// Worker utama: bootstrap → resolusi tenant → admin/publik.
// Cron: cek expiry + GC. Email masuk via CF Email Routing → email() handler.
import type { Env } from "./types";
import { DB } from "./db";
import { resolveTenant } from "./auth";
import { handleAdmin } from "./admin-routes";
import { handlePublic } from "./public-routes";
import { pingAllWatchers } from "./watcher";
import { handleIncomingEmail } from "./email-in";
import { handleMailHub } from "./mail-hub";

export { Mailbox } from "./mailbox";
export { Watcher } from "./watcher";

let booted = false;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const db = new DB(env.DB);
    if (!booted) { booted = true; try { await db.bootstrapOwner(env); } catch { /* ignore */ } }

    const url = new URL(req.url);

    // Mail Hub: host === apex SAAS_ZONE (mis. imapku.icu). Beda dari panel (PLATFORM_HOST=panel.imapku.icu).
    const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
    const apex = (env.SAAS_ZONE || "").toLowerCase();
    if (apex && host === apex) return handleMailHub(req, url, env, db);

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
      // GC Mail Hub sesuai retention setting.
      try {
        const n = parseInt(await db.platformGet("hub_retention_days", "7"), 10);
        if (!isNaN(n) && n > 0) await db.gcHubMessages(n);
      } catch (e) { console.log("hub gc err", (e as Error).message); }
      // Kompat: masih ping Watcher buat buyer yang mau pakai IMAP (opsional).
      try { await pingAllWatchers(env); } catch (e) { console.log("poll err", (e as Error).message); }
    })());
  },

  // Email masuk via CF Email Routing (didaftarkan di dashboard zona imapku.icu).
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    try { await handleIncomingEmail(message, env, ctx); }
    catch (e) { console.log("email() err:", (e as Error).message); }
  },
} satisfies ExportedHandler<Env>;
