// Provisioning Custom Hostname (Cloudflare for SaaS) via API.
// Kalau CF_API_TOKEN / CF_ZONE_ID tidak di-set → mode "manual" (buat lokal/VPS tes).
import type { Env } from "./types";

const CF_API = "https://api.cloudflare.com/client/v4";

export interface DnsRecord { type: string; name: string; value: string; note?: string; }

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
      // TXT DCV: bisa aktif walau buyer pakai A record (bukan CNAME) — cocok utk DNS
      // provider yang gak bisa CNAME (mis. freedns shared domain).
      body: JSON.stringify({ hostname, ssl: { method: "txt", type: "dv" } }),
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

/** Ambil detail DNS yang harus dipasang buyer (TXT DCV + ownership) + status. */
export async function getHostnameDns(env: Env, cfId: string):
  Promise<{ status: string; ssl_status?: string; records: DnsRecord[]; errors: string[] } | null> {
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID || !cfId) return null;
  try {
    const r = await fetch(`${CF_API}/zones/${env.CF_ZONE_ID}/custom_hostnames/${cfId}`, {
      headers: { "authorization": `Bearer ${env.CF_API_TOKEN}` },
    });
    const data = (await r.json()) as any;
    if (!data.success) return null;
    const res = data.result;
    const records: DnsRecord[] = [];
    // 1. TXT ownership verification (kadang diminta CF utk hostname non-CNAME).
    const ov = res.ownership_verification;
    if (ov && ov.type === "txt" && ov.name && ov.value) records.push({ type: "TXT", name: ov.name, value: ov.value, note: "ownership" });
    // 2. TXT DCV utk sertifikat SSL.
    const ssl = res.ssl || {};
    const vrs: any[] = ssl.validation_records || [];
    for (const v of vrs) {
      if (v.txt_name && v.txt_value) records.push({ type: "TXT", name: v.txt_name, value: v.txt_value, note: "ssl" });
    }
    if (!vrs.length && ssl.txt_name && ssl.txt_value) records.push({ type: "TXT", name: ssl.txt_name, value: ssl.txt_value, note: "ssl" });
    return {
      status: ssl.status === "active" ? "active" : (res.status || "pending"),
      ssl_status: ssl.status,
      records,
      errors: [...(res.verification_errors || []), ...((ssl.validation_errors || []).map((e: any) => e.message || String(e)))],
    };
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
