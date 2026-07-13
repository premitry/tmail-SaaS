// UI Admin: halaman login + shell SPA (sidebar) untuk owner & buyer.
import { head, esc } from "./ui";

export function renderLogin(brand: string, role: "owner" | "buyer", error = ""): string {
  const title = role === "owner" ? "Owner Panel" : brand + " Admin";
  return `${head(title + " — Login")}
<body class="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen flex items-center justify-center px-4">
  <form id="f" class="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 space-y-4">
    <div class="text-center">
      <div class="text-4xl mb-2">${role === "owner" ? "🛡️" : "📮"}</div>
      <h1 class="text-xl font-bold">${esc(title)}</h1>
    </div>
    ${error ? `<div class="bg-red-100 text-red-700 text-sm p-3 rounded-lg">${esc(error)}</div>` : ""}
    <input name="email" type="email" placeholder="Email" required class="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    <input name="password" type="password" placeholder="Password" required class="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg">Masuk</button>
  </form>
  <script>
    document.getElementById('f').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      // bawa ?__tenant= (tes via IP) ke request login
      const r = await fetch('/admin/login' + location.search, { method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) });
      const d = await r.json();
      if(d.ok) location.href = '/admin' + location.search;
      else { document.querySelector('h1').insertAdjacentHTML('afterend','<div class="bg-red-100 text-red-700 text-sm p-3 rounded-lg mt-3">'+(d.error||'gagal')+'</div>'); }
    };
  </script>
</body></html>`;
}

export function renderAdminShell(brand: string): string {
  return `${head(brand + " — Admin")}
<body class="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
<div class="flex min-h-screen">
  <aside class="w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed inset-y-0 z-20">
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
        <button id="logoutBtn" class="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"><i class="fas fa-sign-out-alt mr-2"></i>Logout</button>
      </div>
    </div>
  </aside>
  <main class="flex-1 ml-60">
    <header class="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 flex items-center justify-end gap-4 px-6 sticky top-0 z-10">
      <button onclick="toggleDark()" title="Tema gelap/terang" class="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-lg">
        <i class="fas fa-moon dark:hidden"></i><i class="fas fa-sun hidden dark:inline text-yellow-400"></i>
      </button>
    </header>
    <div id="banner"></div>
    <div id="view" class="p-8 max-w-4xl">Memuat…</div>
  </main>
</div>
<div id="modalRoot"></div>
<script>
${ADMIN_APP_JS}
</script>
</body></html>`;
}

