# Deployment Guide (Milestone 6)

I could not actually deploy this (no network access, no credentials for
Render/Vercel/Railway in this sandbox). Below are the exact steps for
your team to run — none of this is hypothetical, but none of it has been
executed either. Budget real time to work through it, ideally 2-3 days
before Sept 30, not the night before.

## 1. Database — managed PostgreSQL

Pick one (all have free tiers as of when this was written — verify current
pricing/limits yourself, free tiers change):
- Render PostgreSQL
- Railway PostgreSQL
- Supabase (Postgres-compatible, has extra features you won't need here)

Steps:
1. Create the instance, copy the connection string.
2. Update `backend/.env` → `DATABASE_URL=<connection string>`
3. From your local machine (or a one-off deploy step): `alembic upgrade head`
4. Run `python -m app.db.seed` once against the production DB to load
   schemes + partners.

## 2. Backend — Render / Railway / Fly.io

Using the `Dockerfile` already in `backend/`:
1. Connect your GitHub repo to Render/Railway.
2. Create a new "Web Service" pointing at `backend/Dockerfile`.
3. Set environment variables in the platform's dashboard (not committed to
   git): `DATABASE_URL`, `GEMINI_API_KEY`, `CORS_ORIGINS` (set this to your
   deployed frontend's URL once you have it, e.g.
   `https://setu-ai.vercel.app`).
4. Deploy. Health-check endpoint: `GET /api/health`.

## 3. Frontend — Vercel

1. Connect the repo, set root directory to `frontend/`.
2. Environment variable: `NEXT_PUBLIC_API_URL=<your deployed backend URL>`.
3. Deploy. Vercel auto-detects Next.js — no extra config needed beyond
   the env var.

## 4. Post-deploy checklist

- [ ] Hit `/api/health` on the deployed backend — confirm 200 OK
- [ ] Hit `/api/schemes` — confirm 6 schemes come back (seed ran correctly)
- [ ] Load the deployed frontend, run through the full citizen journey once
      on the actual production URLs, not just localhost
- [ ] Confirm CORS is not blocking requests (browser console will show this
      immediately if misconfigured — check `CORS_ORIGINS` matches exactly)
- [ ] Confirm tesseract OCR works on the deployed backend (the Dockerfile
      installs it, but test on the actual instance — some managed platforms
      restrict apt-get at runtime, verify it happened at build time)
- [ ] Test on an actual mobile device, not just desktop browser — voice
      input (Web Speech API) behaves differently on mobile Chrome

## Known deployment risks specific to this stack

1. **Tesseract OCR + Hindi language pack** must be baked into the backend's
   container image (handled in the Dockerfile above) — if your platform
   uses buildpacks instead of the Dockerfile, this step needs re-doing
   manually or OCR will silently fail in production.
2. **Web Speech API (voice input)** requires HTTPS in production browsers
   (it will simply refuse to work over plain HTTP) — Vercel gives you
   HTTPS by default, so this should be fine, but it's worth knowing why
   it would break if you ever test on a non-HTTPS staging URL.
3. **Gemini API rate limits** — if multiple team members are testing
   against the same API key simultaneously close to demo day, you can hit
   rate limits. Have a fallback plan (a second key, or a pre-recorded
   fallback demo run) in case this happens live.
