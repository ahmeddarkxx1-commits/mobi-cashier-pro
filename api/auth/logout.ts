import { VercelRequest, VercelResponse } from '@vercel/node';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Clear session cookies by setting Max-Age=0
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
    maxAge: 0
  };

  const clearAccessCookie = serializeCookie('sb-access-token', '', cookieOptions);
  const clearRefreshCookie = serializeCookie('sb-refresh-token', '', cookieOptions);

  res.setHeader('Set-Cookie', [clearAccessCookie, clearRefreshCookie]);
  return res.status(200).json({ success: true });
}
