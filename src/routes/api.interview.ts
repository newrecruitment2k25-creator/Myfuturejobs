import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { callAi, createEmbedding } from "@/lib/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { insertNotification } from "@/lib/notifications";
import { expandKeywords } from "@/lib/taxonomy-map";

// Build a robust searchable text string for a poc_vacancy row.
// Falls back to any string/number fields, and finally to a vacancy-id placeholder,
// so OpenAI never receives an empty input.
function buildVacancyEmbeddingText(vacancy: any): string {
  const primaryParts = [
    vacancy.job_title,
    vacancy.title,
    vacancy.occupation_name,
    vacancy.occupation,
    vacancy.job_description,
    vacancy.description,
    vacancy.skills,
    vacancy.skill,
    vacancy.education_level,
    vacancy.field_of_study,
    vacancy.state,
    vacancy.city,
    vacancy.salary,
    vacancy.salary_min,
    vacancy.salary_max,
  ]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => {
      if (Array.isArray(value)) return value.join(", ");
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    })
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (primaryParts.length > 0) {
    return primaryParts.join("\n").slice(0, 12000);
  }

  // Fallback: use any useful string/number fields from the row.
  const fallbackParts = Object.entries(vacancy || {})
    .filter(([key, value]) => {
      if (value === null || value === undefined) return false;
      if (key === "embedding") return false;
      if (key === "embedding_updated_at") return false;
      return typeof value === "string" || typeof value === "number";
    })
    .map(([key, value]) => `${key}: ${String(value).trim()}`)
    .filter((value) => value.length > 0);

  if (fallbackParts.length > 0) {
    return fallbackParts.join("\n").slice(0, 12000);
  }

  // Final fallback so OpenAI never receives an empty input.
  return `Vacancy ID ${vacancy?.id || "unknown"}`;
}

// Build a robust searchable text string for a poc_candidate row.
// Falls back to any string/number fields, and finally to a candidate-id placeholder,
// so OpenAI never receives an empty input.
function buildCandidateEmbeddingText(candidate: any): string {
  const primaryParts = [
    candidate.education_level,
    candidate.nec_1d,
    candidate.nec_2d,
    candidate.institution,
    candidate.preferred_occupation,
    candidate.previous_occupation,
    candidate.previous_years_experience,
    candidate.preferred_salary,
    candidate.preferred_state,
    candidate.skills,
  ]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => {
      if (Array.isArray(value)) return value.join(", ");
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    })
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (primaryParts.length > 0) {
    return primaryParts.join("\n").slice(0, 12000);
  }

  const fallbackParts = Object.entries(candidate || {})
    .filter(([key, value]) => {
      if (value === null || value === undefined) return false;
      if (key === "embedding") return false;
      if (key === "embedding_updated_at") return false;
      return typeof value === "string" || typeof value === "number";
    })
    .map(([key, value]) => `${key}: ${String(value).trim()}`)
    .filter((value) => value.length > 0);

  if (fallbackParts.length > 0) {
    return fallbackParts.join("\n").slice(0, 12000);
  }

  return `Candidate ID ${candidate?.id || "unknown"}`;
}

// ─── Skill extraction helpers for gap analysis ───────────────────────────────

function normalizeTextList(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v ?? "").trim().toLowerCase())
      .filter((v) => v.length > 0 && !v.startsWith("http"));
  }
  const text = String(value).trim();
  if (text.length === 0) return [];
  return text
    .split(/[,;|]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && !s.startsWith("http"));
}

function extractTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-+.#]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .filter((t) => !["and", "the", "for", "with", "from", "that", "this", "have", "will", "been", "are", "etc", "nasional", "malaysia", "bhd", "sdn"].includes(t));
}

function extractCandidateSkillText(candidate: any): string {
  if (!candidate) return "";
  const parts = [
    candidate.skills,
    candidate.previous_occupation,
    candidate.preferred_occupation,
    candidate.education_level,
    candidate.nec_1d,
    candidate.nec_2d,
    candidate.institution,
    candidate.djs_nec1d_name,
    candidate.djs_nec2d_name,
    candidate.nec3d_list,
    candidate.preferred_state,
    candidate.preferred_salary,
    candidate.previous_years_experience,
  ]
    .map((v) => (v === null || v === undefined ? "" : String(v)))
    .filter((v) => v.trim().length > 0);
  return parts.join(" ").toLowerCase();
}

function extractVacancySkillText(vacancy: any): string {
  if (!vacancy) return "";
  const parts = [
    vacancy.skills,
    vacancy.job_title,
    vacancy.occupation_name,
    vacancy.job_description,
    vacancy.education_level,
    vacancy.field_of_study,
    vacancy.state,
    vacancy.city,
  ]
    .map((v) => (v === null || v === undefined ? "" : String(v)))
    .filter((v) => v.trim().length > 0);
  return parts.join(" ").toLowerCase();
}

function extractCandidateSkills(candidate: any): string[] {
  const text = extractCandidateSkillText(candidate);
  const explicit = normalizeTextList(candidate?.skills);
  const tokens = extractTokens(text);
  return Array.from(new Set([...explicit, ...tokens])).slice(0, 40);
}

function extractVacancySkills(vacancy: any): string[] {
  const text = extractVacancySkillText(vacancy);
  const explicit = normalizeTextList(vacancy?.skills);
  const tokens = extractTokens(text);
  return Array.from(new Set([...explicit, ...tokens])).slice(0, 40);
}

