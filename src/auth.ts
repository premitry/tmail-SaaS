// Sesi login berbasis cookie + resolusi tenant dari Host.
import type { Env, SessionCtx, Tenant } from "./types";
import { DB } from "./db";
import { verifyPassword } from "./crypto";

const COOKIE = "tmsess";
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 hari

export function parseCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function sessionCookie(id: string, secure: boolean): string {
  const flags = ["Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${SESSION_TTL / 1000}`];
  if (secure) flags.push("Secure");
  return `${COOKIE}=${id}; ${flags.join("; ")}`;
}
export function clearCookie(secure: boolean): string {
  const flags = ["Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) flags.push("Secure");
  return `${COOKIE}=; ${flags.join("; ")}`;
}

export async function getSessionCtx(req: Request, db: DB): Promise<SessionCtx | null> {
  const id = parseCookies(req)[COOKIE];
  if (!id) return null;
  const s = await db.getSession(id);
  if (!s) return null;
  return { sessionId: id, user: s.user, impersonatorId: s.impersonatorId };
}

export async function login(db: DB, email: string, password: string, impersonatorId: string | null = null):
  Promise<{ ok: boolean; sessionId?: string; error?: string }> {
  const user = await db.getUserByEmail(email);
  if (!user) return { ok: false, error: "email atau password salah" };
  if (!(await verifyPassword(password, user.pass_hash))) return { ok: false, error: "email atau password salah" };
  if (user.role === "buyer" && user.status !== "active") {
    return { ok: false, error: user.status === "expired" ? "langganan sudah habis" : "akun disuspend" };
  }
  const sessionId = await db.createSession(user.id, impersonatorId, SESSION_TTL);
  return { ok: true, sessionId };
}

export function isSecure(url: URL): boolean {
  return url.protocol === "https:";
}

// Resolusi tenant: owner (PLATFORM_HOST) atau buyer (via hostname). Override ?__tenant untuk tes.
export async function resolveTenant(req: Request, url: URL, env: Env, db: DB): Promise<Tenant> {
  const override = url.searchParams.get("__tenant");
  if (override === "owner") return { kind: "owner" };

  let buyerId: string | null = null;
  if (override) {
    // override = email atau id buyer (untuk tes lokal tanpa DNS)
    const u = override.includes("@") ? await db.getUserByEmail(override) : await db.getUserById(override);
    buyerId = u && u.role === "buyer" ? u.id : null;
  } else {
    const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
    const platform = (env.PLATFORM_HOST || "").toLowerCase().split(":")[0];
    // Owner panel: PLATFORM_HOST atau host default *.workers.dev.
    if (host && ((platform && host === platform) || host.endsWith(".workers.dev"))) return { kind: "owner" };
    buyerId = await db.findBuyerIdByHostname(host);
  }
  if (!buyerId) return { kind: "unknown" };

  const buyer = await db.getUserById(buyerId);
  if (!buyer) return { kind: "unknown" };
  const settings = await db.ensureBuyerSettings(buyerId);
  return { kind: "buyer", buyer, settings };
}
