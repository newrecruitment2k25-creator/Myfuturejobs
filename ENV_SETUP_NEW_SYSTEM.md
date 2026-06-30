# ENV_SETUP_NEW_SYSTEM.md
# Praxo AI — PERKESO AI Matching Platform
# New Cloudflare Deployment Setup Guide

---

## Worker Identity

| Property | Value |
|---|---|
| **Worker name** | `perkesoprax-ai` |
| **Compatibility date** | `2025-09-24` |
| **Compatibility flags** | `nodejs_compat` |
| **Main entry** | `src/server.ts` |
| **Config file** | `wrangler.jsonc` |

---

## PART 1 — Install Dependencies (Bun only)

```powershell
C:\Users\ahmad.bun\bin\bun.exe install
```

---

## PART 2 — Cloudflare Account Login

```powershell
C:\Users\ahmad.bun\bin\bun.exe x wrangler login
```

This opens a browser to authenticate with your **new** Cloudflare account.

---

## PART 3 — Required Environment Variables

These are **public/build-time** variables. Set them in a `.env` file at project root for local dev, and as Cloudflare Worker environment variables for production.

### `.env` file (local dev only — do NOT commit to git)

```env
SUPABASE_URL=https://<your-supabase-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
SUPABASE_PROJECT_ID=<your-supabase-project-ref>

VITE_SUPABASE_URL=https://<your-supabase-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-supabase-project-ref>

VITE_RAPIDAPI_KEY=<your-rapidapi-key-if-used>
```

### Cloudflare Worker environment variables (wrangler vars)

Set these as plaintext vars (non-secret) in Cloudflare dashboard or via wrangler:

```powershell
# These are typically set via dashboard > Workers > Settings > Variables
# Or add to wrangler.jsonc under [vars] if non-sensitive
```

---

## PART 4 — Required Cloudflare Secrets

These are **sensitive** and must NEVER be in source code or `.env` committed to git.  
Run each command and paste the secret value when prompted:

```powershell
C:\Users\ahmad.bun\bin\bun.exe x wrangler secret put SUPABASE_URL
C:\Users\ahmad.bun\bin\bun.exe x wrangler secret put SUPABASE_PUBLISHABLE_KEY
C:\Users\ahmad.bun\bin\bun.exe x wrangler secret put SUPABASE_SERVICE_ROLE_KEY
C:\Users\ahmad.bun\bin\bun.exe x wrangler secret put AI_API_KEY
C:\Users\ahmad.bun\bin\bun.exe x wrangler secret put ADMIN_BACKFILL_SECRET
C:\Users\ahmad.bun\bin\bun.exe x wrangler secret put DID_API_KEY
```

### What each secret does

