// IMAP client (IMAPS/TLS) untuk Cloudflare Workers via cloudflare:sockets.
// Poll 1 mailbox catch-all per-buyer → filter penerima ke domain aktif buyer → simpan.
import { connect } from "cloudflare:sockets";
import PostalMime from "postal-mime";
import type { Env } from "./types";
import { DB } from "./db";
import { decryptSecret } from "./crypto";
import { storeParsed } from "./store";

const enc = new TextEncoder();
const dec = new TextDecoder();
const MAX_PER_POLL = 50;

function quote(s: string): string {
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

class ImapClient {
  private socket: any;
  private writer!: WritableStreamDefaultWriter<Uint8Array>;
  private reader!: ReadableStreamDefaultReader<Uint8Array>;
  private buf = new Uint8Array(0);
  private tagN = 0;

  constructor(private host: string, private port: number, private tls: boolean) {}

  async connect(): Promise<void> {
    this.socket = connect(
      { hostname: this.host, port: this.port },
      { secureTransport: this.tls ? "on" : "off", allowHalfOpen: false },
    );
    this.writer = this.socket.writable.getWriter();
    this.reader = this.socket.readable.getReader();
    await this.readLine(); // greeting
  }

  private append(chunk: Uint8Array) {
    const merged = new Uint8Array(this.buf.length + chunk.length);
    merged.set(this.buf);
    merged.set(chunk, this.buf.length);
    this.buf = merged;
  }
  private async fill() {
    const { value, done } = await this.reader.read();
    if (done || !value) throw new Error("koneksi IMAP tertutup");
    this.append(value);
  }
  private indexOfCRLF(): number {
    for (let i = 0; i < this.buf.length - 1; i++) if (this.buf[i] === 13 && this.buf[i + 1] === 10) return i;
    return -1;
  }
  private async readLine(): Promise<string> {
    for (;;) {
      const idx = this.indexOfCRLF();
      if (idx >= 0) {
        const line = dec.decode(this.buf.slice(0, idx));
        this.buf = this.buf.slice(idx + 2);
        return line;
      }
      await this.fill();
    }
  }
  private async readBytes(n: number): Promise<Uint8Array> {
    while (this.buf.length < n) await this.fill();
    const out = this.buf.slice(0, n);
    this.buf = this.buf.slice(n);
    return out;
  }
  private async send(cmd: string): Promise<string> {
    const tag = "A" + (++this.tagN).toString().padStart(3, "0");
    await this.writer.write(enc.encode(`${tag} ${cmd}\r\n`));
    return tag;
  }
  private async cmd(command: string): Promise<string[]> {
    const tag = await this.send(command);
    const lines: string[] = [];
    for (;;) {
      const line = await this.readLine();
      lines.push(line);
      if (line.startsWith(tag + " ")) {
        const status = line.slice(tag.length + 1).split(" ")[0];
        if (status !== "OK") throw new Error(`IMAP ${command.split(" ")[0]} gagal: ${line}`);
        return lines;
      }
    }
  }

  async login(user: string, pass: string) { await this.cmd(`LOGIN ${quote(user)} ${quote(pass)}`); }
  async selectInbox() { await this.cmd(`SELECT INBOX`); }

  async searchUids(lastUid: number): Promise<number[]> {
    const q = lastUid > 0 ? `UID SEARCH UID ${lastUid + 1}:*` : `UID SEARCH ALL`;
    const lines = await this.cmd(q);
    const uids: number[] = [];
    for (const l of lines) {
      const m = l.match(/^\*\s+SEARCH\b(.*)$/i);
      if (m) for (const t of m[1].trim().split(/\s+/)) {
        const n = parseInt(t, 10);
        if (!isNaN(n)) uids.push(n);
      }
    }
    return uids.filter((u) => u > lastUid);
  }

  async fetchRaw(uid: number): Promise<Uint8Array | null> {
    const tag = await this.send(`UID FETCH ${uid} BODY.PEEK[]`);
    let raw: Uint8Array | null = null;
    for (;;) {
      const line = await this.readLine();
      const m = line.match(/\{(\d+)\}$/);
      if (m) { raw = await this.readBytes(parseInt(m[1], 10)); continue; }
      if (line.startsWith(tag + " ")) break;
    }
    return raw;
  }

  async logout() {
    try { await this.send("LOGOUT"); } catch { /* ignore */ }
    try { await this.writer.close(); } catch { /* ignore */ }
    try { await this.reader.cancel(); } catch { /* ignore */ }
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("IMAP timeout")), ms)),
  ]);
}

/** Penerima yang cocok dengan salah satu domain aktif buyer. */
function recipientsFor(parsed: any, domains: string[]): string[] {
  const set = new Set<string>();
  const ok = (addr?: string) => {
    if (!addr) return;
    const a = addr.toLowerCase();
    if (domains.some((d) => a.endsWith("@" + d))) set.add(a);
  };
  (parsed.to || []).forEach((x: any) => ok(x.address));
  (parsed.cc || []).forEach((x: any) => ok(x.address));
  for (const h of parsed.headers || []) {
    const k = String(h.key || "").toLowerCase();
    if (["delivered-to", "x-original-to", "envelope-to", "x-forwarded-to"].includes(k)) {
      const m = String(h.value).match(/[a-z0-9._%+-]+@[a-z0-9.-]+/i);
      if (m) ok(m[0]);
    }
  }
  return [...set];
}

async function pollBuyer(
  env: Env, db: DB,
  buyerId: string, host: string, port: number, user: string, pass: string, tls: boolean,
  lastUid: number, domains: string[],
): Promise<number> {
  const client = new ImapClient(host, port || 993, tls);
  let stored = 0;
  try {
    await client.connect();
    await client.login(user, pass);
    await client.selectInbox();
    const uids = await client.searchUids(lastUid);

    if (lastUid === 0) {
      const max = uids.length ? Math.max(...uids) : 0;
      if (max > 0) await db.setLastUid(buyerId, max);
      return 0; // baseline
    }

    let maxUid = lastUid;
    for (const uid of uids.slice(0, MAX_PER_POLL)) {
      const raw = await client.fetchRaw(uid);
      if (raw) {
        const parsed = await PostalMime.parse(raw);
        for (const rcpt of recipientsFor(parsed, domains)) {
          await storeParsed(env, rcpt, parsed, parsed.from?.address || "unknown@" + domains[0]);
          stored++;
        }
      }
      if (uid > maxUid) maxUid = uid;
    }
    if (maxUid > lastUid) await db.setLastUid(buyerId, maxUid);
  } finally {
    await client.logout();
  }
  return stored;
}

/** Dipanggil dari Cron: poll semua buyer yang punya IMAP + domain aktif. */
export async function pollAllImap(env: Env): Promise<void> {
  const db = new DB(env.DB);
  const buyers = await db.buyersToPollImap();
  for (const { buyer, settings, domains } of buyers) {
    const pass = await decryptSecret(env, settings.imap_pass_enc);
    if (!pass) continue;
    try {
      const n = await withTimeout(
        pollBuyer(env, db, buyer.id, settings.imap_host, settings.imap_port,
          settings.imap_user, pass, settings.imap_tls !== 0, settings.imap_last_uid, domains),
        45000,
      );
      if (n > 0) {
        await db.incrMessages(buyer.id, n);
        console.log(`IMAP ${buyer.email}: ${n} email baru`);
      }
    } catch (e) {
      console.log(`IMAP poll ${buyer.email} error:`, (e as Error).message);
    }
  }
}
