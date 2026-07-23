// UI Admin: halaman login + shell SPA (sidebar collapsible) untuk owner & buyer.
import { head, esc } from "./ui";
import { DEFAULT_LOGO, THEME_PREVIEWS } from "./assets";

export function renderLogin(brand: string, role: "owner" | "buyer", error = ""): string {
  const title = role === "owner" ? "Owner Panel" : brand + " Admin";
  return `${head(title + " — Login", '<style>html:not(.dark) body{background-color:#e4e6eb}html:not(.dark) .bg-white{background-color:#f4f5f7!important}html:not(.dark) .bg-gray-100{background-color:#e4e6eb!important}</style>')}
<body class="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen flex items-center justify-center px-4">
  <form id="f" class="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 space-y-4">
    <div class="text-center">
      <div class="text-4xl mb-2">${role === "owner" ? "🛡️" : "📮"}</div>
      <h1 class="text-xl font-bold">${esc(title)}</h1>
    </div>
    <div id="loginErr" class="hidden bg-red-100 text-red-700 text-sm p-3 rounded-lg text-center">${error ? esc(error) : ""}</div>
    <input name="email" type="text" placeholder="Email atau username" required class="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    <input name="password" type="password" placeholder="Password" required class="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg">Masuk</button>
  </form>
  <script>
    var _et;
    function showErr(m){ var e=document.getElementById('loginErr'); e.textContent=m; e.classList.remove('hidden'); clearTimeout(_et); _et=setTimeout(function(){ e.classList.add('hidden'); }, 3000); }
    document.getElementById('f').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const r = await fetch('/admin/login' + location.search, { method:'POST', headers:{'content-type':'application/json'},
          body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) });
        const d = await r.json();
        if(d.ok) location.href = '/admin' + location.search;
        else showErr(d.error || 'gagal');
      } catch(_) { showErr('gagal terhubung'); }
    };
  </script>
</body></html>`;
}

const SB_STYLE = `<style>
#sb{transition:transform .2s,width .15s}
#sbBackdrop{display:none}
@media(min-width:768px){
  .sbc #sb{width:4rem}
  .sbc #sb .lbl,.sbc #sb #brandName,.sbc #sb #userName{display:none}
  .sbc #sb .navlink,.sbc #sb #userBtn{justify-content:center}
  .sbc main{margin-left:4rem}
}
@media(max-width:767px){
  #sb{transform:translateX(-100%);width:15rem}
  body.sb-open #sb{transform:translateX(0)}
  body.sb-open #sbBackdrop{display:block}
}
/* Tema terang dilembutin biar gak silau */
html:not(.dark) body{background-color:#e4e6eb}
html:not(.dark) .bg-white{background-color:#f4f5f7!important}
html:not(.dark) .bg-gray-100{background-color:#e4e6eb!important}
html:not(.dark) .bg-gray-50{background-color:#ecedf1!important}
@media(max-width:520px){#visitBtn .vlbl{display:none}#visitBtn{padding:14px!important}}
</style>`;

export function renderAdminShell(brand: string): string {
  return `${head(brand + " — Admin", SB_STYLE)}
<body class="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
<div class="flex min-h-screen">
  <aside id="sb" class="w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col fixed inset-y-0 z-30">
    <div class="h-16 flex items-center gap-2 px-4 border-b border-gray-200 dark:border-gray-700 font-bold text-lg overflow-hidden">
      <span class="text-2xl">📮</span><span id="brandName" class="truncate">${esc(brand)}</span>
    </div>
    <nav id="nav" class="flex-1 p-3 space-y-1 text-sm"></nav>
    <div class="p-3 border-t border-gray-200 dark:border-gray-700 text-sm relative">
      <button id="userBtn" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
        <i class="fas fa-user-circle text-lg"></i><span id="userName" class="truncate">-</span>
      </button>
      <div id="userMenu" class="hidden absolute bottom-14 left-3 right-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
        <a href="#profile" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"><i class="fas fa-user mr-2"></i>Profile</a>
        <button id="logoutBtn" class="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"><i class="fas fa-sign-out-alt mr-2"></i>Logout</button>
      </div>
    </div>
  </aside>
  <div id="sbBackdrop" onclick="closeDrawer()" class="fixed inset-0 bg-black/40 z-20"></div>
  <main class="flex-1 md:ml-60 min-w-0">
    <header class="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 px-4 md:px-5 sticky top-0 z-10">
      <button onclick="toggleSidebar()" title="Menu / kecilkan sidebar" class="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"><i class="fas fa-bars"></i></button>
      <div class="ml-auto"></div>
      <button onclick="toggleDark()" title="Tema gelap/terang" class="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-lg">
        <i class="fas fa-moon dark:hidden"></i><i class="fas fa-sun hidden dark:inline text-yellow-400"></i>
      </button>
    </header>
    <div id="banner"></div>
    <div id="view" class="p-4 md:p-8 max-w-4xl mx-auto">Memuat…</div>
  </main>
</div>
<div id="modalRoot"></div>
<script>window.DEFAULT_LOGO=${JSON.stringify(DEFAULT_LOGO)};window.THEME_PREVIEWS=${JSON.stringify(THEME_PREVIEWS)};</script>
<script>
${ADMIN_APP_JS}
</script>
</body></html>`;
}

