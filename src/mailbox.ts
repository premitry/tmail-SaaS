// Durable Object: satu instance per alamat inbox (SQLite lokal) + WebSocket realtime.
import { DurableObject } from "cloudflare:workers";
import type { Env, StoredEmail } from "./types";

function ttlMs(env: Env): number {
  const mins = parseInt(env.INBOX_TTL_MINUTES || "1440", 10);
  return (isNaN(mins) ? 1440 : mins) * 60 * 1000;
}

export class Mailbox extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS emails (
      id          TEXT PRIMARY KEY,
      sender      TEXT NOT NULL,
      subject     TEXT NOT NULL,
      preview     TEXT NOT NULL,
      text        TEXT NOT NULL,
      html        TEXT NOT NULL,
      received_at INTEGER NOT NULL,
      read        INTEGER NOT NULL DEFAULT 0
    )`);
  }

  /* ── RPC dari Worker ── */
  async store(email: StoredEmail): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();
    this.sql.exec(
      `INSERT INTO emails (id, sender, subject, preview, text, html, received_at, read)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      id, email.sender, email.subject, email.preview, email.text, email.html, now,
    );
    await this.ctx.storage.setAlarm(now + ttlMs(this.env));
    this.broadcast({ type: "new", id, sender: email.sender, subject: email.subject });
    return id;
  }

  list() {
    this.gc();
    return this.sql.exec(
      `SELECT id, sender, subject, preview, received_at, read FROM emails ORDER BY received_at DESC`,
    ).toArray();
  }

  get(id: string) {
    this.gc();
    const rows = this.sql.exec(`SELECT * FROM emails WHERE id = ?`, id).toArray();
    if (rows.length) this.sql.exec(`UPDATE emails SET read = 1 WHERE id = ?`, id);
    return rows[0] ?? null;
  }

  del(id: string) {
    this.sql.exec(`DELETE FROM emails WHERE id = ?`, id);
    this.broadcast({ type: "update" });
  }

  clear() {
    this.sql.exec(`DELETE FROM emails`);
    this.broadcast({ type: "update" });
  }

  private gc() {
    this.sql.exec(`DELETE FROM emails WHERE received_at < ?`, Date.now() - ttlMs(this.env));
  }

  async alarm() {
    this.gc();
    const count = Number(this.sql.exec(`SELECT COUNT(*) AS c FROM emails`).toArray()[0].c);
    if (count > 0) await this.ctx.storage.setAlarm(Date.now() + ttlMs(this.env));
    else if (this.ctx.getWebSockets().length === 0) await this.ctx.storage.deleteAll();
  }

  /* ── WebSocket realtime (hibernatable) ── */
  async fetch(req: Request): Promise<Response> {
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer) {
    if (msg === "ping") ws.send("pong");
  }
  webSocketClose(ws: WebSocket) {
    try { ws.close(); } catch { /* ignore */ }
  }

  private broadcast(data: unknown) {
    const payload = JSON.stringify(data);
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(payload); } catch { /* ignore */ }
    }
  }
}
