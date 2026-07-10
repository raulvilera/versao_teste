-- ============================================================
-- 005 — Assinatura recorrente via Mercado Pago
-- ============================================================

alter table public.companies
  add column mp_preapproval_id text,          -- id da assinatura no Mercado Pago
  add column mp_subscription_status text,     -- pending | authorized | paused | cancelled
  add column plan_updated_at timestamptz;

-- Log de eventos de webhook recebidos (auditoria e proteção contra
-- reprocessar a mesma notificação duas vezes).
create table public.mp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  mp_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

alter table public.mp_webhook_events enable row level security;
-- Sem policies de select/insert para roles públicas: só a service role
-- (usada pelo webhook) acessa esta tabela.
