# Iroko — Repository Notes

## Stack
React + Vite + Express (Vite middleware in `server.ts`) + Groq (Llama models via OpenAI-compatible API).
Migrated from localStorage/fake-auth to Supabase Auth + Postgres.

## Architecture
- `server.ts` — thin Express wrapper that imports shared logic from `server/lib.ts`.
  Dev uses Vite middleware (`tsx server.ts`); prod builds to `dist/server.cjs`.
  Serves SPA + `/api/*`.
- `server/lib.ts` — single source of truth for backend logic: `getSupabase()`,
  `verifyAuth()`, Groq client (`groqComplete`), heuristic fallbacks, and
  `runExtraction` / `runCompileDocument` / `runChunkAction` handlers. Shared by
  both the Express server and the Vercel serverless functions.
- `api/` — Vercel serverless functions (`extract.ts`, `compile-document.ts`,
  `chunk-action.ts`, `health.ts`) wrapped by `api/_helpers.ts` (`withAuth`).
  They import from `server/lib.ts` and must use `.js` extensions on relative
  ESM imports (Node ESM under `type: module` rejects extensionless imports).
- `vercel.json` — Vite frontend build + `/api` functions (60s maxDuration).
  Deploy as a SINGLE Vercel project (frontend + API on one origin). No Render.
- Frontend calls `/api/*` via `src/lib/api.ts` (`apiFetch`), which attaches the
  Supabase access token. `VITE_API_URL` enables split deploy if ever needed.
- Server Supabase client uses the **service role** key (bypasses RLS) to persist;
  browser uses anon key + RLS.
- `runExtraction` degrades gracefully: if DB tables are missing it still returns
  the extracted entities + a warning instead of failing the whole request.

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
- Never commit `.env` / `dist` / `.vercel` (all in `.gitignore`).
- Secrets: service role key + GROQ_API_KEY stay server-side only.
- `vite-env.d.ts` declares `import.meta.env` types + `Window` globals.

## Groq (AI provider)
- Replaced Google Gemini with Groq (Llama models) via OpenAI-compatible
  chat-completions endpoint (`https://api.groq.com/openai/v1/chat/completions`).
- No SDK dependency — `groqComplete()` in `server/lib.ts` uses native `fetch`.
- Models: `llama-3.3-70b-versatile` (primary) → `llama-3.1-8b-instant` (fallback).
- `runExtraction` uses Groq JSON mode (`response_format: {type:'json_object'}`),
  expecting `{"entities":[...]}`; tolerant parsing also accepts raw arrays or
  `{array:[...]}`. `runCompileDocument` + `runChunkAction` use plain text output.
- Env var: `GROQ_API_KEY` (server-side only). Get at console.groq.com/keys.

## Vercel deploy gotchas (learned the hard way)
- Anonymous temporary deploys (`vercel deploy --env KEY=VAL`) DO propagate env
  vars to runtime — but `.env` values written with surrounding quotes (e.g.
  `SUPABASE_URL="https://…"`) get stored WITH the quotes, producing an invalid
  URL. Strip surrounding quotes before passing values to `--env`.
- All relative ESM imports in `api/*.ts` MUST end in `.js` (Node ESM under
  `type: module` throws `ERR_MODULE_NOT_FOUND` on extensionless imports).
- `verifyAuth` swallows errors and returns null → 401. To diagnose 401s on
  serverless runtimes whose logs aren't reachable, temporarily surface the
  underlying error in the response, then revert.
- To persist env vars across deploys, import the GitHub repo into a real Vercel
  account and set them in Settings → Environment Variables.
