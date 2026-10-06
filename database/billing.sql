-- LISTIXAAR V8 — Premium / billing
create table if not exists plans (
  id text primary key,
  name text not null,
  price_xof integer not null,
  currency text not null default 'XOF',
  interval text not null default 'one_time',
  active boolean not null default true
);

insert into plans(id,name,price_xof,currency,interval)
values ('premium_monthly','LISTIXAAR Premium',5000,'XOF','monthly')
on conflict(id) do nothing;

create table if not exists subscriptions (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  plan_id text not null references plans(id),
  status text not null check (status in ('pending','active','expired','cancelled')),
  provider text,
  provider_reference text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user
on subscriptions(user_id, created_at desc);

create table if not exists payment_transactions (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  subscription_id bigint references subscriptions(id) on delete set null,
  provider text not null,
  provider_reference text,
  amount_xof integer not null,
  currency text not null default 'XOF',
  status text not null check (status in ('pending','paid','failed','refunded')),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_transactions_user
on payment_transactions(user_id, created_at desc);
