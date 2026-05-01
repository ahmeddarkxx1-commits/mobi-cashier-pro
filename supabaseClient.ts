
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://txsjgipesuqlztizuqro.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_LhO4sscn-ZmyUV5FcVYZoQ_24Ds2spD';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