// ── SPA client (vanilla JS, tanpa backtick / ${} karena String.raw) ──
const ADMIN_APP_JS = String.raw`
let ME = null;
const $ = (s,r=document)=>r.querySelector(s);
const view = $('#view');
const QS = location.search; // bawa ?__tenant= saat tes via IP

async function api(path, opts){
  const sep = path.indexOf('?')>=0 ? '&' : '?';
  const url = '/admin/api'+path + (QS ? sep + QS.slice(1) : '');
  const r = await fetch(url, Object.assign({headers:{'content-type':'application/json'}}, opts||{}));
  if(r.status===401){ location.href='/admin'+QS; return {}; }
  return r.json();
}
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function toast(m){ const d=document.createElement('div'); d.textContent=m; d.className='fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50'; document.body.appendChild(d); setTimeout(()=>d.remove(),2000); }

/* ---- komponen kecil ---- */
const INP = 'w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500';
function inp(id,val,type,ph){ return '<input id="'+id+'" type="'+(type||'text')+'" '+(ph?'placeholder="'+esc(ph)+'" ':'')+'value="'+esc(val)+'" class="'+INP+'"/>'; }
function field(label,desc,inner){ return '<div class="mb-4"><label class="block text-sm font-medium">'+label+'</label>'+(desc?'<p class="text-xs text-gray-400 mb-1.5">'+desc+'</p>':'<div class="mb-1.5"></div>')+inner+'</div>'; }
function card(title,desc,inner){ return '<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-5"><h3 class="font-semibold">'+title+'</h3>'+(desc?'<p class="text-xs text-gray-400 mb-4">'+desc+'</p>':'<div class="mb-4"></div>')+inner+'</div>'; }
function saveBtn(fn){ return '<button onclick="'+fn+'" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg mt-1">Simpan</button>'; }
function openModal(inner){ $('#modalRoot').innerHTML = '<div class="fixed inset-0 bg-black/50 z-40 flex items-start justify-center p-4 overflow-y-auto" onclick="if(event.target===this)closeModal()"><div class="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 mt-16">'+inner+'</div></div>'; }
function closeModal(){ $('#modalRoot').innerHTML=''; }

const NAV = {
  owner: [ ['#users','Users','fa-users'] ],
  buyer: [ ['#dashboard','Dashboard','fa-gauge-high'], ['#domains','Domains','fa-globe'], ['#settings','Settings','fa-gear'] ],
};
function renderNav(){
  const items = NAV[ME.role] || [];
  $('#nav').innerHTML = items.map(x=>'<a href="'+x[0]+QS+'" class="navlink flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" data-h="'+x[0]+'"><i class="fas '+x[2]+' w-4"></i>'+x[1]+'</a>').join('');
}
function setActive(hash){ document.querySelectorAll('.navlink').forEach(a=>{ const on=a.dataset.h===hash; a.classList.toggle('bg-indigo-50',on); a.classList.toggle('dark:bg-gray-800',on); a.classList.toggle('text-indigo-600',on); a.classList.toggle('font-semibold',on); }); }

function expiryBanner(){
  if(ME.role!=='buyer') return;
  const b=$('#banner');
  if(ME.impersonating){ b.innerHTML='<div class="bg-amber-500 text-white text-sm px-6 py-2 flex justify-between items-center"><span><i class="fas fa-user-secret mr-2"></i>Login sebagai buyer ini (impersonation).</span><a href="/admin/logout'+QS+'" class="underline">Keluar</a></div>'; return; }
  if(ME.expiresInDays!=null && ME.expiresInDays<=3 && !sessionStorage.getItem('exp_dismissed')){
    b.innerHTML='<div class="bg-red-600 text-white text-sm px-6 py-2 flex justify-between items-center"><span><i class="fas fa-triangle-exclamation mr-2"></i>Langganan mau habis — sisa '+ME.expiresInDays+' hari.</span><button onclick="this.closest(\'div\').remove();sessionStorage.setItem(\'exp_dismissed\',\'1\')" class="text-lg leading-none">&times;</button></div>';
  }
}

/* ============ DASHBOARD (buyer) + grafik ============ */
function chartSVG(series){
  if(!series||!series.length) return '<div class="text-gray-400 text-sm py-12 text-center">Belum ada data grafik</div>';
  const w=620,h=210,pad=32,n=series.length; let max=1;
  series.forEach(s=>{ max=Math.max(max,s.emails_created,s.messages_received); });
  const X=i=> n===1 ? pad+(w-pad*2)/2 : pad+(w-pad*2)*i/(n-1);
  const Y=v=> h-pad-(v/max)*(h-pad*2);
  let g='';
  for(let k=0;k<=2;k++){ const gy=pad+(h-pad*2)*k/2; const val=Math.round(max*(2-k)/2);
    g+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'" stroke="#e5e7eb" stroke-width="1"/>';
    g+='<text x="'+(pad-6)+'" y="'+(gy+3)+'" font-size="9" fill="#9ca3af" text-anchor="end">'+val+'</text>'; }
  function lineOf(key,color){
    const pts=series.map((s,i)=>X(i)+','+Y(s[key])).join(' ');
    const dots=series.map((s,i)=>'<circle cx="'+X(i)+'" cy="'+Y(s[key])+'" r="2.5" fill="'+color+'"><title>'+s[key]+'</title></circle>').join('');
    return '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'+dots;
  }
  const step=n>8?Math.ceil(n/8):1;
  const xl=series.map((s,i)=> (i%step===0||i===n-1) ? '<text x="'+X(i)+'" y="'+(h-pad+15)+'" font-size="9" fill="#9ca3af" text-anchor="middle">'+String(s.day).slice(5)+'</text>' : '').join('');
  return '<svg viewBox="0 0 '+w+' '+h+'" class="w-full">'+g+lineOf('emails_created','#4f46e5')+lineOf('messages_received','#22c55e')+xl+'</svg>'+
    '<div class="flex gap-4 justify-center text-xs text-gray-500 mt-2"><span><i class="fas fa-minus text-indigo-500"></i> Email dibuat</span><span><i class="fas fa-minus text-green-500"></i> Pesan diterima</span></div>';
}
function toggle(id,checked,label){ return '<label class="inline-flex items-center gap-3 cursor-pointer"><input id="'+id+'" type="checkbox" class="sr-only peer" '+(checked?'checked':'')+'/><span class="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-checked:bg-indigo-600 rounded-full relative transition-colors after:content-[\'\'] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5"></span>'+(label?'<span class="text-sm">'+label+'</span>':'')+'</label>'; }
async function vDashboard(){
  view.innerHTML='<h1 class="text-2xl font-bold mb-6">Dashboard</h1><div id="cards" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"></div>'+
    '<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 p-5">'+
      '<div class="flex items-center justify-between mb-1"><h3 class="font-semibold">Aktivitas</h3>'+
        '<select id="daySel" onchange="loadChart(this.value)" class="text-sm rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">'+
          '<option value="7">7 hari</option><option value="14" selected>14 hari</option><option value="30">30 hari</option><option value="60">60 hari</option><option value="90">90 hari</option>'+
        '</select></div>'+
      '<p class="text-xs text-gray-400 mb-3">Jumlah email dibuat & pesan diterima per hari.</p>'+
      '<div id="chartBody" class="text-gray-400 text-sm py-12 text-center">Memuat…</div></div>';
  const d=await api('/dashboard');
  const cards=[['Email dibuat',d.emails,'fa-at','text-indigo-600'],['Pesan diterima',d.messages,'fa-inbox','text-green-600'],['Domain',d.domains,'fa-globe','text-purple-600'],['Hari ini',(d.series&&d.series.length?d.series[d.series.length-1].messages_received:0),'fa-bolt','text-amber-600']];
  $('#cards').innerHTML=cards.map(c=>'<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 p-5"><div class="'+c[3]+' text-xl mb-2"><i class="fas '+c[2]+'"></i></div><div class="text-3xl font-bold">'+(c[1]||0)+'</div><div class="text-sm text-gray-500 mt-1">'+c[0]+'</div></div>').join('');
  $('#chartBody').innerHTML=chartSVG(d.series);
}
async function loadChart(days){
  const el=$('#chartBody'); if(el) el.innerHTML='<div class="py-12 text-center text-gray-400 text-sm">Memuat…</div>';
  const d=await api('/dashboard?days='+days);
  if($('#chartBody')) $('#chartBody').innerHTML=chartSVG(d.series);
}

/* ============ DOMAINS (card) ============ */
async function vDomains(){
  view.innerHTML='<h1 class="text-2xl font-bold mb-2">Domains</h1><p class="text-sm text-gray-400 mb-5">Semua domain otomatis pakai IMAP di Settings. Arahkan MX domain ke mailbox catch-all IMAP-mu.</p>'+
    '<div class="flex gap-2 mb-6 max-w-md"><input id="newDomain" placeholder="contoh.com" class="flex-1 '+INP+'"/><button id="addDomain" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-lg">Tambah</button></div>'+
    '<div id="domainGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>';
  $('#addDomain').onclick=async()=>{ const v=$('#newDomain').value.trim(); if(!v)return; const r=await api('/domains',{method:'POST',body:JSON.stringify({domain:v})}); if(r.error)alert(r.error); else {$('#newDomain').value='';loadDomains();} };
  loadDomains();
}
async function loadDomains(){
  const d=await api('/domains');
  $('#domainGrid').innerHTML=(d.domains||[]).map(x=>
    '<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-3">'+
    '<div class="flex items-center gap-2"><i class="fas fa-globe text-indigo-500"></i><span class="font-mono text-sm truncate">'+esc(x.domain)+'</span></div>'+
    '<span class="text-xs w-fit '+(x.is_active?'bg-green-100 text-green-700':'bg-gray-200 text-gray-600')+' px-2 py-0.5 rounded">'+(x.is_active?'aktif':'nonaktif')+'</span>'+
    '<div class="flex gap-2 mt-auto"><button onclick="toggleDomain(\''+x.id+'\','+(x.is_active?0:1)+')" class="text-xs border dark:border-gray-700 px-2 py-1 rounded flex-1">'+(x.is_active?'Nonaktifkan':'Aktifkan')+'</button><button onclick="delDomain(\''+x.id+'\')" class="text-xs text-red-600 border border-red-200 px-2 py-1 rounded">Hapus</button></div></div>'
  ).join('') || '<div class="col-span-full text-center text-gray-400 py-10 border border-dashed dark:border-gray-800 rounded-xl">Belum ada domain</div>';
}
async function toggleDomain(id,a){ await api('/domains/toggle',{method:'POST',body:JSON.stringify({id,active:!!a})}); loadDomains(); }
async function delDomain(id){ if(confirm('Hapus domain?')){ await api('/domains/delete',{method:'POST',body:JSON.stringify({id})}); loadDomains(); } }

/* ============ SETTINGS (semua ke bawah + keterangan) ============ */
async function vSettings(){
  const s=await api('/settings'); window.__S=s;
  const lk=JSON.parse(s.lock_json||'{}'); window.__soc=JSON.parse(s.socials_json||'[]');
  let hostsInfo='';
  view.innerHTML='<h1 class="text-2xl font-bold mb-6">Settings</h1>'+
  card('General','Identitas & warna tampilan web publik.',
    field('Nama Aplikasi','Nama brand yang tampil di web & admin.',inp('g_brand',s.brand_name))+
    field('Logo URL','Alamat gambar logo (opsional).',inp('g_logo',s.logo_url,'text','https://…'))+
    '<div class="flex flex-wrap gap-4">'+field('Warna Primer','Sidebar.',inp('g_c1',s.color_primary,'color'))+field('Sekunder','Tombol Create.',inp('g_c2',s.color_secondary,'color'))+field('Tersier','Tombol Random.',inp('g_c3',s.color_tertiary,'color'))+'</div>'+
    field('Dark Mode','Tampilkan toggle gelap/terang.',toggle('g_dark',s.dark_mode,'Aktifkan'))+
    saveBtn('saveGeneral()'))+
  card('IMAP','Mailbox catch-all yang menerima email semua domainmu.',
    field('Host','mis. imap.domain.com',inp('i_host',s.imap_host))+
    '<div class="flex flex-wrap gap-4">'+field('Port','993 (TLS).','<input id="i_port" type="number" value="'+esc(s.imap_port)+'" class="w-32 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2 px-3"/>')+field('TLS','Implicit TLS.',toggle('i_tls',s.imap_tls,'993'))+'</div>'+
    field('Username','User login mailbox.',inp('i_user',s.imap_user))+
    field('Password',(s.has_imap_pass?'Sudah tersimpan — kosongkan jika tak ingin ganti.':'Password mailbox (dienkripsi).'),'<input id="i_pass" type="password" placeholder="'+(s.has_imap_pass?'••••••':'')+'" class="'+INP+'"/>')+
    saveBtn('saveImap()'))+
  card('Configuration','Aturan pembuatan alamat.',
    field('Batas alamat / pengunjung','Maksimum alamat aktif per pengunjung.','<input id="c_limit" type="number" value="'+esc(s.email_limit)+'" class="w-32 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 py-2 px-3"/>')+
    saveBtn('saveConfig()'))+
  card('Socials','Ikon sosial media di footer web.','<div id="socList" class="space-y-2 mb-3 max-w-lg"></div><button onclick="addSoc()" class="text-sm border dark:border-gray-700 px-3 py-1.5 rounded-lg mb-3">+ Tambah</button><br>'+saveBtn('saveSocials()'))+
  card('Languages','Bahasa default web publik.',
    field('Bahasa','',('<select id="l_lang" class="'+INP+'"><option value="id" '+(s.lang==='id'?'selected':'')+'>Indonesia</option><option value="en" '+(s.lang==='en'?'selected':'')+'>English</option></select>'))+
    saveBtn('saveLang()'))+
  card('Themes','Ubah tampilan web publik. Simpan lalu buka web-nya untuk melihat.',
    field('Tema','default = sidebar solid · mantis = hijau gradien · nebula = gelap ungu.',('<select id="t_theme" class="'+INP+'"><option value="default" '+(s.theme==='default'?'selected':'')+'>Default</option><option value="mantis" '+(s.theme==='mantis'?'selected':'')+'>Mantis</option><option value="nebula" '+(s.theme==='nebula'?'selected':'')+'>Nebula</option></select>')+
    '<a href="/'+QS+'" target="_blank" class="text-sm text-indigo-600 inline-block mt-1">Buka web publik &rarr;</a>')+
    saveBtn('saveTheme()'))+
  card('Advance','API key & gembok halaman.',
    '<h4 class="text-sm font-semibold mb-1">API Keys</h4><p class="text-xs text-gray-400 mb-2">Untuk otomasi eksternal. <a href="/docs'+QS+'" target="_blank" class="text-indigo-600">Docs</a></p><div id="keyList" class="space-y-2 mb-3 max-w-lg"></div>'+
    '<div class="flex gap-2 mb-6 max-w-md"><input id="keyLabel" placeholder="label (mis. bot-signup)" class="flex-1 '+INP+'"/><button onclick="addKey()" class="bg-indigo-600 text-white px-4 rounded-lg">Buat</button></div>'+
    '<h4 class="text-sm font-semibold mb-1">Kunci Web</h4><p class="text-xs text-gray-400 mb-2">Kunci web publik dengan password.</p>'+
    field('Aktifkan','',toggle('lk_on',lk.enable,'Kunci web'))+
    field('Teks','Pesan di layar gembok.',inp('lk_text',lk.text||''))+
    field('Password','',inp('lk_pass',lk.password||''))+
    saveBtn('saveLock()'))+
  card('Export / Import','Cadangkan / pulihkan daftar domain & setting.',
    '<button onclick="doExport()" class="bg-gray-800 text-white px-4 py-2 rounded-lg mr-2">Export JSON</button>'+
    '<label class="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg cursor-pointer inline-block">Import<input type="file" id="impFile" class="hidden" onchange="doImport(this)"/></label>');
  renderSoc(); loadKeys();
}
function renderSoc(){ $('#socList').innerHTML=window.__soc.map((x,i)=>'<div class="flex gap-2"><input value="'+esc(x.icon)+'" onchange="window.__soc['+i+'].icon=this.value" placeholder="fab fa-twitter" class="w-40 rounded-lg border dark:border-gray-700 dark:bg-gray-800 py-2 px-3"/><input value="'+esc(x.link)+'" onchange="window.__soc['+i+'].link=this.value" placeholder="https://…" class="flex-1 rounded-lg border dark:border-gray-700 dark:bg-gray-800 py-2 px-3"/><button onclick="window.__soc.splice('+i+',1);renderSoc()" class="text-red-600 px-2">&times;</button></div>').join(''); }
function addSoc(){ window.__soc.push({icon:'',link:''}); renderSoc(); }
async function put(patch){ const r=await api('/settings',{method:'POST',body:JSON.stringify(patch)}); if(r.error)alert(r.error); else { toast('Tersimpan'); if(r.settings)window.__S=r.settings; } }
function saveGeneral(){ put({brand_name:$('#g_brand').value,logo_url:$('#g_logo').value,color_primary:$('#g_c1').value,color_secondary:$('#g_c2').value,color_tertiary:$('#g_c3').value,dark_mode:$('#g_dark').checked?1:0}); }
function saveImap(){ const p={imap_host:$('#i_host').value,imap_port:+$('#i_port').value,imap_user:$('#i_user').value,imap_tls:$('#i_tls').checked?1:0}; const pw=$('#i_pass').value; if(pw)p.imap_pass=pw; put(p); }
function saveConfig(){ put({email_limit:+$('#c_limit').value}); }
function saveSocials(){ put({socials_json:JSON.stringify(window.__soc)}); }
function saveLang(){ put({lang:$('#l_lang').value}); }
function saveTheme(){ put({theme:$('#t_theme').value}); }
function saveLock(){ put({lock_json:JSON.stringify({enable:$('#lk_on').checked,text:$('#lk_text').value,password:$('#lk_pass').value})}); }
async function loadKeys(){ const d=await api('/keys'); $('#keyList').innerHTML=(d.keys||[]).map(k=>'<div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm"><div class="min-w-0"><span class="font-mono">'+esc(k.key)+'</span> <span class="text-gray-400 ml-2">'+esc(k.label)+'</span></div><button onclick="delKey(\''+k.id+'\')" class="text-red-600">Hapus</button></div>').join('')||'<div class="text-gray-400 text-sm">Belum ada key</div>'; }
async function addKey(){ const label=$('#keyLabel').value; const r=await api('/keys',{method:'POST',body:JSON.stringify({label})}); if(r.key){ $('#keyLabel').value=''; loadKeys(); toast('Key dibuat'); } }
async function delKey(id){ if(confirm('Cabut key?')){ await api('/keys/delete',{method:'POST',body:JSON.stringify({id})}); loadKeys(); } }
async function doExport(){ const d=await api('/export'); const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tmail-export.json'; a.click(); }
async function doImport(el){ const f=el.files[0]; if(!f)return; const t=await f.text(); const r=await api('/import',{method:'POST',body:t}); if(r.error)alert(r.error); else toast('Import selesai'); }

/* ============ PROFILE ============ */
function vProfile(){ view.innerHTML='<h1 class="text-2xl font-bold mb-6">Profile</h1>'+card('Akun','Ubah nama & password.',field('Nama','',inp('p_name',ME.name))+field('Password baru','Kosongkan jika tak ganti.',inp('p_pass','','password'))+'<button onclick="saveProfile()" class="bg-indigo-600 text-white px-5 py-2 rounded-lg">Simpan</button>'); }
async function saveProfile(){ const b={name:$('#p_name').value}; const pw=$('#p_pass').value; if(pw)b.password=pw; const r=await api('/profile',{method:'POST',body:JSON.stringify(b)}); if(r.ok){toast('Tersimpan');ME.name=b.name;$('#userName').textContent=b.name;} }

/* ============ USERS (owner) — modal + detail expand ============ */
function vUsers(){
  view.innerHTML='<div class="flex items-center justify-between mb-6"><h1 class="text-2xl font-bold">Users (Buyers)</h1><button onclick="modalCreateBuyer()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm"><i class="fas fa-plus mr-1"></i> Buat Buyer</button></div><div id="userList" class="space-y-3"></div>';
  loadUsers();
}
function modalCreateBuyer(){
  openModal('<h3 class="text-lg font-bold mb-4">Buat Buyer</h3>'+
    field('Email','',inp('u_email','','email','email@buyer.com'))+
    field('Nama','',inp('u_name','','text','Nama buyer'))+
    field('Password','',inp('u_pass','','text','password'))+
    field('Masa aktif','Otomatis diset dari sekarang.',('<select id="u_dur" class="'+INP+'"><option value="30">1 Bulan</option><option value="90">3 Bulan</option><option value="180">6 Bulan</option><option value="365">1 Tahun</option><option value="0">Tanpa batas</option></select>'))+
    field('Web hostname (opsional)','Domain web buyer; diprovision via Cloudflare for SaaS.',inp('u_host','','text','mail.buyer.com'))+
    '<div class="flex gap-2 justify-end mt-2"><button onclick="closeModal()" class="px-4 py-2 rounded-lg border dark:border-gray-700">Batal</button><button onclick="submitCreateBuyer()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Buat</button></div>');
}
async function submitCreateBuyer(){
  const b={email:$('#u_email').value,name:$('#u_name').value,password:$('#u_pass').value,days:+$('#u_dur').value,hostname:$('#u_host').value.trim()};
  if(!b.email||!b.password){alert('email & password wajib');return;}
  const r=await api('/buyers',{method:'POST',body:JSON.stringify(b)});
  if(r.error){alert(r.error);return;}
  closeModal(); loadUsers(); toast('Buyer dibuat');
}
async function loadUsers(){
  const d=await api('/buyers');
  $('#userList').innerHTML=(d.buyers||[]).map(u=>{
    const exp=u.expires_at?new Date(u.expires_at).toISOString().slice(0,10):'—';
    const days=u.expires_at?Math.ceil((u.expires_at-Date.now())/86400000):null;
    const badge=u.status==='active'?'bg-green-100 text-green-700':(u.status==='expired'?'bg-red-100 text-red-700':'bg-gray-200 text-gray-600');
    const warn=(u.status==='active'&&days!=null&&days<=3&&days>=0)?'<span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded ml-1"><i class="fas fa-triangle-exclamation"></i> mau habis '+days+'h</span>':'';
    return '<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">'+
      '<div class="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onclick="toggleDetail(\''+u.id+'\')">'+
        '<div><div class="font-medium">'+esc(u.email)+' <span class="text-xs '+badge+' px-2 py-0.5 rounded ml-1">'+u.status+'</span>'+warn+'</div>'+
        '<div class="text-xs '+(days!=null&&days<=3?'text-amber-600':'text-gray-400')+'">'+esc(u.name)+' · exp: '+exp+(days!=null?' ('+days+'h)':'')+' <i class="fas fa-chevron-down ml-1"></i></div></div>'+
        '<div class="flex flex-wrap gap-2 text-xs" onclick="event.stopPropagation()">'+
          '<button onclick="loginAs(\''+u.id+'\')" class="border dark:border-gray-700 px-2 py-1 rounded"><i class="fas fa-user-secret"></i> Login as</button>'+
          '<button onclick="extend(\''+u.id+'\')" class="border dark:border-gray-700 px-2 py-1 rounded">Perpanjang</button>'+
          '<button onclick="toggleUser(\''+u.id+'\',\''+(u.status==='suspended'?'active':'suspended')+'\')" class="border dark:border-gray-700 px-2 py-1 rounded">'+(u.status==='suspended'?'Aktifkan':'Suspend')+'</button>'+
          '<button onclick="delUser(\''+u.id+'\')" class="border border-red-200 text-red-600 px-2 py-1 rounded">Hapus</button></div></div>'+
      '<div id="det-'+u.id+'" class="hidden border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900 text-sm"></div></div>';
  }).join('')||'<div class="text-center text-gray-400 py-10 border border-dashed dark:border-gray-800 rounded-xl">Belum ada buyer</div>';
}
async function toggleDetail(id){
  const el=$('#det-'+id); if(!el)return;
  if(!el.classList.contains('hidden')){ el.classList.add('hidden'); return; }
  el.classList.remove('hidden'); el.innerHTML='<span class="text-gray-400">memuat…</span>';
  const d=await api('/buyers/detail?id='+id);
  if(d.error){ el.innerHTML='<span class="text-red-500">'+esc(d.error)+'</span>'; return; }
  const created=new Date(d.user.created_at).toISOString().slice(0,10);
  const stat=(l,v)=>'<div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 p-3"><div class="text-lg font-bold">'+v+'</div><div class="text-xs text-gray-500">'+l+'</div></div>';
  el.innerHTML=
    '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">'+stat('Email dibuat',d.stats.emails)+stat('Pesan diterima',d.stats.messages)+stat('Domain',d.domains.length)+stat('Web hostname',d.hostnames.length)+'</div>'+
    '<div class="grid md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600 dark:text-gray-300">'+
      '<div><b>Dibuat:</b> '+created+'</div><div><b>IMAP:</b> '+(d.settings.has_imap?esc(d.settings.imap_host||'terisi'):'<span class=\"text-red-500\">belum diset</span>')+'</div>'+
      '<div><b>Tema:</b> '+esc(d.settings.theme)+' · <b>Bahasa:</b> '+esc(d.settings.lang)+'</div>'+
      '<div><b>Domain:</b> '+(d.domains.map(x=>esc(x.domain)).join(', ')||'—')+'</div>'+
      '<div class="md:col-span-2"><b>Web:</b> '+(d.hostnames.map(x=>esc(x.hostname)+' ('+esc(x.status)+')').join(', ')||'—')+'</div>'+
    '</div>'+
    chartSVG(d.stats.series);
}
async function extend(id){ const days=prompt('Perpanjang berapa hari dari sekarang? (0 = tanpa batas)','30'); if(days==null)return; await api('/buyers/expiry',{method:'POST',body:JSON.stringify({id,days:+days})}); loadUsers(); }
async function toggleUser(id,status){ await api('/buyers/status',{method:'POST',body:JSON.stringify({id,status})}); loadUsers(); }
async function delUser(id){ if(confirm('Hapus buyer + semua datanya?')){ await api('/buyers/delete',{method:'POST',body:JSON.stringify({id})}); loadUsers(); } }
async function loginAs(id){ const r=await api('/buyers/login-as',{method:'POST',body:JSON.stringify({id})}); if(r.url) location.href=r.url+(QS?(r.url.indexOf('?')>=0?'&':'?')+QS.slice(1):''); else alert(r.error||'gagal'); }

/* ============ router ============ */
const ROUTES={ '#dashboard':vDashboard, '#domains':vDomains, '#settings':vSettings, '#profile':vProfile, '#users':vUsers };
function route(){ let hash=location.hash||(ME.role==='owner'?'#users':'#dashboard'); if(!ROUTES[hash])hash=(ME.role==='owner'?'#users':'#dashboard'); setActive(hash); (ROUTES[hash]||(()=>view.innerHTML='404'))(); }
window.addEventListener('hashchange', route);

(async ()=>{
  ME=await api('/me');
  if(!ME||!ME.role){ location.href='/admin'+QS; return; }
  $('#userName').textContent=ME.name||ME.email;
  $('#brandName').textContent=ME.brand||'Admin';
  renderNav(); expiryBanner(); route();
  $('#userBtn').onclick=()=>$('#userMenu').classList.toggle('hidden');
  $('#logoutBtn').onclick=()=>location.href='/admin/logout'+QS;
})();
`;
