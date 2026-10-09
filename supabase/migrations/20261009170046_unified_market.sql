CREATE TABLE runtime.account_roles (user_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('seller','courier')), status TEXT NOT NULL CHECK(status IN ('approved','revoked')), verification TEXT NOT NULL, updated_at BIGINT NOT NULL, PRIMARY KEY(user_id,role));

CREATE TABLE runtime.personal_sellers (user_id TEXT PRIMARY KEY NOT NULL, seller_id BIGINT NOT NULL UNIQUE, country TEXT NOT NULL, consent_at BIGINT NOT NULL);

CREATE TABLE runtime.commerce_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);

CREATE TABLE runtime.finance_entries (id TEXT PRIMARY KEY NOT NULL, country TEXT NOT NULL, order_id TEXT NOT NULL, seller_id BIGINT NOT NULL, user_id TEXT NOT NULL, currency TEXT NOT NULL, debit_account TEXT NOT NULL, credit_account TEXT NOT NULL, amount BIGINT NOT NULL CHECK(amount>0), kind TEXT NOT NULL, reference TEXT NOT NULL, created_at BIGINT NOT NULL);

CREATE INDEX finance_owner_idx ON runtime.finance_entries(user_id,created_at);

CREATE TABLE runtime.seller_settlements (id TEXT PRIMARY KEY NOT NULL, country TEXT NOT NULL, order_id TEXT NOT NULL, seller_id BIGINT NOT NULL, user_id TEXT NOT NULL, gross BIGINT NOT NULL, commission BIGINT NOT NULL, net BIGINT NOT NULL, currency TEXT NOT NULL, policy_confirmed BIGINT NOT NULL, status TEXT NOT NULL, available_at BIGINT NOT NULL, reference TEXT, channel TEXT, recorded_by TEXT, updated_at BIGINT NOT NULL);

CREATE INDEX settlements_owner_idx ON runtime.seller_settlements(user_id,status);

CREATE TABLE runtime.return_requests (id TEXT PRIMARY KEY NOT NULL, order_id TEXT NOT NULL UNIQUE, buyer_user_id TEXT NOT NULL, country TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL, revision BIGINT NOT NULL, operation_token TEXT, note TEXT NOT NULL, reference TEXT, channel TEXT, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL);

CREATE TABLE runtime.account_addresses (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, label TEXT NOT NULL, city TEXT NOT NULL, commune TEXT NOT NULL, address TEXT NOT NULL, phone TEXT NOT NULL, updated_at BIGINT NOT NULL);

CREATE INDEX addresses_owner_idx ON runtime.account_addresses(user_id);

CREATE TABLE runtime.support_tickets (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, country TEXT NOT NULL, topic TEXT NOT NULL, status TEXT NOT NULL, revision BIGINT NOT NULL, operation_token TEXT, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL);

CREATE TABLE runtime.support_messages (id TEXT PRIMARY KEY NOT NULL, ticket_id TEXT NOT NULL, user_id TEXT NOT NULL, sender_role TEXT NOT NULL, message TEXT NOT NULL, created_at BIGINT NOT NULL);

CREATE INDEX support_thread_idx ON runtime.support_messages(ticket_id,created_at);

CREATE TABLE runtime.subscription_requests (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, country TEXT NOT NULL, kind TEXT NOT NULL, plan TEXT NOT NULL, status TEXT NOT NULL, created_at BIGINT NOT NULL);

CREATE TABLE runtime.admin_content (id TEXT PRIMARY KEY NOT NULL, country TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL, revision BIGINT NOT NULL, updated_at BIGINT NOT NULL);

CREATE TABLE runtime.audit_events (id TEXT PRIMARY KEY NOT NULL, actor_user_id TEXT NOT NULL, country TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL, created_at BIGINT NOT NULL);

CREATE INDEX audit_time_idx ON runtime.audit_events(country,created_at);

CREATE TABLE runtime.account_controls (user_id TEXT PRIMARY KEY NOT NULL, suspended BIGINT NOT NULL, note TEXT NOT NULL, updated_at BIGINT NOT NULL);

ALTER TABLE runtime.owned_stores ADD COLUMN address TEXT NOT NULL DEFAULT '';

ALTER TABLE runtime.identity_checks ADD COLUMN activity_address TEXT NOT NULL DEFAULT '';

ALTER TABLE runtime.seller_settlements ADD COLUMN custodian_kind TEXT NOT NULL DEFAULT 'courier';

CREATE TABLE runtime.cash_remittances (order_id TEXT PRIMARY KEY NOT NULL, country TEXT NOT NULL, amount BIGINT NOT NULL, reference TEXT NOT NULL, channel TEXT NOT NULL, recorded_by TEXT NOT NULL, created_at BIGINT NOT NULL);

do $$ declare item text; begin
foreach item in array array['account_roles','personal_sellers','commerce_settings','finance_entries','seller_settlements','return_requests','account_addresses','support_tickets','support_messages','subscription_requests','admin_content','audit_events','account_controls','cash_remittances'] loop
 execute format('alter table runtime.%I enable row level security',item);
 execute format('alter table runtime.%I force row level security',item);
 execute format('create policy server_runtime_only on runtime.%I for all to yaviya_runtime using (true) with check (true)',item);
 execute format('revoke all on runtime.%I from public, anon, authenticated',item);
 execute format('grant select, insert, update, delete on runtime.%I to yaviya_runtime',item);
end loop; end $$;
revoke update, delete on runtime.finance_entries, runtime.audit_events, runtime.cash_remittances from yaviya_runtime;
create index return_buyer_idx on runtime.return_requests(buyer_user_id,created_at);
create index support_owner_idx on runtime.support_tickets(user_id,updated_at);
create index finance_order_idx on runtime.finance_entries(order_id);
