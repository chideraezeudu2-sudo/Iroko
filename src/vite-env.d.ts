/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Allow runtime injection of Supabase config via window globals.
interface Window {
  __IROKO_SUPABASE_URL?: string;
  __IROKO_SUPABASE_ANON_KEY?: string;
}
