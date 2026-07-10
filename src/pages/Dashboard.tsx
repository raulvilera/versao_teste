import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import BrandingEditor from '../components/BrandingEditor';
import FormBuilder from '../components/FormBuilder';
import SubmissionsList from '../components/SubmissionsList';
import SubscriptionCard from '../components/SubscriptionCard';
import type { FormConfig } from '../types/formConfig';

export default function Dashboard() {
  const { session, company, loading, refreshCompany, signOut } = useAuth();
  const [config, setConfig] = useState<FormConfig | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate('/login');
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!company) return;
    supabase
      .from('form_configs')
      .select('*')
      .eq('company_id', company.id)
      .single()
      .then(({ data }) => setConfig(data as FormConfig));
  }, [company]);

  if (loading || !company) {
    return <div className="panel-loading">Carregando...</div>;
  }

  const publicUrl = `${window.location.origin}/f/${company.slug}`;
  const usagePercent = Math.min(100, Math.round((company.submissions_count / company.trial_limit) * 100));

  return (
    <div className="panel">
      <header className="panel-header">
        <h1>Painel — {company.name}</h1>
        <button type="button" onClick={() => signOut().then(() => navigate('/login'))}>
          Sair
        </button>
      </header>

      <div className="panel-card">
        <h2>Sua Ficha Pública</h2>
        <p>Compartilhe este link com os colaboradores:</p>
        <div className="public-link-row">
          <input readOnly value={publicUrl} onFocus={(e) => e.target.select()} />
          <button type="button" onClick={() => navigator.clipboard.writeText(publicUrl)}>
            Copiar
          </button>
        </div>

        <div className="usage-bar">
          <div className="usage-bar-fill" style={{ width: `${usagePercent}%` }} />
        </div>
        <p>
          {company.submissions_count} de {company.trial_limit} fichas usadas
          {company.plan === 'trial' ? ' (plano de teste)' : ` (plano ${company.plan})`}
        </p>
      </div>

      <SubscriptionCard company={company} ownerEmail={session?.user.email ?? ''} />

      <SubmissionsList companyId={company.id} config={config} />

      <BrandingEditor company={company} onSaved={refreshCompany} />

      {config && <FormBuilder config={config} onSaved={() => {}} />}
    </div>
  );
}
