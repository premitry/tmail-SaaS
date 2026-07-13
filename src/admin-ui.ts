// UI Admin: halaman login + shell SPA (sidebar) untuk owner & buyer.
import { head, esc } from "./ui";

export function renderLogin(brand: string, role: "owner" | "buyer", error = ""): string {
  const title = role === "owner" ? "Owner Panel" : brand + " Admin";
  return `${head(title + " — Login")}
<body class="bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 min-h-screen flex items-center justify-center px-4">
  <form id="f" class="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 space-y-4">
    <div class="text-center">
      <div class="text-4xl mb-2">${role === "owner" ? "🛡️" : "📮"}</div>
      <h1 class="text-xl font-bold">${esc(title)}</h1>
    </div>
    ${error ? `<div class="bg-red-100 text-red-700 text-sm p-3 rounded-lg">${esc(error)}</div>` : ""}
    <input name="email" type="email" placeholder="Email" required class="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
    <input name="password" type="password" placeholder="Password" required class="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
    <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg">Masuk</button>
  </form>
  <script>
    document.getElementById('f').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const r = await fetch('/admin/login', { method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) });
      const d = await r.json();
      if(d.ok) location.href = '/admin'; else { document.querySelector('h1').insertAdjacentHTML('afterend','<div class="bg-red-100 text-red-700 text-sm p-3 rounded-lg mt-3">'+(d.error||'gagal')+'</div>'); }
    };
  </script>
</body></html>`;
}

// Shell SPA: nav berbeda per role, konten dimuat via /admin/api/*.
export function renderAdminShell(brand: string): string {
  return `${head(brand + " — Admin")}
<body class="bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
<div class="flex min-h-screen">
  <!-- SIDEBAR -->
  <aside class="w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed inset-y-0">
    <div class="h-16 flex items-center gap-2 px-6 border-b border-gray-200 dark:border-gray-800 font-bold text-lg">
      <span class="text-2xl">📮</span><span id="brandName">${esc(brand)}</span>
    </div>
    <nav id="nav" class="flex-1 p-3 space-y-1 text-sm"></nav>
    <div class="p-3 border-t border-gray-200 dark:border-gray-800 text-sm relative">
      <button id="userBtn" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
        <i class="fas fa-user-circle text-lg"></i><span id="userName" class="truncate">-</span><i class="fas fa-chevron-up ml-auto text-xs"></i>
      </button>
      <div id="userMenu" class="hidden absolute bottom-14 left-3 right-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
        <a href="#profile" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"><i class="fas fa-user mr-2"></i>Profile</a>
        <button onclick="toggleDark()" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"><i class="fas fa-moon mr-2"></i>Tema Gelap/Terang</button>
        <button id="logoutBtn" class="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"><i class="fas fa-sign-out-alt mr-2"></i>Logout</button>
      </div>
    </div>
  </aside>

  <!-- KONTEN -->
  <main class="flex-1 ml-60">
    <div id="banner"></div>
    <div id="view" class="p-8 max-w-5xl">Memuat…</div>
  </main>
</div>

<script>
${ADMIN_APP_JS}
</script>
</body></html>`;
}

