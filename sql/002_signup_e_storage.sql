-- ============================================================
-- 002 — Policies para SIGNUP de empresa + storage de logos
-- Rode DEPOIS do 001_schema_inicial.sql
-- ============================================================

-- Usuário autenticado pode criar UMA empresa (fluxo de signup)
create policy "usuario autenticado pode criar empresa"
  on public.companies for insert
  with check (auth.uid() is not null);

-- Usuário só pode criar o PRÓPRIO perfil
create policy "usuario cria proprio perfil"
  on public.profiles for insert
  with check (id = auth.uid());

-- ------------------------------------------------------------
-- IMPORTANTE: em Authentication > Settings no Supabase, desative
-- "Confirm email" — o fluxo de signup abaixo depende de já existir
-- uma sessão (auth.uid()) logo após o cadastro, para poder criar a
-- empresa e o perfil na sequência.
-- ------------------------------------------------------------

-- Bucket de logos (público para leitura)
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
