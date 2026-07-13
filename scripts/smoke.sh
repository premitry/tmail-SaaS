#!/usr/bin/env bash
# Smoke test alur multi-tenant terhadap server dev yang SUDAH jalan.
# Pakai override ?__tenant= supaya tak butuh DNS. jq opsional (fallback ke python).
# Jalankan: bash scripts/smoke.sh [BASE]   (default http://127.0.0.1:8787)
set -uo pipefail

BASE="${1:-http://127.0.0.1:8787}"
OWNER_EMAIL="${OWNER_EMAIL:-owner@example.com}"
OWNER_PASSWORD="${OWNER_PASSWORD:-owner123}"
BUYER_EMAIL="buyer-a@example.com"
BUYER_PASS="buyer123"
DOMAIN="example.com"

owner_jar="$(mktemp)"; buyer_jar="$(mktemp)"
say(){ printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
# ekstrak field JSON sederhana tanpa dependency wajib
field(){ python -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }

say "1) Login OWNER"
curl -s -c "$owner_jar" -H 'content-type: application/json' \
  "$BASE/admin/login?__tenant=owner" -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASSWORD\"}"; echo

say "2) Owner buat BUYER ($BUYER_EMAIL, 30 hari)"
curl -s -b "$owner_jar" -H 'content-type: application/json' \
  "$BASE/admin/api/buyers?__tenant=owner" \
  -d "{\"email\":\"$BUYER_EMAIL\",\"name\":\"Buyer A\",\"password\":\"$BUYER_PASS\",\"days\":30}"; echo

say "3) Owner lihat daftar buyer"
curl -s -b "$owner_jar" "$BASE/admin/api/buyers?__tenant=owner" | field "['buyers'][0]['email']"

say "4) Login BUYER"
curl -s -c "$buyer_jar" -H 'content-type: application/json' \
  "$BASE/admin/login?__tenant=$BUYER_EMAIL" -d "{\"email\":\"$BUYER_EMAIL\",\"password\":\"$BUYER_PASS\"}"; echo

say "5) Buyer set IMAP + tambah domain ($DOMAIN)"
curl -s -b "$buyer_jar" -H 'content-type: application/json' \
  "$BASE/admin/api/settings?__tenant=$BUYER_EMAIL" \
  -d '{"imap_host":"imap.example.com","imap_port":993,"imap_user":"catchall@example.com","imap_pass":"secret","imap_tls":1}' >/dev/null && echo "  imap: ok"
curl -s -b "$buyer_jar" -H 'content-type: application/json' \
  "$BASE/admin/api/domains?__tenant=$BUYER_EMAIL" -d "{\"domain\":\"$DOMAIN\"}"; echo

say "6) Buyer dashboard"
curl -s -b "$buyer_jar" "$BASE/admin/api/dashboard?__tenant=$BUYER_EMAIL"; echo

say "7) PENGUNJUNG buat alamat di web buyer"
ADDR=$(curl -s "$BASE/api/new?__tenant=$BUYER_EMAIL&domain=$DOMAIN&local=order-bot" | field "['address']")
echo "  alamat: $ADDR"

say "8) Pengunjung cek inbox"
curl -s "$BASE/api/inbox?__tenant=$BUYER_EMAIL&a=$ADDR"; echo

say "9) Owner Login-as buyer (impersonation)"
BID=$(curl -s -b "$owner_jar" "$BASE/admin/api/buyers?__tenant=owner" | field "['buyers'][0]['id']")
curl -s -b "$owner_jar" -H 'content-type: application/json' \
  "$BASE/admin/api/buyers/login-as?__tenant=owner" -d "{\"id\":\"$BID\"}"; echo

echo -e "\n\033[1;32mSelesai. Alur multi-tenant OK (email masuk perlu IMAP asli).\033[0m"
rm -f "$owner_jar" "$buyer_jar"