// ── SPA client (vanilla JS) ──
const ADMIN_APP_JS = String.raw`
let ME = null;
const $ = (s,r=document)=>r.querySelector(s);
const view = $('#view');

async function api(path, opts){
  const r = await fetch('/admin/api'+path, Object.assign({headers:{'content-type':'application/json'}}, opts||{}));
  if(r.status===401){ location.href='/admin'; return {}; }
  return r.json();
}
function h(html){ return html; }
function toast(m){ const d=document.createElement('div'); d.textContent=m; d.className='fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50'; document.body.appendChild(d); setTimeout(()=>d.remove(),2000); }

const NAV = {
  owner: [ ['#users','Users','fa-users'] ],
  buyer: [ ['#dashboard','Dashboard','fa-gauge-high'], ['#domains','Domains','fa-globe'], ['#settings','Settings','fa-gear'] ],
};

function renderNav(){
  const items = NAV[ME.role] || [];
  $('#nav').innerHTML = items.map(([hash,label,icon])=>
    '<a href="'+hash+'" class="navlink flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" data-h="'+hash+'"><i class="fas '+icon+' w-4"></i>'+label+'</a>').join('');
}
function setActive(hash){
  document.querySelectorAll('.navlink').forEach(a=>{
    a.classList.toggle('bg-blue-50', a.dataset.h===hash);
    a.classList.toggle('dark:bg-gray-800', a.dataset.h===hash);
    a.classList.toggle('text-blue-600', a.dataset.h===hash);
    a.classList.toggle('font-semibold', a.dataset.h===hash);
  });
}

function expiryBanner(){
  if(ME.role!=='buyer') return;
  const b = $('#banner');
  if(ME.impersonating){
    b.innerHTML = '<div class="bg-amber-500 text-white text-sm px-6 py-2 flex justify-between items-center"><span><i class="fas fa-user-secret mr-2"></i>Kamu login sebagai buyer ini (impersonation).</span><a href="/admin/logout" class="underline">Keluar</a></div>';
    return;
  }
  if(ME.expiresInDays!=null && ME.expiresInDays<=3){
    const dismissed = sessionStorage.getItem('exp_dismissed');
    if(dismissed) return;
    b.innerHTML = '<div class="bg-red-600 text-white text-sm px-6 py-2 flex justify-between items-center"><span><i class="fas fa-triangle-exclamation mr-2"></i>Langganan mau habis — sisa '+ME.expiresInDays+' hari. Hubungi admin untuk perpanjang.</span><button onclick="this.closest(\'div\').remove();sessionStorage.setItem(\'exp_dismissed\',\'1\')" class="text-lg leading-none">&times;</button></div>';
  }
}

/* ============ VIEWS ============ */
async function vDashboard(){
  view.innerHTML = '<h1 class="text-2xl font-bold mb-6">Dashboard</h1><div id="cards" class="grid grid-cols-2 md:grid-cols-4 gap-4"></div>';
  const d = await api('/dashboard');
  const cards = [['Email dibuat',d.emails,'fa-at','text-blue-600'],['Pesan diterima',d.messages,'fa-inbox','text-green-600'],['Domain',d.domains,'fa-globe','text-purple-600'],['Hari ini',(d.series?.at(-1)?.messages_received)||0,'fa-bolt','text-amber-600']];
  $('#cards').innerHTML = cards.map(([l,v,i,c])=>'<div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"><div class="'+c+' text-xl mb-2"><i class="fas '+i+'"></i></div><div class="text-3xl font-bold">'+(v||0)+'</div><div class="text-sm text-gray-500 mt-1">'+l+'</div></div>').join('');
}

async function vDomains(){
  view.innerHTML = '<h1 class="text-2xl font-bold mb-6">Domains</h1>'+
    '<div class="flex gap-2 mb-4"><input id="newDomain" placeholder="contoh.com" class="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2 px-3"/><button id="addDomain" class="bg-blue-600 text-white px-4 rounded-lg">Tambah</button></div>'+
    '<div id="domainList" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800"></div>'+
    '<p class="text-xs text-gray-500 mt-3">Semua domain otomatis pakai IMAP di <b>Settings</b>. Arahkan MX domain ke mailbox catch-all IMAP kamu.</p>';
  $('#addDomain').onclick = async ()=>{ const v=$('#newDomain').value.trim(); if(!v)return; const r=await api('/domains',{method:'POST',body:JSON.stringify({domain:v})}); if(r.error)alert(r.error); else {$('#newDomain').value='';loadDomains();} };
  loadDomains();
}
async function loadDomains(){
  const d = await api('/domains');
  $('#domainList').innerHTML = (d.domains||[]).map(x=>
    '<div class="flex items-center justify-between p-4"><div><span class="font-mono">'+x.domain+'</span> '+(x.is_active?'<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded ml-2">aktif</span>':'<span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded ml-2">nonaktif</span>')+'</div>'+
    '<div class="flex gap-2"><button onclick="toggleDomain(\''+x.id+'\','+(x.is_active?0:1)+')" class="text-xs border px-2 py-1 rounded">'+(x.is_active?'Nonaktifkan':'Aktifkan')+'</button><button onclick="delDomain(\''+x.id+'\')" class="text-xs text-red-600 border border-red-200 px-2 py-1 rounded">Hapus</button></div></div>'
  ).join('') || '<div class="p-6 text-center text-gray-400">Belum ada domain</div>';
}
async function toggleDomain(id,active){ await api('/domains/toggle',{method:'POST',body:JSON.stringify({id,active:!!active})}); loadDomains(); }
async function delDomain(id){ if(confirm('Hapus domain?')){ await api('/domains/delete',{method:'POST',body:JSON.stringify({id})}); loadDomains(); } }

const TABS = [['general','General'],['imap','IMAP'],['config','Configuration'],['socials','Socials'],['lang','Languages'],['themes','Themes'],['advance','Advance'],['io','Export/Import']];
async function vSettings(){
  view.innerHTML = '<h1 class="text-2xl font-bold mb-6">Settings</h1>'+
    '<div class="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-2">'+
    TABS.map(([k,l])=>'<button class="stab px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800" data-k="'+k+'">'+l+'</button>').join('')+'</div><div id="stabView"></div>';
  document.querySelectorAll('.stab').forEach(b=> b.onclick=()=>{ document.querySelectorAll('.stab').forEach(x=>x.classList.remove('bg-blue-50','dark:bg-gray-800','text-blue-600','font-semibold')); b.classList.add('bg-blue-50','dark:bg-gray-800','text-blue-600','font-semibold'); renderTab(b.dataset.k); });
  const s = await api('/settings'); window.__S = s;
  const first = document.querySelector('.stab'); if(first) first.click();
}
function fieldRow(label, inner){ return '<div class="mb-4"><label class="block text-sm font-medium mb-1">'+label+'</label>'+inner+'</div>'; }
function inp(id,val,type){ return '<input id="'+id+'" type="'+(type||'text')+'" value="'+(val==null?'':String(val).replace(/"/g,'&quot;'))+'" class="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2 px-3"/>'; }
function saveBtn(fn){ return '<button onclick="'+fn+'" class="bg-blue-600 text-white px-5 py-2 rounded-lg mt-2">Simpan</button>'; }

function renderTab(k){
  const s = window.__S; const v = $('#stabView');
  if(k==='general') v.innerHTML =
    fieldRow('Nama Aplikasi', inp('g_brand',s.brand_name))+
    fieldRow('Logo URL', inp('g_logo',s.logo_url))+
    '<div class="grid grid-cols-3 gap-3">'+fieldRow('Warna Primer', inp('g_c1',s.color_primary,'color'))+fieldRow('Sekunder', inp('g_c2',s.color_secondary,'color'))+fieldRow('Tersier', inp('g_c3',s.color_tertiary,'color'))+'</div>'+
    fieldRow('Dark Mode', '<label class="inline-flex items-center gap-2"><input id="g_dark" type="checkbox" '+(s.dark_mode?'checked':'')+'/> Aktifkan toggle gelap/terang</label>')+
    saveBtn('saveGeneral()');
  else if(k==='imap') v.innerHTML =
    '<p class="text-sm text-gray-500 mb-4">Mailbox catch-all yang menerima email semua domain kamu.</p>'+
    fieldRow('Host', inp('i_host',s.imap_host))+
    '<div class="grid grid-cols-2 gap-3">'+fieldRow('Port', inp('i_port',s.imap_port,'number'))+fieldRow('TLS', '<label class="inline-flex items-center gap-2 mt-2"><input id="i_tls" type="checkbox" '+(s.imap_tls?'checked':'')+'/> Implicit TLS (993)</label>')+'</div>'+
    fieldRow('Username', inp('i_user',s.imap_user))+
    fieldRow('Password', '<input id="i_pass" type="password" placeholder="'+(s.has_imap_pass?'•••••• (biarkan kosong = tetap)':'')+'" class="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2 px-3"/>')+
    saveBtn('saveImap()');
  else if(k==='config') v.innerHTML =
    fieldRow('Batas alamat per pengunjung', inp('c_limit',s.email_limit,'number'))+
    saveBtn('saveConfig()');
  else if(k==='socials'){ v.innerHTML='<div id="socList" class="space-y-2 mb-3"></div><button onclick="addSoc()" class="text-sm border px-3 py-1.5 rounded-lg">+ Tambah</button><div>'+saveBtn('saveSocials()')+'</div>'; window.__soc=JSON.parse(s.socials_json||'[]'); renderSoc(); }
  else if(k==='lang') v.innerHTML =
    fieldRow('Bahasa', '<select id="l_lang" class="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2 px-3"><option value="id" '+(s.lang==='id'?'selected':'')+'>Indonesia</option><option value="en" '+(s.lang==='en'?'selected':'')+'>English</option></select>')+
    saveBtn('saveLang()');
  else if(k==='themes') v.innerHTML =
    fieldRow('Tema Web Publik', '<select id="t_theme" class="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2 px-3"><option value="default" '+(s.theme==='default'?'selected':'')+'>Default</option><option value="mantis" '+(s.theme==='mantis'?'selected':'')+'>Mantis</option><option value="nebula" '+(s.theme==='nebula'?'selected':'')+'>Nebula</option></select>')+
    saveBtn('saveTheme()');
  else if(k==='advance'){ v.innerHTML =
    '<h3 class="font-semibold mb-2">API Keys</h3><div id="keyList" class="space-y-2 mb-3"></div>'+
    '<div class="flex gap-2 mb-6"><input id="keyLabel" placeholder="label (mis. bot-signup)" class="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2 px-3"/><button onclick="addKey()" class="bg-blue-600 text-white px-4 rounded-lg">Buat</button></div>'+
    '<a href="/docs" target="_blank" class="text-sm text-blue-600">Lihat Docs API &rarr;</a>'+
    '<h3 class="font-semibold mt-8 mb-2">Lock (password gembok web)</h3>'+
    (()=>{const lk=JSON.parse(s.lock_json||'{}');return fieldRow('Aktifkan','<label class="inline-flex items-center gap-2"><input id="lk_on" type="checkbox" '+(lk.enable?'checked':'')+'/> Gembok web publik</label>')+fieldRow('Teks', inp('lk_text',lk.text))+fieldRow('Password', inp('lk_pass',lk.password))+saveBtn('saveLock()');})();
    loadKeys();
  }
  else if(k==='io') v.innerHTML =
    '<button onclick="doExport()" class="bg-gray-800 text-white px-4 py-2 rounded-lg mr-2">Export JSON</button>'+
    '<label class="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg cursor-pointer inline-block">Import<input type="file" id="impFile" class="hidden" onchange="doImport(this)"/></label>';
}

/* socials helpers */
function renderSoc(){ $('#socList').innerHTML = window.__soc.map((x,i)=>'<div class="flex gap-2"><input value="'+(x.icon||'')+'" onchange="window.__soc['+i+'].icon=this.value" placeholder="fab fa-twitter" class="w-1/3 rounded-lg border dark:bg-gray-800 py-2 px-3"/><input value="'+(x.link||'')+'" onchange="window.__soc['+i+'].link=this.value" placeholder="https://…" class="flex-1 rounded-lg border dark:bg-gray-800 py-2 px-3"/><button onclick="window.__soc.splice('+i+',1);renderSoc()" class="text-red-600 px-2">&times;</button></div>').join(''); }
function addSoc(){ window.__soc.push({icon:'',link:''}); renderSoc(); }

/* saves */
async function put(patch){ const r=await api('/settings',{method:'POST',body:JSON.stringify(patch)}); if(r.error)alert(r.error); else { toast('Tersimpan'); Object.assign(window.__S,r.settings||{}); } }
function saveGeneral(){ put({brand_name:$('#g_brand').value,logo_url:$('#g_logo').value,color_primary:$('#g_c1').value,color_secondary:$('#g_c2').value,color_tertiary:$('#g_c3').value,dark_mode:$('#g_dark').checked?1:0}); }
function saveImap(){ const p={imap_host:$('#i_host').value,imap_port:+$('#i_port').value,imap_user:$('#i_user').value,imap_tls:$('#i_tls').checked?1:0}; const pw=$('#i_pass').value; if(pw)p.imap_pass=pw; put(p); }
function saveConfig(){ put({email_limit:+$('#c_limit').value}); }
function saveSocials(){ put({socials_json:JSON.stringify(window.__soc)}); }
function saveLang(){ put({lang:$('#l_lang').value}); }
function saveTheme(){ put({theme:$('#t_theme').value}); }
function saveLock(){ put({lock_json:JSON.stringify({enable:$('#lk_on').checked,text:$('#lk_text').value,password:$('#lk_pass').value})}); }

/* keys */
async function loadKeys(){ const d=await api('/keys'); $('#keyList').innerHTML=(d.keys||[]).map(k=>'<div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm"><div><span class="font-mono">'+k.key+'</span> <span class="text-gray-400 ml-2">'+(k.label||'')+'</span></div><button onclick="delKey(\''+k.id+'\')" class="text-red-600">Hapus</button></div>').join('')||'<div class="text-gray-400 text-sm">Belum ada key</div>'; }
async function addKey(){ const label=$('#keyLabel').value; const r=await api('/keys',{method:'POST',body:JSON.stringify({label})}); if(r.key){ $('#keyLabel').value=''; loadKeys(); toast('Key dibuat'); } }
async function delKey(id){ if(confirm('Cabut key?')){ await api('/keys/delete',{method:'POST',body:JSON.stringify({id})}); loadKeys(); } }

/* export/import */
async function doExport(){ const d=await api('/export'); const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tmail-export.json'; a.click(); }
async function doImport(el){ const f=el.files[0]; if(!f)return; const text=await f.text(); const r=await api('/import',{method:'POST',body:text}); if(r.error)alert(r.error); else toast('Import selesai'); }

/* profile */
async function vProfile(){
  view.innerHTML = '<h1 class="text-2xl font-bold mb-6">Profile</h1>'+
    fieldRow('Nama', inp('p_name',ME.name))+
    fieldRow('Password baru', inp('p_pass','','password'))+
    '<button onclick="saveProfile()" class="bg-blue-600 text-white px-5 py-2 rounded-lg">Simpan</button>';
}
async function saveProfile(){ const b={name:$('#p_name').value}; const pw=$('#p_pass').value; if(pw)b.password=pw; const r=await api('/profile',{method:'POST',body:JSON.stringify(b)}); if(r.ok){toast('Tersimpan'); ME.name=b.name; $('#userName').textContent=b.name;} }

/* owner: users */
async function vUsers(){
  view.innerHTML = '<h1 class="text-2xl font-bold mb-6">Users (Buyers)</h1>'+
    '<div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-6"><h3 class="font-semibold mb-3">Buat Buyer</h3>'+
    '<div class="grid md:grid-cols-2 gap-3">'+inp('u_email','','email').replace('id="u_email"','id="u_email" placeholder="email"')+inp('u_name','').replace('id="u_name"','id="u_name" placeholder="nama"')+inp('u_pass','','text').replace('id="u_pass"','id="u_pass" placeholder="password"')+
    '<select id="u_dur" class="rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2 px-3"><option value="30">1 Bulan</option><option value="90">3 Bulan</option><option value="180">6 Bulan</option><option value="365">1 Tahun</option><option value="0">Tanpa batas</option></select></div>'+
    '<button onclick="createBuyer()" class="bg-blue-600 text-white px-5 py-2 rounded-lg mt-3">Buat</button></div>'+
    '<div id="userList" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800"></div>';
  loadUsers();
}
async function loadUsers(){
  const d = await api('/buyers');
  $('#userList').innerHTML = (d.buyers||[]).map(u=>{
    const exp = u.expires_at? new Date(u.expires_at).toISOString().slice(0,10):'—';
    const days = u.expires_at? Math.ceil((u.expires_at-Date.now())/86400000):null;
    const badge = u.status==='active'?'bg-green-100 text-green-700':(u.status==='expired'?'bg-red-100 text-red-700':'bg-gray-200 text-gray-600');
    const warn = (u.status==='active' && days!=null && days<=3 && days>=0) ? '<span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded ml-1"><i class="fas fa-triangle-exclamation"></i> mau habis '+days+'h</span>' : '';
    const expCls = (days!=null && days<=3) ? 'text-amber-600 font-medium' : 'text-gray-400';
    return '<div class="p-4 flex flex-wrap items-center justify-between gap-3"><div><div class="font-medium">'+u.email+' <span class="text-xs '+badge+' px-2 py-0.5 rounded ml-1">'+u.status+'</span>'+warn+'</div><div class="text-xs '+expCls+'">'+(u.name||'')+' · exp: '+exp+(days!=null?' ('+days+'h)':'')+'</div></div>'+
    '<div class="flex flex-wrap gap-2 text-xs">'+
    '<button onclick="loginAs(\''+u.id+'\')" class="border px-2 py-1 rounded"><i class="fas fa-user-secret"></i> Login as</button>'+
    '<button onclick="extend(\''+u.id+'\')" class="border px-2 py-1 rounded">Perpanjang</button>'+
    '<button onclick="toggleUser(\''+u.id+'\',\''+(u.status==='suspended'?'active':'suspended')+'\')" class="border px-2 py-1 rounded">'+(u.status==='suspended'?'Aktifkan':'Suspend')+'</button>'+
    '<button onclick="delUser(\''+u.id+'\')" class="border border-red-200 text-red-600 px-2 py-1 rounded">Hapus</button></div></div>';
  }).join('') || '<div class="p-6 text-center text-gray-400">Belum ada buyer</div>';
}
async function createBuyer(){
  const b={email:$('#u_email').value,name:$('#u_name').value,password:$('#u_pass').value,days:+$('#u_dur').value};
  if(!b.email||!b.password){alert('email & password wajib');return;}
  const r=await api('/buyers',{method:'POST',body:JSON.stringify(b)});
  if(r.error)alert(r.error); else { $('#u_email').value=$('#u_name').value=$('#u_pass').value=''; loadUsers(); toast('Buyer dibuat'); }
}
async function extend(id){ const days=prompt('Perpanjang berapa hari dari sekarang? (0 = tanpa batas)','30'); if(days==null)return; await api('/buyers/expiry',{method:'POST',body:JSON.stringify({id,days:+days})}); loadUsers(); }
async function toggleUser(id,status){ await api('/buyers/status',{method:'POST',body:JSON.stringify({id,status})}); loadUsers(); }
async function delUser(id){ if(confirm('Hapus buyer + semua datanya?')){ await api('/buyers/delete',{method:'POST',body:JSON.stringify({id})}); loadUsers(); } }
async function loginAs(id){ const r=await api('/buyers/login-as',{method:'POST',body:JSON.stringify({id})}); if(r.url) location.href=r.url; else alert(r.error||'gagal'); }

/* router */
const ROUTES = { '#dashboard':vDashboard, '#domains':vDomains, '#settings':vSettings, '#profile':vProfile, '#users':vUsers };
function route(){
  let hash = location.hash || (ME.role==='owner'?'#users':'#dashboard');
  if(!ROUTES[hash]) hash = (ME.role==='owner'?'#users':'#dashboard');
  setActive(hash); (ROUTES[hash]||(()=>view.innerHTML='404'))();
}
window.addEventListener('hashchange', route);

/* boot */
(async ()=>{
  ME = await api('/me');
  if(!ME || !ME.role){ location.href='/admin'; return; }
  $('#userName').textContent = ME.name || ME.email;
  $('#brandName').textContent = ME.brand || 'Admin';
  renderNav(); expiryBanner(); route();
  $('#userBtn').onclick = ()=> $('#userMenu').classList.toggle('hidden');
  $('#logoutBtn').onclick = ()=> location.href='/admin/logout';
})();
`;
