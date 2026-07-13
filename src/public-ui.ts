// Halaman web publik temp-mail (niru TMail). Tema mengubah LAYOUT, bukan cuma warna:
//  - default : sidebar kiri (vertikal)
//  - mantis  : bar atas horizontal, terang
//  - nebula  : bar atas horizontal, gelap ungu
import { esc, head } from "./ui";
import { DEFAULT_LOGO } from "./assets";

export interface PublicOpts {
  brand: string;
  emoji: string;
  logoUrl: string;
  faviconUrl: string;
  colors: { primary: string; secondary: string; tertiary: string };
  theme: string;
  domains: string[];
  socials: Array<{ icon: string; link: string }>;
  darkMode: boolean;
  lang: string;
}

function conf(theme: string, c: PublicOpts["colors"]) {
  if (theme === "mantis") {
    return { layout: "topbar", page: "bg-gray-100 dark:bg-gray-950", barStyle: `background-color:${c.primary};background-image:url(/assets/mantis-pattern.png)`, headerClass: "bg-white dark:bg-gray-900" };
  }
  if (theme === "nebula") {
    return { layout: "topbar", page: "bg-slate-950 text-gray-200", barStyle: `background:linear-gradient(135deg, ${c.primary}, #0f172a)`, headerClass: "bg-slate-900" };
  }
  return { layout: "sidebar", page: "bg-gray-100 dark:bg-gray-950", barStyle: `background-color:${c.primary}`, headerClass: "" };
}