const ADMIN_APP_JS = String.raw`
let ME = null;
const $ = (s,r=document)=>r.querySelector(s);
const view = $('#view');
const QS = location.search;

async function api(path, opts){
  const sep = path.indexOf('?')>=0 ? '&' : '?';
  const url = '/admin/api'+path + (QS ? sep + QS.slice(1) : '');
  const r = await fetch(url, Object.assign({headers:{'content-type':'application/json'}}, opts||{}));
  if(r.status===401){ location.href='/admin'+QS; return {}; }
  return r.json();
}
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function toast(m){ const d=document.createElement('div'); d.textContent=m; d.className='fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50'; document.body.appendChild(d); setTimeout(()=>d.remove(),2000); }
function timeAgo(ms){ const s=Math.floor((Date.now()-ms)/1000); if(s<60)return s+'d'; if(s<3600)return Math.floor(s/60)+'m'; if(s<86400)return Math.floor(s/3600)+'j'; return Math.floor(s/86400)+'h'; }
function fmtTime(ms){ var d=new Date(ms), n=new Date(); function p(x){return ('0'+x).slice(-2);} var t=p(d.getHours())+':'+p(d.getMinutes()); return d.toDateString()===n.toDateString()?t:(p(d.getDate())+'/'+p(d.getMonth()+1)+' '+t); }

/* ---- sidebar: collapse (desktop) / drawer (HP) ---- */
function toggleSidebar(){
  if(window.innerWidth < 768){ document.body.classList.toggle('sb-open'); }
  else { document.body.classList.toggle('sbc'); localStorage.setItem('sbc', document.body.classList.contains('sbc')?'1':'0'); }
}
function closeDrawer(){ document.body.classList.remove('sb-open'); }
if(localStorage.getItem('sbc')==='1') document.body.classList.add('sbc');

/* ---- komponen kecil ---- */
const INP = 'w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500';
function inp(id,val,type,ph){ return '<input id="'+id+'" type="'+(type||'text')+'" '+(ph?'placeholder="'+esc(ph)+'" ':'')+'value="'+esc(val)+'" class="'+INP+'"/>'; }
function field(label,desc,inner){ return '<div class="mb-4"><label class="block text-sm font-medium">'+label+'</label>'+(desc?'<p class="text-xs text-gray-400 mb-1.5">'+desc+'</p>':'<div class="mb-1.5"></div>')+inner+'</div>'; }
function ta(id,val){ return '<textarea id="'+id+'" rows="4" class="w-full max-w-xl rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 py-2 px-3 text-sm">'+esc(val||'')+'</textarea>'; }
function colorField(id,label,desc,val){ return '<div class="mb-4"><label class="block text-sm font-medium">'+label+'</label><p class="text-xs text-gray-400 mb-1.5">'+desc+'</p><div class="flex items-center gap-2"><input id="'+id+'" type="color" value="'+esc(val)+'" oninput="var t=document.getElementById(\''+id+'_t\');if(t)t.value=this.value" class="w-12 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-800"/><input id="'+id+'_t" type="text" value="'+esc(val)+'" maxlength="7" placeholder="#000000" oninput="if(/^#[0-9a-fA-F]{6}$/.test(this.value)){document.getElementById(\''+id+'\').value=this.value;}" class="w-24 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"/></div></div>'; }
function card(title,desc,inner){ return '<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5"><h3 class="font-semibold">'+title+'</h3>'+(desc?'<p class="text-xs text-gray-400 mb-4">'+desc+'</p>':'<div class="mb-4"></div>')+inner+'</div>'; }
function saveBtn(fn){ return '<button onclick="'+fn+'" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg mt-1">Simpan</button>'; }
function toggle(id,checked,label){ return '<label class="inline-flex items-center gap-3 cursor-pointer"><input id="'+id+'" type="checkbox" class="sr-only peer" '+(checked?'checked':'')+'/><span class="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-checked:bg-indigo-600 rounded-full relative transition-colors after:content-[\'\'] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5"></span>'+(label?'<span class="text-sm">'+label+'</span>':'')+'</label>'; }
function openModal(inner,wide){ $('#modalRoot').innerHTML = '<div class="fixed inset-0 bg-black/50 z-40 flex items-start justify-center p-4 overflow-y-auto"><div class="bg-white dark:bg-gray-800 w-full '+(wide?'max-w-2xl':'max-w-md')+' rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 mt-12 relative"><button onclick="closeModal()" title="Tutup (Esc)" class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-2xl leading-none">&times;</button>'+inner+'</div></div>'; }
function closeModal(){ $('#modalRoot').innerHTML=''; }
document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });

const NAV = {
  owner: [ ['#users','Users','fa-users'] ],
  buyer: [ ['#dashboard','Dashboard','fa-gauge-high'], ['#domains','Domains','fa-globe'], ['#settings','Settings','fa-gear'], ['#inbox','Inbox','fa-inbox'] ],
};
function renderNav(){
  const items = NAV[ME.role] || [];
  $('#nav').innerHTML = items.map(x=>'<a href="'+x[0]+QS+'" title="'+x[1]+'" class="navlink flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" data-h="'+x[0]+'"><i class="fas '+x[2]+' w-4 text-center"></i><span class="lbl">'+x[1]+'</span></a>').join('');
}
function setActive(hash){ document.querySelectorAll('.navlink').forEach(a=>{ const on=a.dataset.h===hash; a.classList.toggle('bg-indigo-50',on); a.classList.toggle('dark:bg-gray-700',on); a.classList.toggle('text-indigo-600',on); a.classList.toggle('font-semibold',on); }); }

function expiryBanner(){
  if(ME.role!=='buyer') return;
  const b=$('#banner');
  if(ME.impersonating){ b.innerHTML='<div class="bg-amber-500 text-white text-sm px-6 py-2 flex justify-between items-center"><span><i class="fas fa-user-secret mr-2"></i>Login sebagai buyer ini (impersonation).</span><a href="/admin/logout'+QS+'" class="underline">Keluar</a></div>'; return; }
  if(ME.expiresInDays!=null && ME.expiresInDays<=3 && !sessionStorage.getItem('exp_dismissed')){
    b.innerHTML='<div class="bg-red-600 text-white text-sm px-6 py-2 flex justify-between items-center"><span><i class="fas fa-triangle-exclamation mr-2"></i>Langganan mau habis — sisa '+ME.expiresInDays+' hari.</span><button onclick="this.closest(\'div\').remove();sessionStorage.setItem(\'exp_dismissed\',\'1\')" class="text-lg leading-none">&times;</button></div>';
  }
}

/* ============ grafik garis ============ */
function fillDays(series,days){ var map={}; (series||[]).forEach(function(s){ map[s.day]=s; }); var out=[],now=new Date(); for(var i=days-1;i>=0;i--){ var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i); var key=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); out.push(map[key]||{day:key,emails_created:0,messages_received:0}); } return out; }
function chartTip(e,day,em,ms){ var t=document.getElementById('chartTip'); if(!t)return; t.innerHTML='<div class="font-semibold mb-1">'+day+'</div><div><span style="color:#818cf8">■</span> Email dibuat: '+em+'</div><div><span style="color:#34d399">■</span> Pesan diterima: '+ms+'</div>'; t.style.display='block'; chartTipMove(e); }
function chartTipMove(e){ var t=document.getElementById('chartTip'); if(!t||t.style.display!=='block')return; var p=t.parentElement.getBoundingClientRect(); var x=e.clientX-p.left+14, y=e.clientY-p.top+14; if(x+160>p.width)x=p.width-160; if(x<0)x=4; t.style.left=x+'px'; t.style.top=y+'px'; }
function chartTipHide(){ var t=document.getElementById('chartTip'); if(t)t.style.display='none'; }
function chartSVG(series,H,days){
  if(days) series=fillDays(series,days);
  if(!series||!series.length) return '<div class="text-gray-400 text-sm py-10 text-center">Belum ada data grafik</div>';
  var w=640,h=H||230,pad=36,padB=28,n=series.length,max=1;
  series.forEach(function(s){ max=Math.max(max,s.emails_created,s.messages_received); });
  var step0=Math.max(1,Math.ceil(max/4)); max=step0*4;
  var X=function(i){ return n===1?pad+(w-pad*2)/2:pad+(w-pad*2)*i/(n-1); };
  var top=14; var Y=function(v){ return (h-padB)-(v/max)*((h-padB)-top); };
  var g='';
  for(var k=0;k<=4;k++){ var val=step0*k, gy=Y(val); g+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'" stroke="#374151" stroke-width="1" opacity="0.45"/><text x="'+(pad-7)+'" y="'+(gy+3)+'" font-size="9" fill="#9ca3af" text-anchor="end">'+val+'</text>'; }
  function lineOf(key,color){
    var pts=series.map(function(s,i){ return X(i)+','+Y(s[key]); }).join(' ');
    var dots=series.map(function(s,i){ return '<circle cx="'+X(i)+'" cy="'+Y(s[key])+'" r="2.6" fill="'+color+'"/>'; }).join('');
    return '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'+dots;
  }
  var stepL=n>10?Math.ceil(n/10):1;
  var xl=series.map(function(s,i){ return (i%stepL===0||i===n-1)?'<text x="'+X(i)+'" y="'+(h-padB+16)+'" font-size="9" fill="#9ca3af" text-anchor="middle">'+String(s.day).slice(5)+'</text>':''; }).join('');
  var colW=n>1?(w-pad*2)/(n-1):(w-pad*2);
  var hov=series.map(function(s,i){ var cx=X(i); return '<rect x="'+(cx-colW/2)+'" y="'+top+'" width="'+colW+'" height="'+((h-padB)-top)+'" fill="transparent" onmouseover="chartTip(event,\''+s.day+'\','+s.emails_created+','+s.messages_received+')" onmousemove="chartTipMove(event)" onmouseout="chartTipHide()"/>'; }).join('');
  return '<div class="relative">'+
    '<svg viewBox="0 0 '+w+' '+h+'" class="w-full">'+g+lineOf('emails_created','#6366f1')+lineOf('messages_received','#10b981')+xl+hov+'</svg>'+
    '<div id="chartTip" class="absolute pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-gray-700 z-20" style="display:none;left:0;top:0;min-width:120px"></div>'+
  '</div>'+
    '<div class="flex gap-4 justify-center text-xs text-gray-500 mt-2"><span><i class="fas fa-minus text-indigo-500"></i> Email dibuat</span><span><i class="fas fa-minus text-green-500"></i> Pesan diterima</span></div>';
}

/* ============ DASHBOARD ============ */
async function vDashboard(){
  view.innerHTML='<h1 class="text-2xl font-bold mb-6">Dashboard</h1><div id="myWebDomain"></div><div id="cards" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"></div>'+
    '<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">'+
      '<div class="flex items-center justify-between mb-1"><h3 class="font-semibold">Aktivitas</h3>'+
        '<select id="daySel" onchange="loadChart(this.value)" class="text-sm rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">'+
          '<option value="7">7 hari</option><option value="14" selected>14 hari</option><option value="30">30 hari</option><option value="60">60 hari</option><option value="90">90 hari</option>'+
        '</select></div>'+
      '<p class="text-xs text-gray-400 mb-3">Jumlah email dibuat & pesan diterima per hari.</p>'+
      '<div id="chartBody" class="text-gray-400 text-sm py-10 text-center">Memuat…</div></div>';
  const d=await api('/dashboard');
  const cards=[['Email dibuat',d.emails,'fa-at','text-indigo-600'],['Pesan diterima',d.messages,'fa-inbox','text-green-600'],['Domain',d.domains,'fa-globe','text-purple-600'],['Hari ini',(d.series&&d.series.length?d.series[d.series.length-1].messages_received:0),'fa-bolt','text-amber-600']];
  $('#cards').innerHTML=cards.map(c=>'<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"><div class="'+c[3]+' text-xl mb-2"><i class="fas '+c[2]+'"></i></div><div class="text-3xl font-bold">'+(c[1]||0)+'</div><div class="text-sm text-gray-500 mt-1">'+c[0]+'</div></div>').join('');
  $('#chartBody').innerHTML=chartSVG(d.series,null,14);
  loadMyWebDomain();
}
async function loadMyWebDomain(){
  var box=$('#myWebDomain'); if(!box) return;
  var d=await api('/webdomain'); var hs=d.hostnames||[];
  if(!hs.length){ box.innerHTML=''; return; }
  var items=hs.map(function(h){
    var isSub=d.saasZone && h.hostname.toLowerCase().endsWith('.'+d.saasZone.toLowerCase());
    var active=h.status==='active';
    var badge=active?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700';
    var btn=(active||isSub)?'':'<div class="mt-1"><button onclick="refreshMyDomain(\''+h.id+'\')" class="text-xs text-blue-600"><i class="fas fa-rotate mr-1"></i>Cek status</button></div>';
    return '<div class="mb-2 last:mb-0"><div class="flex items-center justify-between gap-2"><a href="https://'+esc(h.hostname)+'" target="_blank" class="font-mono text-indigo-600 font-semibold truncate">'+esc(h.hostname)+' ↗</a><span class="text-xs '+badge+' px-2 py-0.5 rounded whitespace-nowrap">'+esc(h.status)+'</span></div>'+dnsHint(h,d)+btn+'</div>';
  }).join('');
  box.innerHTML='<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6"><h3 class="font-semibold mb-1"><i class="fas fa-globe mr-1 text-indigo-500"></i>Domain Web Kamu</h3><p class="text-xs text-gray-400 mb-3">Alamat buat akses situs & dashboard (/admin) kamu.</p>'+items+'</div>';
  scheduleWebPoll();
}
function scheduleWebPoll(){ clearTimeout(window.__wp); window.__wp=setTimeout(function(){ if(document.getElementById('myWebDomain')) loadMyWebDomain(); }, 30000); }
async function refreshMyDomain(hid){ var r=await api('/webdomain/refresh',{method:'POST',body:JSON.stringify({id:hid})}); toast('Status: '+(r.status||'?')); loadMyWebDomain(); }
async function loadChart(days){ const el=$('#chartBody'); if(el)el.innerHTML='<div class="py-10 text-center text-gray-400 text-sm">Memuat…</div>'; const d=await api('/dashboard?days='+days); if($('#chartBody'))$('#chartBody').innerHTML=chartSVG(d.series,null,+days); }

/* ============ INBOX (gabungan + search + popup) ============ */
let inbState={page:1,q:''};
function fmtSender(from){ var m=String(from||'').match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>\s*$/); if(m) return '"'+esc(m[1].trim())+'" &lt;'+esc(m[2].trim())+'&gt;'; return esc(from||''); }
function fmtWaktu(ms){ var d=new Date(ms), n=new Date(); function p(x){return ('0'+x).slice(-2);} var t=p(d.getHours())+'.'+p(d.getMinutes()); var b=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']; return d.toDateString()===n.toDateString()?t:(d.getDate()+' '+b[d.getMonth()]+', '+t); }
function vInbox(){
  window.__sel = window.__sel || new Set();
  view.innerHTML=
    '<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">'+
      // Header biru gaya FAV·MAIL
      '<div class="flex items-center justify-between px-4 py-2.5 text-white text-sm font-semibold" style="background:#1e3a8a">'+
        '<div class="flex items-center gap-3"><i class="fas fa-inbox"></i><span>INBOX</span></div>'+
        '<div><span id="inbCount">0 email</span><span id="inbNew" class="ml-2 opacity-90"></span></div>'+
      '</div>'+
      // Toolbar
      '<div class="px-4 py-2 flex flex-wrap items-center gap-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">'+
        '<label class="inline-flex items-center gap-2 text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 cursor-pointer bg-white dark:bg-gray-800"><input id="inbAll" type="checkbox" onchange="inbSelectAll(this.checked)"><span>Pilih semua</span></label>'+
        '<button id="inbDel" onclick="inbBulkDelete()" class="text-xs border border-red-300 text-red-700 bg-red-50 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 px-2 py-1 rounded"><i class="fas fa-trash mr-1"></i>Hapus dipilih</button>'+
        '<div class="relative flex-1 min-w-[180px] max-w-md"><i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>'+
          '<input id="inbQ" placeholder="Cari email…" class="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"/></div>'+
        '<span id="inbPageInfo" class="text-xs text-gray-500 ml-auto"></span>'+
        '<div class="flex gap-1"><button onclick="inbPage(-1)" id="inbPrev" class="w-8 h-7 border dark:border-gray-700 rounded text-sm disabled:opacity-30"><i class="fas fa-chevron-left"></i></button><button onclick="inbPage(1)" id="inbNext" class="w-8 h-7 border dark:border-gray-700 rounded text-sm disabled:opacity-30"><i class="fas fa-chevron-right"></i></button></div>'+
      '</div>'+
      '<div id="inbList" class="divide-y divide-gray-100 dark:divide-gray-800"></div>'+
    '</div>';
  let t; $('#inbQ').oninput=(e)=>{ clearTimeout(t); t=setTimeout(()=>{ inbState.q=e.target.value; inbState.page=1; loadInbox(); },300); };
  loadInbox();
}
async function loadInbox(){
  const d=await api('/inbox?page='+inbState.page+'&q='+encodeURIComponent(inbState.q));
  const rows=d.messages||[]; const nNew = rows.filter(function(m){return !m.seen;}).length;
  $('#inbCount').textContent = (d.total||0)+' email';
  $('#inbNew').innerHTML = nNew ? '· <span class="bg-white/25 rounded px-1.5 py-0.5">'+nNew+' baru</span>' : '';
  $('#inbList').innerHTML = rows.length ? rows.map(function(m){ var sel = window.__sel.has(m.id);
    return '<div class="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 '+(m.seen?'':'bg-indigo-50/30 dark:bg-indigo-900/10')+'">'+
      '<input type="checkbox" data-id="'+m.id+'" '+(sel?'checked':'')+' onchange="inbToggleSel(this)" class="mt-1"/>'+
      '<div class="flex-1 min-w-0 cursor-pointer" onclick="openMsg(\''+m.id+'\')">'+
        '<div class="flex justify-between gap-3 text-sm text-gray-700 dark:text-gray-300">'+
          '<div class="truncate '+(m.seen?'':'font-semibold')+'">'+fmtSender(m.from_addr)+'</div>'+
          '<div class="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">'+fmtWaktu(m.received_at)+'</div>'+
        '</div>'+
        '<div class="text-[15px] '+(m.seen?'':'font-bold')+' truncate">'+esc(m.subject||'(tanpa subjek)')+'</div>'+
        '<div class="text-xs text-gray-500 truncate">ke: '+esc(m.to_addr)+'</div>'+
      '</div></div>';
  }).join('') : '<div class="p-10 text-center text-gray-400">Belum ada email</div>';
  const p=d.page||1, pp=d.pages||1;
  $('#inbPageInfo').textContent = p+'/'+pp;
  $('#inbPrev').disabled = p<=1; $('#inbNext').disabled = p>=pp;
  $('#inbAll').checked = false;
}
function inbToggleSel(cb){ if(cb.checked) window.__sel.add(cb.dataset.id); else window.__sel.delete(cb.dataset.id); }
function inbSelectAll(on){ document.querySelectorAll('#inbList input[type=checkbox][data-id]').forEach(function(cb){ cb.checked=on; if(on) window.__sel.add(cb.dataset.id); else window.__sel.delete(cb.dataset.id); }); }
async function inbBulkDelete(){ const ids=[...window.__sel]; if(!ids.length){ alert('Pilih email dulu.'); return; } if(!confirm('Hapus '+ids.length+' email?')) return; for(const id of ids){ await api('/inbox/delete',{method:'POST',body:JSON.stringify({id})}); } window.__sel.clear(); loadInbox(); }
function inbPage(delta){ inbState.page=Math.max(1,inbState.page+delta); loadInbox(); }
async function openMsg(id){
  const m=await api('/inbox/msg?id='+id);
  if(m.error){ alert(m.error); return; }
  const dt=new Date(m.received_at).toLocaleString();
  const bodyHtml = m.html ? m.html : '<pre style="white-space:pre-wrap;font-family:sans-serif;padding:12px;margin:0">'+esc(m.text||'')+'</pre>';
  openModal(
    '<div class="mb-3 pr-8"><h3 class="text-lg font-bold truncate">'+esc(m.subject||'(tanpa subjek)')+'</h3></div>'+
    '<div class="text-xs text-gray-500 space-y-0.5 mb-3 border-b border-gray-100 dark:border-gray-700 pb-3">'+
      '<div><b>Dari:</b> '+esc(m.from_addr)+'</div><div><b>Ke:</b> '+esc(m.to_addr)+'</div><div><b>Tanggal:</b> '+esc(dt)+'</div></div>'+
    '<iframe sandbox="allow-same-origin" class="w-full h-96 bg-white rounded-lg border border-gray-200 dark:border-gray-700" srcdoc="'+esc(bodyHtml)+'"></iframe>'+
    '<div class="flex justify-end mt-3"><button onclick="delMsg(\''+id+'\')" class="text-sm bg-red-600 text-white px-4 py-2 rounded-lg">Hapus</button></div>',
    true);
}
async function delMsg(id){ await api('/inbox/delete',{method:'POST',body:JSON.stringify({id})}); closeModal(); loadInbox(); }

/* ============ DOMAINS ============ */
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
    '<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">'+
    '<div class="flex items-center gap-2"><i class="fas fa-globe text-indigo-500"></i><span class="font-mono text-sm truncate">'+esc(x.domain)+'</span></div>'+
    '<span class="text-xs w-fit '+(x.is_active?'bg-green-100 text-green-700':'bg-gray-200 text-gray-600')+' px-2 py-0.5 rounded">'+(x.is_active?'aktif':'nonaktif')+'</span>'+
    '<div class="flex gap-2 mt-auto"><button onclick="toggleDomain(\''+x.id+'\','+(x.is_active?0:1)+')" class="text-xs border dark:border-gray-700 px-2 py-1 rounded flex-1">'+(x.is_active?'Nonaktifkan':'Aktifkan')+'</button><button onclick="delDomain(\''+x.id+'\')" class="text-xs text-red-600 border border-red-200 px-2 py-1 rounded">Hapus</button></div></div>'
  ).join('') || '<div class="col-span-full text-center text-gray-400 py-10 border border-dashed dark:border-gray-700 rounded-xl">Belum ada domain</div>';
}
async function toggleDomain(id,a){ await api('/domains/toggle',{method:'POST',body:JSON.stringify({id,active:!!a})}); loadDomains(); }
async function delDomain(id){ if(confirm('Hapus domain?')){ await api('/domains/delete',{method:'POST',body:JSON.stringify({id})}); loadDomains(); } }

/* ============ SETTINGS ============ */
function durParts(min){ min=+min||0; if(min>0&&min%1440===0)return{v:min/1440,u:1440}; if(min>0&&min%60===0)return{v:min/60,u:60}; return{v:min,u:1}; }
async function vSettings(){
  const s=await api('/settings'); window.__S=s;
  window.__img={logo:s.logo_url||'',favicon:s.favicon_url||''};
  const lk=JSON.parse(s.lock_json||'{}'); window.__soc=JSON.parse(s.socials_json||'[]');
  function imgField(kind,label,desc){ const cur=window.__img[kind]; const shown=cur||window.DEFAULT_LOGO;
    return field(label,desc,'<div class="flex items-center gap-3"><img id="'+kind+'Prev" src="'+esc(shown)+'" class="h-12 w-auto bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 p-1 object-contain"/>'+
      '<div class="flex flex-col gap-1"><input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onchange="readImg(this,\''+kind+'\')" class="text-sm"/>'+
      '<span id="'+kind+'Note" class="text-xs '+(cur?'text-green-600':'text-gray-400')+'">'+(cur?'gambar custom':'bawaan TMail')+' · <button type="button" onclick="clearImg(\''+kind+'\')" class="text-red-600 underline">pakai bawaan</button></span></div></div>'); }
  const dp=durParts(s.delete_after_minutes);
  view.innerHTML='<h1 class="text-2xl font-bold mb-6">Settings</h1>'+
  card('General','Identitas & warna tampilan web publik.',
    field('Nama Aplikasi','Nama brand yang tampil di web & admin.',inp('g_brand',s.brand_name))+
    imgField('logo','Logo','Upload gambar (maks 200KB). Kosong = bawaan TMail.')+
    imgField('favicon','Favicon','Ikon tab browser. Kosong = bawaan TMail.')+
    '<div class="flex flex-wrap gap-6">'+colorField('g_c1','Warna Primer','Sidebar.',s.color_primary)+colorField('g_c2','Sekunder','Tombol Create.',s.color_secondary)+colorField('g_c3','Tersier','Tombol Random.',s.color_tertiary)+'</div>'+
    field('Dark Mode','Tampilkan toggle gelap/terang.',toggle('g_dark',s.dark_mode,'Aktifkan'))+
    saveBtn('saveGeneral()'))+
  card('Terima Email','Pilih cara TMail menerima email masuk untuk domain-domainmu.',
    // Toggle mode
    (function(){ var mode = s.imap_host ? 'imap' : 'worker'; window.__mailMode = mode;
      var opt = function(k,label,desc){ var on = mode===k;
        var st = on
          ? 'border:2px solid #6366f1;background:rgba(99,102,241,.08)'
          : 'border:2px solid #e5e7eb;background:transparent';
        return '<label class="mmOpt flex-1 cursor-pointer rounded-lg p-3 flex gap-3 items-start" data-mode="'+k+'" style="'+st+'">'+
          '<input type="radio" name="mail_mode" value="'+k+'" '+(on?'checked':'')+' onchange="setMailMode(\''+k+'\')" class="mt-1"/>'+
          '<div><div class="font-semibold text-sm text-gray-900 dark:text-gray-100">'+label+'</div><div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">'+desc+'</div></div></label>';
      };
      return '<div class="flex flex-col md:flex-row gap-3 mb-1">'+opt('worker','Email Routing (rekomendasi)','Realtime, tanpa VPS. Setup 1x di dashboard CF.')+opt('imap','IMAP','Kalau kamu punya mailbox catch-all sendiri.')+'</div>';
    })()+
    // === Panel Email Routing (worker) ===
    '<div id="modeWorker" style="display:'+(s.imap_host?'none':'block')+'" class="text-sm space-y-2">'+
      (function(){ var t=s.last_worker_email_at||0; var ago=t?Math.floor((Date.now()-t)/60000):0;
        var badge = t
          ? '<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style="background:#dcfce7;color:#166534"><i class="fas fa-check-circle"></i> Email Routing aktif · terakhir '+(ago<1?'baru saja':ago<60?ago+' menit lalu':ago<1440?Math.floor(ago/60)+' jam lalu':Math.floor(ago/1440)+' hari lalu')+'</div>'
          : '<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style="background:#fee2e2;color:#991b1b"><i class="fas fa-exclamation-circle"></i> Belum terdeteksi · setup dulu di dashboard CF</div>';
        return badge;
      })()+
      '<div class="text-gray-600 dark:text-gray-300">Forward semua email tiap domain ke <b class="font-mono select-all" style="background:rgba(148,163,184,.15);padding:2px 6px;border-radius:4px">catchall@imapku.icu</b></div>'+
    '</div>'+
    // === Panel IMAP ===
    '<div id="modeImap" style="display:'+(s.imap_host?'block':'none')+'" class="space-y-3">'+
    field('Host','mis. imap.domain.com',inp('i_host',s.imap_host))+
    '<div class="flex flex-wrap gap-4">'+field('Port','993 (TLS).','<input id="i_port" type="number" value="'+esc(s.imap_port)+'" class="w-32 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 py-2 px-3"/>')+field('TLS','Implicit TLS.',toggle('i_tls',s.imap_tls,'993'))+'</div>'+
    field('Username','User login mailbox.',inp('i_user',s.imap_user))+
    field('Password',(s.has_imap_pass?'Sudah tersimpan — kosongkan jika tak ingin ganti.':'Password mailbox (dienkripsi).'),'<input id="i_pass" type="password" placeholder="'+(s.has_imap_pass?'••••••':'')+'" class="'+INP+'"/>')+
    '<div class="flex flex-wrap gap-2 items-center"><button onclick="testImap()" class="border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"><i class="fas fa-plug mr-1"></i> Test koneksi</button>'+saveBtn('saveImap()')+'<button onclick="pollNow()" class="border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"><i class="fas fa-download mr-1"></i> Tarik email sekarang</button></div>'+
    '<div id="imapTestResult" class="text-sm mt-2"></div>'+
    '</div>')+
  card('Configuration','Aturan pembuatan alamat & penyimpanan email.',
    field('Batas alamat / pengunjung','Maksimum alamat aktif per pengunjung.','<input id="c_limit" type="number" value="'+esc(s.email_limit)+'" class="w-32 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 py-2 px-3"/>')+
    field('Hapus email otomatis setelah','Email di Inbox dihapus setelah durasi ini. 0 = simpan selamanya.',
      '<div class="flex gap-2 items-center"><input id="c_delv" type="number" min="0" value="'+dp.v+'" class="w-28 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 py-2 px-3"/>'+
      '<select id="c_delu" class="rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 py-2 px-3"><option value="1" '+(dp.u===1?'selected':'')+'>Menit</option><option value="60" '+(dp.u===60?'selected':'')+'>Jam</option><option value="1440" '+(dp.u===1440?'selected':'')+'>Hari</option></select></div>')+
    saveBtn('saveConfig()'))+
  card('Socials','Ikon sosial media di footer web.','<div id="socList" class="space-y-2 mb-3 max-w-lg"></div><button onclick="addSoc()" class="text-sm border dark:border-gray-700 px-3 py-1.5 rounded-lg mb-3">+ Tambah</button><br>'+saveBtn('saveSocials()'))+
  card('Languages','Bahasa default web publik.',
    field('Bahasa','',('<select id="l_lang" class="'+INP+'"><option value="id" '+(s.lang==='id'?'selected':'')+'>Indonesia</option><option value="en" '+(s.lang==='en'?'selected':'')+'>English</option></select>'))+
    saveBtn('saveLang()'))+
  card('Themes','Klik tema untuk ganti tampilan web publik — langsung tersimpan.',
    '<div id="themeCards" class="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl"></div>'+
    '<a href="/'+QS+'" target="_blank" class="text-sm text-indigo-600 inline-block mt-3">Buka web publik &rarr;</a>')+
  '<div id="landingCard" style="display:'+(s.theme==='blueprint'?'block':'none')+'">'+card('Tampilan Landing','Teks halaman depan tema Blueprint.',
    field('Heading','Judul besar di tengah.',inp('h_head',s.hero_heading||''))+
    field('Subtitle','Kalimat di bawah judul.',inp('h_sub',s.hero_subtitle||''))+
    saveBtn('saveHero()'))+'</div>'+
  card('Advance','API key & kunci halaman.',
    '<h4 class="text-sm font-semibold mb-1">API Keys</h4><p class="text-xs text-gray-400 mb-2">Untuk otomasi eksternal. <a href="/docs'+QS+'" target="_blank" class="text-indigo-600">Docs</a></p><div id="keyList" class="space-y-2 mb-3 max-w-lg"></div>'+
    '<div class="flex gap-2 mb-6 max-w-md"><input id="keyLabel" placeholder="label (mis. bot-signup)" class="flex-1 '+INP+'"/><button onclick="addKey()" class="bg-indigo-600 text-white px-4 rounded-lg">Buat</button></div>'+
    '<h4 class="text-sm font-semibold mb-1">Kunci Web</h4><p class="text-xs text-gray-400 mb-2">Kunci web publik dengan password.</p>'+
    field('Aktifkan','',toggle('lk_on',lk.enable,'Kunci web'))+
    field('Teks','Pesan di layar kunci.',inp('lk_text',lk.text||''))+
    field('Password','',inp('lk_pass',lk.password||''))+
    saveBtn('saveLock()'))+
  card('Export / Import','Cadangkan / pulihkan daftar domain & setting.',
    '<button onclick="doExport()" class="bg-gray-800 text-white px-4 py-2 rounded-lg mr-2">Export JSON</button>'+
    '<label class="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg cursor-pointer inline-block">Import<input type="file" id="impFile" class="hidden" onchange="doImport(this)"/></label>');
  renderSoc(); loadKeys(); renderThemeCards();
}
function renderSoc(){ $('#socList').innerHTML=window.__soc.map((x,i)=>'<div class="flex gap-2"><input value="'+esc(x.icon)+'" onchange="window.__soc['+i+'].icon=this.value" placeholder="fab fa-twitter" class="w-40 rounded-lg border dark:border-gray-700 dark:bg-gray-900 py-2 px-3"/><input value="'+esc(x.link)+'" onchange="window.__soc['+i+'].link=this.value" placeholder="https://…" class="flex-1 rounded-lg border dark:border-gray-700 dark:bg-gray-900 py-2 px-3"/><button onclick="window.__soc.splice('+i+',1);renderSoc()" class="text-red-600 px-2">&times;</button></div>').join(''); }
function addSoc(){ window.__soc.push({icon:'',link:''}); renderSoc(); }
async function put(patch){ const r=await api('/settings',{method:'POST',body:JSON.stringify(patch)}); if(r.error)alert(r.error); else { toast('Tersimpan'); if(r.settings)window.__S=r.settings; } }
function readImg(inp,kind){ const f=inp.files[0]; if(!f)return; if(f.size>200000){ alert('Ukuran maksimal 200KB'); inp.value=''; return; } const r=new FileReader(); r.onload=()=>{ window.__img[kind]=r.result; const p=$('#'+kind+'Prev'); if(p)p.src=r.result; const n=$('#'+kind+'Note'); if(n){ n.className='text-xs text-green-600'; n.innerHTML='gambar custom · <button type="button" onclick="clearImg(\''+kind+'\')" class="text-red-600 underline">pakai bawaan</button>'; } }; r.readAsDataURL(f); }
function clearImg(kind){ window.__img[kind]=''; const p=$('#'+kind+'Prev'); if(p)p.src=window.DEFAULT_LOGO; const n=$('#'+kind+'Note'); if(n){ n.className='text-xs text-gray-400'; n.innerHTML='bawaan TMail · <button type="button" onclick="clearImg(\''+kind+'\')" class="text-red-600 underline">pakai bawaan</button>'; } }
function saveGeneral(){ put({brand_name:$('#g_brand').value,logo_url:window.__img.logo,favicon_url:window.__img.favicon,color_primary:$('#g_c1').value,color_secondary:$('#g_c2').value,color_tertiary:$('#g_c3').value,dark_mode:$('#g_dark').checked?1:0}); }
function saveHero(){ put({hero_heading:$('#h_head').value,hero_subtitle:$('#h_sub').value}); }
function savePages(){ put({page_faq:$('#p_faq').value,page_privacy:$('#p_priv').value,page_contact:$('#p_contact').value}); }
function imapPayload(){ return {imap_host:$('#i_host').value,imap_port:+$('#i_port').value,imap_user:$('#i_user').value,imap_tls:$('#i_tls').checked?1:0,imap_pass:$('#i_pass').value}; }
function setMailMode(m){ window.__mailMode=m; var w=$('#modeWorker'), i=$('#modeImap'); if(w) w.style.display = m==='worker'?'block':'none'; if(i) i.style.display = m==='imap'?'block':'none';
  // Re-highlight card border via inline style
  document.querySelectorAll('.mmOpt').forEach(function(lbl){ var on = lbl.dataset.mode===m; lbl.style.border = on ? '2px solid #6366f1' : '2px solid #e5e7eb'; lbl.style.background = on ? 'rgba(99,102,241,.08)' : 'transparent'; });
  // Kalau pindah ke Email Routing, otomatis kosongin host IMAP di server.
  if(m==='worker' && window.__S && window.__S.imap_host){ put({imap_host:'',imap_user:''}).then(function(){ window.__S.imap_host=''; window.__S.imap_user=''; }); }
}
function imapResult(cls,html){ var r=$('#imapTestResult'); if(r){ r.className='text-sm mt-2 '+cls; r.innerHTML=html; } }
async function testImap(){ imapResult('text-gray-500','<i class="fas fa-spinner fa-spin"></i> Menguji koneksi…'); const res=await api('/settings/imap-test',{method:'POST',body:JSON.stringify(imapPayload())}); if(res.ok){ imapResult('text-green-600','<i class="fas fa-check-circle"></i> Berhasil konek ke IMAP'); } else { imapResult('text-red-600','<i class="fas fa-times-circle"></i> Gagal: '+esc(res.error||'tidak diketahui')); } return res.ok; }
async function saveImap(){ imapResult('text-gray-500','<i class="fas fa-spinner fa-spin"></i> Menguji koneksi sebelum simpan…'); const res=await api('/settings/imap-test',{method:'POST',body:JSON.stringify(imapPayload())}); if(!res.ok){ imapResult('text-red-600','<i class="fas fa-times-circle"></i> Gagal konek — TIDAK disimpan: '+esc(res.error||'')); return; } const p=imapPayload(); if(!p.imap_pass) delete p.imap_pass; await put(p); imapResult('text-green-600','<i class="fas fa-check-circle"></i> Terhubung & tersimpan'); }
async function pollNow(){ imapResult('text-gray-500','<i class="fas fa-spinner fa-spin"></i> Menarik email dari IMAP…'); const res=await api('/settings/imap-poll',{method:'POST'}); if(res.ok){ imapResult('text-green-600','<i class="fas fa-check-circle"></i> Selesai — '+(res.count||0)+' email baru ditarik. Cek menu Inbox.'); } else { imapResult('text-red-600','<i class="fas fa-times-circle"></i> Gagal: '+esc(res.error||'')); } }
function saveConfig(){ put({email_limit:+$('#c_limit').value, delete_after_minutes:(+$('#c_delv').value)*(+$('#c_delu').value)}); }
function saveSocials(){ put({socials_json:JSON.stringify(window.__soc)}); }
function saveLang(){ put({lang:$('#l_lang').value}); }
function themeMini(theme){
  const s=window.__S, p=s.color_primary, sec=s.color_secondary, ter=s.color_tertiary;
  const dot='<span style="background:'+sec+'" class="w-6 h-2 rounded-sm inline-block"></span><span style="background:'+ter+'" class="w-6 h-2 rounded-sm inline-block"></span>';
  if(theme==='default') return '<div class="h-24 flex">'+
    '<div class="w-1/3 flex flex-col items-center pt-2 gap-1" style="background:'+p+'"><span class="w-7 h-1.5 rounded bg-white/80"></span>'+dot+'</div>'+
    '<div class="flex-1 bg-white dark:bg-gray-700 flex"><div class="w-1/3 border-r border-gray-100 dark:border-gray-600 p-1"><div class="h-1.5 bg-gray-200 dark:bg-gray-600 rounded mb-1"></div><div class="h-1.5 bg-gray-100 dark:bg-gray-600 rounded w-2/3"></div></div></div></div>';
  const bar= theme==='nebula' ? 'background:linear-gradient(135deg,'+p+',#0f172a)' : 'background:'+p;
  const page= theme==='nebula' ? 'bg-slate-900' : 'bg-white dark:bg-gray-700';
  const l1= theme==='nebula' ? 'bg-slate-700' : 'bg-gray-200 dark:bg-gray-600';
  const l2= theme==='nebula' ? 'bg-slate-800' : 'bg-gray-100 dark:bg-gray-600';
  return '<div class="h-24 '+page+'">'+
    '<div class="h-8 flex items-center gap-1 px-2" style="'+bar+'"><span class="flex-1 h-2.5 rounded bg-white/80"></span>'+dot+'</div>'+
    '<div class="p-2 space-y-1"><div class="h-2 '+l1+' rounded"></div><div class="h-2 '+l2+' rounded w-2/3"></div></div></div>';
}
function bpMock(){ var sec=(window.__S&&window.__S.color_secondary)||'#e07b1a'; return '<div class="w-full h-32 p-2" style="background:#6b93d6;background-image:linear-gradient(rgba(255,255,255,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.35) 1px,transparent 1px);background-size:11px 11px">'+
  '<div class="h-full flex flex-col gap-1.5">'+
    '<div style="background:#efe9dd;border:1.5px solid #16233f;border-radius:3px" class="px-2 py-1 flex items-center justify-between"><span style="color:#16233f;font-family:monospace;font-weight:800;font-size:8px">TEMPMAIL</span><span style="color:#16233f;font-size:6px;font-family:monospace;letter-spacing:1px">HOME API</span></div>'+
    '<div style="background:#efe9dd;border:1.5px solid #16233f;border-radius:3px" class="flex-1 p-1.5 flex flex-col gap-1"><div class="bg-white border" style="border-color:#16233f;height:9px"></div><div class="flex gap-1"><div class="flex-1" style="background:'+sec+';height:8px;border-radius:2px"></div><div style="background:#efe9dd;border:1px solid #16233f;width:18px;height:8px"></div><div style="background:#efe9dd;border:1px solid #16233f;width:18px;height:8px"></div></div><div class="flex gap-1 flex-1"><div class="flex-1 bg-white border" style="border-color:#16233f"></div><div class="flex-1 bg-white border" style="border-color:#16233f"></div></div></div>'+
  '</div></div>'; }
function renderThemeCards(){
  const cur=window.__S.theme;
  const defs=[['default','Default','Sidebar kiri'],['mantis','Mantis','Bar atas · terang'],['nebula','Nebula','Bar atas · gelap'],['blueprint','Blueprint','Retro cetak-biru']];
  $('#themeCards').innerHTML=defs.map(function(d){ var prev=window.THEME_PREVIEWS[d[0]]?'<img src="'+window.THEME_PREVIEWS[d[0]]+'" alt="'+d[1]+'" class="w-full h-32 object-cover object-top bg-gray-100 dark:bg-gray-700"/>':(d[0]==='blueprint'?bpMock():'<div class="w-full h-32 flex items-center justify-center text-white font-bold" style="font-family:monospace;background:#6b93d6">▦ '+d[1]+'</div>');
    return '<button onclick="setTheme(\''+d[0]+'\')" class="text-left rounded-xl overflow-hidden border-2 '+(cur===d[0]?'border-indigo-500 ring-2 ring-indigo-200':'border-gray-200 dark:border-gray-700')+' hover:border-indigo-400 transition">'+prev+
    '<div class="px-2 py-1.5 bg-white dark:bg-gray-800"><div class="text-sm font-medium flex items-center gap-1">'+d[1]+(cur===d[0]?' <i class="fas fa-check-circle text-indigo-500 text-xs"></i>':'')+'</div><div class="text-[11px] text-gray-400">'+d[2]+'</div></div></button>'; }).join('');
}
async function setTheme(theme){ window.__S.theme=theme; renderThemeCards(); var d = theme==='blueprint'?'block':'none'; var lc=document.getElementById('landingCard'); if(lc) lc.style.display=d; var pc=document.getElementById('pagesCard'); if(pc) pc.style.display=d; await put({theme}); }
function saveLock(){ put({lock_json:JSON.stringify({enable:$('#lk_on').checked,text:$('#lk_text').value,password:$('#lk_pass').value})}); }
async function loadKeys(){ const d=await api('/keys'); $('#keyList').innerHTML=(d.keys||[]).map(k=>'<div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm"><div class="min-w-0"><span class="font-mono">'+esc(k.key)+'</span> <span class="text-gray-400 ml-2">'+esc(k.label)+'</span></div><button onclick="delKey(\''+k.id+'\')" class="text-red-600">Hapus</button></div>').join('')||'<div class="text-gray-400 text-sm">Belum ada key</div>'; }
async function addKey(){ const label=$('#keyLabel').value; const r=await api('/keys',{method:'POST',body:JSON.stringify({label})}); if(r.key){ $('#keyLabel').value=''; loadKeys(); toast('Key dibuat'); } }
async function delKey(id){ if(confirm('Cabut key?')){ await api('/keys/delete',{method:'POST',body:JSON.stringify({id})}); loadKeys(); } }
async function doExport(){ const d=await api('/export'); const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tmail-export.json'; a.click(); }
async function doImport(el){ const f=el.files[0]; if(!f)return; const t=await f.text(); const r=await api('/import',{method:'POST',body:t}); if(r.error)alert(r.error); else toast('Import selesai'); }

/* ============ PROFILE ============ */
function vProfile(){ view.innerHTML='<h1 class="text-2xl font-bold mb-6">Profile</h1>'+card('Akun','Bisa login pakai email ATAU username.',
  field('Username','Buat login selain email (opsional). Kosongkan = tanpa username.',inp('p_user',ME.username||''))+
  field('Email','',inp('p_email',ME.email||'','email'))+
  field('Nama','',inp('p_name',ME.name||''))+
  field('Password baru','Kosongkan jika tak ganti.',inp('p_pass','','password'))+
  '<button onclick="saveProfile()" class="bg-indigo-600 text-white px-5 py-2 rounded-lg">Simpan</button>'); }
async function saveProfile(){ const b={name:$('#p_name').value,username:$('#p_user').value,email:$('#p_email').value}; const pw=$('#p_pass').value; if(pw)b.password=pw; const r=await api('/profile',{method:'POST',body:JSON.stringify(b)}); if(r.error){alert(r.error);return;} toast('Tersimpan'); ME.name=b.name; ME.email=b.email; ME.username=b.username; $('#userName').textContent=b.name||b.username||b.email; }

/* ============ USERS (owner) — card + popup ============ */
function vUsers(){
  view.innerHTML='<div class="flex items-center justify-between mb-6"><h1 class="text-2xl font-bold">Users (Buyers)</h1><button onclick="modalCreateBuyer()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm"><i class="fas fa-plus mr-1"></i> Buat Buyer</button></div><div id="userGrid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>';
  loadUsers();
}
async function loadUsers(){
  const d=await api('/buyers'); window.__U={};
  $('#userGrid').innerHTML=(d.buyers||[]).map(u=>{ window.__U[u.id]=u;
    const exp=u.expires_at?new Date(u.expires_at).toISOString().slice(0,10):'—';
    const days=u.expires_at?Math.ceil((u.expires_at-Date.now())/86400000):null;
    const badge=u.status==='active'?'bg-green-100 text-green-700':(u.status==='expired'?'bg-red-100 text-red-700':'bg-gray-200 text-gray-600');
    const warn=(u.status==='active'&&days!=null&&days<=3&&days>=0)?'<span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded"><i class="fas fa-triangle-exclamation"></i> '+days+'h</span>':'';
    return '<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">'+
      '<div class="flex items-start justify-between gap-2 mb-2"><div class="min-w-0"><div class="font-medium truncate">'+esc(u.email)+'</div><div class="text-xs text-gray-400">'+esc(u.name||'-')+'</div></div><span class="text-xs '+badge+' px-2 py-0.5 rounded whitespace-nowrap">'+u.status+'</span></div>'+
      '<div class="flex items-center gap-2 text-xs '+(days!=null&&days<=3?'text-amber-600':'text-gray-400')+' mb-3">exp: '+exp+(days!=null?' ('+days+'h)':'')+' '+warn+'</div>'+
      '<div class="flex flex-wrap gap-2 text-xs">'+
        '<button onclick="showDetail(\''+u.id+'\')" class="border dark:border-gray-700 px-2 py-1 rounded"><i class="fas fa-chart-line"></i> Detail</button>'+
        '<button onclick="modalEditBuyer(\''+u.id+'\')" class="border dark:border-gray-700 px-2 py-1 rounded"><i class="fas fa-pen"></i> Edit</button>'+
        '<button onclick="loginAs(\''+u.id+'\')" class="border dark:border-gray-700 px-2 py-1 rounded"><i class="fas fa-user-secret"></i> Login as</button>'+
        '<button onclick="extend(\''+u.id+'\')" class="border dark:border-gray-700 px-2 py-1 rounded">Perpanjang</button>'+
        '<button onclick="toggleUser(\''+u.id+'\',\''+(u.status==='suspended'?'active':'suspended')+'\')" class="border dark:border-gray-700 px-2 py-1 rounded">'+(u.status==='suspended'?'Aktifkan':'Suspend')+'</button>'+
        '<button onclick="delUser(\''+u.id+'\')" class="border border-red-200 text-red-600 px-2 py-1 rounded">Hapus</button></div></div>';
  }).join('')||'<div class="col-span-full text-center text-gray-400 py-10 border border-dashed dark:border-gray-700 rounded-xl">Belum ada buyer</div>';
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
function copyVal(t,e){ if(e){try{e.stopPropagation();}catch(_){}} if(navigator.clipboard&&window.isSecureContext){ navigator.clipboard.writeText(t).then(function(){toast('Tersalin: '+t);}).catch(function(){fbCopy(t);}); } else fbCopy(t); }
function fbCopy(t){ var ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); try{document.execCommand('copy'); toast('Tersalin: '+t);}catch(_){} document.body.removeChild(ta); }
function dnsRow(label,val){ return '<div class="flex items-center justify-between gap-2 py-0.5"><span class="min-w-0 break-all">'+label+': <b>'+esc(val)+'</b></span><button onclick="copyVal(\''+esc(val)+'\',event)" class="shrink-0 text-blue-500 hover:text-blue-700" title="Salin"><i class="far fa-copy"></i></button></div>'; }
function dnsHint(h,d){
  var active=h.status==='active';
  var isSub=d.saasZone && h.hostname.toLowerCase().endsWith('.'+d.saasZone.toLowerCase());
  if(active) return '<div class="text-xs text-green-600 mt-1"><i class="fas fa-check-circle"></i> Domain aktif & siap dipakai</div>';
  if(isSub) return '<div class="text-xs text-gray-500 mt-1">Sedang diaktifkan…</div>';
  var apex=h.hostname.split('.').length<=2;
  var name=apex?'@':h.hostname;
  var tipe=apex?'CNAME (flattening) / A-ALIAS':'CNAME';
  return '<div class="text-xs text-gray-700 dark:text-gray-200 mt-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-3"><div class="font-semibold mb-1">Set DNS ini di penyedia domain biar aktif:</div><div class="font-mono">'+
    '<div class="py-0.5">Tipe: <b>'+tipe+'</b></div>'+dnsRow('Nama',name)+dnsRow('Target',d.saasTarget)+
    '</div><div class="text-amber-600 mt-2 font-sans"><i class="fas fa-triangle-exclamation"></i> Kalau domain di <b>Cloudflare</b>: set record <b>DNS only</b> (awan abu-abu), JANGAN Proxied — biar tak kena Error 1014.</div></div>';
}
function webSectionHtml(d,id){
  var webHtml=(d.hostnames||[]).map(function(h){
    var isSub=d.saasZone && h.hostname.toLowerCase().endsWith('.'+d.saasZone.toLowerCase());
    var active=h.status==='active';
    var badge=active?'bg-green-100 text-green-700':(h.status==='manual'?'bg-gray-200 text-gray-600':'bg-amber-100 text-amber-700');
    return '<div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-2"><div class="flex items-center justify-between gap-2"><a href="https://'+esc(h.hostname)+'" target="_blank" class="font-mono text-indigo-600 text-sm font-semibold truncate">'+esc(h.hostname)+' ↗</a><span class="text-xs '+badge+' px-2 py-0.5 rounded whitespace-nowrap">'+esc(h.status)+'</span></div>'+dnsHint(h,d)+'<div class="flex gap-3 mt-2 text-xs">'+(isSub?'':'<button onclick="refreshHost(\''+id+'\',\''+h.id+'\')" class="text-blue-600"><i class="fas fa-rotate mr-1"></i>Cek status</button>')+'<button onclick="delHost(\''+id+'\',\''+h.id+'\')" class="text-red-600">Hapus</button></div></div>';
  }).join('')||'<div class="text-xs text-gray-400 mb-1">Belum ada web domain</div>';
  return '<div class="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3 mb-2"><h4 class="font-semibold text-sm mb-1"><i class="fas fa-globe mr-1"></i>Web Domain (alamat akses situs & /admin buyer)</h4><p class="text-xs text-gray-400 mb-2">Subdomain '+esc(d.saasZone||'')+' langsung aktif; domain sendiri buyer butuh CNAME.</p>'+webHtml+'<div class="flex gap-2 mt-2"><input id="newHost" placeholder="mail.buyera.com / buyera.com / nama.'+esc(d.saasZone||'')+'" class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 py-2 px-3 text-sm"/><button onclick="addHost(\''+id+'\')" class="bg-indigo-600 text-white px-3 rounded-lg text-sm">Tambah</button></div></div>';
}
async function modalEditBuyer(id){
  openModal('<div class="text-center text-gray-400 py-6">memuat…</div>', true);
  const d=await api('/buyers/detail?id='+id);
  if(d.error){ closeModal(); alert(d.error); return; }
  window.__wRefresh=function(){ modalEditBuyer(id); };
  openModal('<h3 class="text-lg font-bold mb-4">Edit Buyer</h3>'+
    field('Email','',inp('e_email',d.user.email,'email'))+
    field('Nama','',inp('e_name',d.user.name||''))+
    field('Password baru','Kosongkan jika tak ganti.',inp('e_pass','','text','password baru'))+
    '<div class="flex gap-2 justify-end"><button onclick="closeModal()" class="px-4 py-2 rounded-lg border dark:border-gray-700">Batal</button><button onclick="submitEditBuyer(\''+id+'\')" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Simpan</button></div>'+
    webSectionHtml(d,id), true);
}
async function submitEditBuyer(id){
  const b={id,email:$('#e_email').value,name:$('#e_name').value}; const pw=$('#e_pass').value; if(pw)b.password=pw;
  const r=await api('/buyers/update',{method:'POST',body:JSON.stringify(b)});
  if(r.error){alert(r.error);return;}
  closeModal(); loadUsers(); toast('Tersimpan');
}
async function showDetail(id){
  openModal('<div class="text-center text-gray-400 py-6">memuat…</div>', true);
  const d=await api('/buyers/detail?id='+id);
  if(d.error){ openModal('<div class="text-red-500">'+esc(d.error)+'</div>'); return; }
  window.__wRefresh=function(){ showDetail(id); };
  const created=new Date(d.user.created_at).toISOString().slice(0,10);
  const stat=(l,v)=>'<div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center"><div class="text-lg font-bold">'+v+'</div><div class="text-xs text-gray-500">'+l+'</div></div>';
  openModal(
    '<div class="mb-4 pr-8"><h3 class="text-lg font-bold">'+esc(d.user.email)+'</h3><div class="text-xs text-gray-400">'+esc(d.user.name||'')+' · '+esc(d.user.status)+'</div></div>'+
    '<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">'+stat('Email dibuat',d.stats.emails)+stat('Pesan diterima',d.stats.messages)+stat('Domain',d.domains.length)+stat('Web',d.hostnames.length)+'</div>'+
    '<div class="grid md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600 dark:text-gray-300 mb-2">'+
      '<div><b>Dibuat:</b> '+created+'</div><div><b>IMAP:</b> '+(d.settings.has_imap?esc(d.settings.imap_host||'terisi'):'<span class=\"text-red-500\">belum</span>')+'</div>'+
      '<div><b>Tema:</b> '+esc(d.settings.theme)+' · <b>Bahasa:</b> '+esc(d.settings.lang)+'</div>'+
      '<div class="md:col-span-2"><b>Domain email:</b> '+(d.domains.map(x=>esc(x.domain)).join(', ')||'—')+'</div></div>'+
    webSectionHtml(d,id)+
    '<div class="max-w-md mx-auto">'+chartSVG(d.stats.series,140,14)+'</div>',
    true);
}
async function addHost(id){ var v=$('#newHost').value.trim(); if(!v)return; var r=await api('/buyers/hostname',{method:'POST',body:JSON.stringify({id:id,hostname:v})}); if(r.error){alert(r.error);return;} toast(r.warn?('Ditambah (catatan: '+r.warn+')'):'Web domain ditambah'); if(window.__wRefresh)window.__wRefresh(); }
async function delHost(id,hid){ if(!confirm('Hapus web domain ini?'))return; await api('/buyers/hostname/delete',{method:'POST',body:JSON.stringify({id:id,hostnameId:hid})}); if(window.__wRefresh)window.__wRefresh(); }
async function refreshHost(id,hid){ var r=await api('/buyers/hostname/refresh',{method:'POST',body:JSON.stringify({hostnameId:hid})}); toast('Status: '+(r.status||'?')); if(window.__wRefresh)window.__wRefresh(); }
async function extend(id){ const days=prompt('Perpanjang berapa hari dari sekarang? (0 = tanpa batas)','30'); if(days==null)return; await api('/buyers/expiry',{method:'POST',body:JSON.stringify({id,days:+days})}); loadUsers(); }
async function toggleUser(id,status){ await api('/buyers/status',{method:'POST',body:JSON.stringify({id,status})}); loadUsers(); }
async function delUser(id){ if(confirm('Hapus buyer + semua datanya?')){ await api('/buyers/delete',{method:'POST',body:JSON.stringify({id})}); loadUsers(); } }
async function loginAs(id){ const r=await api('/buyers/login-as',{method:'POST',body:JSON.stringify({id})}); if(r.url) location.href=r.url+(QS?(r.url.indexOf('?')>=0?'&':'?')+QS.slice(1):''); else alert(r.error||'gagal'); }

/* ============ router ============ */
const ROUTES={ '#dashboard':vDashboard, '#inbox':vInbox, '#domains':vDomains, '#settings':vSettings, '#profile':vProfile, '#users':vUsers };
function route(){ closeDrawer(); let hash=location.hash||(ME.role==='owner'?'#users':'#dashboard'); if(!ROUTES[hash])hash=(ME.role==='owner'?'#users':'#dashboard'); setActive(hash); (ROUTES[hash]||(()=>view.innerHTML='404'))(); }
window.addEventListener('hashchange', route);

(async ()=>{
  ME=await api('/me');
  if(!ME||!ME.role){ location.href='/admin'+QS; return; }
  $('#userName').textContent=ME.name||ME.email;
  $('#brandName').textContent=ME.brand||'Admin';
  renderNav(); expiryBanner(); route();
  $('#userBtn').onclick=()=>$('#userMenu').classList.toggle('hidden');
  $('#logoutBtn').onclick=()=>location.href='/admin/logout'+QS;
  if(ME.role==='buyer') mountVisitBtn();
})();
async function mountVisitBtn(){
  // URL web publik buyer: hostname aktif kalau ada, kalau nggak origin sekarang.
  var url = location.origin + '/';
  try{ var d=await api('/webdomain'); var hs=(d&&d.hostnames)||[];
    var act=hs.find(function(h){return String(h.status).toLowerCase()==='active';})||hs[0];
    if(act&&act.hostname) url='https://'+act.hostname+'/';
  }catch(e){}
  var a=document.createElement('a');
  a.href=url; a.target='_blank'; a.rel='noopener'; a.id='visitBtn'; a.title='Buka web TMail kamu';
  a.innerHTML='<i class="fas fa-external-link-alt"></i><span class="vlbl">Lihat Web</span>';
  a.style.cssText='position:fixed;right:18px;bottom:18px;z-index:60;display:flex;align-items:center;gap:8px;background:#4f46e5;color:#fff;padding:12px 18px;border-radius:9999px;box-shadow:0 6px 20px rgba(79,70,229,.45);font-size:14px;font-weight:600;text-decoration:none;transition:transform .15s,box-shadow .15s';
  a.onmouseenter=function(){a.style.transform='translateY(-2px)';a.style.boxShadow='0 10px 26px rgba(79,70,229,.55)';};
  a.onmouseleave=function(){a.style.transform='';a.style.boxShadow='0 6px 20px rgba(79,70,229,.45)';};
  document.body.appendChild(a);
}
`;
