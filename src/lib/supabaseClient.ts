import { createClient } from '@supabase/supabase-js';

// Este é o projeto Supabase usado pela plataforma desde a primeira versão.
// O fallback evita que um typo na variável pública da Vercel quebre o login
// com um erro genérico de rede ("Failed to fetch").
const CANONICAL_SUPABASE_URL = 'https://fbbpzeuu1dljuugjuubr.supabase.co';
const configuredSupabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const configuredSupabaseKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const supabaseUrl = configuredSupabaseUrl === CANONICAL_SUPABASE_URL
  ? configuredSupabaseUrl
  : CANONICAL_SUPABASE_URL;

if (!configuredSupabaseKey) {
  throw new Error(
    'Variável VITE_SUPABASE_ANON_KEY não configurada. Veja .env.example.'
  );
}

export const supabase = createClient(supabaseUrl, configuredSupabaseKey);
