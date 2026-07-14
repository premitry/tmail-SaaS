// Halaman web publik temp-mail — 3 tema meniru struktur blade TMail:
//  - default : sidebar kiri vertikal
//  - mantis  : bar atas, alamat kiri + tombol vertikal kanan, terang + motif
//  - nebula  : header berwarna + kartu inbox mengambang, tombol horizontal, gelap
import { esc, head } from "./ui";
import { DEFAULT_LOGO } from "./assets";

export interface PublicOpts {
  brand: string; emoji: string; logoUrl: string; faviconUrl: string;
  colors: { primary: string; secondary: string; tertiary: string };
  theme: string; domains: string[];
  socials: Array<{ icon: string; link: string }>;
  darkMode: boolean; lang: string;
}

// mode: sidebar | mantis | nebula
function actBtns(mode: string): string {
  const items: [string, string, string][] = [
    ["copy", "far fa-copy", "Copy"],
    ["refresh", "fas fa-sync-alt", "Refresh"],
    ["new", "far fa-plus-square", "New"],
    ["clear", "far fa-trash-alt", "Delete"],
  ];
  if (mode === "nebula") {
    return items.map(([a, i, l]) =>
      `<button data-act="${a}" class="act bg-white/10 hover:bg-white/25 text-white rounded-md py-3 flex items-center justify-center gap-2"><i class="${i}"></i><span>${l}</span></button>`).join("");
  }
  if (mode === "mantis") {
    return items.map(([a, i, l]) =>
      `<button data-act="${a}" class="act bg-black/25 hover:bg-black/40 text-white px-4 py-3 text-center"><i class="${i} text-lg"></i><div class="text-[11px] mt-1">${l}</div></button>`).join("");
  }
  return items.map(([a, i, l]) =>
    `<button data-act="${a}" class="act bg-white/10 dark:bg-black/20 hover:bg-white/25 text-white rounded-md py-4 text-center"><div class="text-2xl"><i class="${i}"></i></div><div class="text-xs mt-2">${l}</div></button>`).join("");
}

// Dropdown alamat aktif + daftar email lain (multi-email, klik panah utk ganti).
function addrDropdown(boxCls: string, style = ""): string {
  return `<div class="relative">
      <div id="addrBox" onclick="toggleAddrMenu()" class="${boxCls} cursor-pointer flex items-center justify-between"${style ? ` style="${style}"` : ""}><span class="truncate">-</span><i class="fas fa-chevron-down opacity-50 ml-2"></i></div>
      <div id="addrMenu" class="hidden absolute z-30 mt-1 left-0 right-0 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-md shadow-lg overflow-hidden max-h-60 overflow-y-auto text-sm"></div>
    </div>`;
}

