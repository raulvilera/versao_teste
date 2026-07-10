-- ============================================================
-- 004 — Submissões gravadas direto no Supabase (sem Google Sheets)
-- Rode DEPOIS do 001, 002 e 003
-- ============================================================

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  data jsonb not null,
  pdf_path text,
  created_at timestamptz not null default now()
);

alter table public.submissions enable row level security;

-- A gravação é feita pela função serverless (api/send-ficha.ts) usando a
-- service role key, que ignora RLS — por isso não existe policy de INSERT
-- aqui para o público. Só a leitura precisa de policy, para a própria
-- empresa poder ver as respostas recebidas no painel.
create policy "empresa ve as proprias submissoes"
  on public.submissions for select
  using (company_id = public.my_company_id());

create index idx_submissions_company_id on public.submissions (company_id);
