import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // O Mercado Pago espera 200 rapidamente. Qualquer coisa != 2xx faz ele
  // tentar reenviar a notificação várias vezes.
  if (req.method !== 'POST') {
    res.status(200).json({ received: true });
    return;
  }

  try {
    // O Mercado Pago manda o tipo/id tanto na query string (formato antigo,
    // "IPN") quanto no corpo JSON (formato novo). Aceitamos os dois.
    const body = (req.body ?? {}) as any;
    const tipo = (req.query.type as string) ?? (req.query.topic as string) ?? body.type ?? body.topic;
    const preapprovalId =
      (req.query['data.id'] as string) ?? body?.data?.id ?? (req.query.id as string) ?? body?.id;

    if (!preapprovalId) {
      res.status(200).json({ received: true, ignored: 'sem id' });
      return;
    }

    // Idempotência: se já processamos essa notificação, não faz nada de novo.
    const eventKey = `${tipo}:${preapprovalId}:${req.query['live_mode'] ?? ''}:${JSON.stringify(body).length}`;
    const { error: insertLogError } = await supabaseAdmin
      .from('mp_webhook_events')
      .insert({ mp_event_id: eventKey, event_type: tipo ?? 'desconhecido', payload: { query: req.query, body } });

    if (insertLogError && insertLogError.code === '23505') {
      // já processado antes (violação de unique constraint)
      res.status(200).json({ received: true, duplicated: true });
      return;
    }

    // Notificações de tipo "payment" são cada cobrança recorrente individual —
    // não mudam o status da assinatura em si, então só logamos e seguimos.
    if (tipo !== 'preapproval' && tipo !== 'subscription_preapproval') {
      res.status(200).json({ received: true, ignored: `tipo ${tipo} não tratado` });
      return;
    }

    // Busca o estado real da assinatura direto na API do Mercado Pago —
    // nunca confiamos apenas no conteúdo do webhook em si.
    const mpResp = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    });

    if (!mpResp.ok) {
      console.error('Erro ao consultar preapproval no Mercado Pago:', await mpResp.text());
      res.status(200).json({ received: true, erro: 'falha ao consultar MP' });
      return;
    }

    const preapproval = await mpResp.json();
    const companyId = preapproval.external_reference;
    const status = preapproval.status as 'pending' | 'authorized' | 'paused' | 'cancelled';

    if (!companyId) {
      res.status(200).json({ received: true, ignored: 'sem external_reference' });
      return;
    }

    const { data: empresaAtual } = await supabaseAdmin
      .from('companies')
      .select('plan')
      .eq('id', companyId)
      .single();

    // Empresas marcadas manualmente como "enterprise" (ex: administrador,
    // conta interna) não são geridas pelo Mercado Pago — nunca rebaixamos
    // automaticamente esse plano por causa de um evento de assinatura.
    const novoPlano =
      empresaAtual?.plan === 'enterprise' ? 'enterprise' : status === 'authorized' ? 'pro' : 'trial';

    await supabaseAdmin
      .from('companies')
      .update({
        plan: novoPlano,
        mp_subscription_status: status,
        mp_preapproval_id: preapprovalId,
        plan_updated_at: new Date().toISOString(),
      })
      .eq('id', companyId);

    res.status(200).json({ received: true, companyId, status });
  } catch (err: any) {
    console.error('Erro em /api/mercadopago-webhook:', err);
    // Mesmo em erro interno, respondemos 200 para o MP não ficar
    // reenviando infinitamente; o erro fica registrado no log da Vercel.
    res.status(200).json({ received: true, erro: err.message });
  }
}
