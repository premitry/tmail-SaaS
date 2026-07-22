// Handler semua route /admin* (halaman + JSON API). Admin berbasis SESI user
// (bukan host), supaya "Login as" (impersonation) jalan lintas host.
import type { Env, Tenant, SessionCtx } from "./types";
import { DB } from "./db";
import { getSessionCtx, login, sessionCookie, clearCookie, isSecure } from "./auth";
import { renderLogin, renderAdminShell } from "./admin-ui";
import { encryptSecret, decryptSecret } from "./crypto";
import { provisionHostname, deleteHostname, getHostnameStatus } from "./hostnames";
import { testImapConnection } from "./imap";
import { watcherStub } from "./watcher";

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
const html = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...headers } });

async function body<T = any>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { return {} as T; }
}

// Segarkan status tiap hostname dari Cloudflare (realtime: aktif↔pending sesuai DNS).
async function withStatuses(env: Env, db: DB, list: any[]): Promise<any[]> {
  for (const h of list) {
    if (h.cf_hostname_id) {
      const st = await getHostnameStatus(env, h.cf_hostname_id);
      if (st && st !== h.status) { await db.setHostnameStatus(h.id, st); h.status = st; }
    }
  }
  return list;
}

export async function handleAdmin(req: Request, url: URL, env: Env, db: DB, tenant: Tenant): Promise<Response | null> {
  const path = url.pathname;
  if (path !== "/admin" && !path.startsWith("/admin/")) return null;
  const secure = isSecure(url);
  const loginRole: "owner" | "buyer" = tenant.kind === "owner" ? "owner" : "buyer";
  const brandGuess = tenant.kind === "buyer" ? tenant.settings.brand_name : "Owner Panel";

  // Set cookie dari login-as (magic link) lalu bersihkan URL.
  if (path === "/admin" && url.searchParams.get("__login")) {
    return new Response(null, {
      status: 303,
      headers: { "location": "/admin", "set-cookie": sessionCookie(url.searchParams.get("__login")!, secure) },
    });
  }

  // Login (POST)
  if (path === "/admin/login" && req.method === "POST") {
    const b = await body<{ email: string; password: string }>(req);
    const res = await login(db, b.email || "", b.password || "");
    if (!res.ok) return json({ ok: false, error: res.error });
    const user = await db.getUserByEmailOrUsername(b.email);
    // pastikan role cocok dengan konteks host login
    if (loginRole === "owner" && user?.role !== "owner") return json({ ok: false, error: "bukan akun owner" });
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(res.sessionId!, secure) });
  }

  // Logout
  if (path === "/admin/logout") {
    const s = await getSessionCtx(req, db);
    if (s) {
      await db.deleteSession(s.sessionId);
      // Kalau lagi impersonation (Login-as), keluar = balik ke sesi owner + dashboard owner.
      if (s.impersonatorId) {
        const owner = await db.getUserById(s.impersonatorId);
        if (owner) {
          const sid = await db.createSession(owner.id, null, 1000 * 60 * 60 * 24 * 7);
          return new Response(null, { status: 303, headers: { "location": "/admin", "set-cookie": sessionCookie(sid, secure) } });
        }
      }
    }
    return new Response(null, { status: 303, headers: { "location": "/admin", "set-cookie": clearCookie(secure) } });
  }

  const session = await getSessionCtx(req, db);

  // Halaman /admin
  if (path === "/admin") {
    if (!session) return html(renderLogin(brandGuess, loginRole));
    return html(renderAdminShell(session.user.role === "buyer" ? (await db.ensureBuyerSettings(session.user.id)).brand_name : "Owner Panel"));
  }

  // API
  if (path.startsWith("/admin/api/")) {
    if (!session) return json({ error: "unauthorized" }, 401);
    return session.user.role === "owner"
      ? await ownerApi(req, url, env, db, session)
      : await buyerApi(req, url, env, db, session);
  }

  return json({ error: "not found" }, 404);
}

