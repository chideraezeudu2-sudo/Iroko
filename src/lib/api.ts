import { supabase } from './supabase';

// Optional explicit API origin for split deployments (frontend on Vercel,
// backend on Render). Defaults to same-origin so /api/* works when co-hosted.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';

function resolveUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) return input; // already absolute
  return `${API_BASE}${input}`;
}

// Wrapper around fetch that attaches the current Supabase session access token
// to every /api request. Throws if the user is not authenticated.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Not authenticated. Please sign in.');
  }
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(resolveUrl(input), { ...init, headers });
}