export function renderPublicPage(o: PublicOpts): string {
  const t = conf(o.theme, o.colors);
  const logo = o.logoUrl || DEFAULT_LOGO;
  const favicon = o.faviconUrl || DEFAULT_LOGO;
  const socials = o.socials.map((s) =>
    `<a href="${esc(s.link)}" target="_blank" rel="noopener" class="ml-2 text-lg opacity-80 hover:opacity-100"><i class="${esc(s.icon)}"></i></a>`).join("");
  const domainOptions = o.domains.map((d) => `<option value="${esc(d)}" class="text-black">${esc(d)}</option>`).join("");
  const config = JSON.stringify({ domains: o.domains, brand: o.brand, layout: t.layout });

  const darkBtn = `<button onclick="toggleDark()" class="text-lg" title="Tema"><i class="fas fa-moon dark:hidden"></i><i class="fas fa-sun hidden dark:inline text-yellow-400"></i></button>`;
  const statusEl = `<span id="statusDot" class="text-xs text-gray-400"><i class="fas fa-circle text-[8px]"></i> <span id="statusText">idle</span></span>`;

  const inboxArea = `
    <div id="inboxList" class="w-full lg:w-1/3 border-r border-gray-200 dark:border-gray-800 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 min-h-[300px]">
      <div class="h-40 flex items-center justify-center text-gray-400 text-lg">Buat alamat dulu</div>
    </div>
    <div id="msgView" class="w-full lg:w-2/3 flex flex-col min-h-[300px]">
      <div class="flex-1 flex items-center justify-center text-gray-300 dark:text-gray-600">
        <div class="text-center"><div class="text-6xl mb-3"><i class="far fa-envelope-open"></i></div><div>Pilih email untuk dibaca</div></div>
      </div>
    </div>`;

  let bodyHtml: string;

  if (t.layout === "sidebar") {
    /* ===== LAYOUT SIDEBAR (default) ===== */
    bodyHtml = `
<div class="min-h-screen flex flex-col lg:flex-row">
  <aside class="w-full lg:w-1/4 text-white py-6 px-6 flex flex-col" style="${t.barStyle}">
    <div class="flex items-center justify-center mb-8"><img src="${esc(logo)}" alt="${esc(o.brand)}" class="max-h-12 max-w-[75%] object-contain" /></div>
    <div id="createPanel" class="lg:max-w-xs lg:mx-auto w-full space-y-4">
      <input id="username" type="text" placeholder="Masukkan username (opsional)" class="w-full rounded-md py-3 px-4 bg-white/10 dark:bg-black/20 placeholder-white/50 text-white focus:outline-none" />
      <div class="relative">
        <select id="domain" class="w-full rounded-md py-3 px-4 bg-white/10 dark:bg-black/20 text-white appearance-none focus:outline-none cursor-pointer">${domainOptions}</select>
        <i class="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/70"></i>
      </div>
      <button id="btnCreate" class="w-full rounded-md py-3 px-4 text-white font-semibold" style="background-color:${o.colors.secondary}">Create</button>
      <button id="btnRandom" class="w-full rounded-md py-3 px-4 text-white font-semibold" style="background-color:${o.colors.tertiary}">Random</button>
    </div>
    <div id="activePanel" class="lg:max-w-xs lg:mx-auto w-full space-y-4 hidden">
      <div class="rounded-md py-3 px-4 bg-white/10 dark:bg-black/20 text-white font-mono text-sm break-all" id="addrBox">-</div>
      <div class="grid grid-cols-4 lg:grid-cols-2 gap-2 lg:gap-4">${actBtns()}</div>
    </div>
    <div class="mt-auto pt-8 flex justify-center">${socials}</div>
  </aside>
  <div class="flex-1 flex flex-col min-w-0">
    <nav class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 h-16 flex items-center justify-end gap-4">${statusEl}${darkBtn}</nav>
    <main class="flex-1 lg:flex bg-white dark:bg-gray-900">${inboxArea}</main>
    <footer class="bg-gray-800 text-white text-sm px-6 py-4 text-center">&copy; ${new Date().getFullYear()} ${esc(o.brand)}. All rights reserved.</footer>
  </div>
</div>`;
  } else {
    /* ===== LAYOUT TOPBAR (mantis / nebula) ===== */
    const inputCls = "rounded-md py-3 px-4 border-0 focus:outline-none bg-white text-gray-800 dark:bg-gray-800 dark:text-white";
    bodyHtml = `
<div class="min-h-screen flex flex-col">
  <header class="${t.headerClass} px-6 h-16 flex items-center justify-between border-b border-black/10 dark:border-white/10">
    <img src="${esc(logo)}" alt="${esc(o.brand)}" class="max-h-9 object-contain" />
    <div class="flex items-center gap-4">${statusEl}${socials}${darkBtn}</div>
  </header>
  <div class="text-white" style="${t.barStyle}">
    <div class="container mx-auto px-6 py-6">
      <h2 class="text-center text-white/90 font-semibold mb-4">Alamat email sementara kamu siap</h2>
      <div id="createPanel" class="flex flex-col md:flex-row gap-3">
        <input id="username" type="text" placeholder="username (opsional)" class="flex-1 ${inputCls}" />
        <select id="domain" class="${inputCls} cursor-pointer">${domainOptions}</select>
        <button id="btnCreate" class="rounded-md py-3 px-6 text-white font-semibold" style="background-color:${o.colors.secondary}"><i class="fas fa-chevron-right mr-1"></i> Create</button>
        <button id="btnRandom" class="rounded-md py-3 px-6 text-white font-semibold" style="background-color:${o.colors.tertiary}"><i class="fas fa-random mr-1"></i> Random</button>
      </div>
      <div id="activePanel" class="hidden flex-col md:flex-row gap-3 items-stretch">
        <div id="addrBox" class="flex-1 rounded-md py-3 px-4 bg-white/90 dark:bg-gray-800 text-gray-800 dark:text-white font-mono text-sm break-all flex items-center">-</div>
        <div class="grid grid-cols-4 gap-2">${actBtns(true)}</div>
      </div>
    </div>
  </div>
  <main class="container mx-auto flex-1 p-5 w-full">
    <div class="lg:flex bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">${inboxArea}</div>
  </main>
  <footer class="bg-gray-800 text-white text-sm px-6 py-4 text-center">&copy; ${new Date().getFullYear()} ${esc(o.brand)}. All rights reserved.</footer>
</div>`;
  }

  return `${head(o.brand, "", favicon)}
<body class="${t.page}">
${bodyHtml}
<script>
const CFG = ${config};
const HOST = location.host;
const AKEY = 'tmail_addr_' + HOST;
let addr = localStorage.getItem(AKEY) || '';
let ws = null, currentId = null;
const TENANT = new URLSearchParams(location.search).get('__tenant');
const TQS = TENANT ? '__tenant=' + encodeURIComponent(TENANT) : '';
function apiUrl(path){ if(!TQS) return '/api' + path; return '/api' + path + (path.includes('?') ? '&' : '?') + TQS; }
const $ = (s) => document.querySelector(s);
function status(txt, color){ $('#statusText').textContent = txt; $('#statusDot').className = 'text-xs ' + (color||'text-gray-400'); }
async function api(path, opts){ const r = await fetch(apiUrl(path), opts); return r.json(); }
const LD = CFG.layout === 'topbar' ? 'flex' : 'block';
function showActive(){ $('#createPanel').style.display='none'; $('#activePanel').style.display=LD; $('#addrBox').textContent = addr; }
function showCreate(){ $('#activePanel').style.display='none'; $('#createPanel').style.display=LD; }
async function createAddr(local){
  const domain = $('#domain').value;
  const q = new URLSearchParams({ domain }); if(local) q.set('local', local);
  const res = await api('/new?' + q.toString());
  if(res.error){ alert(res.error); return; }
  addr = res.address; localStorage.setItem(AKEY, addr);
  showActive(); loadInbox(); connectWS();
}
function timeAgo(ms){ const s=Math.floor((Date.now()-ms)/1000); if(s<60)return s+'d lalu'; if(s<3600)return Math.floor(s/60)+'m lalu'; if(s<86400)return Math.floor(s/3600)+'j lalu'; return Math.floor(s/86400)+'h lalu'; }
async function loadInbox(){
  if(!addr) return; status('memuat…');
  const res = await api('/inbox?a=' + encodeURIComponent(addr));
  const list = $('#inboxList'); const msgs = res.messages || [];
  status(msgs.length + ' email', 'text-green-500');
  if(!msgs.length){ list.innerHTML = '<div class="h-40 flex items-center justify-center text-gray-400 text-lg">Inbox kosong</div>'; return; }
  list.innerHTML = msgs.map(m => '<div class="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 '+(m.read?'':'font-semibold')+'" onclick="openMsg(\''+m.id+'\')">'+
    '<div class="flex justify-between gap-2"><div class="text-sm text-gray-800 dark:text-gray-200 truncate">'+escapeHtml(m.sender)+'</div><div class="text-xs text-gray-400 whitespace-nowrap">'+timeAgo(m.received_at)+'</div></div>'+
    '<div class="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">'+escapeHtml(m.subject)+'</div>'+
    '<div class="text-xs text-gray-400 mt-1 truncate">'+escapeHtml(m.preview||'')+'</div></div>').join('');
}
async function openMsg(id){
  currentId = id;
  const res = await api('/message?a=' + encodeURIComponent(addr) + '&id=' + id);
  if(res.error){ alert(res.error); return; }
  const body = res.html ? res.html : '<pre style="white-space:pre-wrap;font-family:sans-serif;padding:12px">'+escapeHtml(res.text||'')+'</pre>';
  $('#msgView').innerHTML = '<div class="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start gap-3"><div class="min-w-0"><div class="text-lg text-gray-900 dark:text-gray-100 truncate">'+escapeHtml(res.subject)+'</div><div class="text-xs text-gray-400 truncate">'+escapeHtml(res.sender)+'</div></div><button onclick="delMsg(\''+id+'\')" class="text-xs bg-red-600 text-white px-3 py-1 rounded-md whitespace-nowrap">Hapus</button></div>'+
    '<iframe class="flex-1 w-full bg-white min-h-[300px]" sandbox="allow-same-origin" srcdoc="'+escapeAttr(body)+'"></iframe>';
  loadInbox();
}
async function delMsg(id){ await api('/delete?a=' + encodeURIComponent(addr) + '&id=' + id, { method:'POST' }); $('#msgView').innerHTML=''; loadInbox(); }
function connectWS(){
  if(ws){ try{ws.close();}catch(e){} }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(proto + '://' + location.host + '/api/ws?a=' + encodeURIComponent(addr) + (TQS ? '&' + TQS : ''));
  ws.onmessage = (e) => { try{ const d = JSON.parse(e.data); if(d.type==='new'||d.type==='update') loadInbox(); }catch(_){} };
  ws.onclose = () => { setTimeout(()=>{ if(addr) connectWS(); }, 5000); };
}
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeAttr(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }
$('#btnCreate').onclick = () => createAddr($('#username').value.trim());
$('#btnRandom').onclick = () => createAddr('');
document.querySelectorAll('.act').forEach(b => b.onclick = () => {
  const a = b.dataset.act;
  if(a==='copy'){ navigator.clipboard.writeText(addr); status('tersalin!','text-green-500'); }
  if(a==='refresh'){ loadInbox(); }
  if(a==='new'){ showCreate(); }
  if(a==='clear'){ if(confirm('Kosongkan inbox?')) api('/clear?a='+encodeURIComponent(addr),{method:'POST'}).then(loadInbox); }
});
if(addr){ showActive(); loadInbox(); connectWS(); }
setInterval(()=>{ if(addr) loadInbox(); }, 15000);
</script>
</body></html>`;
}

// Tombol aksi (Copy/Refresh/New/Clear). compact=true untuk topbar.
function actBtns(compact = false): string {
  const items = [
    ["copy", "far fa-copy", "Copy"],
    ["refresh", "fas fa-sync-alt", "Refresh"],
    ["new", "far fa-plus-square", "New"],
    ["clear", "far fa-trash-alt", "Clear"],
  ];
  if (compact) {
    return items.map(([act, icon, label]) =>
      `<button data-act="${act}" class="act bg-black/25 hover:bg-black/40 text-white rounded-md px-4 py-2 text-center"><div class="text-lg"><i class="${icon}"></i></div><div class="text-[10px] mt-1">${label}</div></button>`).join("");
  }
  return items.map(([act, icon, label]) =>
    `<button data-act="${act}" class="act bg-white/10 dark:bg-black/20 hover:bg-white/25 text-white rounded-md py-4 text-center"><div class="text-2xl"><i class="${icon}"></i></div><div class="text-xs mt-2">${label}</div></button>`).join("");
}
