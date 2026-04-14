# Deployment

IntegrateOS is a Next.js 14 app that deploys cleanly to Vercel. Each step of
the roadmap is kept deployable so you can test incrementally.

## Current step: Step 1 — persisted mappings (Neon)

At this stage the studio is fully partner-aware and every change autosaves
to Postgres. You need a Neon database before the landing page works; the
app degrades to a "connect your database" screen if `DATABASE_URL` is missing.

A read-only demo mapper that runs entirely in-browser is still available
at `/mapper` if you want to test UI changes before provisioning a DB.

## One-time Vercel setup

1. Push this repo to GitHub (already done if you're reading this).
2. In Vercel, click **Add New → Project** and import the repo.
3. **Root Directory**: set to `integrateos-project`.
   (The repo contains prototypes at the top level and the app under
   `integrateos-project/`.)
4. Framework preset: **Next.js** (auto-detected).
5. Leave build/install commands at their defaults — `package.json` handles
   `prisma generate`, `prisma migrate deploy`, and `next build`.
6. Node version: **20.x**.
7. **Don't deploy yet** — provision the database first (next section),
   then hit **Deploy**.

## Provisioning the database (Neon)

1. In your Vercel project, go to **Storage → Create Database**.
2. Pick **Neon** (the Vercel marketplace integration).
3. Accept the default region and plan (the free tier is fine for dev).
4. Click **Connect**.
   - Neon automatically sets `DATABASE_URL` (pooled) and
     `DATABASE_URL_UNPOOLED` (direct) in every environment.
5. Click **Deploy** back in the Project view. The first build will:
   - `npm install` (runs `postinstall` → `prisma generate`)
   - `prisma migrate deploy` — creates tables from
     `prisma/migrations/0_init/migration.sql`
   - `next build`

After the first successful deploy, visit `/` — you should see an empty
partner list.

### Seed example partners + mappings (optional)

To load the demo content (5 partners, 4 mapping specs with ~100
field mappings + customer overrides, and sample payloads) into
production:

```bash
# Copy both URLs from Vercel Project Settings → Environment Variables
export DATABASE_URL="postgresql://…-pooler.…/neondb?sslmode=require"
export DATABASE_URL_UNPOOLED="postgresql://…/neondb?sslmode=require"
cd integrateos-project
npm run db:seed
```

The seed is idempotent — rerunning updates partners in place and
wipes+re-seeds the child field mappings on each seeded spec. User-
created mappings are left alone (seeded specs are tagged with
`[seed:…]` in their name).

You can also add partners + mappings via the UI — the seed is only
for bootstrapping with realistic data.

## Local development

```bash
cd integrateos-project
cp .env.example .env
# Paste your Neon URLs (or use `neonctl connection-string` if you installed it).
npm install           # runs prisma generate
npm run db:deploy     # applies migrations to your Neon branch
npm run db:seed       # optional
npm run dev           # http://localhost:3000
```

If you prefer Docker Postgres for local dev, substitute any Postgres URL —
Prisma and the app code don't depend on Neon specifically, only on
Postgres + a pooled/unpooled URL pair.

## Environment variables

| Variable | Required from | Who sets it | Notes |
|---|---|---|---|
| `DATABASE_URL` | Step 1 | Neon integration | Pooled (transaction mode), serverless-friendly |
| `DATABASE_URL_UNPOOLED` | Step 1 | Neon integration | Direct — used by `prisma migrate` |
| `NEXTAUTH_URL` | Step 2 | Vercel (auto) | Partner portal auth |
| `NEXTAUTH_SECRET` | Step 2 | You | `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Step 3 | You | Plain-English rule authoring |

## Verifying a build locally

```bash
npm run build
```

For the build to fully succeed locally it needs `DATABASE_URL_UNPOOLED`
set so `prisma migrate deploy` can connect. If you skip that, set
`SKIP_PRISMA_MIGRATE=1 npm run build` — no, we don't actually support
that flag; the simpler path is to run against your Neon dev branch or a
local Postgres.

A green Vercel build always runs the full chain.

## Troubleshooting

- **"Prisma Client not generated"** — `postinstall` didn't run. Clear the
  Vercel build cache and redeploy.
- **`P1001` can't reach database** — check `DATABASE_URL_UNPOOLED` in
  Vercel env vars. The pooled URL won't work for `migrate deploy`.
- **Landing page shows "Connect your database"** — `DATABASE_URL` is unset
  or unreachable. Install the Neon integration.
- **Font optimization warning during build** — harmless. Vercel has network
  at build time and will optimize the fonts; the warning only shows in
  offline builds.
- **Root directory wrong** — Vercel errors with
  `No Next.js version detected`. Fix by setting Root Directory to
  `integrateos-project` in Project Settings → General.
