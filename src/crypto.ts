// Hashing password (PBKDF2) + enkripsi rahasia (AES-GCM) via WebCrypto.
import type { Env } from "./types";

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function ub64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ─────────── Password (PBKDF2-SHA256) ─────────── */
export async function hashPassword(pw: string, iterations = 100_000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256,
  );
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  const salt = ub64(parts[2]);
  const expected = ub64(parts[3]);
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, expected.length * 8,
  );
  return timingSafeEqual(new Uint8Array(bits), expected);
}

/* ─────────── Enkripsi rahasia (AES-GCM) ─────────── */
async function aesKey(env: Env): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(env.ENCRYPTION_KEY || "dev-insecure-key"));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(env: Env, plain: string): Promise<string> {
  if (!plain) return "";
  const key = await aesKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain));
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), iv.length);
  return b64(out);
}

export async function decryptSecret(env: Env, blob: string): Promise<string> {
  if (!blob) return "";
  try {
    const key = await aesKey(env);
    const data = ub64(blob);
    const iv = data.slice(0, 12);
    const ct = data.slice(12);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return dec.decode(pt);
  } catch {
    return "";
  }
}

export function randomToken(bytes = 24): string {
  return b64(crypto.getRandomValues(new Uint8Array(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
