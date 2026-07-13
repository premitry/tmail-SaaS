// Halaman dokumentasi API publik (per-buyer, pakai API key).
import { head, esc } from "./ui";

export function renderDocs(brand: string): string {
  return `${head(brand + " — API Docs")}
<body class="bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
<div class="max-w-3xl mx-auto px-5 py-10">
  <a href="/admin" class="text-sm text-blue-600">&larr; Admin</a>
  <h1 class="text-3xl font-bold mt-3 mb-2">📮 API Docs — ${esc(brand)}</h1>
  <p class="text-sm text-gray-500 mb-6">Semua endpoint di bawah <code>/api/</code>. Autentikasi (opsional untuk otomasi eksternal):
    kirim <code>Authorization: Bearer &lt;API_KEY&gt;</code>, header <code>X-API-Key</code>, atau <code>?token=</code>.
    Buat/cabut API key di <b>Admin → Settings → Advance</b>.</p>

  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-gray-100 dark:bg-gray-800"><tr><th class="text-left p-3">Method</th><th class="text-left p-3">Path</th><th class="text-left p-3">Fungsi</th></tr></thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
        <tr><td class="p-3 font-mono text-green-600">GET</td><td class="p-3 font-mono">/api/domains</td><td class="p-3">Daftar domain aktif</td></tr>
        <tr><td class="p-3 font-mono text-green-600">GET</td><td class="p-3 font-mono">/api/new?domain=&amp;local=</td><td class="p-3"><code>local</code> diisi = custom, kosong = acak</td></tr>
        <tr><td class="p-3 font-mono text-green-600">GET</td><td class="p-3 font-mono">/api/inbox?a=&lt;addr&gt;</td><td class="p-3">List email di inbox</td></tr>
        <tr><td class="p-3 font-mono text-green-600">GET</td><td class="p-3 font-mono">/api/message?a=&amp;id=</td><td class="p-3">Isi 1 email</td></tr>
        <tr><td class="p-3 font-mono text-orange-600">POST</td><td class="p-3 font-mono">/api/delete?a=&amp;id=</td><td class="p-3">Hapus 1 email</td></tr>
        <tr><td class="p-3 font-mono text-orange-600">POST</td><td class="p-3 font-mono">/api/clear?a=</td><td class="p-3">Kosongkan inbox</td></tr>
      </tbody>
    </table>
  </div>

  <h2 class="text-lg font-semibold mt-8 mb-2">Contoh (bash)</h2>
  <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">KEY="tk_xxxx"; BASE="https://your-host"
ADDR=$(curl -s -H "X-API-Key: $KEY" "$BASE/api/new?local=bot" | jq -r .address)
curl -s -H "X-API-Key: $KEY" "$BASE/api/inbox?a=$ADDR" | jq '.messages'</pre>
</div>
</body></html>`;
}
