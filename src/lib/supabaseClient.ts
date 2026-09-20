import { createClient } from '@supabase/supabase-js';

// Este é o projeto Supabase usado pela plataforma desde a primeira versão.
// A URL fica fixa para que um typo na variável pública da Vercel não quebre
// o login com um erro genérico de rede ("Failed to fetch").
const CANONICAL_SUPABASE_URL = 'https://rsilbdrcdrlrpdhjexnv.supabase.co';
const PUBLIC_SUPABASE_KEY = 'sb_publishable_FLu5w9sUOTSoTXoVbIxWQA_G98EVJCt';
// A variável antiga da Vercel pode continuar preenchida durante a migração.
// Use a chave que corresponde à URL acima para evitar "Invalid API key".
const configuredSupabaseKey = PUBLIC_SUPABASE_KEY;

if (!configuredSupabaseKey) {
  throw new Error(
    'Variável VITE_SUPABASE_ANON_KEY não configurada. Veja .env.example.'
  );
}

export const supabase = createClient(CANONICAL_SUPABASE_URL, configuredSupabaseKey);
