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
  color text,
  vin_or_renavam text,
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
  add column if not exists color text,
  add column if not exists vin_or_renavam text,
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
  add column if not exists active_plan text not null default 'personal',
  add column if not exists country_code text not null default 'BR',
  add column if not exists whatsapp_number text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_preferences
  drop constraint if exists user_preferences_active_plan_check;

alter table public.user_preferences
  add constraint user_preferences_active_plan_check check (
    active_plan in (
      'free', 'plus', 'fleet',
      'personal', 'fleet_10', 'fleet_25', 'fleet_50', 'fleet_100', 'enterprise'
    )
  );

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
-- ABA 6 — MONETIZACAO INTERNACIONAL, ASSINATURAS & GESTAO DE FROTAS B2B
-- ============================================================================
create table if not exists public.subscription_plans (
  id text primary key,
  slug text unique not null,
  account_scope text not null check (account_scope in ('personal', 'business')),
  name text not null,
  description text not null,
  vehicle_limit integer check (vehicle_limit is null or vehicle_limit > 0),
  allow_fleet_panel boolean not null default false,
  allow_team_members boolean not null default false,
  max_team_members integer,
  features jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;

drop policy if exists "Anyone reads active subscription plans" on public.subscription_plans;
create policy "Anyone reads active subscription plans"
  on public.subscription_plans for select
  using (is_active = true);

create table if not exists public.plan_country_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.subscription_plans (id) on delete cascade,
  country_code text not null,
  currency_code text not null check (currency_code in ('BRL', 'USD', 'EUR', 'GBP', 'CAD', 'CHF', 'MXN', 'JPY')),
  monthly_price_minor integer not null check (monthly_price_minor >= 0),
  annual_price_minor integer not null check (annual_price_minor >= 0),
  tax_rate_percent numeric(5, 2) not null default 0 check (tax_rate_percent >= 0),
  tax_label text not null default '',
  processing_fee_percent numeric(5, 2) not null default 0 check (processing_fee_percent >= 0),
  processing_fee_fixed_minor integer not null default 0 check (processing_fee_fixed_minor >= 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (plan_id, country_code, currency_code)
);

alter table public.plan_country_prices enable row level security;

drop policy if exists "Anyone reads active plan country prices" on public.plan_country_prices;
create policy "Anyone reads active plan country prices"
  on public.plan_country_prices for select
  using (is_active = true);

-- Idempotent seed of configurable plans & international prices
insert into public.subscription_plans (
  id, slug, account_scope, name, description, vehicle_limit,
  allow_fleet_panel, allow_team_members, max_team_members, features, sort_order, is_active
) values
  (
    'personal', 'personal', 'personal',
    'Plano Particular',
    'Para proprietários individuais com 1 veículo e Passaporte Digital verificado.',
    1, false, false, 1,
    '["1 veículo cadastrado","Passaporte Digital do Veículo","Histórico imutável de quilometragem","Histórico completo de manutenção","Documentos e notas fiscais privados","Alertas preventivos por data e km","QR Code para consulta","Compartilhamento autorizado do histórico"]'::jsonb,
    1, true
  ),
  (
    'fleet_10', 'fleet-10', 'business',
    'Plano Frotas 10',
    'Painel central empresarial para até 10 carros e motocicletas com gestão de equipe.',
    10, true, true, 10,
    '["Até 10 veículos (carros e motos)","Painel central de gestão empresarial","Histórico individual e geral de despesas","Controle de quilometragem e manutenção","Documentação e alertas de vencimento","Relatórios gerais e individuais em PDF/CSV","Gestão de responsáveis e permissões","Passaporte Digital + QR Code por veículo"]'::jsonb,
    2, true
  ),
  (
    'fleet_25', 'fleet-25', 'business',
    'Plano Frotas 25',
    'Expansão operacional para empresas com até 25 veículos ativos.',
    25, true, true, 25,
    '["Até 25 veículos na frota unificada","Todos os recursos do Plano Frotas 10","Convites ilimitados de motoristas e gestores","Relatórios executivos por centro de custo"]'::jsonb,
    3, true
  ),
  (
    'fleet_50', 'fleet-50', 'business',
    'Plano Frotas 50',
    'Escala corporativa para operações regionais com até 50 veículos.',
    50, true, true, 50,
    '["Até 50 veículos na frota unificada","Isolamento multiempresa dedicado","Permissões granulares por responsável","Auditoria completa de quilometragem e custos"]'::jsonb,
    4, true
  ),
  (
    'fleet_100', 'fleet-100', 'business',
    'Plano Frotas 100',
    'Alta capacidade para grandes frotas, locadoras e entregas urbanas até 100 veículos.',
    100, true, true, 100,
    '["Até 100 veículos ativos","Gestão multi-equipe avançada","Exportação gerencial completa em PDF e CSV","Passaporte Digital verificável para toda a frota"]'::jsonb,
    5, true
  ),
  (
    'enterprise', 'enterprise', 'business',
    'Empresarial Personalizado',
    'Acima de 100 veículos, SLA dedicado e limites sob medida no banco de dados.',
    null, true, true, null,
    '["Veículos e equipes sob medida","Contrato corporativo global","Impostos e faturamento B2B dedicados","Suporte prioritário de implantação"]'::jsonb,
    6, true
  )
on conflict (id) do update set
  account_scope = excluded.account_scope,
  name = excluded.name,
  description = excluded.description,
  vehicle_limit = excluded.vehicle_limit,
  allow_fleet_panel = excluded.allow_fleet_panel,
  allow_team_members = excluded.allow_team_members,
  max_team_members = excluded.max_team_members,
  features = excluded.features,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.plan_country_prices (
  plan_id, country_code, currency_code, monthly_price_minor, annual_price_minor,
  tax_rate_percent, tax_label, processing_fee_percent, processing_fee_fixed_minor, is_active
) values
  -- Brasil (BRL)
  ('personal', 'BR', 'BRL', 499, 4790, 0.00, 'Impostos inclusos', 3.99, 39, true),
  ('fleet_10', 'BR', 'BRL', 3990, 38300, 0.00, 'Impostos inclusos', 3.99, 39, true),
  ('fleet_25', 'BR', 'BRL', 8990, 86300, 0.00, 'Impostos inclusos', 3.99, 39, true),
  ('fleet_50', 'BR', 'BRL', 15990, 153500, 0.00, 'Impostos inclusos', 3.99, 39, true),
  ('fleet_100', 'BR', 'BRL', 27990, 268700, 0.00, 'Impostos inclusos', 3.99, 39, true),
  ('enterprise', 'BR', 'BRL', 49900, 479000, 0.00, 'Sob consulta B2B', 0.00, 0, true),
  -- Estados Unidos / Global (USD)
  ('personal', 'US', 'USD', 299, 2870, 0.00, 'Est. Sales Tax at checkout', 2.90, 30, true),
  ('fleet_10', 'US', 'USD', 1490, 14300, 0.00, 'Est. Sales Tax at checkout', 2.90, 30, true),
  ('fleet_25', 'US', 'USD', 2990, 28700, 0.00, 'Est. Sales Tax at checkout', 2.90, 30, true),
  ('fleet_50', 'US', 'USD', 5490, 52700, 0.00, 'Est. Sales Tax at checkout', 2.90, 30, true),
  ('fleet_100', 'US', 'USD', 9990, 95900, 0.00, 'Est. Sales Tax at checkout', 2.90, 30, true),
  ('enterprise', 'US', 'USD', 19900, 191000, 0.00, 'Custom Enterprise', 0.00, 0, true),
  ('personal', 'GLOBAL', 'USD', 299, 2870, 0.00, 'Local taxes may apply', 3.40, 30, true),
  ('fleet_10', 'GLOBAL', 'USD', 1490, 14300, 0.00, 'Local taxes may apply', 3.40, 30, true),
  ('fleet_25', 'GLOBAL', 'USD', 2990, 28700, 0.00, 'Local taxes may apply', 3.40, 30, true),
  ('fleet_50', 'GLOBAL', 'USD', 5490, 52700, 0.00, 'Local taxes may apply', 3.40, 30, true),
  ('fleet_100', 'GLOBAL', 'USD', 9990, 95900, 0.00, 'Local taxes may apply', 3.40, 30, true),
  ('enterprise', 'GLOBAL', 'USD', 19900, 191000, 0.00, 'Custom Enterprise', 0.00, 0, true),
  -- Zona do Euro (EUR: PT, ES, DE, FR, EU)
  ('personal', 'EU', 'EUR', 299, 2870, 21.00, 'VAT / IVA estimada', 2.50, 25, true),
  ('fleet_10', 'EU', 'EUR', 1390, 13340, 21.00, 'VAT / IVA estimada', 2.50, 25, true),
  ('fleet_25', 'EU', 'EUR', 2790, 26780, 21.00, 'VAT / IVA estimada', 2.50, 25, true),
  ('fleet_50', 'EU', 'EUR', 4990, 47900, 21.00, 'VAT / IVA estimada', 2.50, 25, true),
  ('fleet_100', 'EU', 'EUR', 8990, 86300, 21.00, 'VAT / IVA estimada', 2.50, 25, true),
  ('enterprise', 'EU', 'EUR', 17900, 171800, 21.00, 'VAT / IVA B2B', 0.00, 0, true),
  ('personal', 'PT', 'EUR', 299, 2870, 23.00, 'IVA (23%)', 2.50, 25, true),
  ('fleet_10', 'PT', 'EUR', 1390, 13340, 23.00, 'IVA (23%)', 2.50, 25, true),
  ('fleet_25', 'PT', 'EUR', 2790, 26780, 23.00, 'IVA (23%)', 2.50, 25, true),
  ('fleet_50', 'PT', 'EUR', 4990, 47900, 23.00, 'IVA (23%)', 2.50, 25, true),
  ('fleet_100', 'PT', 'EUR', 8990, 86300, 23.00, 'IVA (23%)', 2.50, 25, true),
  ('personal', 'DE', 'EUR', 299, 2870, 19.00, 'MwSt (19%)', 2.50, 25, true),
  ('fleet_10', 'DE', 'EUR', 1390, 13340, 19.00, 'MwSt (19%)', 2.50, 25, true),
  ('personal', 'ES', 'EUR', 299, 2870, 21.00, 'IVA (21%)', 2.50, 25, true),
  ('fleet_10', 'ES', 'EUR', 1390, 13340, 21.00, 'IVA (21%)', 2.50, 25, true),
  ('personal', 'FR', 'EUR', 299, 2870, 20.00, 'TVA (20%)', 2.50, 25, true),
  ('fleet_10', 'FR', 'EUR', 1390, 13340, 20.00, 'TVA (20%)', 2.50, 25, true),
  -- Reino Unido (GBP)
  ('personal', 'GB', 'GBP', 249, 2390, 20.00, 'UK VAT (20%)', 2.50, 20, true),
  ('fleet_10', 'GB', 'GBP', 1190, 11420, 20.00, 'UK VAT (20%)', 2.50, 20, true),
  ('fleet_25', 'GB', 'GBP', 2390, 22940, 20.00, 'UK VAT (20%)', 2.50, 20, true),
  ('fleet_50', 'GB', 'GBP', 4290, 41180, 20.00, 'UK VAT (20%)', 2.50, 20, true),
  ('fleet_100', 'GB', 'GBP', 7990, 76700, 20.00, 'UK VAT (20%)', 2.50, 20, true),
  ('enterprise', 'GB', 'GBP', 15900, 152600, 20.00, 'UK VAT (20%)', 0.00, 0, true),
  -- Canada, Suica, Mexico, Japao
  ('personal', 'CA', 'CAD', 399, 3830, 5.00, 'GST (5%)', 2.90, 30, true),
  ('fleet_10', 'CA', 'CAD', 1990, 19100, 5.00, 'GST (5%)', 2.90, 30, true),
  ('personal', 'CH', 'CHF', 290, 2780, 8.10, 'MWST (8.1%)', 2.90, 30, true),
  ('fleet_10', 'CH', 'CHF', 1390, 13340, 8.10, 'MWST (8.1%)', 2.90, 30, true),
  ('personal', 'MX', 'MXN', 4900, 47000, 16.00, 'IVA (16%)', 3.60, 300, true),
  ('fleet_10', 'MX', 'MXN', 29900, 287000, 16.00, 'IVA (16%)', 3.60, 300, true),
  ('personal', 'JP', 'JPY', 390, 3740, 10.00, 'Consumption Tax (10%)', 3.60, 0, true),
  ('fleet_10', 'JP', 'JPY', 1980, 19000, 10.00, 'Consumption Tax (10%)', 3.60, 0, true)
on conflict (plan_id, country_code, currency_code) do update set
  monthly_price_minor = excluded.monthly_price_minor,
  annual_price_minor = excluded.annual_price_minor,
  tax_rate_percent = excluded.tax_rate_percent,
  tax_label = excluded.tax_label,
  processing_fee_percent = excluded.processing_fee_percent,
  processing_fee_fixed_minor = excluded.processing_fee_fixed_minor,
  is_active = excluded.is_active;

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan_id text not null references public.subscription_plans (id),
  country_code text not null default 'BR',
  currency_code text not null default 'BRL',
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'annual')),
  status text not null default 'active' check (status in ('trialing', 'active', 'past_due', 'grace_period', 'canceled', 'expired')),
  auto_renew boolean not null default true,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  grace_period_end timestamptz,
  canceled_at timestamptz,
  provider text not null default 'manual',
  provider_subscription_id text,
  updated_at timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;

