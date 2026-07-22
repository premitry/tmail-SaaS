// Handler web publik temp-mail + visitor API + WebSocket. Tenant = buyer (by host).
import type { Env, Tenant } from "./types";
import { DB } from "./db";
import { renderPublicPage, renderLockScreen, renderContentPage } from "./public-ui";
import { renderDocs } from "./docs";
import { parseCookies } from "./auth";
import { inboxStub, genLocalPart } from "./store";
import { watcherStub } from "./watcher";
import { MANTIS_PATTERN } from "./assets";
import { TAILWIND_CSS } from "./tailwind-css";

function dataUrlToResponse(dataUrl: string, contentType: string): Response {
  const b64 = dataUrl.split(",")[1] || "";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Response(arr, { headers: { "content-type": contentType, "cache-control": "public, max-age=604800" } });
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
const html = (b: string) => new Response(b, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

function validAddress(addr: string | null, domains: string[]): addr is string {
  if (!addr || !/^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(addr)) return false;
  const l = addr.toLowerCase();
  return domains.some((d) => l.endsWith("@" + d));
}

export async function handlePublic(
  req: Request, url: URL, env: Env, db: DB, tenant: Tenant, ctx: ExecutionContext,
): Promise<Response> {
  const path = url.pathname;

  if (path === "/assets/app.css") {
    return new Response(TAILWIND_CSS, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=86400" } });
  }
  if (path === "/assets/mantis-pattern.png") {
    return dataUrlToResponse(MANTIS_PATTERN, "image/png");
  }

  if (path === "/favicon.svg" || path === "/favicon.ico") {
    const emoji = "📮";
    return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`,
      { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
  }

  // Host tak dikenal → info singkat.
  if (tenant.kind !== "buyer") {
    if (path === "/docs") return html(renderDocs(env.BRAND_NAME || "TMail"));
    return new Response("Domain belum terhubung ke buyer manapun.", { status: 404 });
  }

  const buyer = tenant.buyer;
  const st = tenant.settings;

  // Buyer nonaktif/expired → web mati.
  if (buyer.status !== "active") {
    return new Response(`<!doctype html><meta charset=utf-8><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h1>🚫 Layanan tidak aktif</h1><p>${buyer.status === "expired" ? "Langganan sudah habis." : "Akun disuspend."}</p></body>`,
      { status: 403, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  // ── Lock (Kunci Web): gate password sebelum akses situs ──
  const lock = safeJson<any>(st.lock_json, {});
  if (lock && lock.enable && lock.password && path !== "/favicon.svg" && path !== "/favicon.ico" && path !== "/assets/mantis-pattern.png") {
    if (path === "/api/unlock" && req.method === "POST") {
      const b = (await req.json().catch(() => ({}))) as any;
      if (String(b.password || "") === String(lock.password)) {
        const secure = url.protocol === "https:";
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "content-type": "application/json",
            "set-cookie": `tmlock=${encodeURIComponent(String(lock.password))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure ? "; Secure" : ""}`,
          },
        });
      }
      return json({ ok: false, error: "Password salah" }, 401);
    }
    const unlocked = parseCookies(req)["tmlock"] === String(lock.password);
    if (!unlocked) {
      return html(renderLockScreen(st.brand_name, st.logo_url, st.favicon_url, lock.text || "", st.color_primary));
    }
  }

  const domains = await db.activeDomainNames(buyer.id);

  if (path === "/docs") return html(renderDocs(st.brand_name));

  // Halaman utama
  if (path === "/" || path === "/index.html") {
    return html(renderPublicPage({
      brand: st.brand_name, emoji: "📮", logoUrl: st.logo_url, faviconUrl: st.favicon_url,
      colors: { primary: st.color_primary, secondary: st.color_secondary, tertiary: st.color_tertiary },
      theme: st.theme, domains,
      socials: safeJson(st.socials_json, []),
      darkMode: st.dark_mode !== 0, lang: st.lang,
      heroHeading: st.hero_heading, heroSubtitle: st.hero_subtitle,
      hasFaq: !!st.page_faq, hasPrivacy: !!st.page_privacy, hasContact: !!st.page_contact,
    }));
  }
  if (path === "/faq") return html(renderContentPage(st.brand_name, st.logo_url, st.favicon_url, { primary: st.color_primary }, "FAQ", st.page_faq));
  if (path === "/privacy") return html(renderContentPage(st.brand_name, st.logo_url, st.favicon_url, { primary: st.color_primary }, "Kebijakan Privasi", st.page_privacy));
  if (path === "/contact") return html(renderContentPage(st.brand_name, st.logo_url, st.favicon_url, { primary: st.color_primary }, "Kontak", st.page_contact));

  // WebSocket realtime
  if (path === "/api/ws") {
    const a = url.searchParams.get("a");
    if (!validAddress(a, domains)) return new Response("bad address", { status: 400 });
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    if (st.imap_host) ctx.waitUntil(watcherStub(env, buyer.id).ping(buyer.id, true).catch(() => {}));
    const ns = env.MAILBOX;
    const stub = ns.get(ns.idFromName(a.toLowerCase()));
    return stub.fetch(req);
  }

  // Visitor API
  if (path === "/api/domains") return json({ domains });

  if (path === "/api/new") {
    if (!domains.length) return json({ error: "belum ada domain" }, 500);
    const wanted = (url.searchParams.get("domain") || "").toLowerCase();
    const domain = domains.includes(wanted) ? wanted : domains[0];
    const local = (url.searchParams.get("local") || "").toLowerCase().trim();
    let localPart: string;
    if (local) {
      if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(local)) return json({ error: "nama tidak valid" }, 400);
      localPart = local;
    } else localPart = genLocalPart();
    ctx.waitUntil(db.incrEmailsCreated(buyer.id).catch(() => {}));
    return json({ address: `${localPart}@${domain}`, domain, domains });
  }

  const addr = url.searchParams.get("a");
  if (["/api/inbox", "/api/message", "/api/delete", "/api/clear"].includes(path)) {
    if (!validAddress(addr, domains)) return json({ error: "alamat tidak valid" }, 400);
    const stub = inboxStub(env, addr);
    if (path === "/api/inbox") {
      if (st.imap_host) ctx.waitUntil(watcherStub(env, buyer.id).ping(buyer.id, true).catch(() => {}));
      // Jangan pernah 500 ke pengunjung: kalau DO error (mis. kuota), balikin inbox kosong.
      let messages: unknown[] = [];
      try { messages = await stub.list(); } catch { messages = []; }
      return json({ address: addr, messages });
    }
    if (path === "/api/message") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "id kosong" }, 400);
      const msg = await stub.get(id);
      return msg ? json(msg) : json({ error: "tidak ditemukan" }, 404);
    }
    if (path === "/api/delete" && req.method === "POST") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "id kosong" }, 400);
      await stub.del(id); return json({ ok: true });
    }
    if (path === "/api/clear" && req.method === "POST") { await stub.clear(); return json({ ok: true }); }
  }

  return new Response("Not found", { status: 404 });
}

function safeJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}
