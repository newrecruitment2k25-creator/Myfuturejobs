# PERKESO POC — Demo Runbook

## Environment Setup
See `ENV_SETUP_NEW_SYSTEM.md` for full Supabase / Cloudflare Worker environment variables and secrets.

---

## KPI Table

| # | KPI | Target | Demonstrated at |
|---|-----|--------|-----------------|
| 1 | Precision/Recall of semantic matching | ≥85% | `/poc/ai-matching` — candidate match scores + skill overlap |
| 2 | Click-through rate improvement | ≥70% | `/jobs` — semantic re-ranking vs keyword baseline |
| 3 | Semantic not keyword matching | Proven | `/demo` semantic proof panel + `/jobs?search=programmer` vs `software developer` |
| 4 | MASCO mapping coverage | 100% of titles | `/taxonomy` — every title returns a MASCO code |
| 5 | Response time | ≤3 s | Response time chip on every AI call (`Responded in N ms`) |
| 6 | User understands recommendation reason | ≥80% | `/poc/ai-matching` — labelled explainability panel |

---

## Section 11 Mandatory Item Checklist

| Requirement | URL | Sample Input |
|-------------|-----|-------------|
| Resume parsing (PDF/DOCX/TXT) | `/document-intelligence` | Any PDF resume; toggle "Parse a Resume" |
| Vacancy parsing (structured + unstructured) | `/document-intelligence` | Sample Vacancy A1.pdf; toggle "Parse a Vacancy" |
| Skill extraction, salary/experience identification | `/document-intelligence` | Upload any vacancy doc — see Extraction Result panel |
| MASCO / MSIC / NEC / NOSS / MQA taxonomy mapping | `/taxonomy` | Type "Software Engineer" or "Registered Nurse" |
| Explainable AI recommendation | `/poc/ai-matching` | Any vacancy ID → select candidate → view match report |
| Hallucination handling / RAG grounding | `/poc/ai-matching` | Scroll to "Grounded from data" collapsible section |
| Configurable AI rules | `/admin/ai-rules` | Adjust Semantic/Skill/Taxonomy/Behaviour weights |
| Behaviour-aware recommendation | `/poc/ai-matching` | See "Behaviour signal" chip on candidate cards |
| Activity log signals | `/poc/dashboard` | Engagement counts per candidate |
| Multilingual BM + English semantic search | `/jobs?search=jurutera%20perisian` | "jurutera perisian" returns software engineer roles |
| Labour market intelligence | `/labour-insights` | Live aggregates — top occupations, states, skill demand |
| Salary intelligence | `/labour-insights` | Salary ranges table by occupation (real POC data) |
| Semantic (not keyword) matching proof | `/demo` | Semantic proof panel: "programmer" ≈ "software developer" |
| Response time ≤3s proof | Every AI page | `Responded in N ms` chip on every AI call |
| Live working prototype — mandatory demo flow | `/demo` | Step-by-step guided demo checklist |

---

## Full Demo Flow (step by step)

### Step 1 — Document Intelligence (`/document-intelligence`)
1. Set toggle to **"Parse a Vacancy"**
2. Upload `Sample Vacancy A1.pdf` (or any vacancy document)
3. Point out: response time chip ≤3s, MASCO code auto-mapped, skills chips, salary/experience extracted
4. Click **"View full taxonomy"** → goes to Step 2

### Step 2 — Taxonomy Intelligence (`/taxonomy`)
1. The page pre-fills from Step 1's occupation
2. Show MASCO code + confidence badge ("MASCO Mapped ✓")
3. Show all 5 standard cards: MASCO, MSIC, NEC, NOSS, MQA
4. Show confidence bars, career progression steps
5. Click "Run AI Matching" → goes to Step 4

### Step 3 — Semantic + Multilingual Job Search (`/jobs`)
1. Type **"jurutera perisian"** → show software engineer results (BM → EN semantic)
2. Then type **"programmer"** → show overlap with software developer results
3. Use the BM+EN demo chips below the search bar for one-tap demo
4. Point out: "Semantic AI understands both languages — no translation needed"

### Step 4 — AI Candidate Matching + Explainable Report (`/poc/ai-matching`)
1. Paste any vacancy ID from the POC dataset
2. Show ranked candidate list with behaviour signal chips
3. Click a candidate → view the full match report:
   - "Why this match" paragraph
   - Matched skills (green) + gap skills (amber) chips
   - Semantic score bar + Skill overlap score bar
   - Taxonomy relationship line
   - Salary / Experience / Location fit
   - **"Grounded from data"** section → shows source records (RAG anti-hallucination proof)
4. Point out: "Recommendations are generated only from retrieved PERKESO data (RAG). No external/unverified content is used."

### Step 5 — Skill Gap + Career Pathway (`/career-pathway`)
1. From matching report, click "Skill Gap Analysis"
2. Show missing skills (amber chips) + recommended training
3. Open Career Pathway → show Junior → Senior → Lead steps with salary benchmarks

### Step 6 — Labour Market Intelligence (`/labour-insights`)
1. Show real counts: 5,828 vacancies vs 1,449 candidates
2. Top occupations chart, top hiring states
3. In-demand skills bubbles
4. Salary ranges table by occupation
5. Supply vs demand summary panel

### Step 7 — Configurable AI Rules (`/admin/ai-rules`)
1. Show current weights: Semantic 40%, Skills 35%, Taxonomy 15%, Behaviour 10%
2. Adjust Semantic to 60%, show weight bar update
3. Save → return to matching → demonstrate changed ranking
4. Reset to defaults

---

## Vendor-Neutral Labelling
- AI engine is called: **Praxo AI Engine** / **Semantic AI** / **AI Employment Intelligence**
- Never mention OpenAI, GPT, or model vendor names in UI or this runbook

---

## Test URLs

```
/                                          # Homepage
/jobs                                      # Keyword + semantic job search
/jobs?search=software%20engineer           # EN semantic query
/jobs?search=jurutera%20perisian           # BM semantic query
/document-intelligence                     # Resume + vacancy parsing
/taxonomy                                  # MASCO/MSIC/NEC/NOSS/MQA mapping
/taxonomy?q=Software%20Engineer            # Pre-filled taxonomy lookup
/poc/ai-matching                           # AI candidate matching + explainable report
/poc/dashboard                             # POC overview
/labour-insights                           # Labour market + salary intelligence
/admin/ai-rules                            # Configurable AI matching rules
/career-pathway                            # Skill gap + career pathway
/demo                                      # Guided demo checklist
```

---

## Data Sources
- **Vacancies**: `poc_vacancies` table (~5,828 rows)
- **Candidates**: `poc_candidates` table (~1,449 rows)
- **Behaviour**: `poc_behaviour` table (engagement signals per candidate)
- **Activity log**: `poc_activity_log` or equivalent (513,556 rows where available)

*All figures shown in the UI are live aggregates from real tables — no mock data.*
