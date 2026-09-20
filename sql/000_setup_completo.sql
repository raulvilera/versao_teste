-- ============================================================
-- PLATAFORMA DE FICHAS CADASTRAIS — CONFIGURAÇÃO COMPLETA
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================

-- 001 — Schema inicial
create extension if not exists "pgcrypto";

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

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create table public.form_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  form_title text not null default 'Ficha Cadastral',
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.submissions_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  success boolean not null default true
);

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

-- 002 — Signup e storage de logos
create policy "usuario autenticado pode criar empresa"
  on public.companies for insert
  with check (auth.uid() is not null);

create policy "usuario cria proprio perfil"
  on public.profiles for insert
  with check (id = auth.uid());

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "leitura publica de logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "empresa faz upload do proprio logo"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.my_company_id()::text
  );

create policy "empresa atualiza o proprio logo"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.my_company_id()::text
  );

-- 003 — WhatsApp e PDFs
alter table public.companies
  add column whatsapp_number text;

insert into storage.buckets (id, name, public)
values ('fichas-pdf', 'fichas-pdf', false)
on conflict (id) do nothing;

create policy "empresa le os proprios pdfs"
  on storage.objects for select
  using (
    bucket_id = 'fichas-pdf'
    and (storage.foldername(name))[1] = public.my_company_id()::text
  );

-- 004 — Submissões
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  data jsonb not null,
  pdf_path text,
  created_at timestamptz not null default now()
);

alter table public.submissions enable row level security;

create policy "empresa ve as proprias submissoes"
  on public.submissions for select
  using (company_id = public.my_company_id());

create index idx_submissions_company_id on public.submissions (company_id);

-- 005 — Mercado Pago
alter table public.companies
  add column mp_preapproval_id text,
  add column mp_subscription_status text,
  add column plan_updated_at timestamptz;

create table public.mp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  mp_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

alter table public.mp_webhook_events enable row level security;

-- Depois de executar, configure Authentication > Settings conforme o README.
