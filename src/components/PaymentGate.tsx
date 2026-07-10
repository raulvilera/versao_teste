import type { Company } from '../types/formConfig';

interface Props {
  company: Company;
}

export default function PaymentGate({ company }: Props) {
  return (
    <div className="payment-gate">
      <h3><i className="fas fa-credit-card" /> Limite de Usos Atingido</h3>
      <p>
        {company.name} utilizou todas as {company.trial_limit} fichas disponíveis no plano de teste.
      </p>
      <p>Para continuar recebendo cadastros, é necessário assinar um plano pago.</p>
      <button type="button" onClick={() => alert('Integração de pagamento entra na Fase 4 (Mercado Pago).')}>
        <i className="fas fa-shopping-cart" /> Assinar Plano
      </button>
    </div>
  );
}
