import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Company, Profile } from '../types/formConfig';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  refreshCompany: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfileAndCompany(userId: string) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profileData) {
      setProfile(null);
      setCompany(null);
      return;
    }
    setProfile(profileData as Profile);

    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profileData.company_id)
      .single();

    setCompany((companyData as Company) ?? null);
  }

  async function refreshCompany() {
    if (session?.user.id) {
      await loadProfileAndCompany(session.user.id);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user.id) {
        await loadProfileAndCompany(session.user.id);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user.id) {
        await loadProfileAndCompany(newSession.user.id);
      } else {
        setProfile(null);
        setCompany(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setCompany(null);
  }

  return (
    <AuthContext.Provider value={{ session, profile, company, loading, refreshCompany, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
