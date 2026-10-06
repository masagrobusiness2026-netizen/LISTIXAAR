-- LISTIXAAR V3 — production-oriented data model
create table if not exists signs (
  id text primary key,
  symbol text not null,
  name_fr text not null,
  start_date text,
  end_date text
);

create table if not exists sign_elements (
  id bigserial primary key,
  sign_id text not null references signs(id),
  element_number integer not null check (element_number between 1 and 12),
  content text,
  unique(sign_id, element_number)
);

create table if not exists abjad_letters (
  letter text primary key,
  value integer not null
);

create table if not exists users (
  id uuid primary key,
  email text unique not null,
  created_at timestamptz default now()
);

create table if not exists readings (
  id bigserial primary key,
  user_id uuid references users(id),
  sign_id text references signs(id),
  result jsonb not null,
  created_at timestamptz default now()
);

create table if not exists zawj_readings (
  id bigserial primary key,
  user_id uuid references users(id),
  man_name text not null,
  man_mother_name text not null,
  woman_name text not null,
  woman_mother_name text not null,
  man_total integer not null,
  woman_total integer not null,
  man_reduced integer not null,
  woman_reduced integer not null,
  difference integer not null,
  result_code integer not null,
  created_at timestamptz default now()
);

create table if not exists subscriptions (
  id bigserial primary key,
  user_id uuid references users(id),
  status text not null,
  provider text,
  external_id text,
  created_at timestamptz default now()
);