drop policy if exists "Users manage own subscription" on public.user_subscriptions;
create policy "Users manage own subscription"
  on public.user_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid references public.user_subscriptions (id) on delete set null,
  plan_id text not null references public.subscription_plans (id),
  amount_minor integer not null check (amount_minor >= 0),
  tax_minor integer not null default 0,
  processing_fee_minor integer not null default 0,
  currency_code text not null,
  country_code text not null default 'BR',
  payment_method text not null,
  provider text not null,
  provider_payment_id text,
  status text not null check (status in ('paid', 'pending', 'failed', 'refunded')),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_sub_payments_user on public.subscription_payments (user_id, created_at desc);

alter table public.subscription_payments enable row level security;

drop policy if exists "Users view own subscription payments" on public.subscription_payments;
create policy "Users view own subscription payments"
  on public.subscription_payments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Multi-tenant Organizations & Employees (strict isolation per company)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  tax_id text default '',
  country_code text not null default 'BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  member_email text not null,
  member_name text not null default '',
  role text not null check (role in ('admin', 'fleet_manager', 'driver', 'viewer')),
  permissions jsonb not null default '{"canViewVehicles": true, "canEditVehicles": false, "canLogMaintenance": true, "canViewExpenses": false, "canManageTeam": false}'::jsonb,
  invite_status text not null default 'pending' check (invite_status in ('pending', 'active', 'revoked')),
  invite_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, member_email)
);

