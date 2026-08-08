
import { createClient } from '@supabase/supabase-js';

const getCredentials = () => {
  if (typeof window === 'undefined') {
    return {
      url: import.meta.env.VITE_SUPABASE_URL || 'https://txsjgipesuqlztizuqro.supabase.co',
      key: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LhO4sscn-ZmyUV5FcVYZoQ_24Ds2spD'
    };
  }
  const customUrl = localStorage.getItem('CUSTOM_SUPABASE_URL');
  const customKey = localStorage.getItem('CUSTOM_SUPABASE_ANON_KEY');
  return {
    url: customUrl || import.meta.env.VITE_SUPABASE_URL || 'https://txsjgipesuqlztizuqro.supabase.co',
    key: customKey || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LhO4sscn-ZmyUV5FcVYZoQ_24Ds2spD'
  };
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

