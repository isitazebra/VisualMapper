# Deployment

IntegrateOS is a Next.js 14 app that deploys cleanly to Vercel. Each step of
the roadmap is kept deployable so you can test incrementally.

## Current step: Step 0 — static mapper preview

At this stage the mapping studio runs **entirely in the browser** (state lives
in `useReducer`). No database is required yet — you can deploy as-is and the
UI is fully functional; refreshing the page will reset the in-memory state.

Persistence, auth, and API routes land in Step 1.

## One-time Vercel setup

1. Push this repo to GitHub (already done if you're reading this).
2. In Vercel, click **Add New → Project**, import the repo.
3. When prompted for **Root Directory**, set it to `integrateos-project`.
   (This repo contains prototypes at the top level and the app under
   `integrateos-project/`.)
4. Framework preset: **Next.js** (Vercel detects it automatically).
5. Build command: leave default — `package.json` runs `prisma generate &&
   next build`.
6. Install command: leave default — `npm install` triggers the `postinstall`
   hook which also runs `prisma generate`.
7. Node version: **20.x** (default on Vercel for Next 14).
8. Click **Deploy**. First build takes ~2 min.

## Environment variables

None required for Step 0. Step 1 will add:

| Variable | Required from Step | Notes |
|---|---|---|
| `DATABASE_URL` | 1 | Pooled Postgres URL (Neon recommended) |
| `DATABASE_URL_UNPOOLED` | 1 | Direct connection — used for migrations |
| `NEXTAUTH_URL` | 2 | Will be auto-set by Vercel |
| `NEXTAUTH_SECRET` | 2 | `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | 3 | For plain-English rule authoring |

## Local development

```bash
cd integrateos-project
npm install          # runs prisma generate automatically
npm run dev          # http://localhost:3000
```

Landing page is at `/`, the mapping studio at `/mapper`.

## Verifying a build locally

```bash
npm run build        # runs `prisma generate && next build`
npm start            # serves the production build
```

A green build here means Vercel will succeed too — the binary targets in
`prisma/schema.prisma` already include `rhel-openssl-3.0.x` for Vercel's
runtime.

## Troubleshooting

- **"Prisma Client not generated"** — make sure `postinstall` ran. If Vercel
  caches `node_modules`, clear the build cache and redeploy.
- **Font optimization warning** — resolved in Step 0 by switching to
  `next/font/google`. If you see it again, check `src/app/layout.tsx`.
- **Root directory wrong** — Vercel will try to build at repo root and fail
  with `No Next.js version detected`. Fix by setting Root Directory to
  `integrateos-project` in Project Settings → General.
