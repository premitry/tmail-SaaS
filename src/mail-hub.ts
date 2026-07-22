// Mail Hub: halaman terpisah di root apex (mis. imapku.icu) buat baca email catch-all
// yang masuk ke domain apex — gaya FAV·MAIL. Semua data di D1 (nol VPS/IMAP).
import type { Env } from "./types";
import { DB } from "./db";
import { getSessionCtx, login, sessionCookie, clearCookie, isSecure } from "./auth";
import { esc, head } from "./ui";
import { TAILWIND_CSS } from "./tailwind-css";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

async function body(req: Request): Promise<any> { try { return await req.json(); } catch { return {}; } }

export async function handleMailHub(req: Request, url: URL, env: Env, db: DB): Promise<Response> {
  const path = url.pathname;
  const secure = isSecure(url);

  // Static: CSS
  if (path === "/assets/app.css") {
    return new Response(TAILWIND_CSS, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=86400" } });
  }
  if (path === "/favicon.svg" || path === "/favicon.ico") {
    return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📬</text></svg>`,
      { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
  }

  // Login (POST)
  if (path === "/login" && req.method === "POST") {
    const b = await body(req);
    const r = await login(db, String(b.email || ""), String(b.password || ""));
    if (!r.ok) return json({ ok: false, error: r.error || "login gagal" }, 401);
    const user = await db.getUserByEmailOrUsername(String(b.email));
    if (!user || user.role !== "owner") return json({ ok: false, error: "hanya owner yang boleh akses Mail Hub" }, 403);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json", "set-cookie": sessionCookie(r.sessionId!, secure) },
    });
  }
  if (path === "/logout") {
    return new Response("bye", { status: 302, headers: { "location": "/", "set-cookie": clearCookie(secure) } });
  }

  const s = await getSessionCtx(req, db);
  const authed = !!(s && s.user.role === "owner");

  // Render login page
  if (!authed) {
    if (path === "/") return html(renderLogin(env));
    return json({ error: "unauthorized" }, 401);
  }

  // API
  if (path === "/api/inbox" && req.method === "GET") {
    const q = url.searchParams.get("q") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = 30;
    const { rows, total } = await db.listHubMessages(q, limit, (page - 1) * limit);
    const nnew = await db.countHubNew();
    return json({ messages: rows, total, page, pages: Math.max(1, Math.ceil(total / limit)), unread: nnew });
  }
  if (path === "/api/msg" && req.method === "GET") {
    const id = url.searchParams.get("id") || "";
    const m = await db.getHubMessage(id);
    if (m) await db.markHubSeen(id).catch(() => {});
    return m ? json(m) : json({ error: "tidak ditemukan" }, 404);
  }
  if (path === "/api/delete" && req.method === "POST") {
    const b = await body(req);
    const ids = Array.isArray(b.ids) ? b.ids : (b.id ? [b.id] : []);
    for (const id of ids) await db.deleteHubMessage(String(id));
    return json({ ok: true, deleted: ids.length });
  }
  if (path === "/api/settings" && req.method === "GET") {
    return json({
      retention_days: parseInt(await db.platformGet("hub_retention_days", "7"), 10),
      brand: await db.platformGet("hub_brand", "Mail Hub"),
      apex: env.SAAS_ZONE || "",
      catchall: `catchall@${env.SAAS_ZONE || "imapku.icu"}`,
    });
  }
  if (path === "/api/settings" && req.method === "POST") {
    const b = await body(req);
    if (b.retention_days !== undefined) {
      const n = parseInt(String(b.retention_days), 10);
      if (isNaN(n) || n < 0 || n > 365) return json({ error: "retention_days 0-365" }, 400);
      await db.platformSet("hub_retention_days", String(n));
      if (n > 0) await db.gcHubMessages(n);
    }
    if (b.brand !== undefined) await db.platformSet("hub_brand", String(b.brand).slice(0, 40));
    return json({ ok: true });
  }

  // Halaman utama
  if (path === "/") return html(await renderHub(env, db));

  return new Response("Not found", { status: 404 });
}

function renderLogin(env: Env): string {
  const brand = env.BRAND_NAME || "Mail Hub";
  const zone = env.SAAS_ZONE || "imapku.icu";
  return `${head(`${brand} — Login`, "", "/favicon.svg", true)}
<body class="min-h-screen flex items-center justify-center" style="background:#1e3a8a;background-image:linear-gradient(135deg,#1e3a8a 0%,#312e81 100%)">
  <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm">
    <div class="text-center mb-6">
      <div class="inline-flex items-center gap-2 px-3 py-1 text-white font-bold text-sm rounded" style="background:#1e3a8a">
        <i class="fas fa-envelope"></i> MAIL HUB
      </div>
      <h1 class="mt-3 text-lg font-semibold text-gray-800">${esc(zone)}</h1>
      <p class="text-xs text-gray-500 mt-1">Catch-all inbox untuk domain apex.</p>
    </div>
    <form id="loginForm" class="space-y-3">
      <input id="email" type="text" placeholder="username / email owner" class="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" autocomplete="username"/>
      <input id="password" type="password" placeholder="password" class="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" autocomplete="current-password"/>
      <button type="submit" class="w-full py-2.5 rounded-lg text-white font-semibold" style="background:#1e3a8a">Masuk</button>
      <div id="err" class="text-sm text-red-600 text-center min-h-[1.25rem]"></div>
    </form>
  </div>
<script>
document.getElementById('loginForm').onsubmit=async(e)=>{e.preventDefault();
  const email=document.getElementById('email').value.trim();
  const password=document.getElementById('password').value;
  const errEl=document.getElementById('err'); errEl.textContent='';
  const r=await fetch('/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
  const j=await r.json().catch(()=>({}));
  if(j.ok){ location.href='/'; } else { errEl.textContent=j.error||'gagal login'; setTimeout(()=>errEl.textContent='',3500); }
};
</script>
</body></html>`;
}

async function renderHub(env: Env, db: DB): Promise<string> {
  const brand = await db.platformGet("hub_brand", "Mail Hub");
  const zone = env.SAAS_ZONE || "imapku.icu";
  const retention = parseInt(await db.platformGet("hub_retention_days", "7"), 10);
  return `${head(`${brand} — ${zone}`, "", "/favicon.svg", false)}
<body class="bg-gray-100 text-gray-800 min-h-screen">
  <header class="text-white flex items-center justify-between px-4 h-11 shadow" style="background:linear-gradient(90deg,#1e3a8a,#312e81)">
    <div class="flex items-center gap-3">
      <span class="inline-flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded text-sm font-bold"><i class="fas fa-envelope"></i> ${esc(brand).toUpperCase()}</span>
      <div class="relative"><i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-white/60 text-sm"></i>
        <input id="q" placeholder="Cari email…" class="pl-9 pr-3 py-1 rounded bg-white/95 text-gray-800 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-white/40"/></div>
    </div>
    <div class="flex items-center gap-2 text-sm">
      <button onclick="loadInbox()" class="w-8 h-8 rounded hover:bg-white/10" title="Refresh"><i class="fas fa-sync-alt"></i></button>
      <a href="/logout" class="px-3 py-1 border border-white/40 rounded hover:bg-white/10">Keluar</a>
    </div>
  </header>

  <main class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-4 max-w-[1400px] mx-auto">
    <section class="bg-white rounded border border-gray-300 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2 text-white text-sm font-bold" style="background:#1e3a8a"><span><i class="fas fa-inbox"></i> INBOX</span><span id="counter">0 email</span></div>
      <div class="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
        <label class="inline-flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white cursor-pointer"><input type="checkbox" id="pickAll" onchange="pickAll(this.checked)"/>Pilih semua</label>
        <button onclick="bulkDelete()" class="text-xs border border-red-300 text-red-700 bg-red-50 rounded px-2 py-1"><i class="fas fa-trash mr-1"></i>Hapus dipilih</button>
        <span id="pageInfo" class="ml-auto text-xs text-gray-500"></span>
        <div class="flex gap-1"><button id="prev" onclick="go(-1)" class="w-7 h-7 border border-gray-300 rounded disabled:opacity-30"><i class="fas fa-chevron-left"></i></button><button id="next" onclick="go(1)" class="w-7 h-7 border border-gray-300 rounded disabled:opacity-30"><i class="fas fa-chevron-right"></i></button></div>
      </div>
      <div id="list" class="divide-y divide-gray-100"></div>
    </section>

    <aside class="space-y-4">
      <div class="bg-white border border-gray-300 rounded overflow-hidden">
        <div class="text-white text-sm font-bold px-4 py-2" style="background:#1e3a8a"><i class="fas fa-cog"></i> PENGATURAN</div>
        <div class="p-4 space-y-4 text-sm">
          <div>
            <label class="text-xs uppercase text-gray-500 font-semibold">Semua email masuk ke</label>
            <div class="mt-1 font-mono text-[13px] bg-gray-50 border border-gray-200 rounded px-2 py-1.5 select-all">catchall@${esc(zone)}</div>
            <p class="text-xs text-gray-500 mt-1">Set Email Routing catch-all zona <b>${esc(zone)}</b> ke Worker <b>tmail-saas</b>.</p>
          </div>
          <div>
            <label class="text-xs uppercase text-gray-500 font-semibold">Hapus otomatis setelah</label>
            <select id="retention" onchange="saveRetention(this.value)" class="mt-1 w-full py-1.5 px-2 border border-gray-300 rounded bg-white">
              <option value="0"${retention===0?' selected':''}>Simpan selamanya</option>
              <option value="1"${retention===1?' selected':''}>1 hari</option>
              <option value="3"${retention===3?' selected':''}>3 hari</option>
              <option value="7"${retention===7?' selected':''}>7 hari</option>
              <option value="14"${retention===14?' selected':''}>14 hari</option>
              <option value="30"${retention===30?' selected':''}>30 hari</option>
              <option value="90"${retention===90?' selected':''}>90 hari</option>
            </select>
            <p id="retMsg" class="text-xs text-green-600 mt-1 hidden">Tersimpan.</p>
          </div>
          <div>
            <label class="text-xs uppercase text-gray-500 font-semibold">Nama Brand</label>
            <div class="flex gap-2 mt-1"><input id="brand" value="${esc(brand)}" class="flex-1 py-1.5 px-2 border border-gray-300 rounded"/><button onclick="saveBrand()" class="px-3 rounded text-white text-sm" style="background:#1e3a8a">Simpan</button></div>
          </div>
        </div>
      </div>
    </aside>
  </main>

  <!-- modal detail email -->
  <div id="modal" class="fixed inset-0 bg-black/60 z-50 hidden items-center justify-center p-4" onclick="if(event.target===this)closeModal()">
    <div class="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
      <button onclick="closeModal()" class="absolute top-3 right-4 text-2xl text-gray-500 hover:text-gray-800">&times;</button>
      <div id="modalBody" class="p-5"></div>
    </div>
  </div>

<script>
var state={page:1,q:'',rows:[],sel:new Set()};
function esc(s){return String(s??'').replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function fmt(ms){var d=new Date(ms),n=new Date();function p(x){return('0'+x).slice(-2);}var t=p(d.getHours())+'.'+p(d.getMinutes());var b=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];return d.toDateString()===n.toDateString()?t:(d.getDate()+' '+b[d.getMonth()]+', '+t);}
function fmtSender(f){var m=String(f||'').match(/^\\s*"?([^"<]+?)"?\\s*<([^>]+)>\\s*$/);if(m)return '"'+esc(m[1].trim())+'" &lt;'+esc(m[2].trim())+'&gt;';return esc(f||'');}
async function loadInbox(){
  var r=await fetch('/api/inbox?page='+state.page+'&q='+encodeURIComponent(state.q));
  var d=await r.json();state.rows=d.messages||[];
  document.getElementById('counter').innerHTML=(d.total||0)+' email'+(d.unread?' <span class="opacity-80">· '+d.unread+' baru</span>':'');
  var list=document.getElementById('list');
  list.innerHTML=state.rows.length?state.rows.map(function(m){return '<div class="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 '+(m.seen?'':'bg-indigo-50/40')+'">'+
    '<input type="checkbox" data-id="'+m.id+'" onchange="pick(this)" class="mt-1"/>'+
    '<div class="flex-1 min-w-0 cursor-pointer" onclick="openMsg(\\''+m.id+'\\')">'+
      '<div class="flex justify-between gap-3 text-sm text-gray-700"><div class="truncate '+(m.seen?'':'font-semibold')+'">'+fmtSender(m.from_addr)+'</div><div class="text-xs text-gray-400 whitespace-nowrap">'+fmt(m.received_at)+'</div></div>'+
      '<div class="text-[15px] truncate '+(m.seen?'':'font-bold')+'">'+esc(m.subject||'(tanpa subjek)')+'</div>'+
      '<div class="text-xs text-gray-500 truncate">ke: '+esc(m.to_addr)+'</div>'+
    '</div></div>';}).join(''):'<div class="p-12 text-center text-gray-400">Belum ada email masuk.</div>';
  var p=d.page||1,pp=d.pages||1;
  document.getElementById('pageInfo').textContent=p+'/'+pp;
  document.getElementById('prev').disabled=p<=1;document.getElementById('next').disabled=p>=pp;
  document.getElementById('pickAll').checked=false;state.sel.clear();
}
function pick(cb){if(cb.checked)state.sel.add(cb.dataset.id);else state.sel.delete(cb.dataset.id);}
function pickAll(on){document.querySelectorAll('#list input[type=checkbox][data-id]').forEach(function(cb){cb.checked=on;if(on)state.sel.add(cb.dataset.id);else state.sel.delete(cb.dataset.id);});}
async function bulkDelete(){var ids=[...state.sel];if(!ids.length){alert('Pilih email dulu.');return;}if(!confirm('Hapus '+ids.length+' email?'))return;await fetch('/api/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ids:ids})});state.sel.clear();loadInbox();}
async function openMsg(id){
  var r=await fetch('/api/msg?id='+id);var m=await r.json();if(m.error){alert(m.error);return;}
  var body=m.html?m.html:'<pre style="white-space:pre-wrap;font-family:sans-serif;padding:12px">'+esc(m.text||'')+'</pre>';
  document.getElementById('modalBody').innerHTML='<h2 class="text-lg font-bold pr-8 mb-3">'+esc(m.subject||'(tanpa subjek)')+'</h2>'+
    '<div class="text-xs text-gray-600 mb-3 pb-3 border-b border-gray-100"><div><b>Dari:</b> '+esc(m.from_addr)+'</div><div><b>Ke:</b> '+esc(m.to_addr)+'</div><div><b>Tanggal:</b> '+esc(new Date(m.received_at).toLocaleString())+'</div></div>'+
    '<iframe sandbox="allow-same-origin" srcdoc="'+esc(body)+'" class="w-full h-[60vh] bg-white border border-gray-200 rounded"></iframe>'+
    '<div class="flex justify-end mt-3 gap-2"><button onclick="delOne(\\''+id+'\\')" class="text-sm bg-red-600 text-white px-4 py-2 rounded"><i class="fas fa-trash mr-1"></i>Hapus</button></div>';
  document.getElementById('modal').classList.remove('hidden');document.getElementById('modal').classList.add('flex');
}
function closeModal(){var m=document.getElementById('modal');m.classList.add('hidden');m.classList.remove('flex');}
async function delOne(id){await fetch('/api/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:id})});closeModal();loadInbox();}
function go(d){state.page=Math.max(1,state.page+d);loadInbox();}
async function saveRetention(v){await fetch('/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({retention_days:parseInt(v,10)})});var el=document.getElementById('retMsg');el.classList.remove('hidden');setTimeout(function(){el.classList.add('hidden');},1500);}
async function saveBrand(){await fetch('/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({brand:document.getElementById('brand').value})});location.reload();}
var qT;document.getElementById('q').oninput=function(e){clearTimeout(qT);qT=setTimeout(function(){state.q=e.target.value;state.page=1;loadInbox();},300);};
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
loadInbox();setInterval(loadInbox,15000);
</script>
</body></html>`;
}
