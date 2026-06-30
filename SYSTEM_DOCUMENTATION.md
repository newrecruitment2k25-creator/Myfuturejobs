# MYFutureJobs — Full System Documentation

> **Purpose:** Complete technical reference for any developer joining or inheriting this project.
> Covers: architecture, all routes, all DB tables, all AI modules, auth flow, and deployment.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema](#5-database-schema)
6. [Authentication & Role System](#6-authentication--role-system)
7. [Route Map — All Pages](#7-route-map--all-pages)
8. [AI Engine — How It Works](#8-ai-engine--how-it-works)
9. [Core Library Functions](#9-core-library-functions)
10. [API Routes (Server-Side)](#10-api-routes-server-side)
11. [Component Library](#11-component-library)
12. [System Flow — End to End](#12-system-flow--end-to-end)
13. [Deployment](#13-deployment)
14. [Critical Rules & Gotchas](#14-critical-rules--gotchas)

---

## 1. Project Overview

**MYFutureJobs** is Malaysia's national AI-powered employment portal, operated under PERKESO/SOCSO.

It connects three types of users:
- **Job Seekers** — upload CVs, get AI-matched jobs, take AI video interviews, plan careers
- **Employers** — post vacancies, get AI-shortlisted candidates, conduct AI interviews, view analytics
- **Admins** — manage users/roles, audit logs, platform configuration, PDPA compliance

The platform uses **AI at every step**: CV parsing, job matching, interview scoring, labour market intelligence, career pathway recommendations, and resume building.

**Live URL:** `https://resumy-new.chjaved649.workers.dev`
**GitHub:** `https://github.com/chjaved/ResuMy`

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19 + TanStack Start (React Router + SSR) |
| Language | TypeScript |
| Styling | TailwindCSS v4 + CSS custom properties |
| UI Components | shadcn/ui (Radix UI primitives) |
| Icons | Lucide React |
| Backend / DB | Supabase (PostgreSQL + Auth + Row Level Security) |
| AI | OpenAI GPT-5.5 / GPT-5.4-mini via `ai.gateway.lovable.dev` |
| PDF Parsing | `pdf-parse` / `pdfjs-dist` |
| Deployment | Cloudflare Workers (via Wrangler) |
| Build Tool | Vite + Bun |
| Package Manager | Bun |

---

## 3. Project Structure

```
malaysian-cv-aid-main/
├── src/
│   ├── routes/              # All pages (file-based routing)
│   ├── components/          # Shared UI components
│   ├── lib/                 # Business logic, AI functions, utilities
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.ts    # Supabase client singleton
│   ├── styles.css           # Global CSS + design tokens
│   ├── server.ts            # Cloudflare Worker entry point
│   └── router.tsx           # TanStack Router setup
├── supabase/
│   └── migrations/          # All DB migration SQL files
├── .env                     # Environment secrets (never commit)
├── wrangler.toml            # Cloudflare Workers config
└── package.json
```

---

## 4. Environment Variables

Stored in `.env` at project root. **Never commit this file.**

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (`https://kmlizkrhplxkstzxvaii.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key (safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key — server-side only, full DB access |
| `VITE_SUPABASE_PROJECT_ID` | Project ID (`kmlizkrhplxkstzxvaii`) |
| `AI_API_KEY` / `LOVABLE_API_KEY` | Key for OpenAI gateway at `ai.gateway.lovable.dev` |
| `AI_BASE_URL` | AI gateway endpoint (defaults to `https://ai.gateway.lovable.dev/v1/chat/completions`) |
| `VITE_RAPIDAPI_KEY` | RapidAPI key (used for external data lookups) |

---

## 5. Database Schema

### Supabase Project: `kmlizkrhplxkstzxvaii`

All tables have **Row Level Security (RLS)** enabled. Users can only access their own data unless explicitly granted wider access.

---

### `auth.users` (Supabase managed)
Built-in Supabase auth table. Never query directly — use `auth.uid()` in policies.

---

### `public.profiles`
Auto-created on signup via a DB trigger (`handle_new_user`).

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | References `auth.users.id` |
| `role` | text | `job_seeker` \| `employer` \| `admin` |
| `visible_to_employers` | boolean | Whether the job seeker is discoverable |
| `created_at` | timestamptz | Row creation time |
| `updated_at` | timestamptz | Last update time |

**RLS:** Users can only read/update their own profile.
**Trigger:** `on_auth_user_created` → runs `handle_new_user()` → inserts profile with role from signup metadata.

---

### `public.jobs`
Vacancies posted by employers.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Job ID |
| `employer_id` | uuid | FK → `auth.users.id` |
| `job_title` | text | Title of the vacancy |
| `company_name` | text | Company name |
| `employer_type` | text | Government / Private / GLC / MNC |
| `industry` | text | Industry sector |
| `location` | text | Job location |
| `description` | text | Full job description |
| `requirements` | text | Required skills/qualifications |
| `status` | text | `open` \| `closed` |
| `created_at` | timestamptz | Creation time |

**RLS:**
- Employers: full CRUD on their own jobs
- Everyone: can SELECT jobs where `status = 'open'`

---

### `public.applications`
Job applications submitted by job seekers.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Application ID |
| `user_id` | uuid | FK → `auth.users.id` (applicant) |
| `job_id` | uuid (nullable) | FK → `jobs.id` (null for POC vacancies) |
| `poc_vacancy_id` | text | ID of a POC/external vacancy if `job_id` is null |
| `created_at` | timestamptz | Application time |

**RLS:** Users manage only their own applications.

---

### `public.analyses`
Stores CV analysis results (created even for anonymous/unauthenticated users).

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Analysis ID |
| `company_type` | text | Target company type |
| `industry` | text | Target industry |
| `experience_level` | text | Candidate experience level |
| `language_preference` | text | EN or BM |
| `overall_score` | integer | AI-generated score (0–100) |
| `full_results` | jsonb | Full AI analysis JSON |
| `email` | text | Optional email of submitter |
| `created_at` | timestamptz | Creation time |

**RLS:** Anyone (including `anon`) can INSERT. No read policy — server-side only reads.

---

### `public.interview_templates`
Employer-created structured interview templates.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Template ID |
| `employer_id` | uuid | FK → `auth.users.id` |
| `title` | text | Template name |
| `role_title` | text | Job role this template is for |
| `job_id` | uuid (nullable) | Linked job vacancy |
| `company_name` | text | Company name |
| `industry` | text | Industry |
| `experience_level` | text | Target experience level |
| `interview_type` | text | `general` \| `technical` \| `behavioural` |
| `instructions` | text | Instructions shown to candidate |
| `time_limit_minutes` | integer | Total time allowed |
| `created_at` | timestamptz | Creation time |

---

### `public.interview_template_questions`
Individual questions within a template.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Question ID |
| `template_id` | uuid | FK → `interview_templates.id` |
| `question_number` | integer | Order in the template |
| `question_text` | text | The actual question |
| `question_type` | text | `behavioural` \| `technical` \| `situational` |
| `scoring_criteria` | text | What the AI looks for when scoring |
| `time_limit_seconds` | integer | Per-question time limit |

---

### `public.interview_invitations`
Employer sends an invitation to a candidate for a specific template.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Invitation ID |
| `template_id` | uuid | FK → `interview_templates.id` |
| `candidate_id` | uuid | FK → `auth.users.id` |
| `status` | text | `pending` \| `in_progress` \| `completed` |
| `message` | text | Custom message from employer |
| `deadline` | timestamptz | Completion deadline |
| `started_at` / `completed_at` | timestamptz | Timestamps |
| `overall_score` | integer | AI-computed final score |
| `ai_summary` | jsonb | Full AI evaluation JSON |

**Unique:** One invitation per `(template_id, candidate_id)` pair.

---

### `public.invitation_responses`
Candidate's answers to each question in an invitation.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Response ID |
| `invitation_id` | uuid | FK → `interview_invitations.id` |
| `question_id` | uuid | FK → `interview_template_questions.id` |
| `question_number` | integer | Order number |
| `answer_text` | text | Candidate's answer |
| `score` | integer | AI score for this answer |
| `feedback` | jsonb | AI feedback JSON |

---

## 6. Authentication & Role System

### How Auth Works

1. **Signup** → User registers at `/signup` with email + password + role selection
2. **DB Trigger** → `handle_new_user()` fires on `auth.users` INSERT → creates `profiles` row with the correct role
3. **Login** → User logs in at `/login` → `supabase.auth.signInWithPassword()`
4. **Role Check** → After login, the app queries `profiles` for the user's role → redirects to correct dashboard
5. **Role Guard** → Every protected route uses `useRoleGuard()` hook → redirects if wrong role

### Roles

| Role | Dashboard | Access |
|---|---|---|
| `job_seeker` | `/dashboard` | CV tools, job search, applications, interview prep |
| `employer` | `/employer/dashboard` | Vacancy management, candidate shortlisting, interview templates |
| `admin` | `/admin` | Full platform management (restricted) |

### Key Auth Files

- `src/lib/auth-context.tsx` — React context providing `user`, `session`, `loading`, `signOut`
- `src/lib/use-role-guard.ts` — Hook that checks role and redirects if wrong
- `src/lib/use-ops-guard.ts` — Ops-level guard for admin/caseworker routes

### Auth Providers Supported

- Email + Password (always works)
- Google OAuth (needs Supabase Google provider configured)
- MyDigital ID (button present, OAuth endpoint pending government integration)

---

## 7. Route Map — All Pages

### Public Routes
| Route | File | Description |
|---|---|---|
| `/` | `index.tsx` | Landing page — hero, job search, categories, testimonials |
| `/jobs` | `jobs.tsx` | Full job search with filters, AI smart search |
| `/jobs/:jobId` | `jobs.$jobId.tsx` | Individual job detail + apply |
| `/events` | `events.tsx` | PERKESO events & career fairs |
| `/about` | `about.tsx` | About MYFutureJobs platform |
| `/contact` | `contact.tsx` | Contact form |
| `/privacy` | `privacy.tsx` | Privacy policy |
| `/terms` | `terms.tsx` | Terms of service |
| `/login` | `login.tsx` | Login for all roles (job seeker / employer / admin tabs) |
| `/signup` | `signup.tsx` | Registration for job seekers |
| `/analyze` | `analyze.tsx` | Free CV analysis tool (unauthenticated) |
| `/results` | `results.tsx` | CV analysis results display |

### Job Seeker Routes (require `job_seeker` role)
| Route | File | Description |
|---|---|---|
| `/dashboard` | `dashboard.tsx` | Main dashboard — matched jobs, AI tools, applications |
| `/resume-builder` | `resume-builder.tsx` | AI-powered CV builder |
| `/career-pathway` | `career-pathway.tsx` | Career path planning + skill gap analysis |
| `/skills-passport` | `skills-passport.tsx` | PERKESO Skills Passport viewer |
| `/interview-preparation` | `interview-preparation.tsx` | Interview prep entry point |
| `/interview/setup` | `interview.setup.tsx` | Configure mock interview |
| `/interview/:sessionId` | `interview.$sessionId.tsx` | Interview room entry |
| `/interview/:sessionId/room` | `interview.$sessionId.room.tsx` | Live AI interview room |
| `/interview/:sessionId/summary` | `interview.$sessionId.summary.tsx` | Interview results & feedback |
| `/linkedin-review` | `linkedin-review.tsx` | LinkedIn profile analyser |
| `/linkedin-review/results` | `linkedin-review.results.tsx` | LinkedIn review results |

### Employer Routes (require `employer` role)
| Route | File | Description |
|---|---|---|
| `/employer/dashboard` | `employer.dashboard.tsx` | Employer overview — vacancies, candidates, analytics |
| `/employer/signup` | `employer.signup.tsx` | Employer registration |
| `/employer/vacancy-builder` | `employer.vacancy-builder.tsx` | AI job description builder |
| `/employer/vacancies/:jobId/candidates` | `employer.vacancies.$jobId.candidates.tsx` | AI-shortlisted candidates for a job |
| `/employer/vacancies/:jobId/candidates/:candidateId` | `employer.vacancies.$jobId.candidates.$candidateId.tsx` | Individual candidate profile |
| `/employer/vacancies/:jobId/candidates/compare` | `employer.vacancies.$jobId.candidates.compare.tsx` | Side-by-side candidate comparison |
| `/employer/vacancies/:jobId/intelligence` | `employer.vacancies.$jobId.intelligence.tsx` | AI intelligence report for a vacancy |
| `/employer/vacancies/:jobId/occupation` | `employer.vacancies.$jobId.occupation.tsx` | MASCO occupation data for role |
| `/employer/vacancy/:jobId/optimize` | `employer.vacancy.$jobId.optimize.tsx` | AI job description optimisation |
| `/employer/interview-templates` | `employer.interview-templates.tsx` | List of interview templates |
| `/employer/interview-templates/create` | `employer.interview-templates.create.tsx` | Create new template |
| `/employer/interview-templates/:templateId` | `employer.interview-templates.$templateId.tsx` | Edit / manage template |
| `/employer/interview-templates/:templateId/report/:invitationId` | `...report.$invitationId.tsx` | View candidate interview report |
| `/employer/interviews` | `employer.interviews.tsx` | All interview sessions |
| `/employer/interviews/create` | `employer.interviews.create.tsx` | Create ad-hoc interview session |
| `/employer/interviews/:sessionId/report` | `employer.interviews.$sessionId.report.tsx` | Interview session report |
| `/employer/labour-market-intelligence` | `employer.labour-market-intelligence.tsx` | LMI dashboard — salary, demand, trends |
| `/employer/talent-discovery` | `employer.talent-discovery.tsx` | Browse candidate pool |
| `/employer/occupation-intelligence` | `employer.occupation-intelligence.tsx` | MASCO occupation intelligence |

### Admin Routes (require `admin` role)
| Route | File | Description |
|---|---|---|
| `/admin` | `admin.index.tsx` | Admin overview dashboard |
| `/admin/users` | `admin.users.tsx` | User management |
| `/admin/candidates` | `admin.candidates.tsx` | Candidate management |
| `/admin/candidates/:candidateId` | `admin.candidates.$candidateId.tsx` | Individual candidate detail |
| `/admin/employers` | `admin.employers.tsx` | Employer management |
| `/admin/placements` | `admin.placements.tsx` | Placement tracking |
| `/admin/rbac` | `admin.rbac.tsx` | Role-based access control |
| `/admin/audit-logs` | `admin.audit-logs.tsx` | Full audit trail |
| `/admin/taxonomy` | `admin.taxonomy.tsx` | Skills taxonomy management |
| `/admin/configuration` | `admin.configuration.tsx` | Platform configuration |
| `/admin/system-monitoring` | `admin.system-monitoring.tsx` | System health & monitoring |

### POC (Proof of Concept) Routes
| Route | Description |
|---|---|
| `/poc/dashboard` | POC overview |
| `/poc/recommendations` | AI recommendations POC |
| `/poc/employer-matching` | Employer-candidate matching POC |
| `/poc/vacancy-parser` | Vacancy parser POC |

### API Routes (Server-side only)
| Route | File | Description |
|---|---|---|
| `/api/interview` | `api.interview.ts` | All AI interview operations (scoring, questions, summaries) |
| `/api/ops` | `api.ops.ts` | Operations API (admin actions, bulk ops) |
| `/api/resume-builder` | `api.resume-builder.ts` | Resume building AI operations |

---

## 8. AI Engine — How It Works

### Gateway (`src/lib/ai-gateway.ts`)

Central point for all AI calls. **Never call OpenAI directly** — always go through this gateway.

**Functions:**

| Function | Model | Use Case |
|---|---|---|
| `callAi(opts)` | Any | Generic AI call with retry + fallback |
| `analyzeWithGpt5(system, user, tool)` | GPT-5.5 | CV analysis, recruiter-grade assessments |
| `interviewWithGpt5(system, user, tool, useMini)` | GPT-5.5 or GPT-5.4-mini | Interview questions & scoring |

**Models used:**
- `gpt-5.5` — Heavy analysis (CV scoring, interview evaluation). 90s timeout.
- `gpt-5.4-mini` — Fast operations (question gen, chatbot, quick scoring). 30s timeout.
- `gpt-5.4` — Fallback for structured output if gpt-5.5 fails.
- `gpt-4o` / `gpt-4o-mini` — Legacy fallbacks.

**Retry logic:** Exponential backoff on 429 (rate limit) and 5xx errors. Up to 2 retries.

**Reasoning:** When using GPT-5.5 without tools, `reasoning_effort: "high"` is passed for recruiter-grade quality.

---

### AI Modules

| File | What It Does |
|---|---|
| `analyze.functions.ts` | CV analysis — scores, skill extraction, recommendations |
| `candidate-matching.ts` | Matches candidates to job vacancies using skill embeddings |
| `interview.functions.ts` | Generates interview questions, scores answers, produces summary |
| `interview-sessions.ts` | Manages live interview session state |
| `interview-templates.functions.ts` | Creates/manages structured interview templates |
| `labour-market-intelligence.ts` | LMI data — salary ranges, job demand trends, sector analysis |
| `masco-intelligence.ts` | Malaysia Standard Classification of Occupations (MASCO) intelligence |
| `vacancy-optimization.ts` | AI job description optimisation and scoring |
| `smart-search.functions.ts` | Semantic job search (beyond keyword matching) |
| `poc-matching.functions.ts` | POC candidate-vacancy matching engine |
| `caseworker-intelligence.ts` | Caseworker tools for PERKESO officers |
| `cover-letter.functions.ts` | AI cover letter generation |
| `chatbot.functions.ts` | In-app chatbot responses |
| `linkedin-analyze.functions.ts` | LinkedIn profile analysis |
| `training.functions.ts` | Training & upskilling recommendations |
| `behaviour.ts` | Behavioural assessment logic |
| `user-profile.ts` | User profile management (CV data, preferences) |

---

## 9. Core Library Functions

### `src/lib/auth-context.tsx`
React context for auth state. Provides:
- `user` — current Supabase `User` object or `null`
- `session` — current `Session` or `null`
- `loading` — boolean while auth state is resolving
- `signOut()` — calls `supabase.auth.signOut()`

Wrap the app with `<AuthProvider>` (done in `__root.tsx`).

### `src/lib/use-role-guard.ts`
```ts
useRoleGuard(requiredRole: "job_seeker" | "employer")
```
- Checks if user is logged in
- Queries `profiles` table for their role
- Redirects to correct dashboard if wrong role
- Creates a profile if one doesn't exist (handles legacy accounts)
- Returns `{ checked, loading }` — render page only when `checked === true`

### `src/lib/use-ops-guard.ts`
Similar to `useRoleGuard` but for operations/admin level routes.

### `src/lib/jobs.functions.ts`
Functions for fetching jobs from Supabase — filters by status, location, industry, keyword.

### `src/lib/pdf-extract.ts`
Extracts text from uploaded PDF CVs using `pdfjs-dist`. Returns plain text for AI processing.

### `src/lib/language-context.tsx`
Provides `t()` translation function. Supports **English (EN)** and **Bahasa Malaysia (BM)** only.

### `src/lib/translations.ts`
Full translation strings dictionary for EN/BM.

### `src/lib/ops-api.ts`
Client-side wrapper for calling `/api/ops` server endpoints.

### `src/lib/taxonomy-map.ts`
Maps job categories and skills to MASCO/PERKESO taxonomy codes.

---

## 10. API Routes (Server-Side)

These run server-side on Cloudflare Workers. They have access to `SUPABASE_SERVICE_ROLE_KEY` and `AI_API_KEY`.

### `POST /api/interview`
Handles all AI interview operations:
- Generate questions for a role
- Score a candidate's answer
- Produce final interview summary
- Save results to Supabase

### `POST /api/ops`
Admin/ops operations:
- Bulk user management
- Report generation
- System-level queries requiring service role

### `POST /api/resume-builder`
- AI resume section generation
- Skill suggestions
- Format optimisation

---

## 11. Component Library

Located in `src/components/`.

### `public-layout.tsx`
Contains:
- `PublicNav` — top navigation bar with Login/MyDigital ID buttons, mobile menu
- `PublicFooter` — footer with links
- `LoginButtons` — two-button auth widget (MyDigital ID + Login/Sign Up)
- `AuthedNav` — navigation when user is logged in (avatar dropdown with dashboard link + sign out)
- `useUserRole()` — internal hook that fetches role for the nav

### shadcn/ui Components (`src/components/ui/`)
Standard Radix UI-based components: `Button`, `Card`, `Dialog`, `DropdownMenu`, `Input`, `Select`, `Tabs`, `Toast`, `Badge`, `Progress`, `Separator`, etc.

All styled to match MYFutureJobs design tokens.

---

## 12. System Flow — End to End

### Job Seeker Flow
```
Visit / → Search jobs or click Sign Up
→ /signup → creates account (role: job_seeker)
→ DB trigger creates profiles row
→ Redirected to /dashboard

On Dashboard:
→ Upload CV (PDF) → pdf-extract.ts extracts text
→ callAi(analyze.functions) → CV scored, skills extracted
→ candidate-matching.ts → matches against open jobs
→ Personalised job feed shown

Apply for Job:
→ Click Apply on /jobs/:jobId
→ Insert into applications table
→ Employer sees application in their dashboard

AI Interview:
→ Employer invites candidate via interview_invitations
→ Candidate sees invite on dashboard → clicks Accept
→ /interview/:sessionId/room → live AI interview
→ Answers submitted to invitation_responses
→ ai-gateway calls scoring → score saved to invitation

Career Tools:
→ /career-pathway → LMI data + skill gap analysis
→ /resume-builder → AI builds/improves CV
→ /interview-preparation → mock AI interview
```

### Employer Flow
```
/employer/signup → creates account (role: employer)
→ /employer/dashboard

Post Vacancy:
→ /employer/vacancy-builder → AI writes job description
→ Saved to jobs table (status: open)

Find Candidates:
→ /employer/vacancies/:jobId/candidates
→ candidate-matching.ts ranks applicants by AI score
→ Review individual profiles, compare side-by-side

Conduct Interview:
→ /employer/interview-templates/create → build template with AI questions
→ Invite specific candidates → interview_invitations row created
→ Candidate completes interview → scores saved
→ Employer reviews report at /employer/interview-templates/:id/report/:invitationId

Labour Intelligence:
→ /employer/labour-market-intelligence → salary benchmarks, talent supply/demand
→ /employer/occupation-intelligence → MASCO role classification & insights
```

### Admin Flow
```
/admin (restricted — admin role only)
→ View platform KPIs
→ /admin/users — manage all user accounts
→ /admin/rbac — assign/change roles
→ /admin/audit-logs — full activity log
→ /admin/configuration — feature flags, system settings
→ /admin/system-monitoring — health checks
```

---

## 13. Deployment

### Platform
Deployed on **Cloudflare Workers** using Wrangler.

### Build & Deploy Commands
```powershell
# Install dependencies
bun install

# Local development
bun run dev

# Production build
bun run build

# Deploy to Cloudflare Workers
bunx wrangler deploy
```

### Config File
`wrangler.toml` — defines the Cloudflare Worker name, routes, and environment variable bindings.

### Environment on Cloudflare
Secrets (`AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) must be set in Cloudflare Workers dashboard under **Settings → Variables**.

Client-side variables (`VITE_*`) are baked in at build time by Vite.

---

## 14. Critical Rules & Gotchas

### 1. `ssr: false` on ALL routes
Every route file must have:
```ts
export const Route = createFileRoute("/your-route")({
  ssr: false,
  component: YourComponent,
});
```
If you forget `ssr: false`, the route will attempt server-side rendering and crash on Cloudflare Workers because browser APIs (`window`, `localStorage`) don't exist on the server.

### 2. Never use `value=""` in `<SelectItem>`
Radix UI's Select component treats empty string as "no selection". Always use a non-empty value:
```tsx
// WRONG
<SelectItem value="">All</SelectItem>

// CORRECT
<SelectItem value="all">All</SelectItem>
```

### 3. Language support is EN/BM only
The `translations.ts` file and language switcher only support English (`en`) and Bahasa Malaysia (`bm`). Do not add other languages.

### 4. DB migrations run in order
Migration files in `supabase/migrations/` are applied in filename alphabetical order. Always name new migrations with a timestamp prefix: `YYYYMMDDHHMMSS_description.sql`.

### 5. AI calls are server-side only
`callAi()` and all functions in `ai-gateway.ts` must only be called from **API routes** (`src/routes/api.*.ts`), never directly from React components. The `AI_API_KEY` is only available server-side.

### 6. Role check happens client-side
`useRoleGuard()` redirects wrong-role users, but it's client-side. The real security is RLS policies in Supabase — these cannot be bypassed.

### 7. Supabase service role key is server-only
`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is **only** available in API routes and never exposed to the client. The client always uses `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key).

### 8. CSS design tokens
Always use CSS variables for colours, never hardcode:
```css
/* Use these */
var(--brand)      /* #211F60 — primary navy */
var(--accent)     /* #F36C21 — orange */
var(--ink)        /* #17152f — dark text */
var(--muted)      /* #6f7285 — grey text */
var(--base)       /* #f7f8fc — page background */
var(--surface)    /* #ffffff — card background */
var(--line)       /* #e7e8f1 — borders */
```

### 9. Interview room uses `var` not `let`
In the interview room (`interview.$sessionId.room.tsx`), use `var` for certain variables due to a specific scoping requirement. Do not change these to `let`/`const`.

### 10. POC tables / POC vacancies
The POC (Proof of Concept) matching system uses external vacancy IDs (`poc_vacancy_id` text field in `applications`). These are not stored in the `jobs` table — they come from an external PERKESO data source. The `job_id` is nullable to support this.

---

*Last updated: June 2026 — MYFutureJobs v2.0*
