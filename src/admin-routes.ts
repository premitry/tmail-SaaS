// Handler semua route /admin* (halaman + JSON API). Admin berbasis SESI user
// (bukan host), supaya "Login as" (impersonation) jalan lintas host.
import type { Env, Tenant, SessionCtx } from "./types";
import { DB } from "./db";
import { getSessionCtx, login, sessionCookie, clearCookie, isSecure } from "./auth";
import { renderLogin, renderAdminShell } from "./admin-ui";
import { encryptSecret } from "./crypto";
import { provisionHostname, deleteHostname } from "./hostnames";

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
const html = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", ...headers } });

async function body<T = any>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { return {} as T; }
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
    const user = await db.getUserByEmail(b.email);
    // pastikan role cocok dengan konteks host login
    if (loginRole === "owner" && user?.role !== "owner") return json({ ok: false, error: "bukan akun owner" });
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(res.sessionId!, secure) });
  }

  // Logout
  if (path === "/admin/logout") {
    const s = await getSessionCtx(req, db);
    if (s) await db.deleteSession(s.sessionId);
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
      role: "buyer", name: s.user.name, email: s.user.email, brand: st.brand_name,
      expiresInDays: days, impersonating: !!s.impersonatorId,
    });
  }
  if (path === "/dashboard") return json(await db.getStats(buyerId));

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
    const str = ["brand_name", "logo_url", "color_primary", "color_secondary", "color_tertiary", "theme", "lang", "imap_host", "imap_user", "socials_json", "lock_json"];
    for (const k of str) if (b[k] !== undefined) patch[k] = String(b[k]);
    for (const k of ["dark_mode", "imap_tls", "imap_port", "email_limit"]) if (b[k] !== undefined) patch[k] = Number(b[k]);
    if (b.imap_pass) patch.imap_pass_enc = await encryptSecret(env, String(b.imap_pass));
    if (patch.theme && !["default", "mantis", "nebula"].includes(patch.theme)) delete patch.theme;
    if (patch.lang && !["id", "en"].includes(patch.lang)) delete patch.lang;
    await db.updateBuyerSettings(buyerId, patch);
    const st = await db.ensureBuyerSettings(buyerId);
    const { imap_pass_enc, ...safe } = st;
    return json({ ok: true, settings: { ...safe, has_imap_pass: !!imap_pass_enc } });
  }

  if (path === "/keys" && req.method === "GET") return json({ keys: await db.listKeys(buyerId) });
  if (path === "/keys" && req.method === "POST") { const b = await body(req); return json({ key: await db.createKey(buyerId, b.label || "") }); }
  if (path === "/keys/delete") { const b = await body(req); await db.revokeKey(buyerId, b.id); return json({ ok: true }); }

  if (path === "/profile" && req.method === "POST") {
    const b = await body(req);
    if (b.name !== undefined) await db.setName(buyerId, String(b.name).slice(0, 60));
    if (b.password) await db.setPassword(buyerId, String(b.password));
    return json({ ok: true });
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

  if (path === "/me") return json({ role: "owner", name: s.user.name, email: s.user.email, brand: "Owner Panel" });

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
      hostnames: await db.listHostnames(id),
    });
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
