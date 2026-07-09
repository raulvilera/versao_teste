import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import FichaRenderer from '../components/FichaRenderer';
import PaymentGate from '../components/PaymentGate';
import type { Company, FormConfig } from '../types/formConfig';

export default function FichaPublica() {
  const { slug } = useParams<{ slug: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!companyData) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setCompany(companyData as Company);

    const { data: configData } = await supabase
      .from('form_configs')
      .select('*')
      .eq('company_id', companyData.id)
      .maybeSingle();

    setConfig(configData as FormConfig);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) return <div className="ficha-loading">Carregando...</div>;
  if (notFound || !company || !config) {
    return (
      <div className="ficha-loading">
        <h2>Ficha não encontrada</h2>
        <p>Verifique se o link está correto.</p>
      </div>
    );
  }

  const style = {
    '--cor-primaria': company.primary_color,
    '--cor-secundaria': company.secondary_color,
  } as React.CSSProperties;

  const blocked =
    company.status !== 'active' ||
    (company.plan === 'trial' && company.submissions_count >= company.trial_limit);

  return (
    <div className="ficha-page" style={style}>
      {company.logo_url && <img src={company.logo_url} alt={company.name} className="ficha-logo" />}

      {blocked ? (
        <PaymentGate company={company} />
      ) : (
        <FichaRenderer company={company} config={config} onSubmitted={load} />
      )}
    </div>
  );
}
