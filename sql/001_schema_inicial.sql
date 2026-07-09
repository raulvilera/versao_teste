-- ============================================================
-- PLATAFORMA DE FICHAS CADASTRAIS MULTI-EMPRESA
-- 001 — Schema inicial. Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. EMPRESAS (tenants da plataforma)
-- ------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text default '#1a2980',
  secondary_color text default '#26d0ce',
  apps_script_url text,
  plan text not null default 'trial'
    check (plan in ('trial', 'pro', 'enterprise')),
  status text not null default 'active'
    check (status in ('active', 'blocked', 'pending_payment')),
  trial_limit int not null default 3,
  submissions_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. PERFIS DE USUÁRIO
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. CONFIGURAÇÃO DA FICHA
-- ------------------------------------------------------------
create table public.form_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  form_title text not null default 'Ficha Cadastral',
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. LOG DE ENVIOS (só contagem, sem dados pessoais)
-- ------------------------------------------------------------
create table public.submissions_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  success boolean not null default true
);

-- ------------------------------------------------------------
-- 5. Incrementar uso de forma atômica
-- ------------------------------------------------------------
create or replace function public.increment_company_usage(p_company_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.companies
  set submissions_count = submissions_count + 1,
      updated_at = now()
  where id = p_company_id;

  insert into public.submissions_log (company_id) values (p_company_id);
end;
$$;

-- ------------------------------------------------------------
-- 6. updated_at automático
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create trigger trg_form_configs_updated_at
  before update on public.form_configs
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 7. RLS
-- ------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.form_configs enable row level security;
alter table public.submissions_log enable row level security;

create or replace function public.my_company_id()
returns uuid
language sql stable
security definer
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create policy "empresa ve a si mesma"
  on public.companies for select
  using (id = public.my_company_id());

create policy "empresa edita a si mesma"
  on public.companies for update
  using (id = public.my_company_id());

create policy "leitura publica de empresa"
  on public.companies for select
  using (true);

create policy "usuario ve proprio perfil"
  on public.profiles for select
  using (id = auth.uid());

create policy "usuario edita proprio perfil"
  on public.profiles for update
  using (id = auth.uid());

create policy "empresa gerencia propria config"
  on public.form_configs for all
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

create policy "leitura publica de config"
  on public.form_configs for select
  using (true);

create policy "empresa ve proprio log"
  on public.submissions_log for select
  using (company_id = public.my_company_id());
