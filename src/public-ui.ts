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
  heroHeading?: string; heroSubtitle?: string;
  hasFaq?: boolean; hasPrivacy?: boolean; hasContact?: boolean;
}

// Halaman konten sederhana (FAQ / Privacy / Contact) — dipakai semua tema.
export function renderContentPage(brand: string, logoUrl: string, faviconUrl: string, colors: { primary: string }, title: string, content: string): string {
  const logo = logoUrl || DEFAULT_LOGO;
  const favicon = faviconUrl || DEFAULT_LOGO;
  return `${head(brand + " — " + title, "", favicon, false)}
<body class="bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 min-h-screen flex flex-col">
  <header class="text-white px-6 py-4 flex items-center justify-between" style="background-color:${colors.primary}">
    <a href="/"><img src="${esc(logo)}" class="max-h-8 object-contain" /></a>
    <a href="/" class="text-sm hover:underline"><i class="fas fa-arrow-left mr-1"></i>Kembali</a>
  </header>
  <main class="max-w-3xl mx-auto w-full px-5 py-10 flex-1">
    <h1 class="text-2xl font-bold mb-4" style="color:${colors.primary}">${esc(title)}</h1>
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 whitespace-pre-wrap leading-relaxed">${esc(content) || "<span class='text-gray-400'>Belum ada konten.</span>"}</div>
  </main>
  <footer class="text-center text-gray-400 text-sm py-6">&copy; ${new Date().getFullYear()} ${esc(brand)}</footer>
</body></html>`;
}

