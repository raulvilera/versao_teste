import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Valor e nome do plano Pro. Ajuste aqui se o preço mudar — é o único
// lugar que precisa ser editado.
const PLANO_PRO = {
  reason: 'Plataforma de Fichas Cadastrais — Plano Pro',
  valor: 49.9,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', mensagem: 'Método não permitido.' });
    return;
  }

  try {
    const { companyId, payerEmail } = req.body as { companyId: string; payerEmail: string };

    if (!companyId || !payerEmail) {
      res.status(400).json({ status: 'error', mensagem: 'Dados incompletos.' });
      return;
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      res.status(404).json({ status: 'error', mensagem: 'Empresa não encontrada.' });
      return;
    }

    if (company.plan === 'pro' && company.mp_subscription_status === 'authorized') {
      res.status(400).json({ status: 'error', mensagem: 'Esta empresa já possui uma assinatura ativa.' });
      return;
    }

    // Base URL do próprio site, para o Mercado Pago saber para onde
    // redirecionar o usuário depois que ele autorizar o pagamento.
    const origin =
      (req.headers['x-forwarded-proto'] ?? 'https') + '://' + (req.headers['x-forwarded-host'] ?? req.headers.host);

    const mpResp = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        reason: PLANO_PRO.reason,
        external_reference: companyId,
        payer_email: payerEmail,
        back_url: `${origin}/dashboard`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: PLANO_PRO.valor,
          currency_id: 'BRL',
        },
        status: 'pending',
      }),
    });

    const mpData = await mpResp.json();

    if (!mpResp.ok) {
      console.error('Erro do Mercado Pago:', mpData);
      res.status(502).json({ status: 'error', mensagem: mpData.message ?? 'Erro ao criar assinatura no Mercado Pago.' });
      return;
    }

    // Guarda o id da pré-aprovação para conseguirmos casar com o webhook
    // depois, mesmo antes do pagamento ser confirmado.
    await supabaseAdmin
      .from('companies')
      .update({ mp_preapproval_id: mpData.id, mp_subscription_status: 'pending' })
      .eq('id', companyId);

    res.status(200).json({ status: 'ok', checkoutUrl: mpData.init_point });
  } catch (err: any) {
    console.error('Erro em /api/create-subscription:', err);
    res.status(500).json({ status: 'error', mensagem: err.message ?? 'Erro interno ao criar assinatura.' });
  }
}
