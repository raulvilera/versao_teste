-- ============================================================
-- 003 — WhatsApp da empresa + bucket de PDFs das fichas
-- Rode DEPOIS do 001 e 002
-- ============================================================

alter table public.companies
  add column whatsapp_number text; -- formato: 5511999998888 (código do país + DDD + número, sem símbolos)

-- Bucket PRIVADO (as fichas têm CPF, RG etc. — não deixamos público).
-- O acesso é feito via service role (na função serverless) ou link assinado com validade curta.
insert into storage.buckets (id, name, public)
values ('fichas-pdf', 'fichas-pdf', false)
on conflict (id) do nothing;

-- A própria empresa pode listar/baixar os PDFs dela pelo painel, se você quiser
-- oferecer isso no futuro (Fase seguinte). Por enquanto a geração e o envio são
-- feitos só pela função serverless, usando a service role key (que ignora RLS).
create policy "empresa le os proprios pdfs"
  on storage.objects for select
  using (
    bucket_id = 'fichas-pdf'
    and (storage.foldername(name))[1] = public.my_company_id()::text
  );
