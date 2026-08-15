import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const serializeCookie = (name: string, value: string, options: any = {}) => {
  let string = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge) string += `; Max-Age=${options.maxAge}`;
  if (options.path) string += `; Path=${options.path}`;
  if (options.httpOnly) string += `; HttpOnly`;
  if (options.secure) string += `; Secure`;
  if (options.sameSite) string += `; SameSite=${options.sameSite}`;
  return string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const { session, user } = data;
    if (!session) {
      return res.status(400).json({ error: 'Failed to retrieve session' });
    }

    // Set Access Token and Refresh Token as HttpOnly Cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/'
    };

    const accessCookie = serializeCookie('sb-access-token', session.access_token, {
      ...cookieOptions,
      maxAge: session.expires_in
    });

    const refreshCookie = serializeCookie('sb-refresh-token', session.refresh_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
    return res.status(200).json({ success: true, user, access_token: session.access_token });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
