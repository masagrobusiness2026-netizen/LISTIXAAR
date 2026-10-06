-- LISTIXAAR V4 — base de données officielle
create table if not exists signs (
  id text primary key,
  symbol text not null,
  name_fr text not null,
  start_date text,
  end_date text,
  sort_order integer unique not null
);

create table if not exists sign_elements (
  id bigserial primary key,
  sign_id text not null references signs(id) on delete cascade,
  element_number smallint not null check (element_number between 1 and 12),
  element_name text not null,
  content text,
  is_official boolean not null default false,
  unique(sign_id, element_number)
);

create table if not exists abjad_letters (
  letter text primary key,
  value integer not null,
  is_official boolean not null default true
);

create table if not exists users (
  id uuid primary key,
  email text unique not null,
  password_hash text,
  created_at timestamptz not null default now()
);

create table if not exists readings (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  sign_id text references signs(id),
  reading jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists zawj_readings (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  man_name text not null,
  man_mother_name text not null,
  woman_name text not null,
  woman_mother_name text not null,
  calculation jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id bigserial primary key,
  user_id uuid references users(id) on delete cascade,
  status text not null,
  provider text,
  external_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sign_elements_sign on sign_elements(sign_id);
create index if not exists idx_readings_user on readings(user_id);
create index if not exists idx_zawj_user on zawj_readings(user_id);
