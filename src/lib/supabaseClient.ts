import { createClient } from '@supabase/supabase-js';

// Este é o projeto Supabase usado pela plataforma desde a primeira versão.
// A URL fica fixa para que um typo na variável pública da Vercel não quebre
// o login com um erro genérico de rede ("Failed to fetch").
const CANONICAL_SUPABASE_URL = 'https://zzfagkpvbtisklcyvxhu.supabase.co';
const PUBLIC_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZmFna3B2YnRpc2tsY3l2eGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzkyNjksImV4cCI6MjEwNTQ1NTI2OX0.xqub-W75fz_xyOz-nRfqkYzrjSiIypy3x7ETwcfHfuE';
const configuredSupabaseKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim() || PUBLIC_SUPABASE_KEY;

if (!configuredSupabaseKey) {
  throw new Error(
    'Variável VITE_SUPABASE_ANON_KEY não configurada. Veja .env.example.'
  );
}

export const supabase = createClient(CANONICAL_SUPABASE_URL, configuredSupabaseKey);
