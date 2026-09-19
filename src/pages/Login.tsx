import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('email not confirmed')) {
        setError('E-mail ainda não confirmado. Verifique sua caixa de entrada ou desative "Confirm email" no painel do Supabase.');
      } else if (msg.includes('invalid login credentials')) {
        setError('E-mail ou senha incorretos. Se você ainda não criou sua conta nesta plataforma, clique abaixo em "Cadastre sua empresa".');
      } else {
        setError(error.message || 'E-mail ou senha inválidos.');
      }
      return;
    }
    navigate('/dashboard');
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Entrar</h1>
        {error && <p className="auth-error">{error}</p>}
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="auth-switch">
          Ainda não tem conta? <Link to="/cadastro">Cadastre sua empresa</Link>
        </p>
      </form>
    </div>
  );
}