/* ───────────────── BUYER API ───────────────── */
async function buyerApi(req: Request, url: URL, env: Env, db: DB, s: SessionCtx): Promise<Response> {
  const path = url.pathname.replace("/admin/api", "");
  const buyerId = s.user.id;

  if (path === "/me") {
    const st = await db.ensureBuyerSettings(buyerId);
    const days = s.user.expires_at ? Math.ceil((s.user.expires_at - Date.now()) / 86400000) : null;
    return json({
      role: "buyer", name: s.user.name, email: s.user.email, username: s.user.username || "", brand: st.brand_name,
      expiresInDays: days, impersonating: !!s.impersonatorId,
    });
  }
  if (path === "/dashboard") return json(await db.getStats(buyerId, parseInt(url.searchParams.get("days") || "14", 10)));

  if (path === "/inbox" && req.method === "GET") {
    const q = url.searchParams.get("q") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = 20;
    const { rows, total } = await db.listMessages(buyerId, q, limit, (page - 1) * limit);
    return json({ messages: rows, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  }
  if (path === "/inbox/msg") {
    const m = await db.getMessage(buyerId, url.searchParams.get("id") || "");
    return m ? json(m) : json({ error: "tidak ditemukan" }, 404);
  }
  if (path === "/inbox/delete" && req.method === "POST") {
    const b = await body(req); await db.deleteMessage(buyerId, b.id); return json({ ok: true });
  }

  if (path === "/domains" && req.method === "GET") return json({ domains: await db.listDomains(buyerId) });
  if (path === "/domains" && req.method === "POST") {
    const b = await body(req); return json(await db.addDomain(buyerId, b.domain || ""));
  }
  if (path === "/domains/toggle") { const b = await body(req); await db.toggleDomain(buyerId, b.id, !!b.active); return json({ ok: true }); }
  if (path === "/domains/delete") { const b = await body(req); await db.removeDomain(buyerId, b.id); return json({ ok: true }); }

  if (path === "/settings" && req.method === "GET") {
    const st = await db.ensureBuyerSettings(buyerId);
    const { imap_pass_enc, ...safe } = st;
    return json({ ...safe, has_imap_pass: !!imap_pass_enc });
  }
  if (path === "/settings" && req.method === "POST") {
    const b = await body(req);
    const patch: any = {};
    const str = ["brand_name", "logo_url", "favicon_url", "color_primary", "color_secondary", "color_tertiary", "theme", "lang", "imap_host", "imap_user", "socials_json", "lock_json"];
    for (const k of str) if (b[k] !== undefined) patch[k] = String(b[k]);
    for (const k of ["dark_mode", "imap_tls", "imap_port", "email_limit", "delete_after_minutes"]) if (b[k] !== undefined) patch[k] = Number(b[k]);
    if (b.imap_pass) patch.imap_pass_enc = await encryptSecret(env, String(b.imap_pass));
    if (patch.theme && !["default", "mantis", "nebula"].includes(patch.theme)) delete patch.theme;
    if (patch.lang && !["id", "en"].includes(patch.lang)) delete patch.lang;
    await db.updateBuyerSettings(buyerId, patch);
    const st = await db.ensureBuyerSettings(buyerId);
    const { imap_pass_enc, ...safe } = st;
    return json({ ok: true, settings: { ...safe, has_imap_pass: !!imap_pass_enc } });
  }

  if (path === "/settings/imap-test" && req.method === "POST") {
    const b = await body(req);
    const st = await db.ensureBuyerSettings(buyerId);
    const pass = b.imap_pass ? String(b.imap_pass) : await decryptSecret(env, st.imap_pass_enc);
    const host = String(b.imap_host || st.imap_host);
    const user = String(b.imap_user || st.imap_user);
    if (!host || !user || !pass) return json({ ok: false, error: "host/username/password belum lengkap" });
    const tls = b.imap_tls === undefined ? st.imap_tls !== 0 : (b.imap_tls !== 0 && b.imap_tls !== "0");
    const r = await testImapConnection(host, Number(b.imap_port) || st.imap_port || 993, user, pass, tls);
    return json(r);
  }

  if (path === "/settings/imap-poll" && req.method === "POST") {
    return json(await watcherStub(env, buyerId).pollNow(buyerId));
  }

  if (path === "/keys" && req.method === "GET") return json({ keys: await db.listKeys(buyerId) });
  if (path === "/keys" && req.method === "POST") { const b = await body(req); return json({ key: await db.createKey(buyerId, b.label || "") }); }
  if (path === "/keys/delete") { const b = await body(req); await db.revokeKey(buyerId, b.id); return json({ ok: true }); }

  if (path === "/profile" && req.method === "POST") {
    const b = await body(req);
    if (b.username !== undefined) { const r = await db.setUsername(buyerId, String(b.username)); if (!r.ok) return json({ error: r.error }); }
    if (b.email !== undefined && String(b.email) !== s.user.email) { const r = await db.setEmail(buyerId, String(b.email)); if (!r.ok) return json({ error: r.error }); }
    if (b.name !== undefined) await db.setName(buyerId, String(b.name).slice(0, 60));
    if (b.password) await db.setPassword(buyerId, String(b.password));
    return json({ ok: true });
  }

  // Web domain buyer — READ-ONLY (kelola tetap di owner). Buyer cuma lihat + cek status.
  if (path === "/webdomain" && req.method === "GET") {
    return json({
      hostnames: await withStatuses(env, db, await db.listHostnames(buyerId)),
      saasTarget: env.SAAS_ZONE ? "saas." + env.SAAS_ZONE : "",
      saasZone: env.SAAS_ZONE || "",
    });
  }
  if (path === "/webdomain/refresh" && req.method === "POST") {
    const b = await body(req);
    const h = await db.getHostname(b.id);
    if (!h || h.buyer_id !== buyerId) return json({ error: "tidak ditemukan" }, 404);
    if (h.cf_hostname_id) {
      const st = await getHostnameStatus(env, h.cf_hostname_id);
      if (st) await db.setHostnameStatus(h.id, st);
      return json({ ok: true, status: st || h.status });
    }
    return json({ ok: true, status: h.status });
  }

  if (path === "/export") {
    const domains = await db.listDomains(buyerId);
    const st = await db.ensureBuyerSettings(buyerId);
    const { imap_pass_enc, ...safe } = st;
    return json({ domains: domains.map((d) => d.domain), settings: safe });
  }
  if (path === "/import" && req.method === "POST") {
    const b = await body(req);
    if (Array.isArray(b.domains)) for (const d of b.domains) await db.addDomain(buyerId, String(d));
    return json({ ok: true });
  }

  return json({ error: "not found" }, 404);
}

/* ───────────────── OWNER API ───────────────── */
async function ownerApi(req: Request, url: URL, env: Env, db: DB, s: SessionCtx): Promise<Response> {
  const path = url.pathname.replace("/admin/api", "");

  if (path === "/me") return json({ role: "owner", name: s.user.name, email: s.user.email, username: s.user.username || "", brand: "Owner Panel" });

  if (path === "/profile" && req.method === "POST") {
    const b = await body(req);
    if (b.username !== undefined) { const r = await db.setUsername(s.user.id, String(b.username)); if (!r.ok) return json({ error: r.error }); }
    if (b.email !== undefined && String(b.email) !== s.user.email) { const r = await db.setEmail(s.user.id, String(b.email)); if (!r.ok) return json({ error: r.error }); }
    if (b.name !== undefined) await db.setName(s.user.id, String(b.name).slice(0, 60));
    if (b.password) await db.setPassword(s.user.id, String(b.password));
    return json({ ok: true });
  }

  if (path === "/buyers" && req.method === "GET") return json({ buyers: await db.listBuyers() });

  if (path === "/buyers/detail") {
    const id = url.searchParams.get("id") || "";
    const u = await db.getUserById(id);
    if (!u || u.role !== "buyer") return json({ error: "buyer tidak ditemukan" }, 404);
    const st = await db.ensureBuyerSettings(id);
    return json({
      user: { email: u.email, name: u.name, status: u.status, expires_at: u.expires_at, created_at: u.created_at },
      settings: { imap_host: st.imap_host, has_imap: !!st.imap_pass_enc, theme: st.theme, lang: st.lang },
      stats: await db.getStats(id),
      domains: await db.listDomains(id),
      hostnames: await withStatuses(env, db, await db.listHostnames(id)),
      saasTarget: env.SAAS_ZONE ? "saas." + env.SAAS_ZONE : "",
      saasZone: env.SAAS_ZONE || "",
    });
  }

  if (path === "/buyers/hostname" && req.method === "POST") {
    const b = await body(req);
    if (!b.id || !b.hostname) return json({ error: "id & hostname wajib" });
    const prov = await provisionHostname(env, String(b.hostname));
    const r = await db.addHostname(b.id, String(b.hostname), prov.cfId, prov.status);
    if (!r.ok) return json({ error: r.error });
    return json({ ok: true, status: prov.status, target: env.SAAS_ZONE ? "saas." + env.SAAS_ZONE : "", warn: prov.error });
  }
  if (path === "/buyers/hostname/delete") {
    const b = await body(req);
    const removed = await db.removeHostname(b.id, b.hostnameId);
    if (removed?.cf_hostname_id) await deleteHostname(env, removed.cf_hostname_id);
    return json({ ok: true });
  }
  if (path === "/buyers/hostname/refresh") {
    const b = await body(req);
    const h = await db.getHostname(b.hostnameId);
    if (!h) return json({ error: "hostname tidak ditemukan" }, 404);
    if (h.cf_hostname_id) {
      const st = await getHostnameStatus(env, h.cf_hostname_id);
      if (st) await db.setHostnameStatus(h.id, st);
      return json({ ok: true, status: st || h.status });
    }
    return json({ ok: true, status: h.status });
  }

  if (path === "/buyers" && req.method === "POST") {
    const b = await body(req);
    if (!b.email || !b.password) return json({ error: "email & password wajib" });
    if (await db.getUserByEmail(b.email)) return json({ error: "email sudah dipakai" });
    const expiresAt = b.days && +b.days > 0 ? Date.now() + +b.days * 86400000 : null;
    const buyer = await db.createBuyer(b.email, b.password, b.name || "", expiresAt);
    if (b.hostname) {
      const prov = await provisionHostname(env, String(b.hostname));
      await db.addHostname(buyer.id, String(b.hostname), prov.cfId, prov.status);
    }
    return json({ ok: true, id: buyer.id });
  }
  if (path === "/buyers/update" && req.method === "POST") {
    const b = await body(req);
    const u = await db.getUserById(b.id);
    if (!u || u.role !== "buyer") return json({ error: "buyer tidak ditemukan" });
    if (b.email !== undefined && b.email !== u.email) {
      const r = await db.setEmail(b.id, String(b.email));
      if (!r.ok) return json({ error: r.error });
    }
    if (b.name !== undefined) await db.setName(b.id, String(b.name).slice(0, 60));
    if (b.password) await db.setPassword(b.id, String(b.password));
    return json({ ok: true });
  }
  if (path === "/buyers/expiry") {
    const b = await body(req);
    const expiresAt = b.days && +b.days > 0 ? Date.now() + +b.days * 86400000 : null;
    await db.setExpiry(b.id, expiresAt);
    return json({ ok: true });
  }
  if (path === "/buyers/status") { const b = await body(req); await db.setUserStatus(b.id, b.status); return json({ ok: true }); }
  if (path === "/buyers/delete") {
    const b = await body(req);
    for (const h of await db.listHostnames(b.id)) await deleteHostname(env, h.cf_hostname_id);
    await db.deleteBuyer(b.id);
    return json({ ok: true });
  }
  if (path === "/buyers/login-as") {
    const b = await body(req);
    const buyer = await db.getUserById(b.id);
    if (!buyer || buyer.role !== "buyer") return json({ error: "buyer tidak ditemukan" });
    const sid = await db.createSession(buyer.id, s.user.id, 1000 * 60 * 60 * 6);
    return json({ url: `/admin?__login=${sid}` });
  }

  return json({ error: "not found" }, 404);
}
