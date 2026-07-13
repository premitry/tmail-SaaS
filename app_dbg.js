
const CFG = {"domains":["asdawd.com","example.com"],"brand":"tmaikunih","panelDisplay":"flex"};
const HOST = location.host, AKEY = 'tmail_addr_' + HOST;
let addr = localStorage.getItem(AKEY) || '';
let ws = null, currentId = null;
const TENANT = new URLSearchParams(location.search).get('__tenant');
const TQS = TENANT ? '__tenant=' + encodeURIComponent(TENANT) : '';
function apiUrl(path){ if(!TQS) return '/api' + path; return '/api' + path + (path.includes('?') ? '&' : '?') + TQS; }
const $ = (s) => document.querySelector(s);
function status(txt, color){ $('#statusText').textContent = txt; $('#statusDot').className = 'text-xs ' + (color||'text-gray-400'); }
async function api(path, opts){ const r = await fetch(apiUrl(path), opts); return r.json(); }
const LD = CFG.panelDisplay || 'block';
function showActive(){ $('#createPanel').style.display='none'; $('#activePanel').style.display=LD; var ab=$('#addrBox'), sp=ab.querySelector('span'); if(sp){ sp.textContent=addr; } else { ab.textContent=addr; } }
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
  list.innerHTML = msgs.map(m => '<div class="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 '+(m.read?'':'font-semibold')+'" onclick="openMsg(''+m.id+'')">'+
    '<div class="flex justify-between gap-2"><div class="text-sm text-gray-800 dark:text-gray-200 truncate">'+escapeHtml(m.sender)+'</div><div class="text-xs text-gray-400 whitespace-nowrap">'+timeAgo(m.received_at)+'</div></div>'+
    '<div class="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">'+escapeHtml(m.subject)+'</div>'+
    '<div class="text-xs text-gray-400 mt-1 truncate">'+escapeHtml(m.preview||'')+'</div></div>').join('');
}
async function openMsg(id){
  currentId = id;
  const res = await api('/message?a=' + encodeURIComponent(addr) + '&id=' + id);
  if(res.error){ alert(res.error); return; }
  const body = res.html ? res.html : '<pre style="white-space:pre-wrap;font-family:sans-serif;padding:12px">'+escapeHtml(res.text||'')+'</pre>';
  $('#msgView').innerHTML = '<div class="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start gap-3"><div class="min-w-0"><div class="text-lg text-gray-900 dark:text-gray-100 truncate">'+escapeHtml(res.subject)+'</div><div class="text-xs text-gray-400 truncate">'+escapeHtml(res.sender)+'</div></div><button onclick="delMsg(''+id+'')" class="text-xs bg-red-600 text-white px-3 py-1 rounded-md whitespace-nowrap">Hapus</button></div>'+
    '<iframe class="flex-1 w-full bg-white min-h-[320px]" sandbox="allow-same-origin" srcdoc="'+escapeAttr(body)+'"></iframe>';
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