create or replace function public.user_has_org_access(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizations o
    where o.id = target_org_id and o.owner_user_id = auth.uid()
  )
  or exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org_id
      and m.invite_status = 'active'
      and (m.user_id = auth.uid() or lower(m.member_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "Owners and active members access organization" on public.organizations;
create policy "Owners and active members access organization"
  on public.organizations for select
  using (public.user_has_org_access(id));

drop policy if exists "Owners manage organization" on public.organizations;
create policy "Owners manage organization"
  on public.organizations for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "Org owners and admins manage members" on public.organization_members;
create policy "Org owners and admins manage members"
  on public.organization_members for all
  using (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_user_id = auth.uid()
    )
    or user_id = auth.uid()
    or lower(member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_user_id = auth.uid()
    )
  );

-- Extend vehicles for multi-tenant isolation & responsible assignee
alter table public.vehicles
  add column if not exists organization_id uuid references public.organizations (id) on delete set null,
  add column if not exists assigned_member_name text default '',
  add column if not exists assigned_member_email text default '';

drop policy if exists "Users manage own vehicles" on public.vehicles;
create policy "Users manage own vehicles"
  on public.vehicles for all
  using (
    auth.uid() = user_id
    or (organization_id is not null and public.user_has_org_access(organization_id))
  )
  with check (
    auth.uid() = user_id
    or (organization_id is not null and public.user_has_org_access(organization_id))
  );

-- Immutable Odometer History (append-only, no UPDATE policy)
create table if not exists public.odometer_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id text not null references public.vehicles (id) on delete cascade,
  odometer_km integer not null check (odometer_km >= 0),
  source text not null default 'manual' check (source in ('initial', 'manual', 'service_log', 'inspection')),
  recorded_at timestamptz not null default now()
);

