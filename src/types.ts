// Tipe & kontrak bersama antar modul.

export interface Env {
  DB: D1Database;
  MAILBOX: DurableObjectNamespace;
  WATCHER: DurableObjectNamespace;

  PLATFORM_HOST: string;        // host panel owner (superadmin)
  INBOX_TTL_MINUTES: string;    // masa simpan email di inbox
  BRAND_NAME: string;

  // Secret
  OWNER_EMAIL: string;          // bootstrap owner pertama
  OWNER_PASSWORD: string;
  ENCRYPTION_KEY: string;       // untuk AES-GCM password IMAP + hashing

  // Opsional: provisioning Custom Hostname (Cloudflare for SaaS)
  CF_API_TOKEN?: string;
  CF_ZONE_ID?: string;
  SAAS_ZONE?: string;   // zona induk untuk wildcard subdomain (mis. imapku.icu)
}

export interface UserRow {
  id: string;
  role: "owner" | "buyer";
  email: string;
  username: string | null;
  pass_hash: string;
  name: string;
  status: "active" | "suspended" | "expired";
  expires_at: number | null;
  created_at: number;
}

export interface BuyerSettings {
  buyer_id: string;
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_pass_enc: string;
  imap_tls: number;
  imap_last_uid: number;
  brand_name: string;
  logo_url: string;
  favicon_url: string;
  color_primary: string;
  color_secondary: string;
  color_tertiary: string;
  theme: string;
  lang: string;
  dark_mode: number;
  email_limit: number;
  delete_after_minutes: number;
  socials_json: string;
  lock_json: string;
  updated_at: number | null;
}

export interface DomainRow {
  id: string;
  buyer_id: string;
  domain: string;
  is_active: number;
  created_at: number;
}

export interface HostnameRow {
  id: string;
  buyer_id: string;
  hostname: string;
  cf_hostname_id: string;
  status: string;
  created_at: number;
}

export interface StoredEmail {
  sender: string;
  subject: string;
  preview: string;
  text: string;
  html: string;
}

// Konteks tenant hasil resolusi Host.
export type Tenant =
  | { kind: "owner" }
  | { kind: "buyer"; buyer: UserRow; settings: BuyerSettings }
  | { kind: "unknown" };

// Sesi login (dengan info user & impersonation).
export interface SessionCtx {
  sessionId: string;
  user: UserRow;
  impersonatorId: string | null;
}
