
const CFG = {"domains":["yume.my.id"],"brand":"TMail","panelDisplay":"flex","twoPane":true};
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
function renderAddrMenu(){ var m=$('#addrMenu'); if(!m) return; m.innerHTML = addrs.map(function(a){ return '<div onclick="setActiveAddr(\''+a+'\')" class="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-mono '+(a===addr?'font-bold':'')+'">'+escapeHtml(a)+'</div>'; }).join(''); }
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
  const res = await api('/inbox?a=' + encodeURIComponent(addr));
  const list = $('#inboxList'); const msgs = res.messages || [];
  status(msgs.length + ' email', 'text-green-500');
  var _ic=$('#inboxCount'); if(_ic) _ic.textContent=msgs.length;
  if(!msgs.length){ list.innerHTML = '<div class="h-40 flex items-center justify-center text-gray-400">Menunggu email masuk…</div>'; return; }
  if(TWO){
    list.innerHTML = msgs.map(function(m){ var nm=escapeHtml((String(m.sender||'').split('@')[0])||m.sender||''), em=escapeHtml(m.sender||'');
      return '<div onclick="openMsg(\''+m.id+'\')" class="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 '+(m.read?'':'font-semibold')+'">'+
        '<div class="flex justify-between gap-2"><div class="text-sm text-gray-900 dark:text-gray-100 truncate">'+nm+'</div><div class="text-xs text-gray-400 whitespace-nowrap">'+fmtTime(m.received_at)+'</div></div>'+
        '<div class="text-xs text-gray-500 truncate">'+em+'</div>'+
        '<div class="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">'+escapeHtml(m.subject)+'</div></div>';
    }).join('');
    return;
  }
  var header = '<div class="flex items-center gap-3 py-3 px-5 bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><div class="w-1/2 md:w-3/12">Pengirim</div><div class="w-1/2 md:w-7/12">Subjek</div><div class="hidden md:flex md:w-2/12 justify-end">Waktu</div></div>';
  list.innerHTML = header + msgs.map(function(m){
    var em = escapeHtml(m.sender||''), nm = escapeHtml((String(m.sender||'').split('@')[0])||m.sender||'');
    return '<div onclick="openMsg(\''+m.id+'\')" class="flex items-center gap-3 py-4 px-5 border-b border-dashed border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer '+(m.read?'':'font-semibold')+'">'+
      '<div class="w-1/2 md:w-3/12 min-w-0"><div class="truncate text-sm text-gray-900 dark:text-gray-100">'+nm+'</div><div class="text-xs text-gray-500 truncate">'+em+'</div></div>'+
      '<div class="w-1/2 md:w-7/12 truncate text-sm text-gray-700 dark:text-gray-300">'+escapeHtml(m.subject)+'</div>'+
      '<div class="hidden md:flex md:w-2/12 justify-end text-xs text-gray-500">'+fmtTime(m.received_at)+'</div></div>';
  }).join('');
}
async function openMsg(id){
  currentId = id;
  const res = await api('/message?a=' + encodeURIComponent(addr) + '&id=' + id);
  if(res.error){ alert(res.error); return; }
  window.__mHtml = res.html ? res.html : '<pre style="white-space:pre-wrap;font-family:sans-serif;padding:12px">'+escapeHtml(res.text||'')+'</pre>';
  window.__mRaw = 'From: '+(res.sender||'')+'\nTo: '+addr+'\nSubject: '+(res.subject||'')+'\nDate: '+new Date(res.received_at).toLocaleString()+'\n\n'+(res.text||'(email format HTML — buka tab HTML)');
  var mv=$('#msgView');
  var trash='<button onclick="delMsg(\''+id+'\')" title="Hapus email" class="text-red-600 hover:text-red-700"><i class="fas fa-trash"></i></button>';
  var topRow = TWO ? '' : '<div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800"><button onclick="backToList()" class="text-sm text-gray-600 dark:text-gray-300 hover:underline"><i class="fas fa-chevron-left mr-1"></i>Kembali</button>'+trash+'</div>';
  mv.innerHTML = topRow+
    '<div class="pl-4 pr-9 py-3 border-b border-dashed border-gray-200 dark:border-gray-700 font-mono text-xs relative">'+(TWO?'<div class="absolute top-2 right-3">'+trash+'</div>':'')+'<div style="display:grid;grid-template-columns:max-content 1fr;gap:3px 12px">'+
      '<span class="opacity-60">FROM:</span><span class="break-all">'+escapeHtml(res.sender)+'</span>'+
      '<span class="opacity-60">TO:</span><span class="break-all">'+escapeHtml(addr)+'</span>'+
      '<span class="opacity-60">DATE:</span><span>'+escapeHtml(new Date(res.received_at).toLocaleString())+'</span>'+
      '<span class="opacity-60">SUBJECT:</span><span class="break-words font-bold">'+escapeHtml(res.subject)+'</span>'+
    '</div></div>'+
    '<div id="msgBody" class="flex-1 flex flex-col overflow-auto min-h-[300px]"></div>'+
    '<div class="flex border-t border-gray-200 dark:border-gray-800 text-sm font-semibold"><button id="tabHtml" onclick="msgTab(\'html\')" class="flex-1 py-2.5 text-center">HTML</button><button id="tabRaw" onclick="msgTab(\'raw\')" class="flex-1 py-2.5 text-center border-l border-gray-200 dark:border-gray-800">RAW</button></div>';
  if(!TWO){ $('#inboxList').style.display='none'; }
  mv.style.display='flex';
  msgTab('html');
  loadInbox();
}
function renderMsgBody(mode){ var b=$('#msgBody'); if(!b) return; if(mode==='raw'){ b.innerHTML='<pre style="white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,Menlo,monospace;padding:14px;font-size:12px;margin:0">'+escapeHtml(window.__mRaw||'')+'</pre>'; } else { b.innerHTML='<iframe class="flex-1 w-full bg-white" style="min-height:340px" sandbox="allow-same-origin" srcdoc="'+escapeAttr(window.__mHtml||'')+'"></iframe>'; } }
function msgTab(mode){ renderMsgBody(mode); var h=$('#tabHtml'),r=$('#tabRaw'); if(h){ h.style.background=mode==='html'?'rgba(0,0,0,.06)':''; } if(r){ r.style.background=mode==='raw'?'rgba(0,0,0,.06)':''; } }
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
