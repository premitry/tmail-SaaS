// Mail Hub: halaman di root apex (mis. imapku.icu) buat baca email catch-all.
// Tema: retro Windows 98 / Y2K — CSS & HTML struktur mengacu ke email-hub/webmail-custom/src/server.ts.
import type { Env } from "./types";
import { DB } from "./db";
import { getSessionCtx, login, sessionCookie, clearCookie, isSecure } from "./auth";
import { esc, head } from "./ui";
import { FAVICON_SVG } from "./assets";

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

async function readForm(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") || "";
  const out: Record<string, string> = {};
  if (ct.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(await req.text());
    for (const [k, v] of params) out[k] = v;
  } else if (ct.includes("application/json")) {
    try { Object.assign(out, await req.json()); } catch { /* ignore */ }
  }
  return out;
}
async function readFormMulti(req: Request): Promise<{ ids: string[]; [k: string]: unknown }> {
  const params = new URLSearchParams(await req.text());
  const ids = params.getAll("id");
  const out: any = { ids };
  for (const [k, v] of params) if (k !== "id") out[k] = v;
  return out;
}

function fmtDate(ms: number): string {
  const d = new Date(ms);
  const n = new Date();
  const p = (x: number) => ("0" + x).slice(-2);
  const t = `${p(d.getHours())}.${p(d.getMinutes())}`;
  if (d.toDateString() === n.toDateString()) return t;
  const b = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${b[d.getMonth()]}, ${t}`;
}

const STYLE = `
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;font:13px/1.45 Tahoma,"Segoe UI",Arial,sans-serif;color:#000;display:flex;flex-direction:column;background-color:#7cbec9;background-image:linear-gradient(rgba(255,255,255,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.35) 1px,transparent 1px);background-size:50px 50px;background-attachment:fixed}
a{color:#000080}
a:hover{text-decoration:underline}
.muted{color:#404040}
.err{color:#a00000;font-weight:bold}
b{font-weight:bold}
code{background:#fff;color:#000080;padding:0 3px;border:1px solid #808080}
.win{background:#c0c0c0;border:2px solid;border-color:#dfdfdf #808080 #808080 #dfdfdf;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 #000;display:flex;flex-direction:column;min-height:0}
.titlebar,.modaltop{display:flex;align-items:center;gap:6px;background:linear-gradient(90deg,#000080,#1084d0);color:#fff;font-weight:bold;padding:3px 6px;font-size:13px;flex:0 0 auto}
.win-body{padding:8px;overflow:auto;flex:1;min-height:0}
.btn{font:inherit;background:#c0c0c0;color:#000;border:2px solid;border-color:#fff #808080 #808080 #fff;box-shadow:inset 1px 1px 0 #dfdfdf,inset -1px -1px 0 #000;padding:3px 10px;cursor:pointer;white-space:nowrap;text-decoration:none;display:inline-block}
.btn:active{border-color:#808080 #fff #fff #808080;box-shadow:inset -1px -1px 0 #dfdfdf,inset 1px 1px 0 #000}
.btn.danger{color:#800000;font-weight:bold}
input,select,textarea{font:inherit;background:#fff;color:#000;border:2px solid;border-color:#808080 #fff #fff #808080;padding:3px 5px}
.topbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:#c0c0c0;border:2px solid;border-color:#dfdfdf #808080 #808080 #dfdfdf;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 #000;padding:4px 6px;margin:8px 8px 0}
.brand{font-weight:bold;letter-spacing:2px;background:#000080;color:#fff;padding:2px 8px}
.badge{background:#000080;color:#fff;padding:0 6px;font-weight:bold}
#desktop{display:flex;gap:8px;padding:8px;flex:1;min-height:0}
#desktop .left{flex:1 1 0;min-width:0}
#desktop .right{flex:0 0 330px;width:330px}
@media(max-width:840px){body{height:auto}#desktop{flex-direction:column}#desktop .right{flex:none;width:auto}}
.list{background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;overflow:auto;flex:1;min-height:120px}
.row{display:grid;grid-template-columns:16px 1fr auto;gap:8px;align-items:center;padding:5px 8px;border-bottom:1px solid #e2e2e2}
.row:hover{background:#000080;color:#fff}
.row:hover .muted,.row:hover a{color:#fff}
.row a{color:inherit;text-decoration:none}
.row .subj{font-weight:bold}
.row.read .subj{font-weight:normal}
.from{font-size:12px}.to{font-size:11px}
.date{font-size:11px;white-space:nowrap}
.bar{display:flex;gap:6px;align-items:center;padding:6px 2px;flex-wrap:wrap}
.empty{text-align:center;padding:40px 12px;color:#404040}
.searchform{margin:0;flex:1;min-width:120px}.searchform input{width:100%}
.box{border:2px solid;border-color:#808080 #fff #fff #808080;background:#c0c0c0;margin-bottom:10px}
.box>.bt{background:#000080;color:#fff;font-weight:bold;padding:2px 6px;font-size:12px}
.box>.bd{padding:8px}
.irow{display:grid;grid-template-columns:84px 1fr auto;gap:6px;align-items:center;padding:3px 0;border-bottom:1px dotted #808080}
.ival{background:#fff;border:1px solid #808080;padding:2px 4px;word-break:break-all}
.dnsstat{font-size:11px;white-space:nowrap;font-weight:bold}
.domlist{max-height:170px;overflow:auto;background:#fff;border:1px solid #808080;padding:2px}
.drow{display:flex;align-items:center;justify-content:space-between;gap:4px;padding:3px 4px;border-bottom:1px dotted #c8c8c8}
.drow .dnm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drow .da{display:flex;gap:3px;flex:0 0 auto}
.drow .btn{padding:1px 6px}
.modal{display:none;position:fixed;inset:0;background:rgba(0,0,40,.4);z-index:50;align-items:flex-start;justify-content:center;padding:24px;overflow:auto}
.modalcard{background:#c0c0c0;border:2px solid;border-color:#dfdfdf #808080 #808080 #dfdfdf;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 #000,4px 4px 10px rgba(0,0,0,.5);max-width:820px;width:100%;max-height:90vh;overflow:auto}
.modaltop{position:sticky;top:0}
.msghead{background:#fff;padding:8px;border-bottom:2px solid #808080}
.msghead .subj{font-size:15px;font-weight:bold;margin:0 0 4px}
iframe{width:100%;min-height:60vh;border:0;background:#fff}
pre.body{white-space:pre-wrap;word-wrap:break-word;padding:10px;margin:0;background:#fff}
.login{max-width:300px;margin:14vh auto;width:90%}
.login .win-body{padding:14px}
.login input{width:100%;margin:8px 0}
`;

function shell(title: string, inner: string): string {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><link rel="icon" href="/favicon.svg"><style>${STYLE}</style></head><body>${inner}</body></html>`;
}

function loginPage(env: Env, err = ""): string {
  const zone = env.SAAS_ZONE || "imapku.icu";
  return shell(`FAV·MAIL — ${zone}`, `<div class="login"><div class="win">
    <div class="titlebar">🔒 FAV·MAIL — Login</div>
    <form class="win-body" method="post" action="/login">
      ${err ? `<p class="err">${esc(err)}</p>` : ""}
      <div style="margin-bottom:4px">Login owner untuk <b>${esc(zone)}</b>:</div>
      <input type="text" name="email" placeholder="username / email" autofocus autocomplete="username">
      <input type="password" name="password" placeholder="password" autocomplete="current-password">
      <button class="btn" type="submit" style="width:100%;margin-top:8px">Masuk »</button>
    </form>
  </div></div>`);
}

export async function handleMailHub(req: Request, url: URL, env: Env, db: DB): Promise<Response> {
  const path = url.pathname;
  const secure = isSecure(url);

  if (path === "/favicon.svg" || path === "/favicon.ico") {
    return new Response(FAVICON_SVG,
      { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
  }

  // LOGIN
  if (path === "/login" && req.method === "POST") {
    const f = await readForm(req);
    const r = await login(db, String(f.email || ""), String(f.password || ""));
    if (!r.ok) return html(loginPage(env, r.error || "gagal login"), 401);
    const user = await db.getUserByEmailOrUsername(String(f.email));
    if (!user || user.role !== "owner") return html(loginPage(env, "hanya owner yang boleh akses"), 403);
    return new Response("", { status: 302, headers: { "location": "/", "set-cookie": sessionCookie(r.sessionId!, secure) } });
  }
  if (path === "/logout") {
    return new Response("", { status: 302, headers: { "location": "/", "set-cookie": clearCookie(secure) } });
  }

  const s = await getSessionCtx(req, db);
  const authed = !!(s && s.user.role === "owner");
  if (!authed) {
    if (path === "/") return html(loginPage(env));
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Endpoints (form-post friendly, sesuai gaya referensi) ──

  // Detail email → fragment (buat modal) atau halaman penuh.
  const mMatch = path.match(/^\/m\/([a-zA-Z0-9-]+)$/);
  if (mMatch && req.method === "GET") {
    const id = mMatch[1];
    const m = await db.getHubMessage(id);
    if (!m) return new Response("Not found", { status: 404 });
    await db.markHubSeen(id).catch(() => {});
    const frag = url.searchParams.get("frag") === "1";
    return html(frag ? messageFragment(id, m) : messagePage(id, m));
  }
  const mDel = path.match(/^\/m\/([a-zA-Z0-9-]+)\/delete$/);
  if (mDel && req.method === "POST") {
    await db.deleteHubMessage(mDel[1]);
    return new Response("", { status: 302, headers: { "location": "/" } });
  }

  // Bulk delete.
  if (path === "/delete" && req.method === "POST") {
    const f = await readFormMulti(req);
    for (const id of f.ids) await db.deleteHubMessage(String(id));
    return new Response("", { status: 302, headers: { "location": "/" } });
  }

  // Retention.
  if (path === "/settings/retention" && req.method === "POST") {
    const f = await readForm(req);
    const days = parseInt(String(f.days || "0"), 10);
    const max = parseInt(String(f.max || "0"), 10);
    if (!isNaN(days) && days >= 0 && days <= 365) {
      await db.platformSet("hub_retention_days", String(days));
      if (days > 0) await db.gcHubMessages(days);
    }
    if (!isNaN(max) && max >= 0 && max <= 100000) {
      await db.platformSet("hub_max_stored", String(max));
      if (max > 0) await db.trimHubMessages(max);
    }
    return new Response("", { status: 302, headers: { "location": "/?ok=Aturan+tersimpan" } });
  }

  // Ganti password owner (session valid → langsung set).
  if (path === "/settings/change-webmail-pw" && req.method === "POST") {
    const f = await readForm(req);
    const pw = String(f.password || "");
    if (pw.length < 6) return new Response("", { status: 302, headers: { "location": "/?err=password+min+6" } });
    await db.setPassword(s!.user.id, pw);
    return new Response("", { status: 302, headers: { "location": "/logout" } });
  }

  // Polling ringan buat auto-refresh (referensi: /count).
  if (path === "/count") {
    const total = await db.countHubTotal();
    return json({ total });
  }

  // Halaman utama.
  if (path === "/") return html(await renderInbox(env, db, url));

  return new Response("Not found", { status: 404 });
}

async function renderInbox(env: Env, db: DB, url: URL): Promise<string> {
  const pageSize = 20;
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const q = url.searchParams.get("q") || "";
  const err = url.searchParams.get("err") || "";
  const ok = url.searchParams.get("ok") || "";
  const zone = env.SAAS_ZONE || "imapku.icu";
  const { rows, total } = await db.listHubMessages(q, pageSize, (page - 1) * pageSize);
  const unread = await db.countHubNew();
  const retDays = parseInt(await db.platformGet("hub_retention_days", "7"), 10);
  const maxStored = parseInt(await db.platformGet("hub_max_stored", "500"), 10);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const qp = q ? `&q=${encodeURIComponent(q)}` : "";

  // Domains: apex + buyer domains aktif.
  const domRes = await (db as any).d1.prepare(`SELECT domain FROM domains WHERE is_active=1 ORDER BY created_at DESC`).all();
  const buyerDomains: string[] = (domRes.results || []).map((r: any) => r.domain);
  const allDomains = [zone, ...buyerDomains];

  const rowsHtml = rows.map((r: any) => `
    <label class="row ${r.seen ? "read" : "unread"}">
      <input type="checkbox" name="id" value="${esc(r.id)}">
      <a class="cell" data-mail href="/m/${esc(r.id)}" style="display:grid;gap:1px;min-width:0">
        <span class="from muted">${esc(r.from_addr) || "(tanpa pengirim)"}</span>
        <span class="subj">${esc(r.subject || "(tanpa subjek)")}</span>
        <span class="to muted">ke: ${esc(r.to_addr) || "-"}</span>
      </a>
      <span class="date">${esc(fmtDate(r.received_at))}</span>
    </label>`).join("");

  const nav = pages > 1 ? `
      ${page > 1 ? `<a class="btn" href="/?page=${page - 1}${qp}">‹</a>` : ""}
      <span class="muted">${page}/${pages}</span>
      ${page < pages ? `<a class="btn" href="/?page=${page + 1}${qp}">›</a>` : ""}` : "";

  const infoText = q ? `${total} hasil "${esc(q)}"` : `${total} email · ${unread} baru`;
  const listInner = total === 0
    ? `<div class="empty">${q ? "🔍 Tidak ada email cocok." : "📭 Belum ada email. Kirim ke <b>*@" + esc(zone) + "</b>."}</div>`
    : rowsHtml;

  const search = `<form method="get" action="/" class="searchform"><input name="q" value="${esc(q)}" placeholder="🔍 Cari email…" autocomplete="off"></form>`;

  const buildOpts = (presets: [number, string][], cur: number) => {
    let o = presets.map(([v, l]) => `<option value="${v}"${v === cur ? " selected" : ""}>${esc(l)}</option>`).join("");
    if (!presets.some(([v]) => v === cur)) o = `<option value="${cur}" selected>${cur} (custom)</option>` + o;
    return o;
  };
  const maxOptions = buildOpts([[0, "Semua"], [100, "100 terbaru"], [500, "500 terbaru"], [1000, "1000 terbaru"], [2000, "2000 terbaru"]], maxStored);
  const dayOptions = buildOpts([[0, "Jangan"], [3, "3 hari"], [7, "7 hari"], [14, "14 hari"], [30, "30 hari"], [90, "90 hari"]], retDays);

  const drows = allDomains.length
    ? allDomains.map((d) => `
      <div class="drow">
        <span class="dnm"><b>${esc(d)}</b> <span class="dnsstat" style="color:#000080">[OK-CF]</span></span>
        <span class="da">
          ${d === zone ? "" : `<a class="btn" href="https://panel.imapku.icu/#domains" target="_blank" title="Kelola di panel admin">⚙</a>`}
        </span>
      </div>`).join("")
    : `<div class="muted" style="padding:6px 2px">Belum ada domain.</div>`;

  const inboxScript = `<script>
    function openModal(url){
      fetch(url + (url.includes('?')?'&':'?') + 'frag=1')
        .then(function(r){return r.text();})
        .then(function(html){
          document.getElementById('modalcard').innerHTML = html;
          document.getElementById('modal').style.display = 'flex';
        });
    }
    function closeModal(){ document.getElementById('modal').style.display='none'; location.reload(); }
    function toggleAll(btn){
      var boxes = document.querySelectorAll('.list input[name="id"]');
      var anyUnchecked = false;
      boxes.forEach(function(b){ if(!b.checked) anyUnchecked = true; });
      boxes.forEach(function(b){ b.checked = anyUnchecked; });
      btn.textContent = anyUnchecked ? '☐ Batal pilih' : '☑ Pilih semua';
    }
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });
    document.querySelectorAll('a[data-mail]').forEach(function(a){
      a.addEventListener('click', function(e){ e.preventDefault(); openModal(a.getAttribute('href')); });
    });
    function showImap(){ document.getElementById('imapinfo').style.display='flex'; }
    function hideImap(){ document.getElementById('imapinfo').style.display='none'; }
    function cp(btn){ var v=btn.parentNode.querySelector('.ival').textContent; navigator.clipboard.writeText(v);
      var t=btn.textContent; btn.textContent='ok!'; setTimeout(function(){btn.textContent=t;},1000); }
    var lastTotal = ${total};
    setInterval(function(){
      var modalOpen = document.getElementById('modal').style.display === 'flex';
      if (modalOpen || location.search.indexOf('q=') >= 0) return;
      fetch('/count').then(function(r){ return r.json(); }).then(function(j){
        if (j && j.total > lastTotal) location.reload();
      }).catch(function(){});
    }, 12000);
  </script>`;

  const body = `
    <form method="post" action="/delete" style="display:flex;flex-direction:column;gap:6px;flex:1;min-height:0">
      <div class="bar">
        <button class="btn" type="button" onclick="toggleAll(this)">☑ Pilih semua</button>
        <button class="btn danger" type="submit" onclick="return confirm('Hapus email yang dicentang?')">🗑 Hapus dipilih</button>
        ${q ? `<a class="btn" href="/">✕ reset</a>` : ""}
        <span style="flex:1"></span>${nav}
      </div>
      <div class="list">${listInner}</div>
    </form>`;

  const panelRight = `
    ${err ? `<div class="box"><div class="bd err">${esc(err)}</div></div>` : ""}
    ${ok ? `<div class="box"><div class="bd" style="color:#000080;font-weight:bold">✔ ${esc(ok)}</div></div>` : ""}
    <div class="box">
      <div class="bt">📁 DOMAIN</div>
      <div class="bd">
        <div class="muted" style="font-size:11px;margin-bottom:6px">Semua email → <b>catchall@${esc(zone)}</b></div>
        <div class="domlist">${drows}</div>
        <button class="btn" type="button" onclick="showImap()" style="width:100%;margin-top:8px">ⓘ Info Setup Domain</button>
      </div>
    </div>
    <div class="box">
      <div class="bt">🗑 AUTO-HAPUS</div>
      <div class="bd">
        <form method="post" action="/settings/retention">
          <div style="margin-bottom:6px">📦 Simpan maks:<br><select name="max" style="width:100%">${maxOptions}</select></div>
          <div style="margin-bottom:6px">⏳ Hapus setelah:<br><select name="days" style="width:100%">${dayOptions}</select></div>
          <button class="btn" type="submit" style="width:100%">Simpan aturan</button>
        </form>
      </div>
    </div>
    <div class="box">
      <div class="bt">🔑 PASSWORD WEBMAIL</div>
      <div class="bd">
        <form method="post" action="/settings/change-webmail-pw" onsubmit="return confirm('Ganti password? Login ulang ya.')">
          <input name="password" type="password" placeholder="password baru (min 6)" autocomplete="new-password" style="width:100%;margin-bottom:6px">
          <button class="btn" type="submit" style="width:100%">Ganti &amp; login ulang</button>
        </form>
      </div>
    </div>`;

  const imapModal = `
    <div id="imapinfo" class="modal" onclick="if(event.target===this)hideImap()">
      <div class="modalcard" style="max-width:520px">
        <div class="modaltop">ⓘ Setup Domain<span style="flex:1"></span><button class="btn" type="button" onclick="hideImap()">✕</button></div>
        <div style="padding:10px">
          <p class="muted" style="margin-top:0">Domain buyer di-manage lewat panel admin. Semua email lewat catch-all Cloudflare Email Routing.</p>
          <div class="irow"><span class="muted">Catchall</span><span class="ival">catchall@${esc(zone)}</span><button class="btn" type="button" onclick="cp(this)">salin</button></div>
          <div class="irow"><span class="muted">Panel Admin</span><span class="ival">https://panel.${esc(zone)}</span><button class="btn" type="button" onclick="cp(this)">salin</button></div>
          <p class="muted" style="font-size:11px;margin-top:10px;margin-bottom:0">Tambah / kelola domain buyer di <a href="https://panel.${esc(zone)}" target="_blank">panel admin</a>.</p>
        </div>
      </div>
    </div>`;

  return shell(`FAV·MAIL — ${zone}`, `
    <div class="topbar">
      <span class="brand">✉ FAV·MAIL</span>
      ${unread ? `<span class="badge">${unread} baru</span>` : ""}
      ${search}
      <span style="flex:1"></span>
      <a class="btn" href="/">↻</a>
      <a class="btn" href="/logout">Keluar</a>
    </div>
    <div id="desktop">
      <div class="win left">
        <div class="titlebar">📥 INBOX<span style="flex:1"></span><span style="font-weight:normal">${infoText}</span></div>
        <div class="win-body" style="display:flex;flex-direction:column">${body}</div>
      </div>
      <div class="win right">
        <div class="titlebar">⚙ PENGATURAN DOMAIN</div>
        <div class="win-body">${panelRight}</div>
      </div>
    </div>
    <div id="modal" class="modal" onclick="if(event.target===this)closeModal()"><div class="modalcard" id="modalcard"></div></div>
    ${imapModal}
    ${inboxScript}`);
}

function linkify(s: string): string {
  const escaped = esc(s);
  return escaped.replace(/(https?:\/\/[^\s"'<>]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function messageInner(m: any): string {
  const subject = m.subject || "(tanpa subjek)";
  const from = m.from_addr || "";
  const to = m.to_addr || "";
  const date = m.received_at ? fmtDate(m.received_at) : "";
  let bodyHtml: string;
  if (typeof m.html === "string" && m.html.trim()) {
    const safe = '<base target="_blank">' + m.html;
    bodyHtml = `<iframe sandbox="allow-popups allow-popups-to-escape-sandbox" srcdoc="${esc(safe)}"></iframe>`;
  } else {
    bodyHtml = `<pre class="body">${linkify(m.text || "(kosong)")}</pre>`;
  }
  return `
    <div class="msghead">
      <p class="subj">${esc(subject)}</p>
      <div class="muted">Dari: ${esc(from) || "-"}</div>
      <div class="muted">Ke: ${esc(to) || "-"}</div>
      <div class="muted">${esc(date)}</div>
    </div>
    ${bodyHtml}`;
}

function messageFragment(id: string, m: any): string {
  return `
    <div class="modaltop">
      <button class="btn" type="button" onclick="closeModal()">✕ Tutup</button>
      <span style="flex:1"></span>
      <form method="post" action="/m/${esc(id)}/delete" onsubmit="return confirm('Hapus email ini?')">
        <button class="btn danger" type="submit">🗑 Hapus</button>
      </form>
    </div>
    ${messageInner(m)}`;
}

function messagePage(id: string, m: any): string {
  return shell(`Email — ${m.subject || ""}`, `
    <div style="padding:8px;display:flex;gap:6px;align-items:center">
      <a class="btn" href="/">‹ Inbox</a>
      <span style="flex:1"></span>
      <form method="post" action="/m/${esc(id)}/delete" onsubmit="return confirm('Hapus email ini?')">
        <button class="btn danger" type="submit">🗑 Hapus</button>
      </form>
    </div>
    <div style="padding:0 8px 8px">${messageInner(m)}</div>`);
}
