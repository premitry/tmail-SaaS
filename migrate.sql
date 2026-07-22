-- Migrasi untuk DB yang sudah ada (tambah fitur Inbox + Delete After).
-- Jalankan: wrangler d1 execute tmail_saas --local --file=./migrate.sql
-- Catatan: baris ALTER akan error jika kolom sudah ada — abaikan (jalankan sekali).

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

ALTER TABLE buyer_settings ADD COLUMN delete_after_minutes INTEGER NOT NULL DEFAULT 1440;
ALTER TABLE buyer_settings ADD COLUMN favicon_url TEXT NOT NULL DEFAULT '';
-- default tema baru = nebula (terapkan ke yang masih 'default')
UPDATE buyer_settings SET theme='nebula' WHERE theme='default';

-- Deteksi Email Routing aktif: timestamp email terakhir yg masuk via email() handler CF.
ALTER TABLE buyer_settings ADD COLUMN last_worker_email_at INTEGER NOT NULL DEFAULT 0;

-- Mail Hub (root imapku.icu) — settings global (retention, dll).
CREATE TABLE IF NOT EXISTS platform_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('hub_retention_days', '7');
INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('hub_brand', 'Mail Hub');

-- Kolom flag: email masuk ke domain milik OWNER (bukan buyer) — dipisah supaya Mail Hub tampilin catch-all imapku.icu.
ALTER TABLE messages ADD COLUMN is_hub INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_messages_hub ON messages(is_hub, received_at);