create index if not exists idx_odometer_vehicle_time on public.odometer_events (vehicle_id, recorded_at asc);

alter table public.odometer_events enable row level security;

drop policy if exists "Users read own odometer events" on public.odometer_events;
create policy "Users read own odometer events"
  on public.odometer_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users append own odometer events" on public.odometer_events;
create policy "Users append own odometer events"
  on public.odometer_events for insert
  with check (auth.uid() = user_id);

-- Digital Vehicle Passport Authorized Shares & QR Code Verification
create table if not exists public.vehicle_passport_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id text not null references public.vehicles (id) on delete cascade,
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  is_active boolean not null default true,
  include_expenses boolean not null default false,
  include_documents boolean not null default true,
  passport_snapshot jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vehicle_passport_shares enable row level security;

drop policy if exists "Owners manage own passport shares" on public.vehicle_passport_shares;
create policy "Owners manage own passport shares"
  on public.vehicle_passport_shares for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Public reads active shared passport snapshot" on public.vehicle_passport_shares;
create policy "Public reads active shared passport snapshot"
  on public.vehicle_passport_shares for select
  using (is_active = true and (expires_at is null or expires_at > now()));

-- ============================================================================
-- ABA 7 — FUNCOES RPC DO PAINEL ADMIN (Exclusivo picelador@gmail.com)
-- ============================================================================
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  active_plan text,
  subscription_status text,
  billing_cycle text,
  provider text,
  current_period_end timestamptz,
  vehicles_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_caller_email <> 'picelador@gmail.com' then
    raise exception 'Acesso restrito ao administrador.';
  end if;

  return query
  select
    u.id as user_id,
    u.email::text as email,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      ''
    )::text as full_name,
    u.created_at,
    coalesce(s.plan_id, p.active_plan, 'personal')::text as active_plan,
    coalesce(s.status, 'active')::text as subscription_status,
    coalesce(s.billing_cycle, 'monthly')::text as billing_cycle,
    coalesce(s.provider, 'manual')::text as provider,
    s.current_period_end,
    (select count(*) from public.vehicles v where v.user_id = u.id) as vehicles_count
  from auth.users u
  left join public.user_subscriptions s on s.user_id = u.id
  left join public.user_preferences p on p.user_id = u.id
  order by u.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_grant_plan(
  target_email text,
  target_plan_id text,
  duration_days integer default 365
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_user_id uuid;
  v_user_email text;
  v_days integer := greatest(1, least(coalesce(duration_days, 365), 3650));
  v_period_end timestamptz := now() + make_interval(days => greatest(1, least(coalesce(duration_days, 365), 3650)));
  v_cycle text := case when v_days >= 300 then 'annual' else 'monthly' end;
begin
  if v_caller_email <> 'picelador@gmail.com' then
    raise exception 'Acesso restrito ao administrador.';
  end if;

  if target_plan_id not in ('personal', 'fleet_10', 'fleet_25', 'fleet_50', 'fleet_100', 'enterprise') then
    raise exception 'Plano invalido: %', target_plan_id;
  end if;

  select id, email::text
  into v_user_id, v_user_email
  from auth.users
  where lower(email) = lower(trim(coalesce(target_email, '')))
  limit 1;

  if v_user_id is null then
    raise exception 'Conta nao encontrada para o e-mail informado. O usuario precisa ter entrado no app ao menos uma vez.';
  end if;

  insert into public.user_subscriptions (
    user_id, plan_id, country_code, currency_code, billing_cycle,
    status, auto_renew, current_period_start, current_period_end,
    grace_period_end, canceled_at, provider, updated_at
  ) values (
    v_user_id, target_plan_id, 'BR', 'BRL', v_cycle,
    'active', false, now(), v_period_end,
    null, null, 'manual', now()
  )
  on conflict (user_id) do update set
    plan_id = excluded.plan_id,
    billing_cycle = excluded.billing_cycle,
    status = 'active',
    auto_renew = false,
    current_period_start = now(),
    current_period_end = excluded.current_period_end,
    grace_period_end = null,
    canceled_at = null,
    provider = 'manual',
    updated_at = now();

  insert into public.user_preferences (user_id, active_plan, updated_at)
  values (v_user_id, target_plan_id, now())
  on conflict (user_id) do update set
    active_plan = excluded.active_plan,
    updated_at = now();

  return jsonb_build_object(
    'userId', v_user_id,
    'email', v_user_email,
    'planId', target_plan_id,
    'status', 'active',
    'currentPeriodEnd', v_period_end
  );
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

revoke all on function public.admin_grant_plan(text, text, integer) from public;
grant execute on function public.admin_grant_plan(text, text, integer) to authenticated;

-- ============================================================================
-- VERIFICACAO FINAL (Tabelas, RLS ativo e Bucket privado vehicle-attachments)
-- ============================================================================
select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name in (
    'vehicles', 'maintenance_items', 'service_logs', 'vehicle_attachments',
    'charging_sessions', 'user_preferences', 'push_subscriptions',
    'subscription_plans', 'plan_country_prices', 'user_subscriptions', 'subscription_payments',
    'organizations', 'organization_members', 'odometer_events', 'vehicle_passport_shares'
  )) as tabelas_criadas,
  (select count(*) from pg_tables where schemaname = 'public' and rowsecurity = true and tablename in (
    'vehicles', 'maintenance_items', 'service_logs', 'vehicle_attachments',
    'charging_sessions', 'user_preferences', 'push_subscriptions',
    'subscription_plans', 'plan_country_prices', 'user_subscriptions', 'subscription_payments',
    'organizations', 'organization_members', 'odometer_events', 'vehicle_passport_shares'
  )) as tabelas_com_rls_ativo,
  (select count(*) from storage.buckets where id = 'vehicle-attachments' and public = false) as bucket_privado_configurado;