export function renderPublicPage(o: PublicOpts): string {
  const c = o.colors;
  const layout = o.theme === "mantis" ? "mantis" : o.theme === "nebula" ? "nebula" : "sidebar";
  const logo = o.logoUrl || DEFAULT_LOGO;
  const favicon = o.faviconUrl || DEFAULT_LOGO;
  const page = layout === "nebula" ? "bg-slate-950 text-gray-200" : "bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200";
  const panelDisplay = layout === "mantis" ? "flex" : "block";

  const socials = o.socials.map((s) =>
    `<a href="${esc(s.link)}" target="_blank" rel="noopener" class="ml-2 text-lg opacity-80 hover:opacity-100"><i class="${esc(s.icon)}"></i></a>`).join("");
  const domainOptions = o.domains.map((d) => `<option value="${esc(d)}" class="text-black">${esc(d)}</option>`).join("");
  const config = JSON.stringify({ domains: o.domains, brand: o.brand, panelDisplay });
  const darkBtn = `<button onclick="toggleDark()" class="text-lg" title="Tema"><i class="fas fa-moon dark:hidden"></i><i class="fas fa-sun hidden dark:inline text-yellow-400"></i></button>`;
  const statusEl = `<span id="statusDot" class="text-xs text-gray-400"><i class="fas fa-circle text-[8px]"></i> <span id="statusText">idle</span></span>`;

  const inboxArea = `
    <div id="inboxList" class="w-full min-h-[320px] divide-y divide-gray-100 dark:divide-gray-800"></div>
    <div id="msgView" class="w-full min-h-[320px] flex-col" style="display:none"></div>`;

  const footer = `<footer class="bg-gray-800 text-white text-sm px-6 py-4 text-center">&copy; ${new Date().getFullYear()} ${esc(o.brand)}. All rights reserved.</footer>`;

  let bodyHtml = "";

  if (layout === "sidebar") {
    bodyHtml = `
<div class="min-h-screen flex flex-col lg:flex-row">
  <aside class="w-full lg:w-1/4 text-white py-6 px-6 flex flex-col" style="background-color:${c.primary}">
    <div class="flex items-center justify-center mb-8"><img src="${esc(logo)}" class="max-h-12 max-w-[75%] object-contain" /></div>
    <div id="createPanel" class="lg:max-w-xs lg:mx-auto w-full space-y-4">
      <input id="username" placeholder="Masukkan username (opsional)" class="w-full rounded-md py-3 px-4 bg-white/10 dark:bg-black/20 placeholder-white/50 text-white focus:outline-none" />
      <div class="relative"><select id="domain" class="w-full rounded-md py-3 px-4 bg-white/10 dark:bg-black/20 text-white appearance-none focus:outline-none cursor-pointer">${domainOptions}</select><i class="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/70"></i></div>
      <button id="btnCreate" class="w-full rounded-md py-3 px-4 text-white font-semibold" style="background-color:${c.secondary}">Create</button>
      <button id="btnRandom" class="w-full rounded-md py-3 px-4 text-white font-semibold" style="background-color:${c.tertiary}">Random</button>
    </div>
    <div id="activePanel" class="lg:max-w-xs lg:mx-auto w-full space-y-4 hidden">
      ${addrDropdown("rounded-md py-3 px-4 bg-white/10 dark:bg-black/20 text-white font-mono text-sm break-all")}
      <div class="grid grid-cols-4 lg:grid-cols-2 gap-2 lg:gap-4">${actBtns("sidebar")}</div>
    </div>
    <div class="mt-auto pt-8 flex justify-center">${socials}</div>
  </aside>
  <div class="flex-1 flex flex-col min-w-0">
    <nav class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 h-16 flex items-center justify-end gap-4">${statusEl}${darkBtn}</nav>
    <main class="flex-1 bg-white dark:bg-gray-900" id="inboxWrap" style="display:none">${inboxArea}</main>
    ${footer}
  </div>
</div>`;
  } else if (layout === "mantis") {
    const inputCls = "bg-white text-gray-800 dark:bg-gray-800 dark:text-white";
    bodyHtml = `
<div class="min-h-screen flex flex-col">
  <header class="bg-white dark:bg-gray-900 px-6 h-16 flex items-center justify-between border-b border-black/10 dark:border-white/10">
    <img src="${esc(logo)}" class="max-h-9 object-contain" />
    <div class="flex items-center gap-4">${statusEl}${socials}${darkBtn}</div>
  </header>
  <div class="text-white" style="background-color:${c.primary};background-image:url(/assets/mantis-pattern.png)">
    <div class="container mx-auto px-6 py-10">
      <div id="createPanel" class="flex flex-col md:flex-row items-stretch gap-4">
        <div class="flex-1 w-full space-y-3">
          <h2 class="text-center text-xl font-bold mb-1">Buat alamat email sementara</h2>
          <input id="username" placeholder="username (opsional)" class="w-full py-4 px-5 border-b-4 focus:outline-none ${inputCls}" style="border-color:${c.secondary}" />
          <select id="domain" class="w-full py-4 px-5 cursor-pointer focus:outline-none ${inputCls}">${domainOptions}</select>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-1 gap-1 md:w-44">
          <button id="btnCreate" class="py-4 px-5 text-white font-semibold" style="background-color:${c.secondary}"><i class="fas fa-chevron-right mr-1"></i> Create</button>
          <button id="btnRandom" class="py-4 px-5 text-white font-semibold" style="background-color:${c.tertiary}"><i class="fas fa-random mr-1"></i> Random</button>
        </div>
      </div>
      <div id="activePanel" class="hidden flex-col md:flex-row items-stretch gap-4">
        <div class="flex-1 w-full space-y-3">
          <h2 class="text-center text-xl font-bold mb-1">Alamat email sementara kamu siap</h2>
          ${addrDropdown("w-full py-4 px-5 border-b-4 font-mono break-all " + inputCls, "border-color:" + c.secondary)}
        </div>
        <div class="grid grid-cols-4 md:grid-cols-1 gap-0.5 md:w-32">${actBtns("mantis")}</div>
      </div>
    </div>
  </div>
  <main class="container mx-auto flex-1 p-5 w-full">
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm" id="inboxWrap" style="display:none">${inboxArea}</div>
  </main>
  ${footer}
</div>`;
  } else {
    /* NEBULA: header berwarna + kartu inbox mengambang */
    bodyHtml = `
<div class="min-h-screen flex flex-col">
  <header class="text-white" style="background-color:${c.primary}">
    <div class="container mx-auto px-6 pt-5 pb-28">
      <div class="flex items-center justify-between mb-8">
        <img src="${esc(logo)}" class="max-h-10 object-contain" />
        <div class="flex items-center gap-4">${statusEl}${socials}${darkBtn}</div>
      </div>
      <div id="createPanel" class="max-w-2xl mx-auto">
        <div class="flex items-stretch bg-white/15 rounded-md overflow-hidden">
          <input id="username" placeholder="username (opsional)" class="flex-1 bg-transparent py-4 px-5 text-white placeholder-white/40 focus:outline-none" />
          <div class="w-px bg-white/25"></div>
          <select id="domain" class="bg-transparent text-white py-4 px-4 focus:outline-none cursor-pointer">${domainOptions}</select>
          <button id="btnCreate" class="py-4 px-6 text-white font-semibold" style="background-color:${c.secondary}">Create</button>
        </div>
        <div class="text-center text-white/70 py-2">atau</div>
        <div class="flex justify-center"><button id="btnRandom" class="py-2 px-6 rounded-md text-white font-semibold" style="background-color:${c.tertiary}">Buat Email Acak</button></div>
      </div>
      <div id="activePanel" class="hidden max-w-3xl mx-auto">
        ${addrDropdown("w-full bg-white/10 rounded-md py-4 px-5 text-white font-mono break-all")}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">${actBtns("nebula")}</div>
      </div>
    </div>
  </header>
  <div class="container mx-auto px-4 -mt-16 mb-8 relative z-10 flex-1">
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden" id="inboxWrap" style="display:none">${inboxArea}</div>
  </div>
  <footer class="bg-gray-800 text-white text-sm px-6 pt-14 pb-6 text-center -mt-6">&copy; ${new Date().getFullYear()} ${esc(o.brand)}. All rights reserved.</footer>
</div>`;
  }

  return `${head(o.brand, "", favicon)}
<body class="${page}">
${bodyHtml}
<script>
const CFG = ${config};
const HOST = location.host, AKEY = 'tmail_addr_' + HOST, LKEY = 'tmail_addrs_' + HOST;
let addrs = JSON.parse(localStorage.getItem(LKEY) || '[]');
let addr = localStorage.getItem(AKEY) || (addrs[0] || '');
let ws = null, currentId = null;
const TENANT = new URLSearchParams(location.search).get('__tenant');
const TQS = TENANT ? '__tenant=' + encodeURIComponent(TENANT) : '';
function apiUrl(path){ if(!TQS) return '/api' + path; return '/api' + path + (path.includes('?') ? '&' : '?') + TQS; }
const $ = (s) => document.querySelector(s);
function status(txt, color){ $('#statusText').textContent = txt; $('#statusDot').className = 'text-xs ' + (color||'text-gray-400'); }
async function api(path, opts){ const r = await fetch(apiUrl(path), opts); return r.json(); }
const LD = CFG.panelDisplay || 'block';
function setAddrText(){ var ab=$('#addrBox'); if(!ab) return; var sp=ab.querySelector('span'); if(sp){ sp.textContent=addr; } else { ab.textContent=addr; } }
function showActive(){ $('#createPanel').style.display='none'; $('#activePanel').style.display=LD; setAddrText(); var iw=$('#inboxWrap'); if(iw) iw.style.display=''; }
function showCreate(){ $('#activePanel').style.display='none'; $('#createPanel').style.display=LD; var iw=$('#inboxWrap'); if(iw) iw.style.display='none'; closeAddrMenu(); }
function renderAddrMenu(){ var m=$('#addrMenu'); if(!m) return; m.innerHTML = addrs.map(function(a){ return '<div onclick="setActiveAddr(\\''+a+'\\')" class="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-mono '+(a===addr?'font-bold':'')+'">'+escapeHtml(a)+'</div>'; }).join(''); }
function toggleAddrMenu(){ renderAddrMenu(); var m=$('#addrMenu'); if(m) m.classList.toggle('hidden'); }
function closeAddrMenu(){ var m=$('#addrMenu'); if(m) m.classList.add('hidden'); }
function setActiveAddr(a){ addr=a; localStorage.setItem(AKEY,a); setAddrText(); closeAddrMenu(); loadInbox(); connectWS(); }
async function createAddr(local){
  const domain = $('#domain').value;
  const q = new URLSearchParams({ domain }); if(local) q.set('local', local);
  const res = await api('/new?' + q.toString());
  if(res.error){ alert(res.error); return; }
  addr = res.address; if(addrs.indexOf(addr)<0) addrs.push(addr);
  localStorage.setItem(AKEY, addr); localStorage.setItem(LKEY, JSON.stringify(addrs));
  showActive(); loadInbox(); connectWS();
}
function timeAgo(ms){ const s=Math.floor((Date.now()-ms)/1000); if(s<60)return s+'d lalu'; if(s<3600)return Math.floor(s/60)+'m lalu'; if(s<86400)return Math.floor(s/3600)+'j lalu'; return Math.floor(s/86400)+'h lalu'; }
async function loadInbox(){
  if(!addr) return; status('memuat…');
  const res = await api('/inbox?a=' + encodeURIComponent(addr));
  const list = $('#inboxList'); const msgs = res.messages || [];
  status(msgs.length + ' email', 'text-green-500');
  if(!msgs.length){ list.innerHTML = '<div class="h-40 flex items-center justify-center text-gray-400">Menunggu email masuk…</div>'; return; }
  var header = '<div class="flex items-center gap-3 py-3 px-5 bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><div class="w-1/2 md:w-3/12">Pengirim</div><div class="w-1/2 md:w-7/12">Subjek</div><div class="hidden md:flex md:w-2/12 justify-end">Waktu</div></div>';
  list.innerHTML = header + msgs.map(function(m){
    var em = escapeHtml(m.sender||''), nm = escapeHtml((String(m.sender||'').split('@')[0])||m.sender||'');
    return '<div onclick="openMsg(\\''+m.id+'\\')" class="flex items-center gap-3 py-4 px-5 border-b border-dashed border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer '+(m.read?'':'font-semibold')+'">'+
      '<div class="w-1/2 md:w-3/12 min-w-0"><div class="truncate text-sm text-gray-900 dark:text-gray-100">'+nm+'</div><div class="text-xs text-gray-500 truncate">'+em+'</div></div>'+
      '<div class="w-1/2 md:w-7/12 truncate text-sm text-gray-700 dark:text-gray-300">'+escapeHtml(m.subject)+'</div>'+
      '<div class="hidden md:flex md:w-2/12 justify-end text-xs text-gray-500">'+timeAgo(m.received_at)+'</div></div>';
  }).join('');
}
async function openMsg(id){
  currentId = id;
  const res = await api('/message?a=' + encodeURIComponent(addr) + '&id=' + id);
  if(res.error){ alert(res.error); return; }
  const body = res.html ? res.html : '<pre style="white-space:pre-wrap;font-family:sans-serif;padding:12px">'+escapeHtml(res.text||'')+'</pre>';
  var mv=$('#msgView');
  mv.innerHTML = '<div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">'+
      '<button onclick="backToList()" class="text-sm text-gray-600 dark:text-gray-300 hover:underline"><i class="fas fa-chevron-left mr-1"></i>Kembali ke Inbox</button>'+
      '<button onclick="delMsg(\\''+id+'\\')" class="text-xs bg-red-600 text-white px-3 py-1 rounded-md">Delete</button></div>'+
    '<div class="p-4 border-b border-dashed border-gray-200 dark:border-gray-700"><div class="text-base text-gray-900 dark:text-gray-100">'+escapeHtml(res.subject)+'</div><div class="text-xs text-gray-400">'+escapeHtml(res.sender)+'</div></div>'+
    '<iframe class="flex-1 w-full bg-white min-h-[360px]" sandbox="allow-same-origin" srcdoc="'+escapeAttr(body)+'"></iframe>';
  $('#inboxList').style.display='none'; mv.style.display='flex';
  loadInbox();
}
function backToList(){ var mv=$('#msgView'); if(mv) mv.style.display='none'; var l=$('#inboxList'); if(l) l.style.display=''; }
function deleteAddr(){ if(!addr) return; if(!confirm('Hapus alamat '+addr+' dari daftar?')) return; addrs=addrs.filter(function(x){return x!==addr;}); localStorage.setItem(LKEY, JSON.stringify(addrs)); if(addrs.length){ setActiveAddr(addrs[0]); } else { addr=''; localStorage.removeItem(AKEY); showCreate(); } }
async function delMsg(id){ await api('/delete?a=' + encodeURIComponent(addr) + '&id=' + id, { method:'POST' }); backToList(); loadInbox(); }
function connectWS(){
  if(ws){ try{ws.close();}catch(e){} }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(proto + '://' + location.host + '/api/ws?a=' + encodeURIComponent(addr) + (TQS ? '&' + TQS : ''));
  ws.onmessage = (e) => { try{ const d = JSON.parse(e.data); if(d.type==='new'||d.type==='update') loadInbox(); }catch(_){} };
  ws.onclose = () => { setTimeout(()=>{ if(addr) connectWS(); }, 5000); };
}
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeAttr(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }
function fallbackCopy(t){ var ta=document.createElement('textarea'); ta.value=t; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.top='-1000px'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, t.length); var ok=false; try{ ok=document.execCommand('copy'); }catch(e){} document.body.removeChild(ta); status(ok?'tersalin!':'gagal copy', ok?'text-green-500':'text-red-500'); }
function copyText(t){ if(!t) return; if(navigator.clipboard && window.isSecureContext){ navigator.clipboard.writeText(t).then(function(){ status('tersalin!','text-green-500'); }).catch(function(){ fallbackCopy(t); }); } else { fallbackCopy(t); } }
$('#btnCreate').onclick = () => createAddr($('#username').value.trim());
$('#btnRandom').onclick = () => createAddr('');
document.querySelectorAll('.act').forEach(b => b.onclick = () => {
  const a = b.dataset.act;
  if(a==='copy'){ copyText(addr); }
  if(a==='refresh'){ loadInbox(); }
  if(a==='new'){ showCreate(); }
  if(a==='clear'){ deleteAddr(); }
});
if(addr){ showActive(); loadInbox(); connectWS(); }
setInterval(()=>{ if(addr) loadInbox(); }, 15000);
</script>
</body></html>`;
}
