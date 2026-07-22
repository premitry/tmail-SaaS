// Handler untuk email masuk via Cloudflare Email Routing.
// Alur: CF Email Routing → email() → parse → cari buyer dari domain → simpan ke Mailbox DO + log D1.
// Gantiin polling IMAP. Realtime, tanpa VPS, tanpa hang.
import PostalMime from "postal-mime";
import type { Env } from "./types";
import { DB } from "./db";
import { storeParsed } from "./store";

// Ambil semua alamat penerima dari envelope + header (buat nangkep forwarded email
// dari akun CF buyer yang envelope-nya udah ditulis ulang, tapi To asli tetap kebawa).
function collectRecipients(envelopeTo: string, parsed: any): string[] {
  const set = new Set<string>();
  const add = (a?: string) => { if (a && /^[a-z0-9._%+-]+@[a-z0-9.-]+$/i.test(a)) set.add(a.toLowerCase()); };
  add(envelopeTo);
  (parsed.to || []).forEach((x: any) => add(x.address));
  (parsed.cc || []).forEach((x: any) => add(x.address));
  for (const h of parsed.headers || []) {
    const k = String(h.key || "").toLowerCase();
    if (["delivered-to", "x-original-to", "envelope-to", "x-forwarded-to", "x-forwarded-for"].includes(k)) {
      const m = String(h.value).match(/[a-z0-9._%+-]+@[a-z0-9.-]+/i);
      if (m) add(m[0]);
    }
  }
  return [...set];
}

/** Handler untuk `email()` di default export. */
export async function handleIncomingEmail(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
  const raw = await new Response(message.raw).arrayBuffer();
  const parsed = await PostalMime.parse(raw);
  const db = new DB(env.DB);
  const saasZone = (env.SAAS_ZONE || "").toLowerCase();

  const recipients = collectRecipients(message.to, parsed);

  // ── 1. LOG ke Mail Hub kalau email lewat catchall apex (mis. envelope=*@imapku.icu).
  // Ini master log — bahkan email yg akhirnya masuk ke inbox buyer tetap ke-log di sini.
  const envelopeTo = (message.to || "").toLowerCase();
  if (saasZone && envelopeTo.endsWith("@" + saasZone)) {
    const text = parsed.text || "";
    const html = parsed.html || "";
    const preview = String(text || html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 140);
    const from = String(parsed.from?.address || message.from || "unknown").toLowerCase();
    const subj = parsed.subject || "(tanpa subjek)";
    // Cari "ke:" asli (sebelum di-forward). Prefer header To, fallback envelope alias.
    const headerTo = (parsed.to || [])[0]?.address?.toLowerCase();
    const origTo = headerTo || envelopeTo;
    try { await db.logHubMessage(origTo, from, subj, preview, html, text); } catch (e) { console.log("hub log err:", (e as Error).message); }
    // Enforce simpan-maks di background.
    ctx.waitUntil((async () => {
      try {
        const n = parseInt(await db.platformGet("hub_max_stored", "500"), 10);
        if (!isNaN(n) && n > 0) await db.trimHubMessages(n);
      } catch { /* ignore */ }
    })());
  }

  // ── 2. Route ke inbox buyer (via domain aktif). Multi-recipient beda buyer → multi-inbox.
  const routed: { addr: string; buyerId: string }[] = [];
  const seenBuyers = new Set<string>();
  for (const rcpt of recipients) {
    const domain = rcpt.split("@")[1];
    if (!domain) continue;
    const buyerId = await db.findBuyerIdByDomain(domain);
    if (!buyerId) continue;
    routed.push({ addr: rcpt, buyerId });
    seenBuyers.add(buyerId);
  }

  if (!routed.length) {
    const fromAddr = String(parsed.from?.address || message.from || "").toLowerCase();
    const subject = String(parsed.subject || "").toLowerCase();

    // Auto-verifikasi email Cloudflare (destination address).
    const looksCf = fromAddr.includes("cloudflare.com") || subject.includes("verify your email") || subject.includes("cloudflare");
    if (looksCf) {
      const bodyStr = String(parsed.text || parsed.html || "");
      const urls = bodyStr.match(/https?:\/\/[^\s"'<>]+/g) || [];
      const verifyUrl = urls.find((u) => /cloudflare\.com/i.test(u) && /verify|token=/i.test(u));
      if (verifyUrl) {
        try { const r = await fetch(verifyUrl, { method: "GET", redirect: "follow" }); console.log("auto-verify CF:", verifyUrl.slice(0, 80), "→", r.status); }
        catch (e) { console.log("auto-verify gagal:", (e as Error).message); }
      }
    }
    // Nggak ada buyer cocok — udah di-log ke Mail Hub di atas (kalau lewat apex).
    return;
  }

  const from = parsed.from?.address || message.from || "unknown@" + (recipients[0]?.split("@")[1] || "unknown");
  for (const { addr, buyerId } of routed) {
    await storeParsed(env, addr, parsed, from, db, buyerId);
  }

  // Naikin counter pemakaian per buyer + tandai Email Routing aktif (utk deteksi status di UI).
  for (const bid of seenBuyers) {
    ctx.waitUntil(db.incrMessages(bid, 1).catch(() => {}));
    ctx.waitUntil(db.touchWorkerEmail(bid).catch(() => {}));
  }
}
