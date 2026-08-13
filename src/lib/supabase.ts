import { createClient } from '@supabase/supabase-js';

// Public (anon) credentials are safe to expose in the browser bundle.
// They are provided at build/runtime via Vite env vars (VITE_*) and are
// also injected by the dev server's index.html template (see index.html).
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  (window as any).__IROKO_SUPABASE_URL ||
  '';
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (window as any).__IROKO_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Iroko] Supabase env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or inject window.__IROKO_SUPABASE_*).',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
