import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, AuthUser } from '../server/lib.js';

// Wraps an authenticated handler so each /api function enforces a valid
// Supabase session and forwards the verified user.
export function withAuth(
  handler: (user: AuthUser, body: any) => Promise<{ status: number; json: any }>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    const authHeader = (req.headers.authorization || '').toString();
    const user = await verifyAuth(authHeader);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    try {
      const result = await handler(user, req.body);
      return res.status(result.status).json(result.json);
    } catch (err: any) {
      console.error('API error:', err);
      return res.status(500).json({ error: err?.message || 'Server error.' });
    }
  };
}
