-- ============================================================
-- TMail-SaaS — skema D1 (multi-tenant)
-- Jalankan: npm run db:init  (lokal)  /  npm run db:init:remote
-- ============================================================

-- Pengguna: owner (superadmin) & buyer (tenant).
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  role        TEXT NOT NULL DEFAULT 'buyer',   -- 'owner' | 'buyer'
  email       TEXT NOT NULL UNIQUE,
  pass_hash   TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active',  -- active | suspended | expired
  expires_at  INTEGER,                          -- epoch ms; NULL = tanpa batas (owner)
  created_at  INTEGER NOT NULL
);

-- Setting per-buyer (IMAP, branding, tema, dll). 1 baris per buyer.
CREATE TABLE IF NOT EXISTS buyer_settings (
  buyer_id      TEXT PRIMARY KEY,
  imap_host     TEXT NOT NULL DEFAULT '',
  imap_port     INTEGER NOT NULL DEFAULT 993,
  imap_user     TEXT NOT NULL DEFAULT '',
  imap_pass_enc TEXT NOT NULL DEFAULT '',       -- AES-GCM terenkripsi
  imap_tls      INTEGER NOT NULL DEFAULT 1,
  imap_last_uid INTEGER NOT NULL DEFAULT 0,
  brand_name    TEXT NOT NULL DEFAULT 'TMail',
  logo_url      TEXT NOT NULL DEFAULT '',
  color_primary   TEXT NOT NULL DEFAULT '#1d4ed8',
  color_secondary TEXT NOT NULL DEFAULT '#14b8a6',
  color_tertiary  TEXT NOT NULL DEFAULT '#eab308',
  theme         TEXT NOT NULL DEFAULT 'default', -- default | mantis | nebula
  lang          TEXT NOT NULL DEFAULT 'id',      -- id | en
  dark_mode     INTEGER NOT NULL DEFAULT 1,
  email_limit   INTEGER NOT NULL DEFAULT 5,
  delete_after_minutes INTEGER NOT NULL DEFAULT 1440,
  socials_json  TEXT NOT NULL DEFAULT '[]',
  lock_json     TEXT NOT NULL DEFAULT '{"enable":false,"text":"","password":""}',
  updated_at    INTEGER
);

-- Riwayat email masuk (untuk halaman Inbox gabungan per-buyer).
CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  buyer_id    TEXT NOT NULL,
  to_addr     TEXT NOT NULL,
  from_addr   TEXT NOT NULL,
  subject     TEXT NOT NULL DEFAULT '',
  preview     TEXT NOT NULL DEFAULT '',
  html        TEXT NOT NULL DEFAULT '',
  text        TEXT NOT NULL DEFAULT '',
  received_at INTEGER NOT NULL,
  seen        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_buyer ON messages(buyer_id, received_at);

-- Domain email milik buyer (semua otomatis pakai IMAP buyer tsb).
CREATE TABLE IF NOT EXISTS domains (
  id         TEXT PRIMARY KEY,
  buyer_id   TEXT NOT NULL,
  domain     TEXT NOT NULL UNIQUE,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_domains_buyer ON domains(buyer_id);

-- Hostname web buyer (Custom Hostname / Cloudflare for SaaS).
CREATE TABLE IF NOT EXISTS hostnames (
  id            TEXT PRIMARY KEY,
  buyer_id      TEXT NOT NULL,
  hostname      TEXT NOT NULL UNIQUE,
  cf_hostname_id TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | active | manual
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hostnames_buyer ON hostnames(buyer_id);

-- API key per-buyer (bisa dicabut).
CREATE TABLE IF NOT EXISTS api_keys (
  id         TEXT PRIMARY KEY,
  buyer_id   TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT '',
  key        TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_keys_buyer ON api_keys(buyer_id);

-- Sesi login (cookie). impersonator_id terisi saat owner "Login as" buyer.
CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  impersonator_id TEXT,
  created_at      INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Statistik harian per-buyer.
CREATE TABLE IF NOT EXISTS stats (
  buyer_id          TEXT NOT NULL,
  day               TEXT NOT NULL,             -- YYYY-MM-DD
  emails_created    INTEGER NOT NULL DEFAULT 0,
  messages_received INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (buyer_id, day)
);
