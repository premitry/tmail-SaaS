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

  const recipients = collectRecipients(message.to, parsed);

  // Cocokin tiap alamat ke buyer (via domain aktif). Satu email bisa masuk ke banyak inbox
  // kalau ada multi-recipient di domain-domain yang beda buyer.
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
    // Nggak cocok ke buyer. Cek: email verifikasi Cloudflare (destination address)?
    // Auto-klik biar buyer nggak usah manual verify.
    const fromAddr = String(parsed.from?.address || message.from || "").toLowerCase();
    const subject = String(parsed.subject || "").toLowerCase();
    const looksCf = fromAddr.includes("cloudflare.com") || subject.includes("verify your email") || subject.includes("cloudflare");
    if (looksCf) {
      const body = String(parsed.text || parsed.html || "");
      // URL verifikasi CF: https://mailchannels.cloudflare.com/... atau dash.cloudflare.com/email/routing/verify?token=...
      const urls = body.match(/https?:\/\/[^\s"'<>]+/g) || [];
      const verifyUrl = urls.find((u) => /cloudflare\.com/i.test(u) && /verify|token=/i.test(u));
      if (verifyUrl) {
        try { const r = await fetch(verifyUrl, { method: "GET", redirect: "follow" }); console.log("auto-verify CF:", verifyUrl.slice(0, 80), "→", r.status); }
        catch (e) { console.log("auto-verify gagal:", (e as Error).message); }
      } else {
        console.log("email verifikasi CF terdeteksi tapi URL tidak ditemukan. From=" + fromAddr);
      }
      return;
    }
    console.log("email masuk: tidak ada domain buyer yang cocok. To=" + message.to + " From=" + fromAddr);
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
