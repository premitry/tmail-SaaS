// Provisioning Custom Hostname (Cloudflare for SaaS) via API.
// Kalau CF_API_TOKEN / CF_ZONE_ID tidak di-set → mode "manual" (buat lokal/VPS tes).
import type { Env } from "./types";

const CF_API = "https://api.cloudflare.com/client/v4";

export async function provisionHostname(env: Env, hostname: string):
  Promise<{ cfId: string; status: string; error?: string }> {
  const h = hostname.trim().toLowerCase();
  // Subdomain di bawah SAAS_ZONE (mis. buyera.imapku.icu) sudah ditangani wildcard
  // route + DNS, jadi langsung aktif tanpa perlu custom hostname.
  if (env.SAAS_ZONE && h.endsWith("." + env.SAAS_ZONE.toLowerCase())) {
    return { cfId: "", status: "active" };
  }
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) {
    return { cfId: "", status: "manual" };
  }
  try {
    const r = await fetch(`${CF_API}/zones/${env.CF_ZONE_ID}/custom_hostnames`, {
      method: "POST",
      headers: { "authorization": `Bearer ${env.CF_API_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ hostname, ssl: { method: "http", type: "dv" } }),
    });
    const data = (await r.json()) as any;
    if (!data.success) {
      return { cfId: "", status: "manual", error: (data.errors?.[0]?.message) || "gagal provision" };
    }
    return { cfId: data.result.id, status: data.result.status || "pending" };
  } catch (e) {
    return { cfId: "", status: "manual", error: (e as Error).message };
  }
}

/** Cek status custom hostname di Cloudflare (untuk refresh pending→active). */
export async function getHostnameStatus(env: Env, cfId: string): Promise<string | null> {
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID || !cfId) return null;
  try {
    const r = await fetch(`${CF_API}/zones/${env.CF_ZONE_ID}/custom_hostnames/${cfId}`, {
      headers: { "authorization": `Bearer ${env.CF_API_TOKEN}` },
    });
    const data = (await r.json()) as any;
    if (!data.success) return null;
    // gabungkan status hostname + ssl
    const ssl = data.result.ssl?.status;
    return ssl === "active" ? "active" : (data.result.status || "pending");
  } catch {
    return null;
  }
}

export async function deleteHostname(env: Env, cfId: string): Promise<void> {
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID || !cfId) return;
  try {
    await fetch(`${CF_API}/zones/${env.CF_ZONE_ID}/custom_hostnames/${cfId}`, {
      method: "DELETE",
      headers: { "authorization": `Bearer ${env.CF_API_TOKEN}` },
    });
  } catch { /* ignore */ }
}
