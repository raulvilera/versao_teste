import { useState } from 'react';
import type { Company } from '../types/formConfig';

interface Props {
  company: Company;
  ownerEmail: string;
}

const PLANOS = {
  monthly: { label: 'Mensal', preco: 'R$ 49,90/mês', valorMensalEquivalente: 49.9 },
  annual: { label: 'Anual', preco: 'R$ 499,90/ano', valorMensalEquivalente: 41.66 },
} as const;

export default function SubscriptionCard({ company, ownerEmail }: Props) {
  const [ciclo, setCiclo] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPro = company.plan === 'pro' && company.mp_subscription_status === 'authorized';
  const isPending = company.mp_subscription_status === 'pending';

  async function assinar() {
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id, payerEmail: ownerEmail, billingCycle: ciclo }),
      });
      const result = await resp.json();
      if (result.status !== 'ok') {
        throw new Error(result.mensagem || 'Não foi possível iniciar a assinatura.');
      }
      // Redireciona para o checkout do Mercado Pago
      window.location.href = result.checkoutUrl;
    } catch (err: any) {
      setError(err.message ?? 'Erro ao iniciar assinatura.');
      setLoading(false);
    }
  }

  return (
    <div className="panel-card">
      <h2>Plano e Assinatura</h2>

      {isPro && (
        <p className="plano-status plano-ativo">
          ✅ Plano <strong>Pro</strong> ativo ({company.mp_billing_cycle === 'annual' ? 'anual' : 'mensal'}) — fichas
          ilimitadas, cobrança recorrente de {PLANOS[company.mp_billing_cycle ?? 'monthly'].preco} via Mercado Pago.
        </p>
      )}

      {!isPro && isPending && (
        <p className="plano-status plano-pendente">
          ⏳ Assinatura em processamento. Se você já autorizou o pagamento no Mercado Pago, aguarde alguns instantes e
          atualize a página.
        </p>
      )}

      {!isPro && !isPending && (
        <>
          <p>
            Você está no <strong>plano de teste</strong>, limitado a {company.trial_limit} fichas. Assine o plano Pro
            para receber cadastros ilimitados.
          </p>

          <div className="billing-cycle-toggle" role="radiogroup" aria-label="Ciclo de cobrança">
            {(Object.keys(PLANOS) as Array<keyof typeof PLANOS>).map((chave) => (
              <button
                key={chave}
                type="button"
                role="radio"
                aria-checked={ciclo === chave}
                className={`billing-cycle-option ${ciclo === chave ? 'selected' : ''}`}
                onClick={() => setCiclo(chave)}
              >
                <strong>{PLANOS[chave].label}</strong>
                <span>{PLANOS[chave].preco}</span>
                {chave === 'annual' && <span className="billing-cycle-badge">2 meses grátis</span>}
              </button>
            ))}
          </div>

          {error && <p className="auth-error">{error}</p>}
          <button type="button" onClick={assinar} disabled={loading}>
            {loading ? 'Redirecionando...' : `Assinar Plano Pro — ${PLANOS[ciclo].preco}`}
          </button>
        </>
      )}
    </div>
  );
}
