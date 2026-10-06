-- LISTIXAAR V6 — authentication
create table if not exists user_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  display_name text,
  locale text not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_sessions (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_sessions_user on auth_sessions(user_id);
