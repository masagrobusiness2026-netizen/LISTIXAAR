-- LISTIXAAR V7 — espace personnel et historique
create table if not exists saved_readings (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  reading_type text not null check (reading_type in ('astrology','abjad','zawj')),
  title text,
  input_data jsonb not null,
  result_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_saved_readings_user_date
on saved_readings(user_id, created_at desc);
