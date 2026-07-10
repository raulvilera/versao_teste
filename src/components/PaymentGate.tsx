import type { Company } from '../types/formConfig';

interface Props {
  company: Company;
}

export default function PaymentGate({ company }: Props) {
  return (
    <div className="payment-gate">
      <h3>Cadastros temporariamente indisponíveis</h3>
      <p>
        No momento, {company.name} não está aceitando novos cadastros por este link. Entre em contato diretamente com
        a empresa para mais informações.
      </p>
    </div>
  );
}
