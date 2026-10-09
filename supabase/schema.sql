-- Extensions
create extension if not exists pg_trgm;

-- ───────── Profiles (role per user) ─────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin','viewer')),
  created_at timestamptz default now()
);

-- auto-create a profile when a user is created in Supabase Auth
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ───────── Brand tables ─────────
create table if not exists hitachi_records (
  id bigint generated always as identity primary key,
  activation_code text not null unique,
  purchase_date date,
  customer_name text,
  customer_mobile text,
  serial_number text,
  crm_id text,
  remarks text,
  additional_remarks text,
  raw jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists godrej_records (
  id bigint generated always as identity primary key,
  activation_code text not null unique,
  warranty_status text,
  customer_name text,
  customer_mobile text,
  serial_number text,
  payment_status boolean,
  contract_id text,
  remarks text,
  additional_remarks text,
  raw jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists samsung_records (
  id bigint generated always as identity primary key,
  activation_code text not null unique,
  purchase_date date,
  store_name text,
  branch_name text,
  model_name text,
  serial_number text,
  plan_name text,
  raw jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ───────── Import history ─────────
create table if not exists imports (
  id bigint generated always as identity primary key,
  brand text not null,
  file_name text,
  total_rows int default 0,
  inserted int default 0,
  updated int default 0,
  skipped int default 0,
  status text default 'completed',
  uploaded_by uuid references auth.users(id),
  uploaded_by_name text,
  created_at timestamptz default now()
);

-- ───────── Indexes (fast partial search) ─────────
create index if not exists hit_code_trgm   on hitachi_records using gin (activation_code gin_trgm_ops);
create index if not exists hit_mobile_trgm on hitachi_records using gin (customer_mobile gin_trgm_ops);
create index if not exists hit_serial_trgm on hitachi_records using gin (serial_number gin_trgm_ops);
create index if not exists hit_name_trgm   on hitachi_records using gin (customer_name gin_trgm_ops);
create index if not exists hit_remarks     on hitachi_records (remarks);
create index if not exists hit_date        on hitachi_records (purchase_date desc);

create index if not exists god_code_trgm   on godrej_records using gin (activation_code gin_trgm_ops);
create index if not exists god_mobile_trgm on godrej_records using gin (customer_mobile gin_trgm_ops);
create index if not exists god_serial_trgm on godrej_records using gin (serial_number gin_trgm_ops);
create index if not exists god_name_trgm   on godrej_records using gin (customer_name gin_trgm_ops);
create index if not exists god_remarks     on godrej_records (remarks);

create index if not exists sam_code_trgm   on samsung_records using gin (activation_code gin_trgm_ops);
create index if not exists sam_serial_trgm on samsung_records using gin (serial_number gin_trgm_ops);
create index if not exists sam_store_trgm  on samsung_records using gin (store_name gin_trgm_ops);
create index if not exists sam_plan        on samsung_records (plan_name);
create index if not exists sam_date        on samsung_records (purchase_date desc);

-- ───────── Samsung plan counts (for dynamic cards) ─────────
create or replace function samsung_plan_counts(date_from date default null, date_to date default null)
returns table(plan_name text, total bigint)
language sql stable as $$
  select coalesce(plan_name, 'Unknown'), count(*)
  from samsung_records
  where (date_from is null or purchase_date >= date_from)
    and (date_to   is null or purchase_date <= date_to)
  group by 1 order by 2 desc;
$$;

-- ───────── Row Level Security ─────────
alter table profiles        enable row level security;
alter table hitachi_records enable row level security;
alter table godrej_records  enable row level security;
alter table samsung_records enable row level security;
alter table imports         enable row level security;

create policy "read own profile" on profiles for select to authenticated using (id = auth.uid() or is_admin());

-- every logged-in user can read; only admins can write
do $$ declare t text; begin
  foreach t in array array['hitachi_records','godrej_records','samsung_records','imports'] loop
    execute format('create policy "auth read %1$s"   on %1$s for select to authenticated using (true);', t);
    execute format('create policy "admin insert %1$s" on %1$s for insert to authenticated with check (is_admin());', t);
    execute format('create policy "admin update %1$s" on %1$s for update to authenticated using (is_admin());', t);
    execute format('create policy "admin delete %1$s" on %1$s for delete to authenticated using (is_admin());', t);
  end loop;
end $$;

-- ───────── Dynamic status groups (Hitachi / Godrej) ─────────
alter table hitachi_records
  add column if not exists remarks_key text
    generated always as (lower(regexp_replace(btrim(remarks), '\s+', ' ', 'g'))) stored;

alter table godrej_records
  add column if not exists remarks_key text
    generated always as (lower(regexp_replace(btrim(remarks), '\s+', ' ', 'g'))) stored;

create index if not exists hit_remarks_key on hitachi_records (remarks_key);
create index if not exists god_remarks_key on godrej_records (remarks_key);

-- ───────── Full-record search_text (covers every column + raw jsonb) ─────────
-- plain column maintained by BEFORE INSERT OR UPDATE triggers (generated columns
-- cannot use date::text or jsonb::text because those casts are STABLE, not IMMUTABLE).
-- GIN trigram index makes ILIKE '%...%' fast on large tables.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE, DROP/CREATE TRIGGER.

alter table hitachi_records add column if not exists search_text text;
alter table godrej_records  add column if not exists search_text text;
alter table samsung_records add column if not exists search_text text;

create index if not exists hit_search_trgm on hitachi_records using gin (search_text gin_trgm_ops);
create index if not exists god_search_trgm on godrej_records  using gin (search_text gin_trgm_ops);
create index if not exists sam_search_trgm on samsung_records using gin (search_text gin_trgm_ops);

create or replace function hitachi_set_search_text() returns trigger language plpgsql as $$
begin
  new.search_text := lower(
    coalesce(new.activation_code,    '') || ' ' ||
    coalesce(new.purchase_date::text,'') || ' ' ||
    coalesce(new.customer_name,      '') || ' ' ||
    coalesce(new.customer_mobile,    '') || ' ' ||
    coalesce(new.serial_number,      '') || ' ' ||
    coalesce(new.crm_id,             '') || ' ' ||
    coalesce(new.remarks,            '') || ' ' ||
    coalesce(new.additional_remarks, '') || ' ' ||
    coalesce(new.raw::text,          '')
  );
  return new;
end; $$;
drop trigger if exists tg_hitachi_search on hitachi_records;
create trigger tg_hitachi_search
  before insert or update on hitachi_records
  for each row execute function hitachi_set_search_text();

create or replace function godrej_set_search_text() returns trigger language plpgsql as $$
begin
  new.search_text := lower(
    coalesce(new.activation_code,      '') || ' ' ||
    coalesce(new.warranty_status,      '') || ' ' ||
    coalesce(new.customer_name,        '') || ' ' ||
    coalesce(new.customer_mobile,      '') || ' ' ||
    coalesce(new.serial_number,        '') || ' ' ||
    coalesce(new.payment_status::text, '') || ' ' ||
    coalesce(new.contract_id,          '') || ' ' ||
    coalesce(new.remarks,              '') || ' ' ||
    coalesce(new.additional_remarks,   '') || ' ' ||
    coalesce(new.raw::text,            '')
  );
  return new;
end; $$;
drop trigger if exists tg_godrej_search on godrej_records;
create trigger tg_godrej_search
  before insert or update on godrej_records
  for each row execute function godrej_set_search_text();

create or replace function samsung_set_search_text() returns trigger language plpgsql as $$
begin
  new.search_text := lower(
    coalesce(new.activation_code,    '') || ' ' ||
    coalesce(new.purchase_date::text,'') || ' ' ||
    coalesce(new.store_name,         '') || ' ' ||
    coalesce(new.branch_name,        '') || ' ' ||
    coalesce(new.model_name,         '') || ' ' ||
    coalesce(new.serial_number,      '') || ' ' ||
    coalesce(new.plan_name,          '') || ' ' ||
    coalesce(new.raw::text,          '')
  );
  return new;
end; $$;
drop trigger if exists tg_samsung_search on samsung_records;
create trigger tg_samsung_search
  before insert or update on samsung_records
  for each row execute function samsung_set_search_text();

-- backfill existing rows (trigger only fires on future INSERT/UPDATE)
update hitachi_records set search_text = lower(
  coalesce(activation_code,    '') || ' ' ||
  coalesce(purchase_date::text,'') || ' ' ||
  coalesce(customer_name,      '') || ' ' ||
  coalesce(customer_mobile,    '') || ' ' ||
  coalesce(serial_number,      '') || ' ' ||
  coalesce(crm_id,             '') || ' ' ||
  coalesce(remarks,            '') || ' ' ||
  coalesce(additional_remarks, '') || ' ' ||
  coalesce(raw::text,          '')
) where search_text is null;

update godrej_records set search_text = lower(
  coalesce(activation_code,      '') || ' ' ||
  coalesce(warranty_status,      '') || ' ' ||
  coalesce(customer_name,        '') || ' ' ||
  coalesce(customer_mobile,      '') || ' ' ||
  coalesce(serial_number,        '') || ' ' ||
  coalesce(payment_status::text, '') || ' ' ||
  coalesce(contract_id,          '') || ' ' ||
  coalesce(remarks,              '') || ' ' ||
  coalesce(additional_remarks,   '') || ' ' ||
  coalesce(raw::text,            '')
) where search_text is null;

update samsung_records set search_text = lower(
  coalesce(activation_code,    '') || ' ' ||
  coalesce(purchase_date::text,'') || ' ' ||
  coalesce(store_name,         '') || ' ' ||
  coalesce(branch_name,        '') || ' ' ||
  coalesce(model_name,         '') || ' ' ||
  coalesce(serial_number,      '') || ' ' ||
  coalesce(plan_name,          '') || ' ' ||
  coalesce(raw::text,          '')
) where search_text is null;

-- ─────────────────────────────────────────────────────────────────────────────

create or replace function status_groups(p_table text)
returns table(key text, label text, total bigint)
language plpgsql stable security invoker set search_path = public as $$
begin
  if p_table not in ('hitachi_records', 'godrej_records') then
    raise exception 'Table % is not allowed', p_table;
  end if;
  return query execute format(
    $f$
    select
      remarks_key                                    as key,
      mode() within group (order by remarks)         as label,
      count(*)::bigint                               as total
    from %I
    where remarks_key is not null and remarks_key <> ''
    group by remarks_key
    order by total desc
    $f$,
    p_table
  );
end;
$$;
