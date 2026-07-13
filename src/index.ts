// Worker utama: bootstrap → resolusi tenant → admin/publik. Cron: poll IMAP + cek expiry.
import type { Env } from "./types";
import { DB } from "./db";
import { resolveTenant } from "./auth";
import { handleAdmin } from "./admin-routes";
import { handlePublic } from "./public-routes";
import { pollAllImap } from "./imap";

export { Mailbox } from "./mailbox";

let booted = false;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const db = new DB(env.DB);
    if (!booted) { booted = true; try { await db.bootstrapOwner(env); } catch { /* ignore */ } }

    const url = new URL(req.url);
    const tenant = await resolveTenant(req, url, env, db);

    // /admin* ditangani berbasis sesi (lintas host).
    const adminRes = await handleAdmin(req, url, env, db, tenant);
    if (adminRes) return adminRes;

    return handlePublic(req, url, env, db, tenant, ctx);
  },

  async scheduled(_e: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const db = new DB(env.DB);
    ctx.waitUntil((async () => {
      try { await db.expireOverdue(); } catch (e) { console.log("expire err", (e as Error).message); }
      try { await db.gcAllMessages(); } catch (e) { console.log("gc err", (e as Error).message); }
      try { await pollAllImap(env); } catch (e) { console.log("poll err", (e as Error).message); }
    })());
  },
} satisfies ExportedHandler<Env>;
