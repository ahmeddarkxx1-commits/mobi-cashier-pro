
import { createClient } from '@supabase/supabase-js';

const getCredentials = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Supabase URL or Anon Key is missing from environment variables.');
  }

  return { url: url || '', key: key || '' };
};

const credentials = getCredentials();

export const supabase = createClient(credentials.url, credentials.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});

