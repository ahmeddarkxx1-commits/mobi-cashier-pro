import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const parseCookies = (cookieHeader: string | undefined) => {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift()!.trim()] = decodeURIComponent(parts.join('='));
  });
  return list;
};

const serializeCookie = (name: string, value: string, options: any = {}) => {
  let string = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge !== undefined) string += `; Max-Age=${options.maxAge}`;
  if (options.path) string += `; Path=${options.path}`;
  if (options.httpOnly) string += `; HttpOnly`;
  if (options.secure) string += `; Secure`;
  if (options.sameSite) string += `; SameSite=${options.sameSite}`;
  return string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const cookies = parseCookies(req.headers.cookie);
  const accessToken = cookies['sb-access-token'];
  const refreshToken = cookies['sb-refresh-token'];

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  let user: any = null;
  let newSession: any = null;

  if (accessToken) {
    const { data: { user: authUser }, error } = await supabase.auth.getUser(accessToken);
    if (!error && authUser) {
      user = authUser;
    }
  }

  // If access token is missing or invalid, try to refresh session
  if (!user && refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (!error && data.session && data.user) {
      user = data.user;
      newSession = data.session;
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // If a new session was created (refresh), update cookies
  if (newSession) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/'
    };

    const accessCookie = serializeCookie('sb-access-token', newSession.access_token, {
      ...cookieOptions,
      maxAge: newSession.expires_in
    });

    const refreshCookie = serializeCookie('sb-refresh-token', newSession.refresh_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
  }

  try {
    // Fetch profile details securely using service client or anon client
    // Since RLS is enabled, we can select user's own profile using their verified id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.warn('Profile fetch warning in session API:', profileError.message);
    }

    return res.status(200).json({
      authenticated: true,
      user,
      access_token: newSession ? newSession.access_token : accessToken,
      profile: profile || null
    });
  } catch (err: any) {
    console.error('Session handler error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
