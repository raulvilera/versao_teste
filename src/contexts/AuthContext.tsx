import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Company, Profile } from '../types/formConfig';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  authError: string | null;
  refreshCompany: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function databaseErrorMessage(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || '';
  if (error?.code === 'PGRST205' || message.includes('schema cache') || message.includes('does not exist')) {
    return 'O banco da aplicação ainda não foi inicializado. Execute os arquivos SQL do diretório sql/ no SQL Editor do Supabase.';
  }
  return error?.message || 'Não foi possível carregar os dados da sua empresa.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  async function loadProfileAndCompany(userId: string) {
    setAuthError(null);
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      setProfile(null);
      setCompany(null);
      setAuthError(databaseErrorMessage(profileError));
      return;
    }

    if (!profileData) {
      setProfile(null);
      setCompany(null);
      setAuthError('Sua conta de acesso existe, mas ainda não está vinculada a uma empresa. Execute o cadastro da empresa ou peça a configuração do banco.');
      return;
    }
    setProfile(profileData as Profile);

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profileData.company_id)
      .maybeSingle();

    if (companyError) {
      setCompany(null);
      setAuthError(databaseErrorMessage(companyError));
      return;
    }

    setCompany((companyData as Company) ?? null);
    if (!companyData) {
      setAuthError('O perfil está sem uma empresa vinculada. Verifique o cadastro da empresa no banco de dados.');
    }
  }

  async function refreshCompany() {
    if (session?.user.id) {
      await loadProfileAndCompany(session.user.id);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        setSession(currentSession);
        if (currentSession?.user.id) {
          await loadProfileAndCompany(currentSession.user.id);
        }
      } catch (error) {
        if (mounted) {
          setAuthError(error instanceof Error ? error.message : 'Não foi possível inicializar a autenticação.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user.id) {
        void loadProfileAndCompany(newSession.user.id);
      } else {
        setProfile(null);
        setCompany(null);
        setAuthError(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setCompany(null);
    setAuthError(null);
  }

  return (
    <AuthContext.Provider value={{ session, profile, company, loading, authError, refreshCompany, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
