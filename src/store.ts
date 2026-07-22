// Helper penyimpanan inbox + util bersama.
import type { Env, StoredEmail } from "./types";
import type { DB } from "./db";

const ADJ = ["swift", "calm", "bold", "lucky", "cool", "neo", "zen", "epic", "rapid", "sunny", "vivid", "mega"];
const NOUN = ["fox", "wolf", "hawk", "koi", "lynx", "otter", "raven", "puma", "tiger", "panda", "gecko", "orca"];

export interface MailboxStub {
  store(email: StoredEmail): Promise<string>;
  list(): Promise<any[]>;
  get(id: string): Promise<any>;
  del(id: string): Promise<void>;
  clear(): Promise<void>;
}

function randInt(max: number): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] % max;
}

export function genLocalPart(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(2)))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${ADJ[randInt(ADJ.length)]}${NOUN[randInt(NOUN.length)]}${hex}`;
}

export function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ");
}

export function inboxStub(env: Env, address: string): MailboxStub {
  const ns = env.MAILBOX;
  return ns.get(ns.idFromName(address.toLowerCase())) as unknown as MailboxStub;
}

/** Simpan hasil parse email ke Mailbox DO milik `address`, dan (opsional) log ke D1 untuk Inbox buyer. */
export async function storeParsed(
  env: Env,
  address: string,
  parsed: { from?: { address?: string; name?: string }; subject?: string; text?: string; html?: string },
  fallbackSender: string,
  db?: DB,
  buyerId?: string,
): Promise<void> {
  const text = parsed.text || "";
  const html = parsed.html || "";
  const preview = (text || stripHtml(html)).replace(/\s+/g, " ").trim().slice(0, 140);
  const sender = parsed.from?.address || fallbackSender;
  const subject = parsed.subject || "(tanpa subjek)";
  // Simpan ke D1 DULU (fallback tahan banting; jalan walau kuota DO habis).
  if (db && buyerId) {
    try { await db.logMessage(buyerId, address, sender, subject, preview, html, text); } catch (e) { console.log("D1 log gagal:", (e as Error).message); }
  }
  // Baru coba tulis ke DO buat realtime (WS broadcast). Kalau gagal, log-D1 tetep punya email.
  try { await inboxStub(env, address).store({ sender, subject, preview, text, html }); }
  catch (e) { console.log("DO store gagal (email tetap di D1):", (e as Error).message); }
}
