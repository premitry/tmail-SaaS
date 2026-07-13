// Data access layer (D1). Semua query multi-tenant ke-scope buyer_id.
import type { Env, UserRow, BuyerSettings, DomainRow, HostnameRow } from "./types";
import { hashPassword, randomToken } from "./crypto";

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function uid(): string {
  return crypto.randomUUID();
}

export class DB {
  constructor(private d1: D1Database) {}

  /* ─────────── bootstrap ─────────── */
  async bootstrapOwner(env: Env): Promise<void> {
    if (!env.OWNER_EMAIL || !env.OWNER_PASSWORD) return;
    const existing = await this.getUserByEmail(env.OWNER_EMAIL);
    if (existing) return;
    const hash = await hashPassword(env.OWNER_PASSWORD);
    await this.d1
      .prepare(`INSERT INTO users (id, role, email, pass_hash, name, status, expires_at, created_at)
                VALUES (?, 'owner', ?, ?, 'Owner', 'active', NULL, ?)`)
      .bind(uid(), env.OWNER_EMAIL.toLowerCase(), hash, Date.now())
      .run();
  }

  /* ─────────── users ─────────── */
  async getUserByEmail(email: string): Promise<UserRow | null> {
    return await this.d1.prepare(`SELECT * FROM users WHERE email = ?`)
      .bind(email.toLowerCase()).first<UserRow>();
  }
  async getUserById(id: string): Promise<UserRow | null> {
    return await this.d1.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first<UserRow>();
  }
  async listBuyers(): Promise<UserRow[]> {
    const r = await this.d1.prepare(`SELECT * FROM users WHERE role = 'buyer' ORDER BY created_at DESC`).all<UserRow>();
    return r.results ?? [];
  }
  async createBuyer(email: string, password: string, name: string, expiresAt: number | null): Promise<UserRow> {
    const id = uid();
    const hash = await hashPassword(password);
    await this.d1
      .prepare(`INSERT INTO users (id, role, email, pass_hash, name, status, expires_at, created_at)
                VALUES (?, 'buyer', ?, ?, ?, 'active', ?, ?)`)
      .bind(id, email.toLowerCase(), hash, name, expiresAt, Date.now())
      .run();
    await this.ensureBuyerSettings(id);
    return (await this.getUserById(id))!;
  }
  async setUserStatus(id: string, status: string): Promise<void> {
    await this.d1.prepare(`UPDATE users SET status = ? WHERE id = ?`).bind(status, id).run();
  }
  async setExpiry(id: string, expiresAt: number | null): Promise<void> {
    const status = expiresAt && expiresAt < Date.now() ? "expired" : "active";
    await this.d1.prepare(`UPDATE users SET expires_at = ?, status = ? WHERE id = ?`)
      .bind(expiresAt, status, id).run();
  }
  async setPassword(id: string, password: string): Promise<void> {
    const hash = await hashPassword(password);
    await this.d1.prepare(`UPDATE users SET pass_hash = ? WHERE id = ?`).bind(hash, id).run();
  }
  async setName(id: string, name: string): Promise<void> {
    await this.d1.prepare(`UPDATE users SET name = ? WHERE id = ?`).bind(name, id).run();
  }
  async setEmail(id: string, email: string): Promise<{ ok: boolean; error?: string }> {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, error: "email tidak valid" };
    const dup = await this.d1.prepare(`SELECT id FROM users WHERE email = ? AND id != ?`).bind(e, id).first();
    if (dup) return { ok: false, error: "email sudah dipakai" };
    await this.d1.prepare(`UPDATE users SET email = ? WHERE id = ?`).bind(e, id).run();
    return { ok: true };
  }
  async deleteBuyer(id: string): Promise<void> {
    await this.d1.batch([
      this.d1.prepare(`DELETE FROM users WHERE id = ? AND role = 'buyer'`).bind(id),
      this.d1.prepare(`DELETE FROM buyer_settings WHERE buyer_id = ?`).bind(id),
      this.d1.prepare(`DELETE FROM domains WHERE buyer_id = ?`).bind(id),
      this.d1.prepare(`DELETE FROM hostnames WHERE buyer_id = ?`).bind(id),
      this.d1.prepare(`DELETE FROM api_keys WHERE buyer_id = ?`).bind(id),
      this.d1.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(id),
    ]);
  }

  /* ─────────── buyer_settings ─────────── */
  async ensureBuyerSettings(buyerId: string): Promise<BuyerSettings> {
    let s = await this.getBuyerSettings(buyerId);
    if (!s) {
      await this.d1.prepare(`INSERT OR IGNORE INTO buyer_settings (buyer_id, updated_at) VALUES (?, ?)`)
        .bind(buyerId, Date.now()).run();
      s = await this.getBuyerSettings(buyerId);
    }
    return s!;
  }
  async getBuyerSettings(buyerId: string): Promise<BuyerSettings | null> {
    return await this.d1.prepare(`SELECT * FROM buyer_settings WHERE buyer_id = ?`)
      .bind(buyerId).first<BuyerSettings>();
  }
  async updateBuyerSettings(buyerId: string, patch: Partial<BuyerSettings>): Promise<void> {
    const allowed = [
      "imap_host", "imap_port", "imap_user", "imap_pass_enc", "imap_tls", "imap_last_uid",
      "brand_name", "logo_url", "color_primary", "color_secondary", "color_tertiary",
      "theme", "lang", "dark_mode", "email_limit", "delete_after_minutes", "socials_json", "lock_json",
    ];
    const keys = Object.keys(patch).filter((k) => allowed.includes(k));
    if (!keys.length) return;
    const setSql = keys.map((k) => `${k} = ?`).join(", ") + ", updated_at = ?";
    const vals = keys.map((k) => (patch as any)[k]);
    vals.push(Date.now(), buyerId);
    await this.d1.prepare(`UPDATE buyer_settings SET ${setSql} WHERE buyer_id = ?`).bind(...vals).run();
  }
  async setLastUid(buyerId: string, uidVal: number): Promise<void> {
    await this.d1.prepare(`UPDATE buyer_settings SET imap_last_uid = ? WHERE buyer_id = ?`)
      .bind(uidVal, buyerId).run();
  }

  /* ─────────── domains ─────────── */
  async listDomains(buyerId: string): Promise<DomainRow[]> {
    const r = await this.d1.prepare(`SELECT * FROM domains WHERE buyer_id = ? ORDER BY created_at DESC`)
      .bind(buyerId).all<DomainRow>();
    return r.results ?? [];
  }
  async activeDomainNames(buyerId: string): Promise<string[]> {
    const r = await this.d1.prepare(`SELECT domain FROM domains WHERE buyer_id = ? AND is_active = 1 ORDER BY domain`)
      .bind(buyerId).all<{ domain: string }>();
    return (r.results ?? []).map((d) => d.domain);
  }
  async addDomain(buyerId: string, domain: string): Promise<{ ok: boolean; error?: string }> {
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) return { ok: false, error: "domain tidak valid" };
    const dup = await this.d1.prepare(`SELECT id FROM domains WHERE domain = ?`).bind(d).first();
    if (dup) return { ok: false, error: "domain sudah terdaftar" };
    await this.d1.prepare(`INSERT INTO domains (id, buyer_id, domain, is_active, created_at) VALUES (?, ?, ?, 1, ?)`)
      .bind(uid(), buyerId, d, Date.now()).run();
    return { ok: true };
  }
  async toggleDomain(buyerId: string, id: string, active: boolean): Promise<void> {
    await this.d1.prepare(`UPDATE domains SET is_active = ? WHERE id = ? AND buyer_id = ?`)
      .bind(active ? 1 : 0, id, buyerId).run();
  }
  async removeDomain(buyerId: string, id: string): Promise<void> {
    await this.d1.prepare(`DELETE FROM domains WHERE id = ? AND buyer_id = ?`).bind(id, buyerId).run();
  }
  async findBuyerIdByDomain(domain: string): Promise<string | null> {
    const r = await this.d1.prepare(`SELECT buyer_id FROM domains WHERE domain = ? AND is_active = 1`)
      .bind(domain.toLowerCase()).first<{ buyer_id: string }>();
    return r?.buyer_id ?? null;
  }

  /* ─────────── hostnames ─────────── */
  async listHostnames(buyerId: string): Promise<HostnameRow[]> {
    const r = await this.d1.prepare(`SELECT * FROM hostnames WHERE buyer_id = ? ORDER BY created_at DESC`)
      .bind(buyerId).all<HostnameRow>();
    return r.results ?? [];
  }
  async addHostname(buyerId: string, hostname: string, cfId: string, status: string): Promise<{ ok: boolean; error?: string }> {
    const h = hostname.trim().toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(h)) return { ok: false, error: "hostname tidak valid" };
    const dup = await this.d1.prepare(`SELECT id FROM hostnames WHERE hostname = ?`).bind(h).first();
    if (dup) return { ok: false, error: "hostname sudah terdaftar" };
    await this.d1.prepare(`INSERT INTO hostnames (id, buyer_id, hostname, cf_hostname_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(uid(), buyerId, h, cfId, status, Date.now()).run();
    return { ok: true };
  }
  async removeHostname(buyerId: string, id: string): Promise<HostnameRow | null> {
    const row = await this.d1.prepare(`SELECT * FROM hostnames WHERE id = ? AND buyer_id = ?`)
      .bind(id, buyerId).first<HostnameRow>();
    if (row) await this.d1.prepare(`DELETE FROM hostnames WHERE id = ?`).bind(id).run();
    return row;
  }
  async findBuyerIdByHostname(hostname: string): Promise<string | null> {
    const r = await this.d1.prepare(`SELECT buyer_id FROM hostnames WHERE hostname = ?`)
      .bind(hostname.toLowerCase()).first<{ buyer_id: string }>();
    return r?.buyer_id ?? null;
  }

  /* ─────────── api keys ─────────── */
  async listKeys(buyerId: string): Promise<any[]> {
    const r = await this.d1.prepare(`SELECT id, label, key, created_at FROM api_keys WHERE buyer_id = ? ORDER BY created_at DESC`)
      .bind(buyerId).all();
    return r.results ?? [];
  }
  async createKey(buyerId: string, label: string): Promise<string> {
    const key = "tk_" + randomToken(18);
    await this.d1.prepare(`INSERT INTO api_keys (id, buyer_id, label, key, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(uid(), buyerId, label.slice(0, 40), key, Date.now()).run();
    return key;
  }
  async revokeKey(buyerId: string, id: string): Promise<void> {
    await this.d1.prepare(`DELETE FROM api_keys WHERE id = ? AND buyer_id = ?`).bind(id, buyerId).run();
  }
  async validKey(buyerId: string, key: string): Promise<boolean> {
    const r = await this.d1.prepare(`SELECT id FROM api_keys WHERE buyer_id = ? AND key = ?`)
      .bind(buyerId, key).first();
    return !!r;
  }

  /* ─────────── sessions ─────────── */
  async createSession(userId: string, impersonatorId: string | null, ttlMs: number): Promise<string> {
    const id = randomToken(24);
    const now = Date.now();
    await this.d1.prepare(`INSERT INTO sessions (id, user_id, impersonator_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(id, userId, impersonatorId, now, now + ttlMs).run();
    return id;
  }
  async getSession(id: string): Promise<{ user: UserRow; impersonatorId: string | null } | null> {
    const s = await this.d1.prepare(`SELECT * FROM sessions WHERE id = ?`).bind(id)
      .first<{ user_id: string; impersonator_id: string | null; expires_at: number }>();
    if (!s) return null;
    if (s.expires_at < Date.now()) { await this.deleteSession(id); return null; }
    const user = await this.getUserById(s.user_id);
    if (!user) return null;
    return { user, impersonatorId: s.impersonator_id };
  }
  async deleteSession(id: string): Promise<void> {
    await this.d1.prepare(`DELETE FROM sessions WHERE id = ?`).bind(id).run();
  }

  /* ─────────── stats ─────────── */
  async incrEmailsCreated(buyerId: string): Promise<void> {
    await this.d1.prepare(
      `INSERT INTO stats (buyer_id, day, emails_created, messages_received) VALUES (?, ?, 1, 0)
       ON CONFLICT(buyer_id, day) DO UPDATE SET emails_created = emails_created + 1`)
      .bind(buyerId, today()).run();
  }
  async incrMessages(buyerId: string, by = 1): Promise<void> {
    await this.d1.prepare(
      `INSERT INTO stats (buyer_id, day, emails_created, messages_received) VALUES (?, ?, 0, ?)
       ON CONFLICT(buyer_id, day) DO UPDATE SET messages_received = messages_received + ?`)
      .bind(buyerId, today(), by, by).run();
  }
  async getStats(buyerId: string, days = 14): Promise<{ emails: number; messages: number; domains: number; series: any[] }> {
    const limit = Math.max(1, Math.min(90, days || 14));
    const totals = await this.d1.prepare(
      `SELECT COALESCE(SUM(emails_created),0) AS emails, COALESCE(SUM(messages_received),0) AS messages
       FROM stats WHERE buyer_id = ?`).bind(buyerId).first<{ emails: number; messages: number }>();
    const domains = await this.d1.prepare(`SELECT COUNT(*) AS c FROM domains WHERE buyer_id = ?`)
      .bind(buyerId).first<{ c: number }>();
    const series = await this.d1.prepare(
      `SELECT day, emails_created, messages_received FROM stats WHERE buyer_id = ? ORDER BY day DESC LIMIT ?`)
      .bind(buyerId, limit).all();
    return {
      emails: totals?.emails ?? 0,
      messages: totals?.messages ?? 0,
      domains: domains?.c ?? 0,
      series: (series.results ?? []).reverse(),
    };
  }

  /* ─────────── polling helpers ─────────── */
  async buyersToPollImap(): Promise<Array<{ buyer: UserRow; settings: BuyerSettings; domains: string[] }>> {
    const r = await this.d1.prepare(
      `SELECT bs.* FROM buyer_settings bs
       JOIN users u ON u.id = bs.buyer_id
       WHERE u.status = 'active' AND bs.imap_host != '' AND bs.imap_user != ''`).all<BuyerSettings>();
    const out: Array<{ buyer: UserRow; settings: BuyerSettings; domains: string[] }> = [];
    for (const s of r.results ?? []) {
      const buyer = await this.getUserById(s.buyer_id);
      if (!buyer) continue;
      const domains = await this.activeDomainNames(s.buyer_id);
      if (!domains.length) continue;
      out.push({ buyer, settings: s, domains });
    }
    return out;
  }

  /* ─────────── messages (inbox gabungan) ─────────── */
  async logMessage(buyerId: string, to: string, from: string, subject: string, preview: string, html: string, text: string): Promise<void> {
    await this.d1.prepare(
      `INSERT INTO messages (id, buyer_id, to_addr, from_addr, subject, preview, html, text, received_at, seen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
      .bind(uid(), buyerId, to, from, subject, preview, html, text, Date.now()).run();
  }
  async listMessages(buyerId: string, q: string, limit: number, offset: number): Promise<{ rows: any[]; total: number }> {
    const like = "%" + q.trim() + "%";
    const where = q.trim()
      ? `buyer_id = ? AND (subject LIKE ? OR from_addr LIKE ? OR to_addr LIKE ? OR preview LIKE ?)`
      : `buyer_id = ?`;
    const args = q.trim() ? [buyerId, like, like, like, like] : [buyerId];
    const total = await this.d1.prepare(`SELECT COUNT(*) AS c FROM messages WHERE ${where}`).bind(...args).first<{ c: number }>();
    const rows = await this.d1.prepare(
      `SELECT id, to_addr, from_addr, subject, preview, received_at, seen FROM messages WHERE ${where} ORDER BY received_at DESC LIMIT ? OFFSET ?`)
      .bind(...args, limit, offset).all();
    return { rows: rows.results ?? [], total: total?.c ?? 0 };
  }
  async getMessage(buyerId: string, id: string): Promise<any> {
    const row = await this.d1.prepare(`SELECT * FROM messages WHERE id = ? AND buyer_id = ?`).bind(id, buyerId).first();
    if (row) await this.d1.prepare(`UPDATE messages SET seen = 1 WHERE id = ?`).bind(id).run();
    return row;
  }
  async deleteMessage(buyerId: string, id: string): Promise<void> {
    await this.d1.prepare(`DELETE FROM messages WHERE id = ? AND buyer_id = ?`).bind(id, buyerId).run();
  }
  async unseenCount(buyerId: string): Promise<number> {
    const r = await this.d1.prepare(`SELECT COUNT(*) AS c FROM messages WHERE buyer_id = ? AND seen = 0`).bind(buyerId).first<{ c: number }>();
    return r?.c ?? 0;
  }
  async gcAllMessages(): Promise<void> {
    await this.d1.prepare(
      `DELETE FROM messages WHERE rowid IN (
         SELECT m.rowid FROM messages m JOIN buyer_settings bs ON bs.buyer_id = m.buyer_id
         WHERE bs.delete_after_minutes > 0 AND m.received_at < ? - bs.delete_after_minutes * 60000)`)
      .bind(Date.now()).run();
  }

  // Cek masa aktif: tandai expired yang lewat; kembalikan yang ≤ 3 hari untuk notif.
  async expireOverdue(): Promise<void> {
    await this.d1.prepare(
      `UPDATE users SET status = 'expired' WHERE role = 'buyer' AND status = 'active' AND expires_at IS NOT NULL AND expires_at < ?`)
      .bind(Date.now()).run();
  }
}
