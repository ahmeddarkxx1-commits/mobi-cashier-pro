
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

const inMemoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();

export const supabase = createClient(credentials.url, credentials.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: inMemoryStorage
  }
});