const BP_STYLE = `<style>
.bp-body{font-family:ui-monospace,'Courier New',monospace}
.bp-card{background:#efe9dd;border:2px solid #16233f;border-radius:6px;box-shadow:4px 4px 0 rgba(22,35,63,.35)}
.bp-head{color:#fff;font-weight:700;letter-spacing:.05em;padding:10px 16px;border-bottom:2px solid #16233f}
.bp-btn{background:#efe9dd;border:2px solid #16233f;border-radius:4px;padding:10px 14px;font-weight:700;letter-spacing:.03em;color:#16233f;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-size:14px}
.bp-btn:hover{background:#e2dbc9}
.bp-nav a{color:inherit;font-weight:700;letter-spacing:.08em}
.bp-nav a:hover{text-decoration:underline}
.bp-card .msg-tabs{display:flex;background:#efe9dd;border-top:2px solid #16233f}
.bp-card .msg-tabs button{flex:1;padding:10px;color:#16233f;font-weight:700;letter-spacing:.06em;font-size:12px;border:0;background:transparent;cursor:pointer}
.bp-card .msg-tabs button.active{background:#16233f;color:#efe9dd}
</style>`;

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
  const layout = o.theme === "mantis" ? "mantis" : o.theme === "nebula" ? "nebula" : o.theme === "blueprint" ? "blueprint" : "sidebar";
  const logo = o.logoUrl || DEFAULT_LOGO;
  const favicon = o.faviconUrl || DEFAULT_LOGO;
  const page = layout === "nebula" ? "bg-slate-950 text-gray-200" : "bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200";
  const panelDisplay = (layout === "mantis" || layout === "blueprint") ? "flex" : "block";
  const heading = o.heroHeading || "Dapatkan Email Sementara dalam Sekejap";
  const subtitle = o.heroSubtitle || "Lindungi privasimu dengan inbox sekali pakai.";
  const year = new Date().getFullYear();

  const socials = o.socials.map((s) =>
    `<a href="${esc(s.link)}" target="_blank" rel="noopener" class="ml-2 text-lg opacity-80 hover:opacity-100"><i class="${esc(s.icon)}"></i></a>`).join("");
  const domainOptions = o.domains.map((d) => `<option value="${esc(d)}" class="text-black">${esc(d)}</option>`).join("");
  const config = JSON.stringify({ domains: o.domains, brand: o.brand, panelDisplay, twoPane: layout === "sidebar" || layout === "blueprint" });
  const darkBtn = `<button onclick="toggleDark()" class="text-lg" title="Tema"><i class="fas fa-moon dark:hidden"></i><i class="fas fa-sun hidden dark:inline text-yellow-400"></i></button>`;
  const statusEl = `<span id="statusDot" class="text-xs text-gray-400"><i class="fas fa-circle text-[8px]"></i> <span id="statusText">idle</span></span>`;

  const inboxArea = layout === "sidebar" ? `
    <div id="inboxList" class="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 min-h-[200px] lg:min-h-[440px] overflow-y-auto"></div>
    <div id="msgView" class="msg-pane w-full lg:w-2/3 min-h-[440px] flex flex-col"><div class="flex-1 flex items-center justify-center text-gray-300 dark:text-gray-600"><div class="text-center"><div class="text-5xl mb-3"><i class="far fa-envelope-open"></i></div><div>Pilih email untuk dibaca</div></div></div></div>` : `
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
      <button id="btnCancel" onclick="cancelCreate()" class="w-full rounded-md py-2 px-4 bg-white/10 hover:bg-white/20 text-white text-sm" style="display:none">Batal</button>
    </div>
    <div id="activePanel" class="lg:max-w-xs lg:mx-auto w-full space-y-4 hidden">
      ${addrDropdown("rounded-md py-3 px-4 bg-white/10 dark:bg-black/20 text-white font-mono text-sm break-all")}
      <div class="grid grid-cols-4 lg:grid-cols-2 gap-2 lg:gap-4">${actBtns("sidebar")}</div>
    </div>
    <div class="mt-auto pt-8 flex justify-center">${socials}</div>
  </aside>
  <div class="flex-1 flex flex-col min-w-0">
    <nav class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-5 h-16 flex items-center justify-end gap-4">${statusEl}${darkBtn}</nav>
    <main class="flex-1 lg:flex bg-white dark:bg-gray-900" id="inboxWrap" style="display:none">${inboxArea}</main>
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
          <button id="btnCancel" onclick="cancelCreate()" class="py-2 px-5 bg-black/20 hover:bg-black/30 text-white text-sm" style="display:none">Batal</button>
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
  <main class="container mx-auto flex-1 p-5 w-full flex flex-col">
    <div class="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm" id="inboxWrap" style="display:none">${inboxArea}</div>
  </main>
  ${footer}
</div>`;
  } else if (layout === "nebula") {
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
        <div class="flex justify-center gap-2"><button id="btnRandom" class="py-2 px-6 rounded-md text-white font-semibold" style="background-color:${c.tertiary}">Buat Email Acak</button><button id="btnCancel" onclick="cancelCreate()" class="py-2 px-4 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm" style="display:none">Batal</button></div>
      </div>
      <div id="activePanel" class="hidden max-w-3xl mx-auto">
        ${addrDropdown("w-full bg-white/10 rounded-md py-4 px-5 text-white font-mono break-all")}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">${actBtns("nebula")}</div>
      </div>
    </div>
  </header>
  <div class="container mx-auto px-4 -mt-16 mb-8 relative z-10 flex-1 flex flex-col">
    <div class="flex-1 bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden" id="inboxWrap" style="display:none">${inboxArea}</div>
  </div>
  <footer class="bg-gray-800 text-white text-sm px-6 pt-14 pb-6 text-center -mt-6">&copy; ${new Date().getFullYear()} ${esc(o.brand)}. All rights reserved.</footer>
</div>`;
  } else {
    /* BLUEPRINT: retro cetak-biru, monospace, kartu krem border tebal */
    const gridBg = `background-color:${c.primary};background-image:linear-gradient(rgba(255,255,255,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.22) 1px,transparent 1px);background-size:26px 26px`;
    const brandHtml = o.logoUrl ? `<img src="${esc(logo)}" class="max-h-9 object-contain" />` : `<div class="flex items-center gap-2"><div class="w-9 h-9 flex items-center justify-center rounded" style="border:2px solid ${c.primary}"><i class="fas fa-envelope-open-text" style="color:${c.primary}"></i></div><div class="text-2xl font-bold tracking-wide uppercase" style="color:${c.primary}">${esc(o.brand)}</div></div>`;
    bodyHtml = `
<div class="bp-body min-h-screen p-4 md:p-8" style="${gridBg}">
  <div class="max-w-4xl mx-auto flex flex-col gap-5">
    <div class="bp-card px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
      ${brandHtml}
      <div class="flex items-center gap-5">
        <nav class="bp-nav flex gap-5 text-sm" style="color:${c.primary}"><a href="/">HOME</a><a href="/docs" target="_blank">API</a></nav>
        <div class="flex items-center gap-2 text-sm" style="color:${c.primary}">${statusEl}${socials}</div>
      </div>
    </div>
    <div class="bp-card px-6 py-8">
      <h1 class="text-3xl md:text-4xl font-bold text-center mb-3" style="color:${c.primary}">${esc(heading)}</h1>
      <p class="text-center mb-1" style="color:${c.primary}">${esc(subtitle)}</p>
      <p class="text-center text-sm mb-6" style="color:${c.primary};opacity:.6">No signup · Free · Instant</p>
      <div id="createPanel" class="flex flex-col sm:flex-row gap-3 justify-center" style="display:none">
        <select id="domain" class="bp-btn" style="min-width:200px">${domainOptions}</select>
        <button id="btnRandom" class="bp-btn" style="background:${c.secondary};color:#fff;border-color:${c.secondary}"><i class="fas fa-bolt"></i> GENERATE</button>
      </div>
      <div id="activePanel" class="flex-col gap-3" style="display:none">
        <div class="flex flex-col md:flex-row gap-3">
          <div class="flex-1">${addrDropdown("bp-card px-5 py-4 font-mono text-lg break-all !shadow-none", "background:#fff;color:" + c.primary)}</div>
          <button data-act="copy" class="act bp-btn md:w-36"><i class="far fa-copy"></i> COPY</button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onclick="createAddr('')" class="bp-btn" style="background:${c.secondary};color:#fff;border-color:${c.secondary}"><i class="fas fa-sync-alt"></i> GENERATE NEW</button>
          <button data-act="refresh" class="act bp-btn"><i class="fas fa-sync-alt"></i> REFRESH</button>
          <button data-act="share" class="act bp-btn"><i class="fas fa-share-nodes"></i> SHARE</button>
          <button data-act="clear" class="act bp-btn"><i class="far fa-trash-alt"></i> DELETE</button>
        </div>
      </div>
    </div>
    <div id="inboxWrap" class="grid md:grid-cols-5 gap-5" style="display:none">
      <div class="bp-card p-0 overflow-hidden md:col-span-2">
        <div class="bp-head" style="background:${c.primary}">INBOX (<span id="inboxCount">0</span>)</div>
        <div id="inboxList" class="min-h-[460px] max-h-[560px] overflow-y-auto"></div>
      </div>
      <div class="msg-pane bp-card p-0 overflow-hidden flex flex-col md:col-span-3">
        <div class="bp-head" style="background:${c.primary}">PESAN</div>
        <div id="msgView" class="min-h-[460px] flex flex-col"><div class="flex-1 flex items-center justify-center text-sm py-16" style="color:${c.primary};opacity:.5">Pilih email untuk dibaca</div></div>
      </div>
    </div>
    <footer class="text-center text-white text-sm py-2 font-bold" style="text-shadow:0 1px 2px rgba(0,0,0,.3)">&copy; ${year} ${esc(o.brand)}</footer>
  </div>
</div>`;
  }

  return `${head(o.brand, layout === "blueprint" ? BP_STYLE : "", favicon, layout === "nebula")}
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
const TWO = !!CFG.twoPane;
function setAddrText(){ var ab=$('#addrBox'); if(!ab) return; var sp=ab.querySelector('span'); if(sp){ sp.textContent=addr; } else { ab.textContent=addr; } }
function showActive(){ var cp=$('#createPanel'); if(cp)cp.style.display='none'; var ap=$('#activePanel'); if(ap)ap.style.display=LD; setAddrText(); var iw=$('#inboxWrap'); if(iw) iw.style.display=''; }
function showCreate(){ var cp=$('#createPanel'); if(!cp){ if(CFG.domains&&CFG.domains.length) createAddr(''); return; } var ap=$('#activePanel'); if(ap)ap.style.display='none'; cp.style.display=LD; var iw=$('#inboxWrap'); if(iw) iw.style.display='none'; var cb=$('#btnCancel'); if(cb) cb.style.display = addrs.length ? '' : 'none'; closeAddrMenu(); }
function cancelCreate(){ if(addrs.length){ showActive(); loadInbox(); } }
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
function fmtTime(ms){ var d=new Date(ms), n=new Date(); function p(x){return ('0'+x).slice(-2);} var t=p(d.getHours())+':'+p(d.getMinutes()); return d.toDateString()===n.toDateString()?t:(p(d.getDate())+'/'+p(d.getMonth()+1)+' '+t); }
async function loadInbox(){
  if(!addr) return; status('memuat…');
  var res;
  try { res = await api('/inbox?a=' + encodeURIComponent(addr)); }
  catch(e){ status('gagal memuat, coba lagi', 'text-red-500'); return; }
  const list = $('#inboxList'); if(!list) return; const msgs = (res && res.messages) || [];
  status(msgs.length + ' email', 'text-green-500');
  var _ic=$('#inboxCount'); if(_ic) _ic.textContent=msgs.length;
  if(!msgs.length){ list.innerHTML = '<div class="h-40 flex items-center justify-center text-gray-400">Menunggu email masuk…</div>'; return; }
  if(TWO){
    list.innerHTML = msgs.map(function(m){ var nm=escapeHtml((String(m.sender||'').split('@')[0])||m.sender||''), em=escapeHtml(m.sender||'');
      return '<div onclick="openMsg(\\''+m.id+'\\')" class="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 '+(m.read?'':'font-semibold')+'">'+
        '<div class="flex justify-between gap-2"><div class="text-sm text-gray-900 dark:text-gray-100 truncate">'+nm+'</div><div class="text-xs text-gray-400 whitespace-nowrap">'+fmtTime(m.received_at)+'</div></div>'+
        '<div class="text-xs text-gray-500 truncate">'+em+'</div>'+
        '<div class="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">'+escapeHtml(m.subject)+'</div></div>';
    }).join('');
    return;
  }
  var header = '<div class="flex items-center gap-3 py-3 px-5 bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><div class="w-1/2 md:w-3/12">Pengirim</div><div class="w-1/2 md:w-7/12">Subjek</div><div class="hidden md:flex md:w-2/12 justify-end">Waktu</div></div>';
  list.innerHTML = header + msgs.map(function(m){
    var em = escapeHtml(m.sender||''), nm = escapeHtml((String(m.sender||'').split('@')[0])||m.sender||'');
    return '<div onclick="openMsg(\\''+m.id+'\\')" class="flex items-center gap-3 py-4 px-5 border-b border-dashed border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer '+(m.read?'':'font-semibold')+'">'+
      '<div class="w-1/2 md:w-3/12 min-w-0"><div class="truncate text-sm text-gray-900 dark:text-gray-100">'+nm+'</div><div class="text-xs text-gray-500 truncate">'+em+'</div></div>'+
      '<div class="w-1/2 md:w-7/12 truncate text-sm text-gray-700 dark:text-gray-300">'+escapeHtml(m.subject)+'</div>'+
      '<div class="hidden md:flex md:w-2/12 justify-end text-xs text-gray-500">'+fmtTime(m.received_at)+'</div></div>';
  }).join('');
}
function isMobile(){ return window.matchMedia('(max-width: 767px)').matches; }
async function openMsg(id){
  currentId = id;
  const res = await api('/message?a=' + encodeURIComponent(addr) + '&id=' + id);
  if(res.error){ alert(res.error); return; }
  window.__mHtml = res.html ? res.html : '<pre style="white-space:pre-wrap;font-family:sans-serif;padding:12px">'+escapeHtml(res.text||'')+'</pre>';
  window.__mRaw = 'From: '+(res.sender||'')+'\\nTo: '+addr+'\\nSubject: '+(res.subject||'')+'\\nDate: '+new Date(res.received_at).toLocaleString()+'\\n\\n'+(res.text||'(email format HTML — buka tab HTML)');
  var trash='<button onclick="delMsg(\\''+id+'\\')" title="Hapus email" class="text-red-600 hover:text-red-700 text-2xl"><i class="fas fa-trash"></i></button>';
  var isBp = !!document.querySelector('.bp-card');
  // Blueprint: bg cream, tulisan navy. Tema lain: pakai opacity/bold biasa.
  var lStyle = isBp ? 'style="color:#16233f;opacity:.6;font-weight:700"' : 'class="opacity-60"';
  var vStyle = isBp ? 'style="color:#16233f;font-weight:500"' : '';
  var sStyle = isBp ? 'style="color:#16233f;font-weight:800"' : 'class="font-bold"';
  var metaGrid='<div style="display:grid;grid-template-columns:max-content 1fr;gap:6px 14px'+(isBp?';color:#16233f':'')+'">'+
      '<span '+lStyle+'>FROM:</span><span '+vStyle+' class="break-all">'+escapeHtml(res.sender)+'</span>'+
      '<span '+lStyle+'>TO:</span><span '+vStyle+' class="break-all">'+escapeHtml(addr)+'</span>'+
      '<span '+lStyle+'>DATE:</span><span '+vStyle+'>'+escapeHtml(new Date(res.received_at).toLocaleString())+'</span>'+
      '<span '+lStyle+'>SUBJECT:</span><span '+sStyle+' class="break-words">'+escapeHtml(res.subject)+'</span>'+
    '</div>';
  var bodyBlock='<div id="msgBody" class="flex-1 flex flex-col overflow-auto min-h-[300px]"></div>';
  var tabs = isBp
    ? '<div class="msg-tabs"><button id="tabHtml" onclick="msgTab(\\'html\\')">HTML</button><button id="tabRaw" onclick="msgTab(\\'raw\\')">RAW</button></div>'
    : '<div class="flex border-t border-gray-200 dark:border-gray-700 text-sm font-semibold"><button id="tabHtml" onclick="msgTab(\\'html\\')" class="flex-1 py-2.5 text-center">HTML</button><button id="tabRaw" onclick="msgTab(\\'raw\\')" class="flex-1 py-2.5 text-center border-l border-gray-200 dark:border-gray-700">RAW</button></div>';
  // HP: buka pesan full-screen (semua tema), biar ga numpuk & ada tombol kembali.
  if(isMobile()){
    var ov=document.getElementById('msgOv');
    if(!ov){ ov=document.createElement('div'); ov.id='msgOv'; document.body.appendChild(ov); }
    ov.className='fixed inset-0 z-50 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col';
    ov.innerHTML='<div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"><button onclick="backToList()" class="text-sm text-gray-600 dark:text-gray-300"><i class="fas fa-chevron-left mr-1"></i>Kembali</button>'+trash+'</div>'+
      '<div class="px-4 py-3 border-b border-dashed border-gray-200 dark:border-gray-700 font-mono text-xs">'+metaGrid+'</div>'+
      bodyBlock+tabs;
    ov.style.display='flex'; document.body.style.overflow='hidden';
    msgTab('html'); loadInbox(); return;
  }
  var mv=$('#msgView');
  var topRow = TWO ? '' : '<div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700"><button onclick="backToList()" class="text-sm text-gray-600 dark:text-gray-300 hover:underline"><i class="fas fa-chevron-left mr-1"></i>Kembali</button>'+trash+'</div>';
  mv.innerHTML = topRow+
    '<div class="pl-4 pr-9 py-3 border-b border-dashed border-gray-200 dark:border-gray-700 font-mono text-xs relative">'+(TWO?'<div class="absolute top-2 right-3">'+trash+'</div>':'')+metaGrid+'</div>'+
    bodyBlock+tabs;
  if(!TWO){ $('#inboxList').style.display='none'; }
  mv.style.display='flex';
  msgTab('html');
  loadInbox();
}
function renderMsgBody(mode){ var b=$('#msgBody'); if(!b) return; if(mode==='raw'){ b.innerHTML='<pre style="white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,Menlo,monospace;padding:14px;font-size:12px;margin:0">'+escapeHtml(window.__mRaw||'')+'</pre>'; } else { b.innerHTML='<iframe class="flex-1 w-full bg-white" style="min-height:340px" sandbox="allow-same-origin" srcdoc="'+escapeAttr(window.__mHtml||'')+'"></iframe>'; } }
function msgTab(mode){ renderMsgBody(mode); var h=$('#tabHtml'),r=$('#tabRaw'); if(!h||!r) return; var bp = !!document.querySelector('.bp-card');
  if(bp){ h.classList.toggle('active',mode==='html'); r.classList.toggle('active',mode==='raw'); h.style.background=''; r.style.background=''; }
  else { h.style.background=mode==='html'?'rgba(0,0,0,.06)':''; r.style.background=mode==='raw'?'rgba(0,0,0,.06)':''; }
}
function backToList(){ var ov=document.getElementById('msgOv'); if(ov){ ov.style.display='none'; } document.body.style.overflow=''; var mv=$('#msgView'); if(mv) mv.style.display='none'; var l=$('#inboxList'); if(l) l.style.display=''; }
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
function shareLink(){ if(!addr) return; var link=location.origin+location.pathname+'?a='+encodeURIComponent(addr);
  var ov=document.createElement('div'); ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.onclick=function(e){ if(e.target===ov) document.body.removeChild(ov); };
  ov.innerHTML='<div style="position:relative;background:#fff;color:#111;border-radius:12px;max-width:440px;width:100%;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,.35)"><button id="_sCl" title="Tutup" style="position:absolute;top:8px;right:12px;background:none;border:0;font-size:24px;line-height:1;color:#999;cursor:pointer">&times;</button><div style="font-weight:700;font-size:16px;margin-bottom:4px;padding-right:20px">Bagikan Inbox</div><div style="font-size:13px;color:#666;margin-bottom:12px">Yang buka link ini bisa lihat inbox <b>'+escapeHtml(addr)+'</b>.</div><div style="display:flex;gap:8px"><input id="_sIn" readonly value="'+escapeAttr(link)+'" style="flex:1;border:1px solid #ccc;border-radius:8px;padding:9px 11px;font-size:13px;font-family:ui-monospace,monospace"/><button id="_sCp" style="background:#4f46e5;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:600;cursor:pointer">Salin</button></div></div>';
  document.body.appendChild(ov);
  var inp=ov.querySelector('#_sIn'), cp=ov.querySelector('#_sCp');
  cp.onclick=function(){ inp.select(); if(navigator.clipboard&&window.isSecureContext){ navigator.clipboard.writeText(link).catch(function(){document.execCommand('copy');}); } else { document.execCommand('copy'); } cp.textContent='Tersalin!'; setTimeout(function(){ cp.textContent='Salin'; },1500); };
  ov.querySelector('#_sCl').onclick=function(){ document.body.removeChild(ov); };
  inp.focus(); inp.select();
}
var _bc=$('#btnCreate'); if(_bc) _bc.onclick = () => createAddr($('#username')?$('#username').value.trim():'');
var _br=$('#btnRandom'); if(_br) _br.onclick = () => createAddr('');
document.querySelectorAll('.act').forEach(b => b.onclick = () => {
  const a = b.dataset.act;
  if(a==='copy'){ copyText(addr); }
  if(a==='refresh'){ loadInbox(); }
  if(a==='new'){ showCreate(); }
  if(a==='clear'){ deleteAddr(); }
  if(a==='share'){ shareLink(); }
});
// Link share: ?a=alamat -> langsung buka inbox alamat itu.
var _urlA=new URLSearchParams(location.search).get('a');
if(_urlA){ addr=_urlA.toLowerCase(); if(addrs.indexOf(addr)<0) addrs.push(addr); localStorage.setItem(AKEY,addr); localStorage.setItem(LKEY,JSON.stringify(addrs)); }
if(addr){ showActive(); loadInbox(); connectWS(); }
else if(CFG.domains && CFG.domains.length){ createAddr(''); }  // belum ada alamat -> auto-generate
setInterval(()=>{ if(addr) loadInbox(); }, 15000);
</script>
</body></html>`;
}

// Layar kunci (Lock / Kunci Web) — gate password sebelum akses situs.
export function renderLockScreen(brand: string, logoUrl: string, faviconUrl: string, text: string, primary: string): string {
  const logo = logoUrl || DEFAULT_LOGO;
  const favicon = faviconUrl || DEFAULT_LOGO;
  return `${head(brand + " — Terkunci", "", favicon)}
<body class="bg-gray-900 text-white min-h-screen flex items-center justify-center px-4">
  <form id="lf" class="bg-gray-800 w-full max-w-sm rounded-2xl shadow-xl border border-gray-700 p-8 text-center space-y-4">
    <img src="${esc(logo)}" class="h-12 mx-auto object-contain" />
    <div class="text-4xl">🔒</div>
    <div class="text-sm text-gray-300">${esc(text || "Situs ini dikunci. Masukkan password untuk lanjut.")}</div>
    <div id="le" class="hidden bg-red-500/20 text-red-300 text-sm p-2 rounded"></div>
    <input id="lp" type="password" placeholder="Password" class="w-full rounded-lg bg-gray-900 border border-gray-700 py-2.5 px-4 focus:outline-none" />
    <button class="w-full text-white font-semibold py-2.5 rounded-lg" style="background-color:${primary}">Buka</button>
  </form>
  <script>
    document.getElementById('lf').onsubmit=async function(e){ e.preventDefault();
      try{
        var r=await fetch('/api/unlock'+location.search,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:document.getElementById('lp').value})});
        var d=await r.json();
        if(d.ok){ location.reload(); return; }
        var le=document.getElementById('le'); le.textContent=d.error||'Password salah'; le.classList.remove('hidden');
      }catch(_){ }
    };
  </script>
</body></html>`;
}