| Secret | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project REST API base URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (safe for client-side auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — bypasses RLS, server-only |
| `AI_API_KEY` | OpenAI API key — used for embeddings, CV analysis, chat, interviews |
| `ADMIN_BACKFILL_SECRET` | Secret for vacancy/candidate embedding backfill API calls |
| `DID_API_KEY` | D-ID API key for video avatar generation in AI interviews |

> **Note:** `AI_BASE_URL` is optional. If not set, defaults to `https://ai.gateway.lovable.dev/v1/chat/completions`.  
> Set it only if routing through a custom AI gateway.

---

## PART 5 — Build and Deploy Commands

```powershell
# Step 1: Install dependencies (run once after clone)
C:\Users\ahmad.bun\bin\bun.exe install

# Step 2: Build
C:\Users\ahmad.bun\bin\bun.exe run build

# Step 3: Deploy to Cloudflare Workers
C:\Users\ahmad.bun\bin\bun.exe x wrangler deploy
```

After deploy, your Worker will be live at:
```
https://perkesoprax-ai.<your-cf-account-subdomain>.workers.dev
```

---

## PART 6 — Supabase Database Separation Plan

### Option A — Reuse Existing Supabase Database (Fastest)

**Pros:**
- Backend works immediately after setting secrets
- No data migration required
- POC data (vacancies, candidates, embeddings) already present

**Cons:**
- Data is shared with the original system
- Suitable for internal demo / POC only

**Steps:**
1. Copy existing `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` values
2. Set them as Cloudflare secrets for `perkesoprax-ai` (see Part 4)
3. Deploy — backend APIs work immediately

---

### Option B — Create Separate Supabase Database (Recommended for Production)

**Pros:**
- Fully independent system
- No data leakage between deployments
- Safe for client-facing or production use

**Cons:**
- Requires running migrations and embedding backfills

#### Migration & Backfill Checklist

- [ ] 1. Create new Supabase project at https://supabase.com
- [ ] 2. Enable the `vector` extension:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [ ] 3. Run all migrations in order from `supabase/migrations/`:
  ```
  20260526072053_5e510855-f1fa-4ca8-98a8-dfad4eca8c06.sql
  20260605030110_9a9c99ff-3718-432f-a790-fd8a643b3a61.sql
  20260608055134_95a363d8-2947-4971-9065-ed993933588d.sql
  20260608055155_bb7788e0-7c0f-4bf0-a316-7c209d42c942.sql
  20260615000000_interview_templates.sql
  20260615010000_applications_poc_vacancy.sql
  20260615020000_jobs_applications_policies.sql
  20260625000000_poc_candidate_id.sql
  20260626000000_saved_jobs.sql
  20260630000000_add_poc_vacancy_embeddings.sql
  20260630000001_add_poc_candidate_embeddings.sql
  ```
  Run via: Supabase Dashboard > SQL Editor, or `supabase db push`

- [ ] 4. Import POC tables/data:
  - Export `poc_vacancies` and `poc_candidates` from original Supabase project
  - Import into new project via Supabase dashboard or `psql`

- [ ] 5. Update Cloudflare secrets with new Supabase project values:
  ```powershell
  C:\Users\ahmad.bun\bin\bun.exe x wrangler secret put SUPABASE_URL
  C:\Users\ahmad.bun\bin\bun.exe x wrangler secret put SUPABASE_PUBLISHABLE_KEY
  C:\Users\ahmad.bun\bin\bun.exe x wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  ```

- [ ] 6. Run vacancy embedding backfill:
  ```powershell
  # Set your admin secret first
  $env:ADMIN_BACKFILL_SECRET = "your-secret-here"

  for ($i = 1; $i -le 600; $i++) {
    $body = @{ action = "backfill_vacancy_embeddings"; limit = 10; admin_secret = $env:ADMIN_BACKFILL_SECRET } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "https://perkesoprax-ai.<YOUR_CF_ACCOUNT>.workers.dev/api/interview" -Method POST -Body $body -ContentType "application/json"
    $res | ConvertTo-Json
    if ($res.updated -eq 0) { break }
    Start-Sleep -Seconds 1
  }
  ```

- [ ] 7. Run candidate embedding backfill (use `candidate-backfill.ps1` — update URL placeholder first):
  ```powershell
  # Edit candidate-backfill.ps1: replace <YOUR_CF_ACCOUNT> with your actual account subdomain
  .\candidate-backfill.ps1
  ```

- [ ] 8. Verify embedding counts in Supabase SQL Editor:
  ```sql
  SELECT COUNT(*) FROM poc_vacancies WHERE embedding IS NOT NULL;
  SELECT COUNT(*) FROM poc_candidates WHERE embedding IS NOT NULL;
  ```

- [ ] 9. Test semantic search via `/poc/dashboard`

- [ ] 10. Test `match_candidates_for_vacancy` (via POC dashboard or API)

- [ ] 11. Test `candidate_match_report` (explainable AI match)

---

## PART 7 — Backfill Script Note

The file `candidate-backfill.ps1` has been updated:
- Old hardcoded URL (`resumy-new.chjaved649.workers.dev`) replaced with `perkesoprax-ai.<YOUR_CF_ACCOUNT>.workers.dev`
- Old hardcoded secret (`ResuMYBackfill123`) replaced with `$env:ADMIN_BACKFILL_SECRET`

**Before running the script**, replace `<YOUR_CF_ACCOUNT>` with your actual Cloudflare account subdomain,  
and set the secret:
```powershell
$env:ADMIN_BACKFILL_SECRET = "your-actual-secret"
```

---

## PART 8 — Verify Deployment

After deploy, test these endpoints:

```powershell
# Health check (should return HTML/app)
Invoke-WebRequest -Uri "https://perkesoprax-ai.<YOUR_CF_ACCOUNT>.workers.dev/"

# Chatbot API (should return AI reply)
$body = @{ action = "chat"; message = "How many jobs are available?" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://perkesoprax-ai.<YOUR_CF_ACCOUNT>.workers.dev/api/interview" -Method POST -Body $body -ContentType "application/json"
```

---

## Summary of Secrets Required

| Secret | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase project settings > API |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase project settings > API > anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings > API > service_role key |
| `AI_API_KEY` | OpenAI platform.openai.com > API Keys |
| `ADMIN_BACKFILL_SECRET` | Choose any strong random string — set it yourself |
| `DID_API_KEY` | D-ID studio.d-id.com > API credentials |
