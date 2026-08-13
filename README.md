# Iroko — Backend Build

Iroko is a verbatim fact & entity extractor. This build replaces the original
localStorage/fake-auth prototype with real, production infrastructure:

- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Database:** Supabase Postgres with row-level security
- **Backend:** Express (`server.ts`) — auth-gated, persists results, new chunk-action endpoint
- **AI:** Google Gemini (verbatim extraction + compile-document + chunk actions)

The existing React + Vite frontend UI and extraction flow are preserved; only the
fake parts (localStorage, fake auth, fake Google account picker) were replaced.

---

## 1. Prerequisites

- Node 18+
- A Supabase project (URL + anon key + service role key)
- A Google Gemini API key
- (For Google Sign-In) a Google Cloud OAuth client — see §5

## 2. Install

```bash
npm install
cp .env.example .env   # then fill in real values
```

## 3. Apply the database schema (REQUIRED, one-time)

The tables, triggers, and row-level-security policies live in
[`supabase/schema.sql`](supabase/schema.sql). This must be run once before the app
will persist anything.

1. Open your Supabase project → **SQL Editor**.
2. Paste the contents of `supabase/schema.sql` and **Run**.

This creates `users`, `extraction_records`, `extracted_chunks`, the
`handle_new_user` trigger (auto-creates a profile row on signup, including from
Google OAuth metadata), and owner-only RLS policies.

> The schema cannot be applied from the server with the anon/service-role keys
> alone (those keys permit CRUD but not DDL). Run it in the SQL editor.

## 4. Environment variables

Copy `.env.example` → `.env` and set:

| Var | Where used | Notes |
|-----|-----------|-------|
| `GEMINI_API_KEY` | server | Server-side only. Required for AI extraction. |
| `VITE_SUPABASE_URL` | frontend (bundled) | Public Supabase URL. |
| `VITE_SUPABASE_ANON_KEY` | frontend (bundled) | Public anon key (safe in browser). |
| `SUPABASE_URL` | server | Same Supabase URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | **Secret.** Bypasses RLS — never commit or expose to the client. |
| `APP_URL` | server/app | Public app URL (OAuth redirect). |
| `PORT` | server | Express port (default 3000). |

## 5. Google Sign-In setup

1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID**
   (Web application).
2. Add your Supabase auth callback to **Authorized redirect URIs**:
   `https://<your-supabase-project>.supabase.co/auth/v1/callback`
3. Supabase dashboard → **Authentication → Providers → Google** → enable, paste the
   Google **Client ID** and **Client Secret**.
4. Add your site URL(s) to Supabase **Authentication → URL Configuration → Redirect URLs**
   (e.g. `http://localhost:3000`, your Vercel URL).

The frontend calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`,
which redirects to Google's real account chooser — the fake in-app account picker was removed.

## 6. Run locally

```bash
npm run dev      # dev server with HMR (Vite middleware)
# or
npm run build && npm start   # production build + node server
```

## 7. Deployment

**Frontend — Vercel (static Vite build):**
- Framework preset: Vite. Build command `npm run build`, output dir `dist`.
- If you split the backend out (recommended), set the frontend to call the backend
  origin (e.g. set `VITE_API_URL` and point `apiFetch` at it). In this build the
  frontend calls same-origin `/api/*`, so the Express backend must be reachable.
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

**Backend — Render (Express):**
- Web Service, build `npm run build`, start `npm start`.
- Env vars: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`,
  `APP_URL`.
- Point the frontend's API calls at the Render URL (set `VITE_API_URL` and update
  `src/lib/api.ts` base) — or host frontend + backend on the same origin.

**Database/Auth — Supabase:** managed. Just run `supabase/schema.sql`.

## 8. API reference

All `/api/*` endpoints (except `/api/health`) require
`Authorization: Bearer <supabase access_token>`.

- `POST /api/extract` `{ text, criteria?, label }` → extracts verbatim chunks via
  Gemini (heuristic fallback if no key), **persists** an `extraction_records` row +
  `extracted_chunks` rows, returns the persisted record with DB ids.
- `POST /api/compile-document` `{ quotes, title?, format? }` → compiles selected
  verbatim quotes into a Markdown document (zero summarization).
- `POST /api/chunk-action` `{ chunks? | chunkIds?, instruction, allChunksContext? }`
  → sends the chunk(s) + the user's free-text instruction to Gemini and returns a
  derived/modified result. Powers the per-chunk "Act" and bulk "Do something with
  N selected chunks" inputs in the Review Chunks screen.

## 9. Row-level security

Each user can only read/write their own `users` row, `extraction_records`, and the
`extracted_chunks` belonging to their records. The server uses the service role to
persist on the user's behalf after verifying their JWT; the browser uses the anon
key with the user's own session (RLS-enforced).
