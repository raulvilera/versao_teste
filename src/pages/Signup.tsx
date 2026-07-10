import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { slugify, maskPhone } from '../utils/masks';
import { defaultSections } from '../data/defaultSections';

export default function Signup() {
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const digitosWhatsapp = whatsapp.replace(/\D/g, '');
    if (digitosWhatsapp.length < 10) {
      setError('Informe um número de WhatsApp válido, com DDD.');
      return;
    }
    // Guarda no formato DDI + DDD + número (ex: 5511999998888), que é o que
    // o envio via WhatsApp (Z-API) espera. Assume DDI 55 (Brasil).
    const whatsappCompleto = `55${digitosWhatsapp}`;

    setLoading(true);

    try {
      // 1. Cria o usuário
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      const userId = signUpData.user?.id;
      if (!userId) {
        throw new Error(
          'Cadastro criado, mas é necessário confirmar o e-mail antes de continuar. Verifique sua caixa de entrada e depois faça login.'
        );
      }

      // 2. Gera um slug único para a empresa
      let slug = slugify(companyName);
      const { data: existing } = await supabase.from('companies').select('slug').eq('slug', slug).maybeSingle();
      if (existing) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      }

      // 3. Cria a empresa (já com o WhatsApp configurado — a empresa não
      // precisa mais mexer em nenhum campo depois do cadastro para receber
      // os PDFs das fichas preenchidas).
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ name: companyName, slug, whatsapp_number: whatsappCompleto })
        .select()
        .single();
      if (companyError) throw companyError;

      // 4. Cria o perfil vinculando o usuário à empresa
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: userId, company_id: company.id, full_name: fullName, role: 'owner' });
      if (profileError) throw profileError;

      // 5. Cria a configuração padrão da ficha
      const { error: configError } = await supabase
        .from('form_configs')
        .insert({ company_id: company.id, form_title: 'Ficha Cadastral', sections: defaultSections });
      if (configError) throw configError;

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Não foi possível concluir o cadastro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Cadastrar Empresa</h1>
        {error && <p className="auth-error">{error}</p>}
        <label>
          Nome da Empresa
          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </label>
        <label>
          Seu Nome
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>
        <label>
          WhatsApp da Empresa (para receber os PDFs das fichas)
          <input
            type="tel"
            placeholder="(11) 99999-9999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar minha conta'}
        </button>
        <p className="auth-switch">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
