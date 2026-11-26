-- ============================================================================
-- AutoLife World — Schema Supabase Organizado por Abas (RLS + Storage Privado)
-- ============================================================================
-- Como usar:
-- 1. No Supabase: SQL Editor -> New Query -> cole TODO este arquivo -> RUN.
-- 2. Este script e idempotente (pode ser rodado novamente sem apagar dados).
-- 3. Todas as tabelas usam RLS com auth.uid() = user_id (privacidade total).
-- 4. O bucket "vehicle-attachments" e PRIVADO (somente o dono acessa).
-- ============================================================================

-- ============================================================================
-- CONFIGURACAO GERAL (Extensoes e funcao de timestamp)
-- ============================================================================
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- ABA 1 — GARAGEM & FROTA (Veiculos do Usuario)
-- ============================================================================
create table if not exists public.vehicles (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_type text not null default 'car' check (vehicle_type in ('car', 'motorcycle')),
  make text not null,
  model text not null,
  year integer not null check (year between 1900 and 2100),
  plate text not null,
  powertrain text not null check (powertrain in ('gasoline', 'diesel', 'hybrid', 'electric')),
  engine_displacement_cc integer check (engine_displacement_cc is null or engine_displacement_cc > 0),
  odometer_km integer not null default 0 check (odometer_km >= 0),
  fleet_group text not null default 'personal' check (fleet_group in ('personal', 'fleet')),
  driving_profile text not null default 'mixed' check (driving_profile in ('urban_severe', 'mixed', 'highway')),
  weekly_km integer not null default 250 check (weekly_km >= 0),
  battery_capacity_kwh numeric check (battery_capacity_kwh is null or battery_capacity_kwh > 0),
  consumption_kwh_per_100km numeric check (consumption_kwh_per_100km is null or consumption_kwh_per_100km > 0),
  estimated_range_km integer check (estimated_range_km is null or estimated_range_km >= 0),
  battery_soh_percent integer check (battery_soh_percent is null or (battery_soh_percent between 0 and 100)),
  tire_pressure_psi integer not null default 34 check (tire_pressure_psi between 5 and 120),
  rear_tire_pressure_psi integer check (rear_tire_pressure_psi is null or (rear_tire_pressure_psi between 5 and 120)),
  document_expiry_date date not null,
  insurance_expiry_date date not null,
  manual_spec jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vehicles
  add column if not exists vehicle_type text not null default 'car',
  add column if not exists engine_displacement_cc integer,
  add column if not exists driving_profile text not null default 'mixed',
  add column if not exists weekly_km integer not null default 250,
  add column if not exists rear_tire_pressure_psi integer,
  add column if not exists manual_spec jsonb,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_vehicles_user on public.vehicles (user_id);
create index if not exists idx_vehicles_user_type on public.vehicles (user_id, vehicle_type);

drop trigger if exists trg_vehicles_updated on public.vehicles;
create trigger trg_vehicles_updated
  before update on public.vehicles
  for each row execute function public.set_updated_at();

alter table public.vehicles enable row level security;

drop policy if exists "Users manage own vehicles" on public.vehicles;
create policy "Users manage own vehicles"
  on public.vehicles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- ABA 2 — SAUDE & MANUTENCAO (Checklist Preditivo)
-- ============================================================================
create table if not exists public.maintenance_items (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id text not null references public.vehicles (id) on delete cascade,
  category text not null,
  title_key text not null,
  description_key text not null,
  interval_days integer not null check (interval_days > 0),
  interval_km integer not null check (interval_km > 0),
  last_checked_date date not null,
  last_checked_km integer not null default 0 check (last_checked_km >= 0),
  notes text,
  safety_note_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.maintenance_items
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_maintenance_user_vehicle on public.maintenance_items (user_id, vehicle_id);

drop trigger if exists trg_maintenance_items_updated on public.maintenance_items;
create trigger trg_maintenance_items_updated
  before update on public.maintenance_items
  for each row execute function public.set_updated_at();

alter table public.maintenance_items enable row level security;

drop policy if exists "Users manage own maintenance items" on public.maintenance_items;
create policy "Users manage own maintenance items"
  on public.maintenance_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- ABA 3 — FICHA MEDICA, HISTORICO & FOTOS DA NOTA (Storage Privado)
-- ============================================================================
create table if not exists public.service_logs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id text not null references public.vehicles (id) on delete cascade,
  date date not null,
  odometer_km integer not null check (odometer_km >= 0),
  category text not null,
  title text not null,
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  currency text not null default 'BRL' check (currency in ('BRL', 'USD', 'EUR', 'GBP', 'CAD', 'CHF', 'MXN', 'JPY')),
  workshop_name text not null,
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.service_logs
  add column if not exists currency text not null default 'BRL',
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_logs_user_vehicle_date on public.service_logs (user_id, vehicle_id, date desc);

alter table public.service_logs enable row level security;

drop policy if exists "Users manage own service logs" on public.service_logs;
create policy "Users manage own service logs"
  on public.service_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tabela de fotos da nota, recibos, seguro, ITV/vistoria e documentos
create table if not exists public.vehicle_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id text not null references public.vehicles (id) on delete cascade,
  service_log_id text references public.service_logs (id) on delete set null,
  attachment_date date not null default current_date,
  file_category text not null check (
    file_category in ('vehicle_photo', 'document', 'insurance', 'receipt', 'inspection', 'diagnostic')
  ),
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 2097152),
  storage_bucket text not null default 'vehicle-attachments',
  storage_path text not null unique,
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.vehicle_attachments
  add column if not exists attachment_date date not null default current_date;

alter table public.vehicle_attachments
  alter column storage_bucket set default 'vehicle-attachments';

create index if not exists idx_attachments_user_vehicle on public.vehicle_attachments (user_id, vehicle_id, attachment_date desc, created_at desc);

alter table public.vehicle_attachments enable row level security;

drop policy if exists "Users manage own vehicle attachments" on public.vehicle_attachments;
create policy "Users manage own vehicle attachments"
  on public.vehicle_attachments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Bucket PRIVADO vehicle-attachments (JPG comprimido ate 2MB; pasta: user_id/vehicle_id/arquivo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-attachments',
  'vehicle-attachments',
  false,
  2097152,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Vehicle attachments owner select" on storage.objects;
create policy "Vehicle attachments owner select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vehicle-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Vehicle attachments owner insert" on storage.objects;
create policy "Vehicle attachments owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Vehicle attachments owner update" on storage.objects;
create policy "Vehicle attachments owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vehicle-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'vehicle-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Vehicle attachments owner delete" on storage.objects;
create policy "Vehicle attachments owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vehicle-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- ABA 4 — MUNDO ELETRICO (EV & Carregamentos)
-- ============================================================================
create table if not exists public.charging_sessions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id text not null references public.vehicles (id) on delete cascade,
  date date not null,
  station_name text not null,
  power_type text not null check (power_type in ('AC', 'DC')),
  energy_kwh numeric(10, 2) not null check (energy_kwh >= 0),
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  currency text not null default 'BRL' check (currency in ('BRL', 'USD', 'EUR', 'GBP', 'CAD', 'CHF', 'MXN', 'JPY')),
  soc_start integer not null check (soc_start between 0 and 100),
  soc_end integer not null check (soc_end between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.charging_sessions
  add column if not exists currency text not null default 'BRL',
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_charging_user_vehicle_date on public.charging_sessions (user_id, vehicle_id, date desc);

alter table public.charging_sessions enable row level security;

drop policy if exists "Users manage own charging sessions" on public.charging_sessions;
create policy "Users manage own charging sessions"
  on public.charging_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- ABA 5 — CONFIGURACOES, LOGIN SOCIAL & NOTIFICACOES PUSH
-- ============================================================================
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  language text not null default 'pt' check (language in ('pt', 'en', 'es', 'de', 'fr')),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  currency text not null default 'BRL' check (currency in ('BRL', 'USD', 'EUR', 'GBP', 'CAD', 'CHF', 'MXN', 'JPY')),
  theme text not null default 'light' check (theme in ('light', 'dark')),
  active_plan text not null default 'free' check (active_plan in ('free', 'plus', 'fleet')),
  whatsapp_number text not null default '',
  oil_reminder_days integer not null default 15 check (oil_reminder_days between 1 and 365),
  tire_reminder_days integer not null default 15 check (tire_reminder_days between 1 and 365),
  coolant_reminder_days integer not null default 30 check (coolant_reminder_days between 1 and 365),
  doc_reminder_days integer not null default 30 check (doc_reminder_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences
  add column if not exists active_plan text not null default 'free',
  add column if not exists whatsapp_number text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_user_preferences_updated on public.user_preferences;
create trigger trg_user_preferences_updated
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_user on public.push_subscriptions (user_id);

drop trigger if exists trg_push_subscriptions_updated on public.push_subscriptions;
create trigger trg_push_subscriptions_updated
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- VERIFICACAO FINAL (Tabelas, RLS ativo e Bucket privado vehicle-attachments)
-- ============================================================================
select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name in (
    'vehicles', 'maintenance_items', 'service_logs', 'vehicle_attachments',
    'charging_sessions', 'user_preferences', 'push_subscriptions'
  )) as tabelas_criadas,
  (select count(*) from pg_tables where schemaname = 'public' and rowsecurity = true and tablename in (
    'vehicles', 'maintenance_items', 'service_logs', 'vehicle_attachments',
    'charging_sessions', 'user_preferences', 'push_subscriptions'
  )) as tabelas_com_rls_ativo,
  (select count(*) from storage.buckets where id = 'vehicle-attachments' and public = false) as bucket_privado_configurado;
