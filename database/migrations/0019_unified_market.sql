CREATE TABLE account_roles (user_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('seller','courier')), status TEXT NOT NULL CHECK(status IN ('approved','revoked')), verification TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,role));
--> statement-breakpoint
CREATE TABLE personal_sellers (user_id TEXT PRIMARY KEY NOT NULL, seller_id INTEGER NOT NULL UNIQUE, country TEXT NOT NULL, consent_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE commerce_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE finance_entries (id TEXT PRIMARY KEY NOT NULL, country TEXT NOT NULL, order_id TEXT NOT NULL, seller_id INTEGER NOT NULL, user_id TEXT NOT NULL, currency TEXT NOT NULL, debit_account TEXT NOT NULL, credit_account TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>0), kind TEXT NOT NULL, reference TEXT NOT NULL, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX finance_owner_idx ON finance_entries(user_id,created_at);
--> statement-breakpoint
CREATE TABLE seller_settlements (id TEXT PRIMARY KEY NOT NULL, country TEXT NOT NULL, order_id TEXT NOT NULL, seller_id INTEGER NOT NULL, user_id TEXT NOT NULL, gross INTEGER NOT NULL, commission INTEGER NOT NULL, net INTEGER NOT NULL, currency TEXT NOT NULL, policy_confirmed INTEGER NOT NULL, status TEXT NOT NULL, available_at INTEGER NOT NULL, reference TEXT, channel TEXT, recorded_by TEXT, updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX settlements_owner_idx ON seller_settlements(user_id,status);
--> statement-breakpoint
CREATE TABLE return_requests (id TEXT PRIMARY KEY NOT NULL, order_id TEXT NOT NULL UNIQUE, buyer_user_id TEXT NOT NULL, country TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL, revision INTEGER NOT NULL, operation_token TEXT, note TEXT NOT NULL, reference TEXT, channel TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE account_addresses (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, label TEXT NOT NULL, city TEXT NOT NULL, commune TEXT NOT NULL, address TEXT NOT NULL, phone TEXT NOT NULL, updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX addresses_owner_idx ON account_addresses(user_id);
--> statement-breakpoint
CREATE TABLE support_tickets (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, country TEXT NOT NULL, topic TEXT NOT NULL, status TEXT NOT NULL, revision INTEGER NOT NULL, operation_token TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE support_messages (id TEXT PRIMARY KEY NOT NULL, ticket_id TEXT NOT NULL, user_id TEXT NOT NULL, sender_role TEXT NOT NULL, message TEXT NOT NULL, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX support_thread_idx ON support_messages(ticket_id,created_at);
--> statement-breakpoint
CREATE TABLE subscription_requests (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, country TEXT NOT NULL, kind TEXT NOT NULL, plan TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE admin_content (id TEXT PRIMARY KEY NOT NULL, country TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL, revision INTEGER NOT NULL, updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE audit_events (id TEXT PRIMARY KEY NOT NULL, actor_user_id TEXT NOT NULL, country TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX audit_time_idx ON audit_events(country,created_at);
--> statement-breakpoint
CREATE TABLE account_controls (user_id TEXT PRIMARY KEY NOT NULL, suspended INTEGER NOT NULL, note TEXT NOT NULL, updated_at INTEGER NOT NULL);
--> statement-breakpoint
ALTER TABLE owned_stores ADD COLUMN address TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE identity_checks ADD COLUMN activity_address TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE seller_settlements ADD COLUMN custodian_kind TEXT NOT NULL DEFAULT 'courier';
--> statement-breakpoint
CREATE TABLE cash_remittances (order_id TEXT PRIMARY KEY NOT NULL, country TEXT NOT NULL, amount INTEGER NOT NULL, reference TEXT NOT NULL, channel TEXT NOT NULL, recorded_by TEXT NOT NULL, created_at INTEGER NOT NULL);
