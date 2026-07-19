// Durable Object "Watcher": near-realtime email.
// Semua poll IMAP untuk 1 buyer lewat DO ini (single-threaded) → tak ada race/duplikat.
// Pas ada pengunjung mantau inbox → poll tiap ~10 detik. Idle → berhenti (fallback cron 1 menit).
import { DurableObject } from "cloudflare:workers";
import type { Env } from "./types";
import { DB } from "./db";
import { pollBuyerNow } from "./imap";

const FAST_INTERVAL = 10_000;   // 10 dtk saat aktif
const ACTIVE_WINDOW = 120_000;  // dianggap aktif 2 menit sejak ping terakhir

export class Watcher extends DurableObject<Env> {
  // Dipanggil saat pengunjung buka/refresh inbox (active=true) atau cron (active=false).
  async ping(buyerId: string, active: boolean): Promise<void> {
    await this.ctx.storage.put("buyerId", buyerId);
    if (active) await this.ctx.storage.put("lastActive", Date.now());
    const a = await this.ctx.storage.getAlarm();
    if (a === null) await this.ctx.storage.setAlarm(Date.now() + 1500);
  }

  // Poll sekarang & kembalikan hasil (dipakai tombol "Tarik email sekarang").
  async pollNow(buyerId: string): Promise<{ ok: boolean; count?: number; error?: string }> {
    await this.ctx.storage.put("buyerId", buyerId);
    return await pollBuyerNow(this.env, buyerId);
  }

  async alarm(): Promise<void> {
    const buyerId = await this.ctx.storage.get<string>("buyerId");
    if (!buyerId) return;
    try { await pollBuyerNow(this.env, buyerId); } catch { /* ignore */ }
    const lastActive = (await this.ctx.storage.get<number>("lastActive")) || 0;
    if (Date.now() - lastActive < ACTIVE_WINDOW) {
      await this.ctx.storage.setAlarm(Date.now() + FAST_INTERVAL);
    }
    // kalau tidak aktif → tidak reschedule (berhenti); cron akan ping lagi tiap menit.
  }
}

export function watcherStub(env: Env, buyerId: string): any {
  const ns = env.WATCHER;
  return ns.get(ns.idFromName(buyerId));
}

// Cron: ping Watcher tiap buyer ber-IMAP (poll 1x via DO, serial, tanpa duplikat).
export async function pingAllWatchers(env: Env): Promise<void> {
  const db = new DB(env.DB);
  const buyers = await db.buyersToPollImap();
  for (const { buyer } of buyers) {
    try { await watcherStub(env, buyer.id).ping(buyer.id, false); } catch { /* ignore */ }
  }
}
