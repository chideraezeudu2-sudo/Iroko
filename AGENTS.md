# Iroko — Repository Notes

## Stack
React + Vite + Express (Vite middleware in `server.ts`) + Google Gemini.
Migrated from localStorage/fake-auth to Supabase Auth + Postgres.

## Architecture
- `server.ts` — Express server; dev uses Vite middleware (`tsx server.ts`), prod builds
  to `dist/server.cjs` (esbuild, cjs, external packages). Serves SPA + `/api/*`.
- Frontend calls `/api/*` via `src/lib/api.ts` (`apiFetch`), which attaches the
  Supabase access token. `VITE_API_URL` enables split deploy (Vercel + Render).
- Server Supabase client uses the **service role** key (bypasses RLS) to persist;
  browser uses anon key + RLS.

## Supabase project
`woikicnksvylyiyjxnxl.supabase.co`. Email confirmation is ON by default, so
`signUp` returns no session until the email link is clicked. `auth.admin.createUser`
with `email_confirm: true` is the way to create a loginable test user.
Supabase's email validator rejects addresses with leading underscores in the
local part (e.g. `_test_…@example.com`).

## DB schema
`supabase/schema.sql` must be run ONCE in the Supabase SQL editor. DDL cannot be
applied with anon/service-role keys (PostgREST has no /pg/query; the management
API `/v1/projects/{ref}/database/query` needs a Supabase personal access token
(prefixed `sbp_`), which was not provided). Tables: `users`, `extraction_records`,
`extracted_chunks`; `handle_new_user` trigger auto-creates the profile row
(including from Google OAuth metadata); owner-only RLS.

## Key commands
- `npm run dev` — tsx dev server (HMR)
- `npm run build` — vite build + esbuild server bundle → `dist/`
- `npm run lint` — `tsc --noEmit` (clean must pass)
- `npm start` — `node dist/server.cjs`

## Conventions
- Never commit `.env` / `dist` (both in `.gitignore`).
- Secrets: service role key + GEMINI_API_KEY stay server-side only.
- `vite-env.d.ts` declares `import.meta.env` types + `Window` globals.
