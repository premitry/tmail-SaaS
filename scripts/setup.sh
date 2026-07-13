#!/usr/bin/env bash
# Setup TMail-SaaS di VPS (Linux). Jalankan dari root proyek: bash scripts/setup.sh
set -euo pipefail

echo "==> 1. Install dependency"
npm install

echo "==> 2. Buat database D1 (kalau belum)"
if ! grep -q '"database_id": "REPLACE_WITH_D1_ID"' wrangler.jsonc; then
  echo "    (database_id sudah diisi, lewati pembuatan)"
else
  echo "    Jalankan perintah ini lalu tempel database_id ke wrangler.jsonc:"
  echo "    npx wrangler d1 create tmail_saas"
  read -rp "    Tekan Enter setelah database_id diisi ke wrangler.jsonc..."
fi

echo "==> 3. Terapkan skema (lokal + remote)"
npm run db:init || true
read -rp "    Terapkan skema ke REMOTE juga? (y/N) " yn
[[ "${yn:-N}" == "y" ]] && npm run db:init:remote || true

echo "==> 4. Set secret (owner + kunci enkripsi)"
echo "    OWNER_EMAIL / OWNER_PASSWORD = login owner pertama."
echo "    ENCRYPTION_KEY = string acak panjang (untuk enkripsi password IMAP)."
cat <<'EOF'
    Contoh:
    npx wrangler secret put OWNER_EMAIL
    npx wrangler secret put OWNER_PASSWORD
    npx wrangler secret put ENCRYPTION_KEY
    # opsional (custom hostname):
    npx wrangler secret put CF_API_TOKEN
    npx wrangler secret put CF_ZONE_ID
EOF

echo "==> Selesai. Jalankan dev:  npm run dev  (atau: npx wrangler dev --ip 0.0.0.0 --port 8787)"
echo "    Owner panel (lokal):  http://<ip>:8787/admin?__tenant=owner"
