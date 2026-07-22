// Mail Hub: halaman di root apex (mis. imapku.icu) buat baca email catch-all
// yang masuk ke domain apex. Layout meniru FAV·MAIL. Semua data di D1 (nol VPS/IMAP).
import type { Env } from "./types";
import { DB } from "./db";
import { getSessionCtx, login, sessionCookie, clearCookie, isSecure } from "./auth";
import { esc, head } from "./ui";
import { verifyPassword } from "./crypto";
import { TAILWIND_CSS } from "./tailwind-css";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

async function body(req: Request): Promise<any> { try { return await req.json(); } catch { return {}; } }

export async function handleMailHub(req: Request, url: URL, env: Env, db: DB): Promise<Response> {
  const path = url.pathname;
  const secure = isSecure(url);

  if (path === "/assets/app.css") {
    return new Response(TAILWIND_CSS, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=86400" } });
  }
  if (path === "/favicon.svg" || path === "/favicon.ico") {
    return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📬</text></svg>`,
      { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
  }

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

  if (!authed) {
    if (path === "/") return html(renderLogin(env));
    return json({ error: "unauthorized" }, 401);
  }

  if (path === "/api/inbox" && req.method === "GET") {
    const q = url.searchParams.get("q") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = 20;
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
  if (path === "/api/domains" && req.method === "GET") {
    // Domain apex + semua domain buyer aktif (info).
    const apex = env.SAAS_ZONE || "imapku.icu";
    const list: { name: string; source: string }[] = [{ name: apex, source: "apex" }];
    const r = await (db as any).d1.prepare(`SELECT d.domain, u.name FROM domains d JOIN users u ON u.id=d.buyer_id WHERE d.is_active=1 ORDER BY d.created_at DESC`).all();
    for (const row of r.results || []) list.push({ name: (row as any).domain, source: (row as any).name || "buyer" });
    return json({ domains: list });
  }
  if (path === "/api/settings" && req.method === "GET") {
    return json({
      retention_days: parseInt(await db.platformGet("hub_retention_days", "7"), 10),
      max_stored: parseInt(await db.platformGet("hub_max_stored", "500"), 10),
      brand: await db.platformGet("hub_brand", "MAIL HUB"),
      apex: env.SAAS_ZONE || "",
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
    if (b.max_stored !== undefined) {
      const n = parseInt(String(b.max_stored), 10);
      if (isNaN(n) || n < 0 || n > 100000) return json({ error: "max_stored 0-100000" }, 400);
      await db.platformSet("hub_max_stored", String(n));
      if (n > 0) await db.trimHubMessages(n);
    }
    if (b.brand !== undefined) await db.platformSet("hub_brand", String(b.brand).slice(0, 40));
    return json({ ok: true });
  }
  if (path === "/api/password" && req.method === "POST") {
    const b = await body(req);
    const oldPw = String(b.old_password || "");
    const newPw = String(b.new_password || "");
    if (newPw.length < 6) return json({ ok: false, error: "password baru minimal 6 karakter" }, 400);
    const owner = s!.user;
    if (!(await verifyPassword(oldPw, owner.pass_hash))) return json({ ok: false, error: "password lama salah" }, 401);
    await db.setPassword(owner.id, newPw);
    return json({ ok: true });
  }

  if (path === "/") return html(await renderHub(env, db));

  return new Response("Not found", { status: 404 });
}

function renderLogin(env: Env): string {
  const brand = env.BRAND_NAME || "Mail Hub";
  const zone = env.SAAS_ZONE || "imapku.icu";
  return `${head(`${brand} — Login`, "", "/favicon.svg", false)}
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
  const brand = await db.platformGet("hub_brand", "MAIL HUB");
  const zone = env.SAAS_ZONE || "imapku.icu";
  const retention = parseInt(await db.platformGet("hub_retention_days", "7"), 10);
  const maxStored = parseInt(await db.platformGet("hub_max_stored", "500"), 10);
  const style = `
    body{background:#e5e7eb}
    .hb-hdr{background:linear-gradient(180deg,#1e2f5a,#0f1e3f);color:#fff;border-bottom:1px solid #0a1530}
    .hb-hdr .brand{background:#1e3a8a;color:#fff;padding:6px 10px;font-weight:800;letter-spacing:.05em;font-size:13px;border:1px solid #0a1530}
    .hb-hdr input{background:#fff;color:#1f2937}
    .hb-btn{background:#fff;border:1px solid #94a3b8;color:#1f2937;padding:5px 10px;border-radius:2px;font-size:13px}
    .hb-btn:hover{background:#f1f5f9}
    .hb-card{background:#fff;border:1px solid #94a3b8}
    .hb-card-hdr{background:linear-gradient(180deg,#2b4380,#1e3a8a);color:#fff;font-weight:700;padding:6px 12px;font-size:13px;letter-spacing:.03em;display:flex;align-items:center;justify-content:space-between}
    .hb-side-hdr{background:linear-gradient(180deg,#3f5a9c,#2b4380);color:#fff;font-weight:700;padding:6px 10px;font-size:12px}
    .hb-row{padding:12px 16px;border-bottom:1px solid #e5e7eb;background:#fff}
    .hb-row:hover{background:#f8fafc}
    .hb-row.unread{background:#fff}
    .hb-btn-danger{background:#fee2e2;border:1px solid #ef9a9a;color:#991b1b;padding:4px 10px;border-radius:2px;font-size:12px;font-weight:600}
    .hb-btn-primary{background:#1e3a8a;color:#fff;padding:6px 12px;border-radius:2px;font-size:12px;border:0;cursor:pointer;font-weight:600}
    .hb-input{width:100%;border:1px solid #94a3b8;padding:4px 8px;font-size:13px;background:#fff}
    .hb-select{width:100%;border:1px solid #94a3b8;padding:4px 8px;font-size:13px;background:#fff}
    .hb-dtag{display:inline-block;background:#dcfce7;color:#166534;font-size:10px;font-weight:700;padding:1px 5px;margin-left:6px;border-radius:2px}
  `;
  return `${head(`${brand} — ${zone}`, `<style>${style}</style>`, "/favicon.svg", false)}
<body class="min-h-screen text-gray-800">
  <header class="hb-hdr flex items-center gap-3 px-3 h-11">
    <div class="brand"><i class="far fa-envelope mr-1"></i> ${esc(brand).toUpperCase()}</div>
    <div class="relative flex-1 max-w-2xl"><i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
      <input id="q" placeholder="Cari email..." class="w-full pl-9 pr-3 py-1.5 rounded text-sm focus:outline-none"/></div>
    <div class="flex items-center gap-2 ml-auto">
      <button onclick="loadInbox()" class="hb-btn" title="Refresh"><i class="fas fa-sync-alt"></i></button>
      <a href="/logout" class="hb-btn"><u>K</u>eluar</a>
    </div>
  </header>

  <main class="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3 p-3 max-w-[1400px] mx-auto">
    <section class="hb-card">
      <div class="hb-card-hdr"><span><i class="fas fa-inbox mr-1"></i>INBOX</span><span id="counter" class="font-normal opacity-90">0 email</span></div>
      <div class="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-300 bg-gray-100 text-sm">
        <label class="inline-flex items-center gap-1.5 border border-gray-400 bg-white px-2 py-1 rounded-sm cursor-pointer"><input type="checkbox" id="pickAll" onchange="pickAll(this.checked)"/>Pilih semua</label>
        <button onclick="bulkDelete()" class="hb-btn-danger"><i class="fas fa-trash mr-1"></i>Hapus dipilih</button>
        <span id="pageInfo" class="ml-auto text-xs text-gray-600 font-mono"></span>
        <div class="flex gap-1"><button id="prev" onclick="go(-1)" class="hb-btn w-7 h-7 disabled:opacity-30 flex items-center justify-center"><i class="fas fa-chevron-left text-xs"></i></button><button id="next" onclick="go(1)" class="hb-btn w-7 h-7 disabled:opacity-30 flex items-center justify-center"><i class="fas fa-chevron-right text-xs"></i></button></div>
      </div>
      <div id="list" style="min-height:400px"></div>
    </section>

    <aside class="space-y-3">
      <div class="hb-card">
        <div class="hb-card-hdr"><span><i class="fas fa-cog mr-1"></i>PENGATURAN DOMAIN</span></div>
        <div class="hb-side-hdr">📁 DOMAIN</div>
        <div class="p-3 text-sm space-y-2">
          <div class="text-xs text-gray-600">Semua email → catchall <b class="font-mono">${esc(zone)}</b></div>
          <div id="domList" class="space-y-1"></div>
        </div>
        <div class="hb-side-hdr">🗑 AUTO-HAPUS</div>
        <div class="p-3 text-sm space-y-3">
          <div>
            <label class="text-xs text-gray-600">📄 Simpan maks:</label>
            <select id="maxStored" class="hb-select mt-1">
              ${[100,300,500,1000,3000,0].map(v=>`<option value="${v}"${v===maxStored?' selected':''}>${v===0?'Tak terbatas':(v+' terbaru')}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-600">⏳ Hapus setelah:</label>
            <select id="retention" class="hb-select mt-1">
              ${[[0,'Selamanya'],[1,'1 hari'],[3,'3 hari'],[7,'7 hari'],[14,'14 hari'],[30,'30 hari'],[90,'90 hari']].map(([v,t])=>`<option value="${v}"${v===retention?' selected':''}>${t}</option>`).join("")}
            </select>
          </div>
          <button onclick="saveRules()" class="hb-btn-primary w-full py-1.5">Simpan aturan</button>
          <p id="ruleMsg" class="text-xs text-green-600 hidden">✓ Tersimpan</p>
        </div>
        <div class="hb-side-hdr">🔑 PASSWORD OWNER</div>
        <div class="p-3 text-sm space-y-2">
          <input id="oldPw" type="password" placeholder="password lama" class="hb-input"/>
          <input id="newPw" type="password" placeholder="password baru (min 6)" class="hb-input"/>
          <button onclick="changePw()" class="hb-btn-primary w-full py-1.5">Ganti password</button>
          <p id="pwMsg" class="text-xs hidden"></p>
        </div>
      </div>
    </aside>
  </main>

  <div id="modal" class="fixed inset-0 bg-black/60 z-50 hidden items-center justify-center p-4" onclick="if(event.target===this)closeModal()">
    <div class="bg-white rounded max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
      <button onclick="closeModal()" class="absolute top-2 right-3 text-2xl text-gray-500 hover:text-gray-800">&times;</button>
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
  document.getElementById('counter').innerHTML=(d.total||0)+' email'+(d.unread?' · '+d.unread+' baru':'');
  var list=document.getElementById('list');
  list.innerHTML=state.rows.length?state.rows.map(function(m){return '<div class="hb-row flex items-start gap-3">'+
    '<input type="checkbox" data-id="'+m.id+'" onchange="pick(this)" class="mt-1"/>'+
    '<div class="flex-1 min-w-0 cursor-pointer" onclick="openMsg(\\''+m.id+'\\')">'+
      '<div class="flex justify-between gap-3 text-sm text-gray-700"><div class="truncate '+(m.seen?'':'font-semibold')+'">'+fmtSender(m.from_addr)+'</div><div class="text-xs text-gray-500 whitespace-nowrap font-mono">'+fmt(m.received_at)+'</div></div>'+
      '<div class="text-[14px] truncate '+(m.seen?'':'font-bold')+' text-gray-800">'+esc(m.subject||'(tanpa subjek)')+'</div>'+
      '<div class="text-xs text-gray-500 truncate">ke: '+esc(m.to_addr)+'</div>'+
    '</div></div>';}).join(''):'<div class="p-12 text-center text-gray-400">Belum ada email masuk. Kirim ke <b>*@'+'${esc(zone)}'+'</b>.</div>';
  var p=d.page||1,pp=d.pages||1;
  document.getElementById('pageInfo').textContent=p+'/'+pp;
  document.getElementById('prev').disabled=p<=1;document.getElementById('next').disabled=p>=pp;
  document.getElementById('pickAll').checked=false;state.sel.clear();
}
async function loadDomains(){
  var r=await fetch('/api/domains');var d=await r.json();
  document.getElementById('domList').innerHTML=(d.domains||[]).map(function(x){return '<div class="border border-gray-300 bg-white px-2 py-1 flex justify-between items-center text-xs"><span class="font-mono">'+esc(x.name)+'</span><span class="hb-dtag">'+(x.source==='apex'?'APEX':'BUYER')+'</span></div>';}).join('');
}
function pick(cb){if(cb.checked)state.sel.add(cb.dataset.id);else state.sel.delete(cb.dataset.id);}
function pickAll(on){document.querySelectorAll('#list input[type=checkbox][data-id]').forEach(function(cb){cb.checked=on;if(on)state.sel.add(cb.dataset.id);else state.sel.delete(cb.dataset.id);});}
async function bulkDelete(){var ids=[...state.sel];if(!ids.length){alert('Pilih email dulu.');return;}if(!confirm('Hapus '+ids.length+' email?'))return;await fetch('/api/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ids:ids})});state.sel.clear();loadInbox();}
async function openMsg(id){
  var r=await fetch('/api/msg?id='+id);var m=await r.json();if(m.error){alert(m.error);return;}
  var body=m.html?m.html:'<pre style="white-space:pre-wrap;font-family:sans-serif;padding:12px;margin:0">'+esc(m.text||'')+'</pre>';
  document.getElementById('modalBody').innerHTML='<h2 class="text-lg font-bold pr-8 mb-3">'+esc(m.subject||'(tanpa subjek)')+'</h2>'+
    '<div class="text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200"><div><b>Dari:</b> '+esc(m.from_addr)+'</div><div><b>Ke:</b> '+esc(m.to_addr)+'</div><div><b>Tanggal:</b> '+esc(new Date(m.received_at).toLocaleString())+'</div></div>'+
    '<iframe sandbox="allow-same-origin" srcdoc="'+esc(body)+'" class="w-full h-[60vh] bg-white border border-gray-200 rounded"></iframe>'+
    '<div class="flex justify-end mt-3 gap-2"><button onclick="delOne(\\''+id+'\\')" class="hb-btn-danger"><i class="fas fa-trash mr-1"></i>Hapus</button></div>';
  document.getElementById('modal').classList.remove('hidden');document.getElementById('modal').classList.add('flex');
}
function closeModal(){var m=document.getElementById('modal');m.classList.add('hidden');m.classList.remove('flex');}
async function delOne(id){await fetch('/api/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:id})});closeModal();loadInbox();}
function go(d){state.page=Math.max(1,state.page+d);loadInbox();}
async function saveRules(){var r=parseInt(document.getElementById('retention').value,10);var m=parseInt(document.getElementById('maxStored').value,10);await fetch('/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({retention_days:r,max_stored:m})});var el=document.getElementById('ruleMsg');el.classList.remove('hidden');setTimeout(function(){el.classList.add('hidden');},1500);loadInbox();}
async function changePw(){var op=document.getElementById('oldPw').value;var np=document.getElementById('newPw').value;var msg=document.getElementById('pwMsg');msg.classList.remove('hidden');var r=await fetch('/api/password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({old_password:op,new_password:np})});var j=await r.json().catch(function(){return{};});if(j.ok){msg.textContent='✓ Password diganti';msg.className='text-xs text-green-600';document.getElementById('oldPw').value='';document.getElementById('newPw').value='';}else{msg.textContent='✗ '+(j.error||'gagal');msg.className='text-xs text-red-600';}setTimeout(function(){msg.classList.add('hidden');},3000);}
var qT;document.getElementById('q').oninput=function(e){clearTimeout(qT);qT=setTimeout(function(){state.q=e.target.value;state.page=1;loadInbox();},300);};
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
loadInbox();loadDomains();setInterval(loadInbox,15000);
</script>
</body></html>`;
}
