import { createClient } from '@supabase/supabase-js';

// Este é o projeto Supabase usado pela plataforma desde a primeira versão.
// A URL fica fixa para que um typo na variável pública da Vercel não quebre
// o login com um erro genérico de rede ("Failed to fetch").
const CANONICAL_SUPABASE_URL = 'https://fbbpzeuu1dljuugjuubr.supabase.co';
const configuredSupabaseKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

if (!configuredSupabaseKey) {
  throw new Error(
    'Variável VITE_SUPABASE_ANON_KEY não configurada. Veja .env.example.'
  );
}

export const supabase = createClient(CANONICAL_SUPABASE_URL, configuredSupabaseKey);