function computeSkillGap(candidate: any, vacancy: any) {
  const candSkills = extractCandidateSkills(candidate);
  const vacSkills = extractVacancySkills(vacancy);
  const candSet = new Set(candSkills);
  const matched: string[] = [];
  const missing: string[] = [];
  const transferable: string[] = [];

  for (const skill of vacSkills) {
    if (candSet.has(skill)) {
      matched.push(skill);
      continue;
    }
    // Partial match: candidate skill contains the vacancy skill or vice versa
    const partial = candSkills.find((c) => c.includes(skill) || skill.includes(c));
    if (partial) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  // Transferable skills: candidate has them but vacancy did not explicitly ask
  for (const skill of candSkills) {
    if (!vacSkills.includes(skill) && !matched.includes(skill)) {
      transferable.push(skill);
    }
  }

  const score = vacSkills.length === 0 ? 0 : Math.round((matched.length / vacSkills.length) * 100);
  return {
    score: Math.min(100, Math.max(0, score)),
    matchedSkills: matched,
    missingSkills: missing,
    transferableSkills: transferable,
  };
}

async function buildSkillGapResult(
  candidate: any,
  vacancy: any,
  AI_API_KEY?: string
): Promise<{
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  recommendedTraining: string[];
  summary: string;
  nextSteps: string[];
}> {
  const local = computeSkillGap(candidate, vacancy);
  const fallback = {
    score: local.score,
    matchedSkills: local.matchedSkills,
    missingSkills: local.missingSkills,
    transferableSkills: local.transferableSkills,
    recommendedTraining: local.missingSkills.map((s) => `Complete training in ${s}`),
    summary: `Skill match score: ${local.score}%. Matched: ${local.matchedSkills.length}, missing: ${local.missingSkills.length}.`,
    nextSteps: local.missingSkills.length > 0 ? ["Review missing skills and plan upskilling."] : ["Candidate meets the key requirements."],
  };

  if (!AI_API_KEY) return fallback;

  const prompt = `You are a Malaysian workforce development advisor for PERKESO/Praxo.
Analyze the skill gap between this candidate and vacancy. Return ONLY valid JSON.

Candidate skills: ${local.matchedSkills.concat(local.transferableSkills).join(", ") || "N/A"}
Vacancy required skills: ${local.matchedSkills.concat(local.missingSkills).join(", ") || "N/A"}
Missing skills: ${local.missingSkills.join(", ") || "N/A"}
Candidate role: ${candidate?.preferred_occupation || candidate?.previous_occupation || "N/A"}
Vacancy title: ${vacancy?.job_title || vacancy?.occupation_name || "N/A"}

Return JSON:
{"recommendedTraining":["..."],"summary":"...","nextSteps":["..."]}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    try {
      const ai = JSON.parse(text.replace(/```json|```/g, "").trim());
      return {
        score: local.score,
        matchedSkills: local.matchedSkills,
        missingSkills: local.missingSkills,
        transferableSkills: local.transferableSkills,
        recommendedTraining: Array.isArray(ai.recommendedTraining) ? ai.recommendedTraining : fallback.recommendedTraining,
        summary: ai.summary || fallback.summary,
        nextSteps: Array.isArray(ai.nextSteps) ? ai.nextSteps : fallback.nextSteps,
      };
    } catch {
      return fallback;
    }
  } catch (e) {
    console.warn("[api/interview] buildSkillGapResult AI failed:", e);
    return fallback;
  }
}

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("get_session"),
    session_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("generate_question"),
    session_id: z.string().uuid(),
    question_number: z.number().int().min(1),
  }),
  z.object({
    action: z.literal("submit_answer"),
    response_id: z.string().uuid(),
    answer_text: z.string().min(1).max(10000),
  }),
  z.object({
    action: z.literal("complete"),
    session_id: z.string().uuid(),
    proctoring: z.object({
      tab_switches: z.number().int().min(0).default(0),
      fullscreen_exits: z.number().int().min(0).default(0),
      face_absent_seconds: z.number().min(0).default(0),
    }).optional(),
  }),
  z.object({
    action: z.literal("generate_avatar"),
    text: z.string().min(1).max(4096),
    presenter: z.enum(["female", "male"]).optional(),
    voice_id: z.string().optional(),
  }),
  z.object({
    action: z.literal("generate_speech"),
    text: z.string().min(1).max(4096),
    voice: z.enum(["nova", "onyx", "alloy", "echo", "fable", "shimmer"]).optional(),
  }),
  z.object({
    action: z.literal("start_invited"),
    invitation_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("score_invited_answer"),
    invitation_id: z.string().uuid(),
    question_id: z.string().uuid(),
    question_number: z.number().int().min(1),
    answer_text: z.string().min(1).max(10000),
  }),
  z.object({
    action: z.literal("complete_invited"),
    invitation_id: z.string().uuid(),
    proctoring: z.object({
      tab_switches: z.number().int().min(0).default(0),
      fullscreen_exits: z.number().int().min(0).default(0),
      face_absent_seconds: z.number().min(0).default(0),
    }).optional(),
  }),
  z.object({
    action: z.literal("create_invitation_from_template"),
    template_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("start_simli_session"),
    face_id: z.string(),
    system_prompt: z.string().optional(),
  }),
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/interview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── Pre-auth: public chat action ────────────────────────────────────
        const rawBody = await request.clone().json().catch(() => null);
        if (rawBody?.action === "chat") {
          const AI_API_KEY = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;
          if (!AI_API_KEY) return json({ reply: "AI service is not configured. Please try again later." });
          const { message, history } = rawBody as { message: string; history?: Array<{ role: string; content: string }> };
          if (!message) return json({ error: "message is required" }, 400);

          // ── Step 1: Gather live DB context ────────────────────────────────
          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
          let dbContext = "";

          if (SUPABASE_URL && SUPABASE_KEY) {
            const sbHeaders: Record<string, string> = {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
            };

            try {
              // Total vacancies + candidates (parallel)
              const [totalRes, candRes] = await Promise.all([
                fetch(`${SUPABASE_URL}/rest/v1/poc_vacancies?select=id&limit=1`, { headers: { ...sbHeaders, Prefer: "count=exact" } }),
                fetch(`${SUPABASE_URL}/rest/v1/poc_candidates?select=id&limit=1`, { headers: { ...sbHeaders, Prefer: "count=exact" } }),
              ]);
              const totalCount = totalRes.headers.get("content-range")?.split("/")[1] ?? "5828";
              const candCount = candRes.headers.get("content-range")?.split("/")[1] ?? "1449";

              // State distribution (sample 500)
              const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/poc_vacancies?select=state&limit=500`, { headers: sbHeaders }).catch(() => null);
              let stateDistInfo = "";
              if (stateRes?.ok) {
                const rows = await stateRes.json() as Array<{ state: string | null }>;
                const dist: Record<string, number> = {};
                rows.forEach((r) => { if (r.state) dist[r.state] = (dist[r.state] ?? 0) + 1; });
                const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 8);
                stateDistInfo = "\nJobs by state (top 8): " + top.map(([s, n]) => `${s} (${n})`).join(", ");
              }

              // Top occupations (sample 200)
              const occRes = await fetch(`${SUPABASE_URL}/rest/v1/poc_vacancies?select=occupation_name&limit=200`, { headers: sbHeaders }).catch(() => null);
              let topOccupations = "";
              if (occRes?.ok) {
                const rows = await occRes.json() as Array<{ occupation_name: string | null }>;
                const dist: Record<string, number> = {};
                rows.forEach((r) => { if (r.occupation_name) dist[r.occupation_name] = (dist[r.occupation_name] ?? 0) + 1; });
                const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 10);
                topOccupations = "\nTop 10 occupations: " + top.map(([o, n]) => `${o} (${n})`).join(", ");
              }

              // Salary distribution (sample 100)
              const salRes = await fetch(`${SUPABASE_URL}/rest/v1/poc_vacancies?select=salary&limit=100&salary=not.is.null`, { headers: sbHeaders }).catch(() => null);
              let salaryInfo = "";
              if (salRes?.ok) {
                const rows = await salRes.json() as Array<{ salary: string | null }>;
                const dist: Record<string, number> = {};
                rows.forEach((r) => { if (r.salary) dist[r.salary] = (dist[r.salary] ?? 0) + 1; });
                const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 5);
                salaryInfo = "\nSalary distribution (top 5 ranges): " + top.map(([s, n]) => `${s} (${n} jobs)`).join(", ");
              }

              // Specific job query — extract keywords and state from message
              let specificResults = "";
              let msgLeft = message.toLowerCase();

              // State map — sorted longest-key-first to avoid "jb" matching before "johor bahru"
              const stateMap: Record<string, string> = {
                "kuala lumpur": "Kuala Lumpur", "kl": "Kuala Lumpur",
                "petaling jaya": "Selangor", "shah alam": "Selangor", "cyberjaya": "Selangor", "pj": "Selangor", "selangor": "Selangor",
                "johor bahru": "Johor", "johor": "Johor", "jb": "Johor",
                "pulau pinang": "Pulau Pinang", "penang": "Pulau Pinang",
                "ipoh": "Perak", "perak": "Perak",
                "negeri sembilan": "Negeri Sembilan",
                "sabah": "Sabah", "sarawak": "Sarawak",
                "kedah": "Kedah", "kelantan": "Kelantan", "melaka": "Melaka",
                "pahang": "Pahang", "terengganu": "Terengganu", "perlis": "Perlis",
                "putrajaya": "Putrajaya", "labuan": "Labuan",
              };
              const sortedStateKeys = Object.keys(stateMap).sort((a, b) => b.length - a.length);

              let detectedState: string | null = null;
              for (const key of sortedStateKeys) {
                if (msgLeft.includes(key)) {
                  detectedState = stateMap[key];
                  msgLeft = msgLeft.replace(key, " ");
                  break;
                }
              }

              // Strip years, filler, question words, job-related generic words
              const cleaned = msgLeft
                .replace(/\b20\d{2}\b/g, "")
                .replace(/\b(how|many|much|what|where|which|when|who|tell|me|show|find|search|get|list|count|number|of)\b/g, "")
                .replace(/\b(jobs?|vacancies?|vacancy|positions?|openings?|listings?|posted|available|active|current|currently|overall|total)\b/g, "")
                .replace(/\b(in|at|near|around|for|the|a|an|are|there|is|it|do|does|can|i|you|my|this|that|with|from|to|on|by|and|or|any|all|some)\b/g, "")
                .replace(/\b(today|yesterday|last|week|month|year|recently|latest|new|recent)\b/g, "")
                .replace(/[?!.,;:'"]/g, "")
                .replace(/\s+/g, " ")
                .trim();

              // Normalise trailing plural 's' on last word only
              const titleKeywords = cleaned.replace(/s\b/g, "").trim();

              console.log("[chatbot] Parsed query — keywords:", titleKeywords, "| state:", detectedState);

              if (titleKeywords.length >= 3 || detectedState) {
                let queryUrl = `${SUPABASE_URL}/rest/v1/poc_vacancies?select=id,job_title,state,salary,occupation_name&limit=5`;
                let countUrl = `${SUPABASE_URL}/rest/v1/poc_vacancies?select=id&limit=1`;

                if (titleKeywords.length >= 3) {
                  const enc = encodeURIComponent(titleKeywords);
                  const orFilter = `or=(job_title.ilike.*${enc}*,occupation_name.ilike.*${enc}*)`;
                  queryUrl += `&${orFilter}`;
                  countUrl += `&${orFilter}`;
                }
                if (detectedState) {
                  const enc = encodeURIComponent(detectedState);
                  queryUrl += `&state=ilike.*${enc}*`;
                  countUrl += `&state=ilike.*${enc}*`;
                }

                console.log("[chatbot] Query URL:", queryUrl);
                console.log("[chatbot] Count URL:", countUrl);

                const [jobsRes, cntRes] = await Promise.all([
                  fetch(queryUrl, { headers: sbHeaders }),
                  fetch(countUrl, { headers: { ...sbHeaders, Prefer: "count=exact" } }),
                ]);
                const matchCount = cntRes.headers.get("content-range")?.split("/")[1] ?? "0";
                const matchingJobs = jobsRes.ok ? await jobsRes.json() as Array<{ job_title: string; state: string; salary: string | null }> : [];
                specificResults = `\n\nSPECIFIC QUERY RESULTS:\nSearch: "${titleKeywords}"${detectedState ? ` in ${detectedState}` : ""}\nTotal matching jobs: ${matchCount}`;
                if (matchingJobs.length > 0) {
                  specificResults += "\nSample matches:\n" + matchingJobs.slice(0, 5).map((j) => `- ${j.job_title} | ${j.state} | ${j.salary ?? "Salary not specified"}`).join("\n");
                }
              }

              // Behaviour analytics for chatbot
              let behaviourContext = "";
              try {
                const bhvRes = await fetch(`${SUPABASE_URL}/rest/v1/poc_behaviour?select=grand_total,submitted_application_count,interview_count,sign_in_count&limit=2000`, { headers: sbHeaders });
                if (bhvRes.ok) {
                  const bhvRows = await bhvRes.json() as Array<{ grand_total: number; submitted_application_count: number; interview_count: number; sign_in_count: number }>;
                  if (bhvRows.length > 0) {
                    const highlyActive = bhvRows.filter(b => b.submitted_application_count > 80 || b.interview_count > 3).length;
                    const active       = bhvRows.filter(b => b.submitted_application_count > 30 && b.submitted_application_count <= 80).length;
                    const moderate     = bhvRows.filter(b => b.submitted_application_count > 10 && b.submitted_application_count <= 30).length;
                    const withInterviews = bhvRows.filter(b => b.interview_count > 0).length;
                    const avgApps      = Math.round(bhvRows.reduce((s, b) => s + (b.submitted_application_count ?? 0), 0) / bhvRows.length);
                    behaviourContext = `\nCandidate Engagement (${bhvRows.length} records): ${highlyActive} highly active (80+ apps or 3+ interviews), ${active} active (30-80 apps), ${moderate} moderate (10-30 apps), ${withInterviews} attended interviews, avg ${avgApps} applications per candidate.`;
                  }
                }
              } catch {}

              dbContext = `\nLIVE PLATFORM DATA (use this to answer accurately):\n- Total active vacancies: ${totalCount}\n- Total registered candidates: ${candCount}${stateDistInfo}${topOccupations}${salaryInfo}${behaviourContext}${specificResults}\n`;
            } catch (e) {
              console.error("[api/interview] DB context error:", e);
              dbContext = "\nNote: Could not fetch live data. Answer based on general knowledge.";
            }
          }

          // ── Step 2: Call AI engine with real data context ────────────────
          const systemPrompt = `You are the Praxo AI Assistant — the intelligent career engine powering PERKESO's AI employment intelligence platform. You are NOT GPT, NOT ChatGPT, NOT made by OpenAI. You are Praxo AI, built to serve Malaysian jobseekers and employers.

You have access to REAL, LIVE platform data. Use it to answer accurately.
${dbContext}
PLATFORM FEATURES you can guide users to:
- /jobs — Browse and search all vacancies with smart filters
- /analyze — AI CV Analyzer (upload CV for instant feedback)
- /linkedin-review — LinkedIn profile review
- Interview Prep — AI mock interviews with video avatar
- /poc/dashboard — AI matching engine demo
- /employer/dashboard — Employer tools (post jobs, find candidates)

RULES:
- NEVER say "GPT", "ChatGPT", "OpenAI", or mention any external AI provider. You are Praxo AI.
- If asked "what AI are you?" or "who made you?", say: "I'm the Praxo AI Assistant — PERKESO's AI Employment Intelligence engine, built to help Malaysian jobseekers and employers."
- Always use the LIVE DATA above to give specific numbers, not estimates
- If user asks about job counts, salaries, or locations, give exact numbers from the data
- If the specific query results show matching jobs, mention the count and sample titles
- Be concise (under 200 words unless asked for detail)
- Be Malaysia-aware: GLC, MNC, SME, HRD Corp, MASCO, EPF, SOCSO context
- Guide users to specific platform features when relevant`;

          const messages = [
            { role: "system", content: systemPrompt },
            ...(history ?? []),
            { role: "user", content: message },
          ];
          try {
            const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 500 }),
            });
            const aiData = await aiRes.json() as any;
            const reply = aiData.choices?.[0]?.message?.content || "Sorry, I could not process that. Please try again.";
            return json({ reply });
          } catch (e) {
            console.error("[api/interview] chat error:", e);
            return json({ reply: "I'm having trouble connecting right now. Please try again in a moment." });
          }
        }

        // ── Pre-auth: talent_search action ──────────────────────────────────
        if (rawBody?.action === "talent_search") {
          const authH = request.headers.get("Authorization") ?? "";
          const tkn = authH.replace(/^Bearer\s+/i, "").trim();
          if (!tkn) return json({ error: "Authentication required" }, 401);
          // Validate JWT using a user-scoped client (anon key + bearer token)
          const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
          let authedUserId: string | null = null;
          if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
            const { createClient } = await import("@supabase/supabase-js");
            const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
              global: { headers: { Authorization: `Bearer ${tkn}` } },
              auth: { persistSession: false },
            });
            const { data: ud, error: ue } = await userClient.auth.getUser();
            if (ue || !ud?.user) return json({ error: "Invalid token" }, 401);
            authedUserId = ud.user.id;
          } else {
            // Fallback: try with supabaseAdmin (works on some configs)
            const { data: ud, error: ue } = await supabaseAdmin.auth.getUser(tkn);
            if (ue || !ud?.user) return json({ error: "Invalid token" }, 401);
            authedUserId = ud.user.id;
          }
          if (!authedUserId) return json({ error: "Invalid token" }, 401);

          const { query } = rawBody as { query: string };
          if (!query || query.length < 3) return json({ error: "Query too short" }, 400);

          const AI_API_KEY = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;
          if (!AI_API_KEY) return json({ error: "AI service not configured" }, 500);

          // Step 1: Parse query with AI
          let parsed: { skills?: string[]; state?: string; education_level?: string; experience?: string; min_salary?: number; max_salary?: number; job_title?: string } = {};
          try {
            const parseResult = await callAi({
              model: "gpt-5.4-mini",
              messages: [
                { role: "system", content: `You are a talent search query parser for a Malaysian job portal.
Parse the employer's search query and extract structured filters.

Query: "${query}"

Extract:
- skills: array of SPECIFIC technical/domain skills this role requires. Include the explicit skills AND related skills typically required for this role. For example:
  - "Software Developer" → ["programming", "javascript", "python", "java", "html", "css", "sql", "git", "web development", "software engineering"]
  - "Data Analyst" → ["excel", "sql", "python", "data analysis", "power bi", "tableau", "statistics"]
  - "Accountant" → ["accounting", "excel", "taxation", "audit", "financial reporting", "sage", "quickbooks"]
  - "Admin" → ["microsoft office", "excel", "word", "administrative", "data entry", "filing"]
  DO NOT include generic words like "development", "management", "services" alone — they match unrelated roles.
- state: Malaysian state (map KL/Kuala Lumpur→Kuala Lumpur, JB/Johor Bahru→Johor, PJ/Petaling Jaya→Selangor, Penang→Pulau Pinang, etc.)
- education_level: SPM/Diploma/Bachelor/Master/PhD (null if not mentioned)
- experience: Fresh Graduate/1-3 years/3-5 years/5-10 years/10+ years (null if not mentioned)
- min_salary: number in RM (null if not mentioned)
- max_salary: number in RM (null if not mentioned)
- job_title: the role they are looking for (extract cleanly, e.g. "Software Developer")

Return JSON only, no markdown, no explanation.` },
                { role: "user", content: query },
              ],
            });
            const raw = (parseResult.text ?? "").replace(/```json?\n?/g, "").replace(/```/g, "").trim();
            parsed = JSON.parse(raw);
          } catch (e) {
            console.error("[talent_search] AI parse failed, using fallback:", e);
            parsed = { skills: query.split(/[\s,]+/).filter(w => w.length > 2), job_title: query };
          }

          // Step 2: Query poc_candidates
          let pocCandidates: any[] = [];
          try {
            let q = (supabaseAdmin as any).from("poc_candidates").select("*").limit(500);
            if (parsed.state) q = q.ilike("preferred_state", `%${parsed.state}%`);
            if (parsed.education_level) q = q.ilike("education_level", `%${parsed.education_level}%`);
            const { data } = await q;
            pocCandidates = data ?? [];
          } catch (e) {
            console.error("[talent_search] poc_candidates query error:", e);
          }

          // Step 3: Query registered users with analyses
          let registeredCandidates: any[] = [];
          try {
            const { data: profiles } = await (supabaseAdmin as any).from("profiles")
              .select("id, email, role, created_at")
              .eq("role", "job_seeker")
              .limit(100);
            if (profiles && profiles.length > 0) {
              const userIds = (profiles as any[]).map((p: any) => p.id);
              const { data: analyses } = await (supabaseAdmin as any).from("analyses")
                .select("user_id, industry, experience_level, overall_score, results")
                .in("user_id", userIds)
                .order("created_at", { ascending: false });
              const latestByUser = new Map<string, any>();
              ((analyses ?? []) as any[]).forEach((a: any) => { if (!latestByUser.has(a.user_id)) latestByUser.set(a.user_id, a); });
              registeredCandidates = (profiles as any[]).map((p: any) => {
                const analysis = latestByUser.get(p.id);
                let skills: string[] = [];
                if (analysis?.results) {
                  try {
                    const r = typeof analysis.results === "string" ? JSON.parse(analysis.results) : analysis.results;
                    skills = r?.skills?.technical ?? r?.skills ?? [];
                  } catch {}
                }
                return { ...p, analysis, skills, source: "registered" };
              }).filter((p: any) => p.analysis);
            }
          } catch (e) {
            console.error("[talent_search] profiles query error:", e);
          }

          // Step 4: Score candidates — expand job_title synonyms via taxonomy
          const requestedSkills = (parsed.skills ?? []).map(s => s.toLowerCase().trim()).filter(Boolean);
          const requestedState = (parsed.state ?? "").toLowerCase();
          const requestedJobTitle = (parsed.job_title ?? "").toLowerCase();
          const expandedJobTitles = parsed.job_title ? expandKeywords(parsed.job_title) : [requestedJobTitle];

          // Skills are weighted 60%, location 25%, education 15%
          // Occupation match adds 20-point bonus
          function skillMatch(candidateSkillStr: string, isArray = false): { matched: string[]; missing: string[] } {
            const cSkills = isArray
              ? (candidateSkillStr as any as string[]).map((s: string) => s.toLowerCase().trim())
              : candidateSkillStr.toLowerCase().split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean);
            const matched: string[] = [];
            const missing: string[] = [];
            for (const req of requestedSkills) {
              // Exact word match or contained within a skill token (both directions)
              const found = cSkills.some((cs: string) => {
                const csWords = cs.split(/\s+/);
                const reqWords = req.split(/\s+/);
                // Full phrase match
                if (cs === req) return true;
                if (cs.includes(req) && req.length > 3) return true;
                if (req.includes(cs) && cs.length > 3) return true;
                // Word-level match — at least one word matches exactly
                return reqWords.some(rw => rw.length > 3 && csWords.some(cw => cw === rw));
              });
              if (found) matched.push(req); else missing.push(req);
            }
            return { matched, missing };
          }

          function scoreCandidate(matched: string[], missing: string[], state: string, education: string, occupation: string): number {
            if (requestedSkills.length > 0 && matched.length === 0) return 0; // hard filter
            const skillPct = requestedSkills.length > 0 ? matched.length / requestedSkills.length : 0.5;
            const skillScore = skillPct * 100;
            const locScore = !requestedState ? 50 : (state.toLowerCase().includes(requestedState) ? 100 : 0);
            const eduScore = !parsed.education_level ? 50 :
              (education.toLowerCase().includes(parsed.education_level.toLowerCase()) ? 100 : 30);
            let total = Math.round(skillScore * 0.60 + locScore * 0.25 + eduScore * 0.15);
            // Occupation boost: +20 if preferred role matches any taxonomy synonym of the searched job title
            if (expandedJobTitles.length > 0 && occupation) {
              const occLower = occupation.toLowerCase();
              if (expandedJobTitles.some(t => t.length > 2 && occLower.includes(t))) {
                total = Math.min(100, total + 20);
              }
            }
            return total;
          }

          function applyBehaviourBoost(baseScore: number, behaviour: any): number {
            if (!behaviour) return baseScore;
            let bonus = 0;
            const appCount  = behaviour.submitted_application_count ?? behaviour.total_applications ?? 0;
            const signIns   = behaviour.sign_in_count ?? 0;
            const interviews = behaviour.interview_count ?? behaviour.total_interviews ?? 0;
            const offers    = behaviour.job_offer_count ?? behaviour.total_offers ?? 0;
            const total     = behaviour.grand_total ?? 0;
            // Application activity (max +10)
            if (appCount > 80)       bonus += 10;
            else if (appCount > 40)  bonus += 7;
            else if (appCount > 15)  bonus += 4;
            // Interview attendance (max +8)
            if (interviews > 5)      bonus += 8;
            else if (interviews > 2) bonus += 5;
            else if (interviews > 0) bonus += 3;
            // Sign-in frequency (max +5)
            if (signIns > 40)        bonus += 5;
            else if (signIns > 15)   bonus += 3;
            // Offers received (max +5)
            if (offers > 0)          bonus += 5;
            // Penalty: very low activity
            if (total < 10)          bonus -= 5;
            return Math.min(100, baseScore + Math.max(-5, bonus));
          }

          function scorePoc(c: any): { score: number; matched: string[]; missing: string[] } {
            const { matched, missing } = skillMatch(c.skills ?? "");
            const score = scoreCandidate(
              matched, missing,
              c.preferred_state ?? "",
              c.education_level ?? "",
              `${c.preferred_occupation ?? ""} ${c.previous_occupation ?? ""}`,
            );
            return { score, matched, missing };
          }

          function scoreRegistered(c: any): { score: number; matched: string[]; missing: string[] } {
            const { matched, missing } = skillMatch(c.skills ?? [], true);
            const score = scoreCandidate(
              matched, missing,
              "", // no location in profiles
              c.analysis?.industry ?? "",
              c.analysis?.industry ?? "",
            );
            return { score, matched, missing };
          }

          // Step 5: Get behaviour data for POC candidates
          let behaviourMap = new Map<string, any>();
          try {
            const pocIds = pocCandidates.map(c => c.id);
            if (pocIds.length > 0) {
              const { data: behaviour } = await (supabaseAdmin as any).from("poc_behaviour")
                .select("candidate_id, total_applications, total_interviews, total_offers, sign_in_count")
                .in("candidate_id", pocIds.slice(0, 200));
              (behaviour ?? []).forEach((b: any) => behaviourMap.set(b.candidate_id, b));
            }
          } catch {}

          // Combine and rank
          const results: any[] = [];

          var MIN_SKILLS_MATCH = 3;
          var MIN_SCORE = 40;

          for (const c of pocCandidates) {
            const { score, matched, missing } = scorePoc(c);
            if (score === 0 && requestedSkills.length > 0) continue; // hard filter: zero skill matches
            if (score < MIN_SCORE) continue; // minimum relevance threshold
            // Must have title match OR 3+ skill matches
            var titleMatchPoc = (c.preferred_occupation ?? c.previous_occupation ?? "").toLowerCase().includes(requestedJobTitle.toLowerCase()) ||
              expandedJobTitles.some(t => t.length > 2 && (c.preferred_occupation ?? "").toLowerCase().includes(t));
            if (!titleMatchPoc && matched.length < MIN_SKILLS_MATCH) continue;
            const behaviour = behaviourMap.get(c.id);
            const boostedScore = applyBehaviourBoost(score, behaviour);
            const grandTotal = (behaviour?.total_applications ?? 0) + (behaviour?.total_interviews ?? 0) + (behaviour?.total_offers ?? 0) + (behaviour?.sign_in_count ?? 0);
            const activityLabel = grandTotal > 200 ? "🔥 Highly Active" : grandTotal > 50 ? "✅ Active" : "⚪ Low Activity";
            results.push({
              source: "poc",
              id: c.id,
              candidate_id: c.candidate_id,
              education_level: c.education_level,
              field_of_study: c.field_of_study,
              preferred_state: c.preferred_state,
              preferred_salary: c.preferred_salary,
              previous_occupation: c.previous_occupation,
              previous_years_experience: c.previous_years_experience,
              skills: c.skills,
              score: boostedScore,
              matched_skills: matched,
              missing_skills: missing,
              applications: behaviour?.total_applications ?? 0,
              interviews: behaviour?.total_interviews ?? 0,
              offers: behaviour?.total_offers ?? 0,
              activity_label: activityLabel,
            });
          }

          for (const c of registeredCandidates) {
            const { score, matched, missing } = scoreRegistered(c);
            if (score === 0 && requestedSkills.length > 0) continue;
            if (score < MIN_SCORE) continue;
            if (matched.length < MIN_SKILLS_MATCH && requestedSkills.length >= MIN_SKILLS_MATCH) continue;
            results.push({
              source: "registered",
              id: c.id,
              email: c.email,
              education_level: c.analysis?.experience_level ?? null,
              field_of_study: c.analysis?.industry ?? null,
              preferred_state: null,
              preferred_salary: null,
              previous_occupation: null,
              previous_years_experience: c.analysis?.experience_level ?? null,
              skills: (c.skills ?? []).join(", "),
              score,
              matched_skills: matched,
              missing_skills: missing,
              applications: 0,
              interviews: 0,
              offers: 0,
              overall_score: c.analysis?.overall_score ?? null,
            });
          }

          results.sort((a, b) => b.score - a.score);

          return json({
            candidates: results.slice(0, 50),
            total: results.length,
            parsed,
            query,
          });
        }

        // ── Pre-auth: semantic_search action ─────────────────────────────────
        if (rawBody?.action === "semantic_search") {
          try {
            const { query, type = "vacancies", limit = 20 } = rawBody as { query?: string; type?: string; limit?: number };
            if (!query || typeof query !== "string" || query.trim().length < 2) {
              return json({ ok: true, results: [], warning: "Enter at least 2 characters for semantic AI search." });
            }

            const embedding = await createEmbedding(query.trim(), { AI_API_KEY: process.env.AI_API_KEY });
            if (!embedding) {
              return json({ ok: true, results: [], warning: "Semantic AI search is temporarily unavailable; keyword results are shown." });
            }

            try {
              // Try to use an existing RPC or table for vector search. If none exists, fall back safely.
              const rpcAvailable = !!(supabaseAdmin as any).rpc;
              if (!rpcAvailable) {
                return json({ ok: true, results: [], warning: "Semantic AI search is temporarily unavailable; keyword results are shown." });
              }

              // Attempt vector search via an expected RPC; if it does not exist, catch and fall back.
              const { data: matches, error: rpcError } = await (supabaseAdmin as any)
                .rpc("match_vacancies", { query_embedding: embedding, match_limit: Math.min(limit, 50) })
                .limit(Math.min(limit, 50));

              if (rpcError) {
                console.warn("[api/interview] semantic_search RPC failed:", rpcError);
                return json({ ok: true, results: [], warning: "Semantic AI search is temporarily unavailable; keyword results are shown." });
              }

              const normalized = Array.isArray(matches)
                ? matches.map((item: any) => ({
                    ...item,
                    id: item.id ?? item.vacancy_id ?? crypto.randomUUID(),
                    semanticScore: item.similarity ?? item.semantic_score ?? 0,
                  }))
                : [];

              return json({ ok: true, results: normalized, warning: null });
            } catch (dbError) {
              console.warn("[api/interview] Semantic DB search failed:", dbError);
              return json({ ok: true, results: [], warning: "Semantic AI search is temporarily unavailable; keyword results are shown." });
            }
          } catch (e) {
            console.warn("[api/interview] semantic_search failed:", e);
            return json({ ok: true, results: [], warning: "Semantic AI search is temporarily unavailable; keyword results are shown." });
          }
        }

        // ── Pre-auth: backfill_vacancy_embeddings action ───────────────────
        // Developer-only. Generates OpenAI embeddings for poc_vacancies rows that
        // do not yet have an embedding. Protected by ADMIN_BACKFILL_SECRET only.
        if (rawBody?.action === "backfill_vacancy_embeddings") {
          try {
            // 1. Secret-only auth: ADMIN_BACKFILL_SECRET must match body.admin_secret.
            // No Authorization header / user JWT required for this maintenance action.
            const expectedSecret = process.env.ADMIN_BACKFILL_SECRET;
            const providedSecret = (rawBody as any).admin_secret;

            if (!expectedSecret) {
              return json({ error: "Backfill secret is not configured" }, 403);
            }

            if (!providedSecret || providedSecret !== expectedSecret) {
              return json({ error: "Unauthorized backfill request" }, 403);
            }

            // 2. Limit controls: cap at 10 to stay within Cloudflare Worker subrequest limits.
            const requestedLimit = Math.max(1, Math.min(Number((rawBody as any).limit) || 10, 10));

            // 3. Fetch vacancies without embeddings (deterministic order so retries
            // don't endlessly reprocess the same rows when some are unfixable).
            const { data: rows, error: fetchError } = await (supabaseAdmin as any)
              .from("poc_vacancies")
              .select("*")
              .is("embedding", null)
              .order("id", { ascending: true })
              .limit(requestedLimit);

            if (fetchError) {
              console.warn("[api/interview] backfill fetch failed:", fetchError);
              return json({ ok: false, error: "Failed to fetch vacancies" }, 500);
            }

            const candidates = rows ?? [];
            let updated = 0;
            let failed = 0;
            const errors: string[] = [];

            // 4. Generate and store embeddings
            for (const vacancy of candidates) {
              try {
                const text = buildVacancyEmbeddingText(vacancy);

                if (!text || text.trim().length < 3) {
                  failed++;
                  errors.push(`${vacancy.id}: skipped because searchable text is empty`);
                  continue;
                }

                const embedding = await createEmbedding(text.trim(), {
                  AI_API_KEY: process.env.AI_API_KEY,
                });

                if (!Array.isArray(embedding) || embedding.length !== 384) {
                  failed++;
                  errors.push(`${vacancy.id}: embedding missing or wrong length (${Array.isArray(embedding) ? embedding.length : 0})`);
                  continue;
                }

                // Try direct array first; fall back to Postgres vector literal if needed.
                let updatePayload = { embedding, embedding_updated_at: new Date().toISOString() };
                const { error: updateError } = await (supabaseAdmin as any)
                  .from("poc_vacancies")
                  .update(updatePayload)
                  .eq("id", vacancy.id);

                if (updateError) {
                  const vectorLiteral = "[" + embedding.join(",") + "]";
                  const { error: literalError } = await (supabaseAdmin as any)
                    .from("poc_vacancies")
                    .update({ embedding: vectorLiteral, embedding_updated_at: new Date().toISOString() })
                    .eq("id", vacancy.id);
                  if (literalError) {
                    console.warn("[api/interview] backfill update failed for", vacancy.id, literalError);
                    failed++;
                    errors.push(`${vacancy.id}: ${literalError.message ?? JSON.stringify(literalError)}`);
                    continue;
                  }
                }

                updated++;
              } catch (itemError: any) {
                console.warn("[api/interview] backfill item failed:", itemError);
                failed++;
                errors.push(`${vacancy.id}: ${itemError?.message ?? String(itemError)}`);
              }
            }

            return json({
              ok: true,
              processed: candidates.length,
              updated,
              failed,
              remainingHint: "Run again until updated is 0",
              errors: errors.slice(0, 10),
            });
          } catch (e) {
            console.warn("[api/interview] backfill_vacancy_embeddings failed:", e);
            return json({ ok: false, error: "Backfill failed" }, 500);
          }
        }

        // ── Pre-auth: backfill_candidate_embeddings action ───────────────────
        // Developer-only. Generates OpenAI embeddings for poc_candidates rows that
        // do not yet have an embedding. Protected by ADMIN_BACKFILL_SECRET only.
        if (rawBody?.action === "backfill_candidate_embeddings") {
          try {
            // 1. Secret-only auth
            const expectedSecret = process.env.ADMIN_BACKFILL_SECRET;
            const providedSecret = (rawBody as any).admin_secret;

            if (!expectedSecret) {
              return json({ error: "Backfill secret is not configured" }, 403);
            }

            if (!providedSecret || providedSecret !== expectedSecret) {
              return json({ error: "Unauthorized backfill request" }, 403);
            }

            // 2. Limit controls: cap at 10 to stay within Cloudflare Worker subrequest limits.
            const requestedLimit = Math.max(1, Math.min(Number((rawBody as any).limit) || 10, 10));

            // 3. Fetch candidates without embeddings (deterministic order)
            const { data: rows, error: fetchError } = await (supabaseAdmin as any)
              .from("poc_candidates")
              .select("*")
              .is("embedding", null)
              .order("id", { ascending: true })
              .limit(requestedLimit);

            if (fetchError) {
              console.warn("[api/interview] candidate backfill fetch failed:", fetchError);
              return json({ ok: false, error: "Failed to fetch candidates" }, 500);
            }

            const candidates = rows ?? [];
            let updated = 0;
            let failed = 0;
            const errors: string[] = [];

            // 4. Generate and store embeddings
            for (const candidate of candidates) {
              try {
                const text = buildCandidateEmbeddingText(candidate);

                if (!text || text.trim().length < 3) {
                  failed++;
                  errors.push(`${candidate.id}: skipped because searchable text is empty`);
                  continue;
                }

                const embedding = await createEmbedding(text.trim(), {
                  AI_API_KEY: process.env.AI_API_KEY,
                });

                if (!Array.isArray(embedding) || embedding.length !== 384) {
                  failed++;
                  errors.push(`${candidate.id}: embedding missing or wrong length (${Array.isArray(embedding) ? embedding.length : 0})`);
                  continue;
                }

                // Try direct array first; fall back to Postgres vector literal if needed.
                const updatePayload = { embedding, embedding_updated_at: new Date().toISOString() };
                const { error: updateError } = await (supabaseAdmin as any)
                  .from("poc_candidates")
                  .update(updatePayload)
                  .eq("id", candidate.id);

                if (updateError) {
                  const vectorLiteral = "[" + embedding.join(",") + "]";
                  const { error: literalError } = await (supabaseAdmin as any)
                    .from("poc_candidates")
                    .update({ embedding: vectorLiteral, embedding_updated_at: new Date().toISOString() })
                    .eq("id", candidate.id);
                  if (literalError) {
                    console.warn("[api/interview] candidate backfill update failed for", candidate.id, literalError);
                    failed++;
                    errors.push(`${candidate.id}: ${literalError.message ?? JSON.stringify(literalError)}`);
                    continue;
                  }
                }

                updated++;
              } catch (itemError: any) {
                console.warn("[api/interview] candidate backfill item failed:", itemError);
                failed++;
                errors.push(`${candidate.id}: ${itemError?.message ?? String(itemError)}`);
              }
            }

            return json({
              ok: true,
              processed: candidates.length,
              updated,
              failed,
              remainingHint: "Run again until updated is 0",
              errors: errors.slice(0, 10),
            });
          } catch (e) {
            console.warn("[api/interview] backfill_candidate_embeddings failed:", e);
            return json({ ok: false, error: "Backfill failed" }, 500);
          }
        }

        // ── Pre-auth: explain_match action ───────────────────────────────────
        if (rawBody?.action === "explain_match") {
          try {
            const { candidate, job, score } = rawBody as { candidate?: any; job?: any; score?: number };
            const AI_API_KEY = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;
            if (!AI_API_KEY) {
              return json({
                ok: true,
                explanation: {
                  summary: "Semantic AI match explanation is temporarily unavailable.",
                  strengths: [],
                  gaps: [],
                  recommendation: "Review job details and candidate skills manually.",
                },
              });
            }

            const prompt = `You are a Malaysian job matching explainer. Explain why a candidate matches a job vacancy.

Candidate:
- Role: ${candidate?.target_role || candidate?.preferred_occupation || "N/A"}
- Skills: ${Array.isArray(candidate?.skills) ? candidate.skills.join(", ") : candidate?.skills || "N/A"}
- Education: ${candidate?.education_level || "N/A"}
- Location: ${candidate?.preferred_state || candidate?.location || "N/A"}
- Salary: ${candidate?.preferred_salary || candidate?.salary || "N/A"}

Job:
- Title: ${job?.job_title || job?.occupation_name || "N/A"}
- Skills: ${job?.skills || "N/A"}
- Location: ${job?.state || job?.location || "N/A"}
- Salary: ${job?.salary || "N/A"}
- Education: ${job?.education_level || "N/A"}

Match score: ${score ?? "N/A"}

Return ONLY valid JSON:
{"summary":"short paragraph","strengths":["..."],"gaps":["..."],"recommendation":"strong_match/good_match/potential_match/weak_match"}`;

            try {
              const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 500 }),
              });
              if (!aiRes.ok) {
                console.warn("[api/interview] explain_match OpenAI failed:", aiRes.status);
                return json({
                  ok: true,
                  explanation: {
                    summary: "Semantic AI match explanation is temporarily unavailable.",
                    strengths: [],
                    gaps: [],
                    recommendation: "Review job details and candidate skills manually.",
                  },
                });
              }
              const aiData = await aiRes.json();
              const text = aiData.choices?.[0]?.message?.content || "{}";
              try {
                const explanation = JSON.parse(text.replace(/```json|```/g, "").trim());
                return json({ ok: true, explanation });
              } catch {
                return json({ ok: true, explanation: { summary: text, strengths: [], gaps: [], recommendation: "Review details manually." } });
              }
            } catch (aiError) {
              console.warn("[api/interview] explain_match AI call failed:", aiError);
              return json({
                ok: true,
                explanation: {
                  summary: "Semantic AI match explanation is temporarily unavailable.",
                  strengths: [],
                  gaps: [],
                  recommendation: "Review job details and candidate skills manually.",
                },
              });
            }
          } catch (e) {
            console.warn("[api/interview] explain_match failed:", e);
            return json({
              ok: true,
              explanation: {
                summary: "Semantic AI match explanation is temporarily unavailable.",
                strengths: [],
                gaps: [],
                recommendation: "Review job details and candidate skills manually.",
              },
            });
          }
        }

        // ── Pre-auth: match_candidates_for_vacancy action ──────────────────
        // Given a vacancy_id, returns the best-matching candidates via pgvector.
        // No Authorization header required; safe fallback if candidate embeddings are missing.
        if (rawBody?.action === "match_candidates_for_vacancy") {
          try {
            const { vacancy_id, limit = 20 } = rawBody as { vacancy_id?: string; limit?: number };
            if (!vacancy_id || typeof vacancy_id !== "string") {
              return json({ ok: false, error: "vacancy_id is required" }, 400);
            }

            // 1. Load vacancy
            const { data: vacancy, error: vacancyError } = await (supabaseAdmin as any)
              .from("poc_vacancies")
              .select("*")
              .eq("id", vacancy_id)
              .maybeSingle();

            if (vacancyError || !vacancy) {
              return json({ ok: false, error: "Vacancy not found" }, 404);
            }

            // 2. Resolve vacancy embedding (generate and persist if missing)
            let embedding: number[] | null = vacancy.embedding ?? null;
            if (!embedding) {
              const text = buildVacancyEmbeddingText(vacancy);
              if (text && text.trim().length >= 3) {
                embedding = await createEmbedding(text.trim(), { AI_API_KEY: process.env.AI_API_KEY });
                if (embedding && embedding.length === 384) {
                  // Persist on-demand embedding so future calls succeed
                  const updatePayload = { embedding, embedding_updated_at: new Date().toISOString() };
                  const { error: persistError } = await (supabaseAdmin as any)
                    .from("poc_vacancies")
                    .update(updatePayload)
                    .eq("id", vacancy.id);
                  if (persistError) {
                    const vectorLiteral = "[" + embedding.join(",") + "]";
                    await (supabaseAdmin as any)
                      .from("poc_vacancies")
                      .update({ embedding: vectorLiteral, embedding_updated_at: new Date().toISOString() })
                      .eq("id", vacancy.id);
                  }
                }
              }
            }

            if (!embedding || embedding.length !== 384) {
              return json({
                ok: true,
                vacancy,
                candidates: [],
                warning: "Semantic candidate matching is not available for this vacancy yet. Please try another vacancy or run embedding sync.",
              });
            }

            // 3. Call match_candidates RPC
            try {
              const { data: matches, error: rpcError } = await (supabaseAdmin as any)
                .rpc("match_candidates", {
                  query_embedding: embedding,
                  match_limit: Math.min(Number(limit) || 20, 50),
                })
                .limit(Math.min(Number(limit) || 20, 50));

              if (rpcError) {
                console.warn("[api/interview] match_candidates RPC failed:", rpcError);
                return json({
                  ok: true,
                  vacancy,
                  candidates: [],
                  warning: "Candidate semantic matching unavailable; run candidate backfill",
                });
              }

              const candidates = Array.isArray(matches)
                ? matches.map((item: any) => ({
                    id: item.id ?? crypto.randomUUID(),
                    preferred_name: item.preferred_name ?? item.preferred_occupation ?? item.previous_occupation ?? null,
                    skills: item.skills ?? null,
                    previous_occupation: item.previous_occupation ?? null,
                    preferred_state: item.preferred_state ?? null,
                    preferred_salary: item.preferred_salary ?? null,
                    education_level: item.education_level ?? null,
                    institution: item.institution ?? null,
                    similarity: item.similarity ?? 0,
                    semanticScore: item.similarity ?? item.semantic_score ?? 0,
                  }))
                : [];

              return json({ ok: true, vacancy, candidates, warning: null });
            } catch (dbError) {
              console.warn("[api/interview] match_candidates_for_vacancy DB failed:", dbError);
              return json({
                ok: true,
                vacancy,
                candidates: [],
                warning: "Candidate semantic matching unavailable; run candidate backfill",
              });
            }
          } catch (e) {
            console.warn("[api/interview] match_candidates_for_vacancy failed:", e);
            return json({ ok: false, error: "Match failed" }, 500);
          }
        }

        // ── Pre-auth: analyze_skill_gap action ─────────────────────────────
        // Compares a candidate's skills against a vacancy's requirements and returns
        // a local + AI-enhanced gap analysis with training recommendations.
        if (rawBody?.action === "analyze_skill_gap") {
          try {
            let candidate = (rawBody as any).candidate;
            let vacancy = (rawBody as any).vacancy;
            const candidateId = (rawBody as any).candidate_id;
            const vacancyId = (rawBody as any).vacancy_id;
            const AI_API_KEY = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;

            if (!candidate && candidateId) {
              const { data, error } = await (supabaseAdmin as any)
                .from("poc_candidates")
                .select("*")
                .eq("id", candidateId)
                .maybeSingle();
              if (error) throw error;
              candidate = data;
            }

            if (!vacancy && vacancyId) {
              const { data, error } = await (supabaseAdmin as any)
                .from("poc_vacancies")
                .select("*")
                .eq("id", vacancyId)
                .maybeSingle();
              if (error) throw error;
              vacancy = data;
            }

            if (!candidate || !vacancy) {
              return json({ ok: false, error: "candidate and vacancy are required" }, 400);
            }

            const skillGap = await buildSkillGapResult(candidate, vacancy, AI_API_KEY);
            return json({
              ok: true,
              skillGap: {
                score: skillGap.score,
                matchedSkills: skillGap.matchedSkills,
                missingSkills: skillGap.missingSkills,
                transferableSkills: skillGap.transferableSkills,
                recommendedTraining: skillGap.recommendedTraining,
                summary: skillGap.summary,
                nextSteps: skillGap.nextSteps,
              },
            });
          } catch (e) {
            console.warn("[api/interview] analyze_skill_gap failed:", e);
            return json({ ok: false, error: "Skill gap analysis failed" }, 500);
          }
        }

        // ── Pre-auth: explain_candidate_match action ───────────────────────
        // Explains why a candidate is a good match for a vacancy. Returns structured
        // summary, strengths, gaps, fit notes, recommendation and confidence.
        // Falls back safely if AI fails.
        if (rawBody?.action === "explain_candidate_match") {
          try {
            let candidate = (rawBody as any).candidate;
            let vacancy = (rawBody as any).vacancy;
            const candidateId = (rawBody as any).candidate_id;
            const vacancyId = (rawBody as any).vacancy_id;
            let score = (rawBody as any).score;

            const AI_API_KEY = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;

            if (!candidate && candidateId) {
              const { data, error } = await (supabaseAdmin as any)
                .from("poc_candidates")
                .select("*")
                .eq("id", candidateId)
                .maybeSingle();
              if (error) throw error;
              candidate = data;
            }

            if (!vacancy && vacancyId) {
              const { data, error } = await (supabaseAdmin as any)
                .from("poc_vacancies")
                .select("*")
                .eq("id", vacancyId)
                .maybeSingle();
              if (error) throw error;
              vacancy = data;
            }

            if (!candidate || !vacancy) {
              return json({
                ok: true,
                explanation: {
                  summary: "Candidate and vacancy details are required for an explanation.",
                  strengths: [],
                  gaps: [],
                  skillGap: { matchedSkills: [], missingSkills: [], recommendedTraining: [] },
                  salaryFit: "unknown",
                  locationFit: "unknown",
                  experienceFit: "unknown",
                  recommendation: "Review details manually.",
                  confidence: 0,
                },
              });
            }

            const skillGap = await buildSkillGapResult(candidate, vacancy, AI_API_KEY);
            const fallback = {
              summary: `Candidate matches ${skillGap.score}% of required skills. ${skillGap.matchedSkills.length > 0 ? "Strengths include " + skillGap.matchedSkills.slice(0, 3).join(", ") + "." : "No direct skill matches found."}`,
              strengths: skillGap.matchedSkills.slice(0, 5),
              gaps: skillGap.missingSkills.slice(0, 5),
              skillGap: {
                matchedSkills: skillGap.matchedSkills,
                missingSkills: skillGap.missingSkills,
                recommendedTraining: skillGap.recommendedTraining,
              },
              salaryFit: "unknown",
              locationFit: "unknown",
              experienceFit: "unknown",
              recommendation: skillGap.score >= 70 ? "strong_match" : skillGap.score >= 50 ? "good_match" : skillGap.score >= 30 ? "potential_match" : "weak_match",
              confidence: skillGap.score,
            };

            if (!AI_API_KEY) {
              return json({ ok: true, explanation: fallback });
            }

            const prompt = `You are a Malaysian job matching explainer for PERKESO's employer/caseworker portal.

Candidate:
- Role: ${candidate?.preferred_occupation || candidate?.previous_occupation || "N/A"}
- Skills: ${Array.isArray(candidate?.skills) ? candidate.skills.join(", ") : candidate?.skills || "N/A"}
- Education: ${candidate?.education_level || "N/A"}
- Institution: ${candidate?.institution || "N/A"}
- Location: ${candidate?.preferred_state || "N/A"}
- Salary: ${candidate?.preferred_salary || "N/A"}
- Experience: ${candidate?.previous_years_experience || "N/A"}

Vacancy:
- Title: ${vacancy?.job_title || vacancy?.occupation_name || "N/A"}
- Skills: ${vacancy?.skills || "N/A"}
- Location: ${vacancy?.state || "N/A"}
- Salary: ${vacancy?.salary || "N/A"}
- Education: ${vacancy?.education_level || "N/A"}

Skill match score: ${skillGap.score}
Matched skills: ${skillGap.matchedSkills.join(", ") || "N/A"}
Missing skills: ${skillGap.missingSkills.join(", ") || "N/A"}
Match score: ${score ?? "N/A"}

Return ONLY valid JSON:
{"summary":"short paragraph","strengths":["..."],"gaps":["..."],"skillGap":{"matchedSkills":["..."],"missingSkills":["..."],"recommendedTraining":["..."]},"salaryFit":"...","locationFit":"...","experienceFit":"...","recommendation":"strong_match/good_match/potential_match/weak_match","confidence":0-100}`;

            try {
              const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: [{ role: "user", content: prompt }],
                  max_tokens: 700,
                }),
              });
              if (!aiRes.ok) {
                console.warn("[api/interview] explain_candidate_match OpenAI failed:", aiRes.status);
                return json({ ok: true, explanation: fallback });
              }
              const aiData = await aiRes.json();
              const text = aiData.choices?.[0]?.message?.content || "{}";
              try {
                const ai = JSON.parse(text.replace(/```json|```/g, "").trim());
                return json({
                  ok: true,
                  explanation: {
                    summary: ai.summary || fallback.summary,
                    strengths: Array.isArray(ai.strengths) ? ai.strengths : fallback.strengths,
                    gaps: Array.isArray(ai.gaps) ? ai.gaps : fallback.gaps,
                    skillGap: {
                      matchedSkills: Array.isArray(ai.skillGap?.matchedSkills) ? ai.skillGap.matchedSkills : fallback.skillGap.matchedSkills,
                      missingSkills: Array.isArray(ai.skillGap?.missingSkills) ? ai.skillGap.missingSkills : fallback.skillGap.missingSkills,
                      recommendedTraining: Array.isArray(ai.skillGap?.recommendedTraining) ? ai.skillGap.recommendedTraining : fallback.skillGap.recommendedTraining,
                    },
                    salaryFit: ai.salaryFit || fallback.salaryFit,
                    locationFit: ai.locationFit || fallback.locationFit,
                    experienceFit: ai.experienceFit || fallback.experienceFit,
                    recommendation: ai.recommendation || fallback.recommendation,
                    confidence: typeof ai.confidence === "number" ? ai.confidence : fallback.confidence,
                  },
                });
              } catch {
                return json({
                  ok: true,
                  explanation: { ...fallback, summary: text },
                });
              }
            } catch (aiError) {
              console.warn("[api/interview] explain_candidate_match AI call failed:", aiError);
              return json({ ok: true, explanation: fallback });
            }
          } catch (e) {
            console.warn("[api/interview] explain_candidate_match failed:", e);
            return json({
              ok: true,
              explanation: {
                summary: "Semantic AI match explanation is temporarily unavailable.",
                strengths: [],
                gaps: [],
                skillGap: { matchedSkills: [], missingSkills: [], recommendedTraining: [] },
                salaryFit: "unknown",
                locationFit: "unknown",
                experienceFit: "unknown",
                recommendation: "Review details manually.",
                confidence: 0,
              },
            });
          }
        }

        // ── Pre-auth: candidate_match_report action ──────────────────────────
        // One-stop report: candidate + vacancy + semantic score + skill gap + explanation.
        // Safe fallback at every step. No Authorization required.
        if (rawBody?.action === "candidate_match_report") {
          try {
            const { candidate_id, vacancy_id } = rawBody as { candidate_id?: string; vacancy_id?: string };
            if (!candidate_id || !vacancy_id) {
              return json({ ok: false, error: "candidate_id and vacancy_id are required" }, 400);
            }

            const [{ data: candidate, error: candidateError }, { data: vacancy, error: vacancyError }] = await Promise.all([
              (supabaseAdmin as any).from("poc_candidates").select("*").eq("id", candidate_id).maybeSingle(),
              (supabaseAdmin as any).from("poc_vacancies").select("*").eq("id", vacancy_id).maybeSingle(),
            ]);

            if (candidateError || vacancyError || !candidate || !vacancy) {
              return json({ ok: false, error: "Candidate or vacancy not found" }, 404);
            }

            const AI_API_KEY = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;

            // 1. Semantic score (if both embeddings exist)
            let semanticScore: number | null = null;
            try {
              if (candidate.embedding && vacancy.embedding) {
                const candEmbedding = Array.isArray(candidate.embedding) ? candidate.embedding : null;
                const vacEmbedding = Array.isArray(vacancy.embedding) ? vacancy.embedding : null;
                if (candEmbedding && vacEmbedding && candEmbedding.length === 384 && vacEmbedding.length === 384) {
                  const dot = candEmbedding.reduce((sum: number, val: number, i: number) => sum + val * vacEmbedding[i], 0);
                  const a = Math.sqrt(candEmbedding.reduce((sum: number, val: number) => sum + val * val, 0));
                  const b = Math.sqrt(vacEmbedding.reduce((sum: number, val: number) => sum + val * val, 0));
                  if (a > 0 && b > 0) semanticScore = Math.round((dot / (a * b)) * 100) / 100;
                }
              }
            } catch (e) {
              console.warn("[api/interview] candidate_match_report semantic score failed:", e);
            }

            // 2. Skill gap
            const skillGap = await buildSkillGapResult(candidate, vacancy, AI_API_KEY);

            // 3. Combined match score: blend skill gap with semantic score
            const matchScore = semanticScore != null
              ? Math.round(skillGap.score * 0.6 + semanticScore * 40)
              : skillGap.score;

            // 4. Explanation
            const explanation = {
              summary: `Candidate matches ${skillGap.score}% of required skills.`,
              strengths: skillGap.matchedSkills.slice(0, 5),
              gaps: skillGap.missingSkills.slice(0, 5),
              skillGap: {
                matchedSkills: skillGap.matchedSkills,
                missingSkills: skillGap.missingSkills,
                recommendedTraining: skillGap.recommendedTraining,
              },
              salaryFit: "unknown",
              locationFit: "unknown",
              experienceFit: "unknown",
              recommendation: matchScore >= 70 ? "strong_match" : matchScore >= 50 ? "good_match" : matchScore >= 30 ? "potential_match" : "weak_match",
              confidence: matchScore,
            };

            if (AI_API_KEY) {
              try {
                const prompt = `You are a Malaysian workforce matching advisor for PERKESO/Praxo.
Summarize this candidate-vacancy match in one short paragraph and list 2-4 strengths, 2-4 gaps, plus salary/location/experience fit and a recommendation.

Candidate: ${candidate.preferred_occupation || candidate.previous_occupation || "N/A"} | ${candidate.education_level || "N/A"} | ${candidate.preferred_state || "N/A"} | ${candidate.preferred_salary || "N/A"}
Vacancy: ${vacancy.job_title || vacancy.occupation_name || "N/A"} | ${vacancy.education_level || "N/A"} | ${vacancy.state || "N/A"} | ${vacancy.salary || "N/A"}
Skill match: ${skillGap.score}% | Matched: ${skillGap.matchedSkills.join(", ") || "N/A"} | Missing: ${skillGap.missingSkills.join(", ") || "N/A"}
Semantic similarity: ${semanticScore ?? "N/A"}

Return ONLY valid JSON:
{"summary":"...","strengths":["..."],"gaps":["..."],"salaryFit":"...","locationFit":"...","experienceFit":"...","recommendation":"strong_match/good_match/potential_match/weak_match","confidence":0-100}`;
                const res = await fetch("https://api.openai.com/v1/chat/completions", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 700 }),
                });
                if (res.ok) {
                  const data = await res.json();
                  const text = data.choices?.[0]?.message?.content || "{}";
                  try {
                    const ai = JSON.parse(text.replace(/```json|```/g, "").trim());
                    explanation.summary = ai.summary || explanation.summary;
                    explanation.strengths = Array.isArray(ai.strengths) ? ai.strengths : explanation.strengths;
                    explanation.gaps = Array.isArray(ai.gaps) ? ai.gaps : explanation.gaps;
                    explanation.salaryFit = ai.salaryFit || explanation.salaryFit;
                    explanation.locationFit = ai.locationFit || explanation.locationFit;
                    explanation.experienceFit = ai.experienceFit || explanation.experienceFit;
                    explanation.recommendation = ai.recommendation || explanation.recommendation;
                    if (typeof ai.confidence === "number") explanation.confidence = ai.confidence;
                  } catch {}
                }
              } catch (e) {
                console.warn("[api/interview] candidate_match_report AI failed:", e);
              }
            }

            return json({
              ok: true,
              candidate,
              vacancy,
              semanticScore,
              matchScore,
              skillGap: {
                score: skillGap.score,
                matchedSkills: skillGap.matchedSkills,
                missingSkills: skillGap.missingSkills,
                transferableSkills: skillGap.transferableSkills,
                recommendedTraining: skillGap.recommendedTraining,
                summary: skillGap.summary,
                nextSteps: skillGap.nextSteps,
              },
              explanation,
              sources: [
                { type: "candidate", id: candidate_id, label: `Candidate #${String(candidate_id).slice(0, 8)}` },
                { type: "vacancy",   id: vacancy_id,   label: `Vacancy #${String(vacancy_id).slice(0, 8)} — ${vacancy.job_title ?? vacancy.occupation_name ?? "Role"}` },
                ...(vacancy.occupation_name ? [{ type: "taxonomy", id: `MASCO`, label: `Taxonomy: ${vacancy.occupation_name}` }] : []),
              ],
            });
          } catch (e) {
            console.warn("[api/interview] candidate_match_report failed:", e);
            return json({ ok: false, error: "Match report failed" }, 500);
          }
        }

        // ── Auth: verify the Supabase access token ──────────────────────────
        const authHeader = request.headers.get("Authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (!token) return json({ error: "Missing Authorization header" }, 401);

        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        const user = userData?.user;
        if (userErr || !user) return json({ error: "Invalid or expired token" }, 401);

        // ── Parse body ──────────────────────────────────────────────────────
        let body: z.infer<typeof ActionSchema>;
        try {
          body = ActionSchema.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid request body: " + String(e) }, 400);
        }

        console.log("[api/interview] action:", body.action, "user:", user.id);

        try {
          switch (body.action) {
            // ── get_session ────────────────────────────────────────────────
            case "get_session": {
              const { data: session, error } = await supabaseAdmin
                .from("interview_sessions")
                .select("*")
                .eq("id", body.session_id)
                .eq("user_id", user.id)
                .maybeSingle();
              if (error) return json({ error: error.message }, 500);
              return json({ session });
            }

            // ── generate_question ──────────────────────────────────────────
            case "generate_question": {
              const { data: session, error: sErr } = await supabaseAdmin
                .from("interview_sessions")
                .select("*")
                .eq("id", body.session_id)
                .eq("user_id", user.id)
                .single();
              if (sErr || !session) return json({ error: "Session not found." }, 404);

              const { data: prevResponses } = await supabaseAdmin
                .from("interview_responses")
                .select("question_number, question_text, answer_text")
                .eq("session_id", body.session_id)
                .order("question_number", { ascending: true });

              const prevQA = (prevResponses ?? [])
                .filter((r) => r.answer_text)
                .map((r) => `Q${r.question_number}: ${r.question_text}\nA: ${r.answer_text}`)
                .join("\n\n");

              const systemPrompt = `You are an expert Malaysian job interviewer. You are conducting a ${session.interview_type} interview for the role of ${session.role_title} at a ${session.company_type} company in the ${session.industry} industry.

This is question ${body.question_number} of ${session.total_questions}.

${prevQA ? `Previous Q&A in this interview:\n${prevQA}\n\n` : ""}Generate the next interview question. Make it:
- Appropriate for ${session.experience_level} level candidates
- Relevant to Malaysian workplace culture and expectations
- Progressive (build on previous answers if available)
- ${session.interview_type}-focused (behavioral = STAR method, technical = problem-solving, competency = skills demonstration)

Return ONLY the question text, nothing else. Keep it concise (1-2 sentences).`;

              const { text } = await callAi({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: systemPrompt }],
                busyMessage: "Generating your next interview question…",
              });

              const questionText = text?.trim() ?? "Tell me about yourself and what draws you to this role.";

              const { data: response, error: rErr } = await supabaseAdmin
                .from("interview_responses")
                .insert({
                  session_id: body.session_id,
                  question_number: body.question_number,
                  question_text: questionText,
                  answer_text: null,
                })
                .select("id")
                .single();
              if (rErr || !response) return json({ error: "Failed to save question." }, 500);

              await supabaseAdmin
                .from("interview_sessions")
                .update({ current_question: body.question_number, status: "in_progress" })
                .eq("id", body.session_id);

              return json({ question: questionText, response_id: response.id });
            }

            // ── submit_answer ──────────────────────────────────────────────
            case "submit_answer": {
              const { data: response, error: rErr } = await supabaseAdmin
                .from("interview_responses")
                .select("*, interview_sessions!inner(role_title, company_type, industry, experience_level, user_id)")
                .eq("id", body.response_id)
                .single();
              if (rErr || !response) return json({ error: "Response not found." }, 404);
              const session = (response as any).interview_sessions;
              if (session.user_id !== user.id) return json({ error: "Unauthorized." }, 403);

              const SCORE_TOOL = {
                type: "function" as const,
                function: {
                  name: "score_interview_answer",
                  description: "Score a candidate's interview answer",
                  parameters: {
                    type: "object",
                    properties: {
                      score: { type: "number", description: "Score 0-100" },
                      strengths: { type: "array", items: { type: "string" } },
                      improvements: { type: "array", items: { type: "string" } },
                      competencies_demonstrated: { type: "array", items: { type: "string" } },
                    },
                    required: ["score", "strengths", "improvements", "competencies_demonstrated"],
                  },
                },
              };

              const { toolArgs } = await callAi({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "user",
                    content: `You are scoring a candidate's interview answer for a Malaysian job market context.

Role: ${session.role_title}
Company: ${session.company_type}, ${session.industry}
Question: ${(response as any).question_text}
Answer: ${body.answer_text}

Score this answer 0-100 and provide brief feedback. Consider:
- Relevance to the question
- Depth and specificity
- Communication clarity
- Malaysian workplace context awareness`,
                  },
                ],
                tool: SCORE_TOOL,
                busyMessage: "Scoring your answer…",
              });

              const feedback = toolArgs as { score: number; strengths: string[]; improvements: string[]; competencies_demonstrated: string[] };

              await supabaseAdmin
                .from("interview_responses")
                .update({
                  answer_text: body.answer_text,
                  score: Math.round(feedback.score),
                  feedback: feedback as unknown as never,
                  model_used: "gpt-4o-mini",
                })
                .eq("id", body.response_id);

              return json({ score: Math.round(feedback.score), feedback });
            }

            // ── complete ───────────────────────────────────────────────────
            case "complete": {
              const { data: session, error: sErr } = await supabaseAdmin
                .from("interview_sessions")
                .select("*")
                .eq("id", body.session_id)
                .eq("user_id", user.id)
                .single();
              if (sErr || !session) return json({ error: "Session not found." }, 404);

              const { data: responses } = await supabaseAdmin
                .from("interview_responses")
                .select("*")
                .eq("session_id", body.session_id)
                .order("question_number", { ascending: true });

              const allQA = (responses ?? [])
                .map((r) => `Q${r.question_number} (Score: ${r.score ?? "N/A"}): ${r.question_text}\nAnswer: ${r.answer_text ?? "(no answer)"}`)
                .join("\n\n");

              const SUMMARY_TOOL = {
                type: "function" as const,
                function: {
                  name: "generate_interview_assessment",
                  description: "Generate comprehensive interview assessment",
                  parameters: {
                    type: "object",
                    properties: {
                      overall_score: { type: "number" },
                      strengths: { type: "array", items: { type: "string" } },
                      weaknesses: { type: "array", items: { type: "string" } },
                      competency_scores: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            score: { type: "number" },
                            evidence: { type: "string" },
                          },
                          required: ["name", "score", "evidence"],
                        },
                      },
                      hiring_recommendation: {
                        type: "string",
                        enum: ["strong_hire", "hire", "maybe", "no_hire"],
                      },
                      summary: { type: "string" },
                      improvement_areas: { type: "array", items: { type: "string" } },
                    },
                    required: ["overall_score", "strengths", "weaknesses", "competency_scores", "hiring_recommendation", "summary", "improvement_areas"],
                  },
                },
              };

              const { toolArgs } = await callAi({
                model: "gpt-4o",
                messages: [
                  {
                    role: "user",
                    content: `You are generating a comprehensive interview assessment for a Malaysian job market context.

Role: ${session.role_title} at ${session.company_type} (${session.industry})
Experience Level: ${session.experience_level}
Interview type: ${session.interview_type}

Questions and answers with individual scores:
${allQA}

Generate a complete, fair, and actionable interview assessment.`,
                  },
                ],
                tool: SUMMARY_TOOL,
                busyMessage: "Generating your interview assessment…",
              });

              const summary = toolArgs as { overall_score: number };

              const finalSummary = body.proctoring
                ? { ...(summary as object), proctoring: body.proctoring }
                : summary;

              await supabaseAdmin
                .from("interview_sessions")
                .update({
                  status: "completed",
                  overall_score: Math.round(summary.overall_score),
                  ai_summary: finalSummary as unknown as never,
                  model_used: "gpt-4o",
                })
                .eq("id", body.session_id);

              // Notify jobseeker that their interview result is ready
              await insertNotification({
                user_id: user.id,
                title: "Interview Complete",
                message: `Your AI interview for ${session.role_title} is complete. Overall score: ${Math.round(summary.overall_score)}/100.`,
                type: "success",
                link: `/interview/${body.session_id}/summary`,
                metadata: { session_id: body.session_id, score: Math.round(summary.overall_score) },
              });

              return json({ summary });
            }

            // ── generate_avatar (D-ID) ─────────────────────────────────────
            case "generate_avatar": {
              const apiKey = process.env.DID_API_KEY;
              if (!apiKey) {
                console.log("[api/interview] DID_API_KEY not set, skipping D-ID");
                return json({ videoUrl: null });
              }

              const DID_BASE = "https://api.d-id.com";
              const DID_PRESENTERS = {
                female: { url: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",  voice: "en-US-JennyNeural" },
                male:   { url: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/noelle.jpg", voice: "en-US-DavisNeural" },
              } as const;
              const presenterKey = (body.presenter === "male" ? "male" : "female") as "female" | "male";
              const presenter = DID_PRESENTERS[presenterKey];
              const voiceId = body.voice_id ?? presenter.voice;

              let talkId: string;
              try {
                const createRes = await fetch(`${DID_BASE}/talks`, {
                  method: "POST",
                  headers: {
                    Authorization: `Basic ${apiKey}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                  },
                  body: JSON.stringify({
                    source_url: presenter.url,
                    script: {
                      type: "text",
                      input: body.text,
                      provider: { type: "microsoft", voice_id: voiceId },
                    },
                    config: { fluent: true, pad_audio: 0.5, stitch: true },
                    driver_url: "bank://lively",
                  }),
                });
                if (!createRes.ok) {
                  console.error("[api/interview] D-ID create failed:", await createRes.text());
                  return json({ videoUrl: null, error: "D-ID creation failed" });
                }
                talkId = ((await createRes.json()) as { id: string }).id;
              } catch (e) {
                console.error("[api/interview] D-ID network error:", e);
                return json({ videoUrl: null, error: "D-ID network error" });
              }

              // Poll every 1.5 seconds for up to 30 seconds (20 attempts)
              for (let i = 0; i < 20; i++) {
                await new Promise((r) => setTimeout(r, 1500));
                try {
                  const pollRes = await fetch(`${DID_BASE}/talks/${talkId}`, {
                    headers: { Authorization: `Basic ${apiKey}`, Accept: "application/json" },
                  });
                  if (!pollRes.ok) continue;
                  const talk = (await pollRes.json()) as { status: string; result_url?: string };
                  if (talk.status === "done" && talk.result_url) {
                    console.log("[api/interview] D-ID video ready:", talk.result_url);
                    return json({ videoUrl: talk.result_url });
                  }
                  if (talk.status === "error") {
                    console.error("[api/interview] D-ID processing error");
                    return json({ videoUrl: null, error: "D-ID processing error" });
                  }
                } catch (e) {
                  console.error("[api/interview] D-ID polling error:", e);
                  // keep polling
                }
              }
              console.log("[api/interview] D-ID timeout after 30 seconds");
              return json({ videoUrl: null, error: "D-ID timeout" });
            }

            // ── generate_speech (OpenAI TTS) ───────────────────────────────
            case "generate_speech": {
              const AI_API_KEY = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;
              if (!AI_API_KEY) return json({ audio: null });

              const res = await fetch("https://api.openai.com/v1/audio/speech", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${AI_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "tts-1",
                  input: body.text,
                  voice: body.voice ?? "nova",
                  response_format: "mp3",
                }),
              });
              if (!res.ok) {
                console.error("[api/interview] TTS error:", res.status);
                return json({ audio: null });
              }
              const audioBuffer = await res.arrayBuffer();
              const bytes = new Uint8Array(audioBuffer);
              let binary = "";
              for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
              return json({ audio: btoa(binary) });
            }

            // ── start_invited ──────────────────────────────────────────────
            case "start_invited": {
              const { data: inv, error: iErr } = await supabaseAdmin
                .from("interview_invitations")
                .select("*")
                .eq("id", body.invitation_id)
                .eq("candidate_id", user.id)
                .single();
              if (iErr || !inv) return json({ error: "Invitation not found or unauthorized." }, 404);
              if (inv.status === "completed") return json({ error: "Interview already completed." }, 400);

              await supabaseAdmin
                .from("interview_invitations")
                .update({ status: "in_progress", started_at: new Date().toISOString() })
                .eq("id", body.invitation_id);

              const { data: template } = await supabaseAdmin
                .from("interview_templates")
                .select("*")
                .eq("id", inv.template_id)
                .single();

              const { data: questions } = await supabaseAdmin
                .from("interview_template_questions")
                .select("*")
                .eq("template_id", inv.template_id)
                .order("question_number", { ascending: true });

              return json({ invitation_id: body.invitation_id, template, questions: questions ?? [] });
            }

            // ── score_invited_answer ───────────────────────────────────────
            case "score_invited_answer": {
              const { data: inv, error: iErr } = await supabaseAdmin
                .from("interview_invitations")
                .select("template_id")
                .eq("id", body.invitation_id)
                .eq("candidate_id", user.id)
                .single();
              if (iErr || !inv) return json({ error: "Invitation not found or unauthorized." }, 404);

              const { data: question } = await supabaseAdmin
                .from("interview_template_questions")
                .select("question_text, question_type, scoring_criteria")
                .eq("id", body.question_id)
                .eq("template_id", inv.template_id)
                .single();
              if (!question) return json({ error: "Question not found." }, 404);

              const { data: template } = await supabaseAdmin
                .from("interview_templates")
                .select("role_title, company_name, industry")
                .eq("id", inv.template_id)
                .single();

              const SCORE_TOOL = {
                type: "function" as const,
                function: {
                  name: "score_interview_answer",
                  description: "Score a candidate interview answer",
                  parameters: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      strengths: { type: "array", items: { type: "string" } },
                      improvements: { type: "array", items: { type: "string" } },
                      competencies_demonstrated: { type: "array", items: { type: "string" } },
                    },
                    required: ["score", "strengths", "improvements", "competencies_demonstrated"],
                  },
                },
              };

              const criteriaNote = question.scoring_criteria
                ? `\n\nEmployer's scoring criteria: ${question.scoring_criteria}` : "";

              const { toolArgs } = await callAi({
                model: "gpt-4o-mini",
                messages: [{
                  role: "user",
                  content: `Score this interview answer for Malaysian job market context.
Role: ${template?.role_title ?? "Unknown"} at ${template?.company_name ?? "Unknown"} (${template?.industry ?? ""})
Question type: ${question.question_type ?? "open"}
Question: ${question.question_text}
Answer: ${body.answer_text}${criteriaNote}
Score 0-100. Apply employer criteria if provided.`,
                }],
                tool: SCORE_TOOL,
                busyMessage: "Scoring your answer…",
              });

              const fb = toolArgs as { score: number; strengths: string[]; improvements: string[]; competencies_demonstrated: string[] };

              await supabaseAdmin
                .from("invitation_responses")
                .upsert({
                  invitation_id: body.invitation_id,
                  question_id: body.question_id,
                  question_number: body.question_number,
                  answer_text: body.answer_text,
                  score: Math.round(fb.score),
                  feedback: fb as unknown as never,
                }, { onConflict: "invitation_id,question_id" });

              return json({ score: Math.round(fb.score), feedback: fb });
            }

            // ── complete_invited ───────────────────────────────────────────
            case "complete_invited": {
              const { data: inv, error: iErr } = await supabaseAdmin
                .from("interview_invitations")
                .select("template_id")
                .eq("id", body.invitation_id)
                .eq("candidate_id", user.id)
                .single();
              if (iErr || !inv) return json({ error: "Invitation not found or unauthorized." }, 404);

              const { data: template } = await supabaseAdmin
                .from("interview_templates")
                .select("role_title, company_name, industry, interview_type, experience_level")
                .eq("id", inv.template_id)
                .single();

              const { data: responses } = await supabaseAdmin
                .from("invitation_responses")
                .select("*, interview_template_questions!inner(question_text)")
                .eq("invitation_id", body.invitation_id)
                .order("question_number", { ascending: true });

              const allQA = (responses ?? [])
                .map((r) => `Q${r.question_number} (Score: ${r.score ?? "N/A"}): ${(r as any).interview_template_questions?.question_text ?? ""}\nAnswer: ${r.answer_text ?? "(no answer)"}`)
                .join("\n\n");

              const SUMMARY_TOOL = {
                type: "function" as const,
                function: {
                  name: "generate_interview_assessment",
                  description: "Generate comprehensive interview assessment",
                  parameters: {
                    type: "object",
                    properties: {
                      overall_score: { type: "number" },
                      strengths: { type: "array", items: { type: "string" } },
                      weaknesses: { type: "array", items: { type: "string" } },
                      competency_scores: { type: "array", items: { type: "object", properties: { name: { type: "string" }, score: { type: "number" }, evidence: { type: "string" } }, required: ["name", "score", "evidence"] } },
                      hiring_recommendation: { type: "string", enum: ["strong_hire", "hire", "maybe", "no_hire"] },
                      summary: { type: "string" },
                      improvement_areas: { type: "array", items: { type: "string" } },
                    },
                    required: ["overall_score", "strengths", "weaknesses", "competency_scores", "hiring_recommendation", "summary", "improvement_areas"],
                  },
                },
              };

              const { toolArgs } = await callAi({
                model: "gpt-4o",
                messages: [{
                  role: "user",
                  content: `Generate a comprehensive interview assessment for Malaysian job market context.
Role: ${template?.role_title ?? "Unknown"} at ${template?.company_name ?? "Unknown"} (${template?.industry ?? ""})
Experience Level: ${template?.experience_level ?? "Not specified"}
Interview type: ${template?.interview_type ?? "general"}

Questions and answers:
${allQA}

Generate a complete, fair assessment with hiring recommendation.`,
                }],
                tool: SUMMARY_TOOL,
                busyMessage: "Generating assessment…",
              });

              const summary = toolArgs as { overall_score: number };
              const finalSummary = body.proctoring
                ? { ...(summary as object), proctoring: body.proctoring }
                : summary;

              await supabaseAdmin
                .from("interview_invitations")
                .update({
                  status: "completed",
                  completed_at: new Date().toISOString(),
                  overall_score: Math.round((summary as any).overall_score ?? 0),
                  ai_summary: finalSummary as unknown as never,
                })
                .eq("id", body.invitation_id);

              // Notify the jobseeker their invited interview result is ready
              await insertNotification({
                user_id: user.id,
                title: "Interview Complete",
                message: `Your interview for ${template?.role_title ?? "the role"} at ${template?.company_name ?? "the company"} is complete. Score: ${Math.round((summary as any).overall_score ?? 0)}/100.`,
                type: "success",
                link: "/dashboard",
                metadata: { invitation_id: body.invitation_id, score: Math.round((summary as any).overall_score ?? 0) },
              });

              // Notify the employer that the candidate completed the interview.
              // interview_templates no longer has created_by; use template.employer_id if available.
              try {
                const employerId = (template as any)?.employer_id ?? (template as any)?.created_by;
                if (employerId) {
                  await insertNotification({
                    user_id: employerId,
                    title: "Candidate Completed Interview",
                    message: `A candidate has completed the AI interview for ${template?.role_title ?? "your role"}. Score: ${Math.round((summary as any).overall_score ?? 0)}/100.`,
                    type: "info",
                    link: "/employer/dashboard",
                    metadata: { invitation_id: body.invitation_id, score: Math.round((summary as any).overall_score ?? 0) },
                  });
                }
              } catch { /* ignore */ }

              return json({ summary: finalSummary, company_name: template?.company_name ?? "the company" });
            }

            // ── create_invitation_from_template ───────────────────────────────
            case "create_invitation_from_template": {
              // Check if template exists. is_active column is not currently present.
              const { data: template, error: tErr } = await supabaseAdmin
                .from("interview_templates")
                .select("id, employer_id")
                .eq("id", body.template_id)
                .single();

              if (tErr || !template) return json({ error: "Template not found." }, 404);

              // Create invitation
              const { data: invitation, error: iErr } = await supabaseAdmin
                .from("interview_invitations")
                .insert({
                  template_id: body.template_id,
                  candidate_id: user.id,
                  status: "pending",
                  created_at: new Date().toISOString(),
                })
                .select("id")
                .single();

              if (iErr || !invitation) return json({ error: "Failed to create invitation." }, 500);

              return json({ invitation_id: invitation.id });
            }

            // ── start_simli_session ───────────────────────────────────────────
            case "start_simli_session": {
              const SIMLI_API_KEY = process.env.SIMLI_API_KEY;
              if (!SIMLI_API_KEY) return json({ error: "Simli API key not configured" }, 500);

              try {
                const response = await fetch("https://api.simli.ai/startAudioToVideoSession", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-simli-api-key": SIMLI_API_KEY,
                  },
                  body: JSON.stringify({
                    faceId: body.face_id,
                    handleSilence: true,
                    maxSessionLength: 1800,
                    maxIdleTime: 120,
                  }),
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error("[api/interview] Simli API error:", response.status, errorText);
                  return json({ error: "Failed to start Simli session" }, response.status);
                }

                const sessionData = await response.json();
                return json({ session: sessionData });
              } catch (error) {
                console.error("[api/interview] Simli session error:", error);
                return json({ error: "Failed to start Simli session" }, 500);
              }
            }
          }
        } catch (e: any) {
          console.error("[api/interview] error:", e);
          return json({ error: e?.message ?? String(e) }, 500);
        }
      },
    },
  },
});
