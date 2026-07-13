# TMail-SaaS — Temp Mail Multi-Tenant di Cloudflare Workers

Temp-mail **SaaS white-label** yang jalan penuh di **Cloudflare Workers**.
Tampilan meniru **TMail**, 3 tingkat: **Owner → Buyer → Pengunjung**.

> **Status:** MVP end-to-end **sudah jalan & terverifikasi lokal** (typecheck OK, `wrangler dev` OK,
> smoke test alur owner/buyer/pengunjung + impersonation + expiry semua lulus).
> IMAP client dipakai ulang dari `../tmail-cf` (jangan diutak-atik).

---

## Arsitektur singkat

```
OWNER (superadmin) ── panel.platform-kamu.com/admin
  └─ kelola Users (buat buyer, set masa aktif, Login-as)

BUYER (mis. A) ── mail.buyera.com  (web)  +  mail.buyera.com/admin
  ├─ 1 config IMAP (mailbox catch-all sendiri)
  └─ banyak domain (semua otomatis pakai IMAP buyer)

PENGUNJUNG ── buka web buyer → alamat anonim xkz8@a.com → inbox realtime (WebSocket)
```

- **1 Worker** melayani semua tenant; publik dibedakan dari **Host** (Custom Hostname / Cloudflare for SaaS).
- **Admin berbasis sesi** (bukan host) → fitur **Login-as** (impersonation) jalan lintas host.
- **D1** (data, multi-tenant scope `buyer_id`) · **Durable Object** (inbox + WebSocket) · **IMAP** via `cloudflare:sockets`.
- Password IMAP **dienkripsi AES-GCM**; password akun **di-hash PBKDF2**.

## Struktur file (`src/`)

| File | Isi |
|---|---|
| `index.ts` | Worker utama: bootstrap → resolusi tenant → admin/publik + cron |
| `types.ts` | Tipe bersama |
| `crypto.ts` | Hash password (PBKDF2) + enkripsi IMAP (AES-GCM) |
| `db.ts` | Semua query D1 (users, settings, domains, hostnames, keys, sessions, stats) |
| `auth.ts` | Sesi cookie + `resolveTenant` |
| `imap.ts` | IMAP client + poll per-buyer (dari tmail-cf) |
| `mailbox.ts` | Durable Object inbox + WebSocket realtime |
| `store.ts` | Helper simpan email + generator alamat |
| `public-ui.ts` | Halaman web publik (3 tema, dark/light, realtime) |
| `public-routes.ts` | Route web publik + visitor API + WS |
| `admin-ui.ts` | Login + shell admin SPA (sidebar) |
| `admin-routes.ts` | API admin buyer & owner + login-as |
| `hostnames.ts` | Provisioning Custom Hostname (CF API) |
| `docs.ts` | Halaman Docs API |

---

## Menjalankan (lokal / VPS Linux)

```bash
# 1. Dependency
npm install

# 2. Buat D1 lalu tempel database_id ke wrangler.jsonc
npx wrangler d1 create tmail_saas

# 3. Terapkan skema
npm run db:init            # lokal
# npm run db:init:remote   # produksi

# 4. Secret / dev vars
#   Lokal: buat file .dev.vars
cat > .dev.vars <<'EOF'
OWNER_EMAIL=owner@example.com
OWNER_PASSWORD=owner123
ENCRYPTION_KEY=ganti-string-acak-panjang
EOF
#   Produksi: npx wrangler secret put OWNER_EMAIL  (dst.)

# 5. Jalankan
npx wrangler dev --ip 0.0.0.0 --port 8787
```

Owner pertama otomatis dibuat dari `OWNER_EMAIL`/`OWNER_PASSWORD` saat request pertama.

### Akses saat tes tanpa DNS
Pakai override `?__tenant=`:
- Owner panel: `http://<ip>:8787/admin?__tenant=owner`
- Web/admin buyer: tambahkan `?__tenant=<email-buyer>` di URL.

### Smoke test otomatis
```bash
bash scripts/smoke.sh http://127.0.0.1:8787
```
Menguji: login owner → buat buyer → login buyer → set IMAP + domain → dashboard →
pengunjung buat alamat → inbox → login-as. (Email masuk perlu IMAP asli.)

---

## Produksi (ringkas)

1. Deploy: `npm run deploy` (butuh Workers Paid untuk Durable Objects di skala nyata).
2. Owner buat buyer di panel, isi **web hostname** buyer → di-provision via Cloudflare for SaaS
   (set `CF_API_TOKEN` + `CF_ZONE_ID`; tanpa itu hostname berstatus `manual`).
3. Buyer arahkan **MX domain**-nya ke mailbox catch-all IMAP miliknya, lalu isi IMAP di
   **Settings → IMAP**, dan tambah domain di **Domains**.
4. Cron tiap menit menarik email baru via IMAP + menandai buyer yang masa aktifnya habis.

## Menu Admin

- **Owner:** Users (create buyer, dropdown masa aktif, perpanjang, suspend, hapus, **Login-as**).
- **Buyer sidebar:** Dashboard · Domains · Settings.
  - Settings: General · IMAP · Configuration · Socials · Languages (ID/EN) · Themes (3 tema) · Advance (API Keys + Lock) · Export/Import.
  - User menu: Profile · toggle gelap/terang · Logout.
- Banner **notif 3 hari** sebelum masa aktif habis (bisa disilang, muncul lagi tiap login).

## Yang perlu lingkungan nyata (belum bisa dites lokal)

- **Terima email IMAP** — butuh mailbox catch-all asli.
- **WebSocket realtime push** — terpicu saat email betulan masuk.
- **Custom Hostname** — butuh Cloudflare for SaaS + `CF_API_TOKEN`/`CF_ZONE_ID`.

## Catatan keamanan

- Ganti `ENCRYPTION_KEY` dengan string acak kuat sebelum produksi.
- Cookie sesi `HttpOnly` + `Secure` (di HTTPS). Visitor API sengaja terbuka (sifat temp-mail), tetap ke-scope per-domain buyer.
