import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAi } from "./ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ─── Education level ordering for compatibility filtering ─────────────────────
const EDU_RANK: Record<string, number> = {
  "NO FORMAL EDUCATION": 0,
  "PRIMARY SCHOOL": 1,
  "LOWER SECONDARY": 2,
  "UPPER SECONDARY / SPM OR EQUIVALENT": 3,
  "CERTIFICATE": 4,
  "DIPLOMA/ADVANCE DIPLOMA/HIGHER GRADUATE DIPLOMA/DVM/DKM LEVEL 4 AND LEVEL 5": 5,
  "BACHELOR'S OR EQUIVALENT": 6,
  "MASTER'S OR EQUIVALENT": 7,
  "DOCTORAL OR EQUIVALENT": 8,
};

function eduRank(level: string | null): number {
  if (!level) return 0;
  const upper = level.toUpperCase().trim();
  for (const [k, v] of Object.entries(EDU_RANK)) {
    if (upper.includes(k) || k.includes(upper)) return v;
  }
  return 3;
}

function skillOverlapCount(candidateSkills: string | null, vacancySkills: string | null): number {
  if (!candidateSkills || !vacancySkills) return 0;
  const cSet = new Set(candidateSkills.toLowerCase().split(",").map((s) => s.trim()));
  const vArr = vacancySkills.toLowerCase().split(",").map((s) => s.trim());
  return vArr.filter((s) => cSet.has(s)).length;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const MatchCandidateSchema = z.object({
  candidate_id: z.string(),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

const MatchJobSchema = z.object({
  vacancy_id: z.string(),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

const GetExplanationSchema = z.object({
  candidate_id: z.string(),
  vacancy_id: z.string(),
});

// ─── AI tool schema ───────────────────────────────────────────────────────────
const MATCH_TOOL = {
  type: "function" as const,
  function: {
    name: "return_matches",
    description: "Return scored match results for candidate-vacancy pairs",
    parameters: {
      type: "object",
      properties: {
        matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              vacancy_id: { type: "string" },
              match_score: { type: "number" },
              skill_match_score: { type: "number" },
              education_match_score: { type: "number" },
              salary_match_score: { type: "number" },
              location_match_score: { type: "number" },
              experience_match_score: { type: "number" },
              explanation: { type: "string" },
              matched_skills: { type: "array", items: { type: "string" } },
              transferable_skills: { type: "array", items: { type: "string" } },
              skill_gaps: { type: "array", items: { type: "string" } },
              taxonomy_relationship: { type: "string" },
            },
            required: ["vacancy_id", "match_score", "explanation"],
          },
        },
      },
      required: ["matches"],
    },
  },
};

const CANDIDATE_MATCH_TOOL = {
  type: "function" as const,
  function: {
    name: "return_candidate_matches",
    description: "Return scored match results for vacancy-candidate pairs",
    parameters: {
      type: "object",
      properties: {
        matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              candidate_id: { type: "string" },
              match_score: { type: "number" },
              skill_match_score: { type: "number" },
              education_match_score: { type: "number" },
              salary_match_score: { type: "number" },
              location_match_score: { type: "number" },
              experience_match_score: { type: "number" },
              explanation: { type: "string" },
              matched_skills: { type: "array", items: { type: "string" } },
              transferable_skills: { type: "array", items: { type: "string" } },
              skill_gaps: { type: "array", items: { type: "string" } },
              taxonomy_relationship: { type: "string" },
            },
            required: ["candidate_id", "match_score", "explanation"],
          },
        },
      },
      required: ["matches"],
    },
  },
};

// ─── 1. matchCandidateToJobs ──────────────────────────────────────────────────
export const matchCandidateToJobs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MatchCandidateSchema.parse(input))
  .handler(async ({ data }) => {
    const { candidate_id, limit } = data;

    // Load candidate
    const { data: candidate, error: cErr } = await supabaseAdmin
      .from("poc_candidates")
      .select("*")
      .eq("id", candidate_id)
      .single();
    if (cErr || !candidate) throw new Error(`Candidate ${candidate_id} not found`);

    // Load behaviour
    const { data: behaviour } = await supabaseAdmin
      .from("poc_behaviour")
      .select("*")
      .eq("candidate_id", candidate_id)
      .maybeSingle();

    // Load recent activity (last 50)
    const { data: activity } = await supabaseAdmin
      .from("poc_activity_log")
      .select("activity_name, activity_date, job_title, occupation_name, state")
      .eq("candidate_id", candidate_id)
      .order("activity_date", { ascending: false })
      .limit(50);

    // Pre-filter vacancies by education + salary + state
    const candRank = eduRank(candidate.education_level);
    let query = supabaseAdmin
      .from("poc_vacancies")
      .select("id, job_title, occupation_name, education_level, salary, salary_min, salary_max, state, skills, field_of_study")
      .limit(500);

    // Salary overlap: candidate min <= vacancy max AND candidate max >= vacancy min
    if (candidate.salary_min != null && candidate.salary_max != null) {
      query = query
        .lte("salary_min", candidate.salary_max)
        .gte("salary_max", candidate.salary_min);
    }

    const { data: preFiltered } = await query;
    let filtered = (preFiltered ?? []).filter((v) => {
      // Education: candidate rank >= vacancy rank
      if (candRank < eduRank(v.education_level)) return false;
      // State: if candidate has preferred state, match or allow null vacancy state
      if (candidate.preferred_state && v.state && v.state !== candidate.preferred_state) return false;
      return true;
    });

    // Sort by skill overlap, take top 20 for AI
    const ranked = filtered
      .map((v) => ({ ...v, _overlap: skillOverlapCount(candidate.skills, v.skills) }))
      .sort((a, b) => b._overlap - a._overlap)
      .slice(0, 20);

    if (ranked.length === 0) {
      return { matches: [], candidate, behaviour, error: "No compatible vacancies found after pre-filtering." };
    }

    // Check cache for already-scored pairs
    const vacIds = ranked.map((v) => v.id);
    const { data: cached } = await supabaseAdmin
      .from("poc_match_results")
      .select("*")
      .eq("candidate_id", candidate_id)
      .in("vacancy_id", vacIds);
    const cachedMap = new Map((cached ?? []).map((r: Record<string, unknown>) => [r.vacancy_id as string, r]));

    const toScore = ranked.filter((v) => !cachedMap.has(v.id));

    let aiMatches: Record<string, unknown>[] = [];

    if (toScore.length > 0) {
      // Format activity for prompt
      const activityText = (activity ?? [])
        .slice(0, 20)
        .map((a) => `[${a.activity_date?.slice(0, 10) ?? "?"}] ${a.activity_name} — ${a.job_title ?? a.occupation_name ?? ""} (${a.state ?? ""})`)
        .join("\n");

      const vacanciesText = toScore
        .map((v) => `ID: ${v.id} | ${v.job_title} (${v.occupation_name}) | Edu: ${v.education_level} | Salary: ${v.salary} | State: ${v.state ?? "Any"} | Skills: ${v.skills ?? "N/A"}`)
        .join("\n");

      const prompt = `You are an AI employment matching specialist for PERKESO Malaysia's job portal.

CANDIDATE PROFILE:
- ID: ${candidate.id}
- Education: ${candidate.education_level ?? "N/A"} in ${candidate.nec_1d ?? "N/A"} / ${candidate.nec_2d ?? "N/A"}
- Institution: ${candidate.institution ?? "N/A"}
- Preferred Role: ${candidate.preferred_occupation ?? "N/A"}
- Previous Role: ${candidate.previous_occupation ?? "N/A"} (${candidate.previous_years_experience ?? "0"} yrs exp)
- Preferred Salary: ${candidate.preferred_salary ?? "N/A"}
- Preferred Location: ${candidate.preferred_state ?? "Any"}
- Skills: ${candidate.skills ?? "N/A"}

BEHAVIOURAL DATA:
- Job searches: ${behaviour?.job_search_count ?? 0}
- Applications submitted: ${behaviour?.submitted_application_count ?? 0}
- Interviews attended: ${behaviour?.interview_count ?? 0}
- Job offers received: ${behaviour?.job_offer_count ?? 0}
- Report for duty: ${behaviour?.report_for_duty_count ?? 0}

RECENT ACTIVITY (last 20 actions):
${activityText || "No recent activity"}

VACANCIES TO SCORE (${toScore.length} pre-filtered by education, salary, location):
${vacanciesText}

For each vacancy, provide a precise match assessment using Malaysian job market context (GLCs, MNCs, SMEs, bilingual expectations, state-level markets). Score 0-100.`;

      try {
        const result = await callAi({
          model: "gpt-5.4",
          messages: [{ role: "user", content: prompt }],
          tool: MATCH_TOOL,
          busyMessage: "The matching engine is busy. Please try again in a moment.",
        });

        const raw = result.toolArgs as { matches?: Record<string, unknown>[] } | null;
        aiMatches = raw?.matches ?? [];

        // Save new results to cache
        if (aiMatches.length > 0) {
          const rows = aiMatches.map((m) => ({
            candidate_id,
            vacancy_id: m.vacancy_id as string,
            match_score: m.match_score as number,
            skill_match_score: (m.skill_match_score as number) ?? null,
            education_match_score: (m.education_match_score as number) ?? null,
            salary_match_score: (m.salary_match_score as number) ?? null,
            location_match_score: (m.location_match_score as number) ?? null,
            experience_match_score: (m.experience_match_score as number) ?? null,
            explanation: m.explanation as string,
            matched_skills: m.matched_skills ?? [],
            transferable_skills: m.transferable_skills ?? [],
            skill_gaps: m.skill_gaps ?? [],
            taxonomy_relationship: (m.taxonomy_relationship as string) ?? null,
            model_used: "gpt-5.4",
          }));
          await supabaseAdmin.from("poc_match_results").upsert(rows, { onConflict: "candidate_id,vacancy_id" }).throwOnError().catch((e: Error) => {
            console.error("[matchCandidateToJobs] cache save failed:", e.message);
          });
        }
      } catch (e) {
        console.error("[matchCandidateToJobs] AI call failed:", e);
      }
    }

    // Merge AI results with cached results
    const allScoredMap = new Map<string, Record<string, unknown>>();
    for (const c of cached ?? []) allScoredMap.set(c.vacancy_id as string, c as Record<string, unknown>);
    for (const m of aiMatches) allScoredMap.set(m.vacancy_id as string, m);

    // Enrich with vacancy metadata
    const vacancyMeta = new Map(ranked.map((v) => [v.id, v]));
    const matches = Array.from(allScoredMap.values())
      .map((m) => ({ ...m, vacancy: vacancyMeta.get(m.vacancy_id as string) ?? null }))
      .filter((m) => m.vacancy)
      .sort((a, b) => (b.match_score as number) - (a.match_score as number))
      .slice(0, limit);

    return { matches, candidate, behaviour, error: null };
  });

// ─── 2. matchJobToCandidates ──────────────────────────────────────────────────
export const matchJobToCandidates = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MatchJobSchema.parse(input))
  .handler(async ({ data }) => {
    const { vacancy_id, limit } = data;

    // Load vacancy
    const { data: vacancy, error: vErr } = await supabaseAdmin
      .from("poc_vacancies")
      .select("*")
      .eq("id", vacancy_id)
      .single();
    if (vErr || !vacancy) throw new Error(`Vacancy ${vacancy_id} not found`);

    const vacRank = eduRank(vacancy.education_level);

    // Pre-filter candidates by education + salary + state
    let query = supabaseAdmin
      .from("poc_candidates")
      .select("id, education_level, nec_1d, nec_2d, preferred_occupation, previous_occupation, previous_years_experience, preferred_salary, salary_min, salary_max, preferred_state, skills, institution")
      .limit(500);

    if (vacancy.salary_min != null && vacancy.salary_max != null) {
      query = query
        .lte("salary_min", vacancy.salary_max)
        .gte("salary_max", vacancy.salary_min);
    }

    const { data: preFiltered } = await query;
    let filtered = (preFiltered ?? []).filter((c) => {
      if (eduRank(c.education_level) < vacRank) return false;
      if (vacancy.state && c.preferred_state && c.preferred_state !== vacancy.state) return false;
      return true;
    });

    // Sort by skill overlap, top 20
    const ranked = filtered
      .map((c) => ({ ...c, _overlap: skillOverlapCount(c.skills, vacancy.skills) }))
      .sort((a, b) => b._overlap - a._overlap)
      .slice(0, 20);

    if (ranked.length === 0) {
      return { matches: [], vacancy, error: "No compatible candidates found after pre-filtering." };
    }

    // Check cache
    const candIds = ranked.map((c) => c.id);
    const { data: cached } = await supabaseAdmin
      .from("poc_match_results")
      .select("*")
      .eq("vacancy_id", vacancy_id)
      .in("candidate_id", candIds);
    const cachedMap = new Map((cached ?? []).map((r: Record<string, unknown>) => [r.candidate_id as string, r]));

    const toScore = ranked.filter((c) => !cachedMap.has(c.id));
    let aiMatches: Record<string, unknown>[] = [];

    if (toScore.length > 0) {
      const candidatesText = toScore
        .map((c) => `ID: ${c.id} | ${c.preferred_occupation ?? c.previous_occupation ?? "N/A"} | Edu: ${c.education_level ?? "N/A"} | Salary: ${c.preferred_salary ?? "N/A"} | State: ${c.preferred_state ?? "Any"} | Skills: ${c.skills ?? "N/A"}`)
        .join("\n");

      const prompt = `You are an AI talent matching specialist for PERKESO Malaysia's job portal.

VACANCY:
- ID: ${vacancy.id}
- Job Title: ${vacancy.job_title}
- Occupation: ${vacancy.occupation_name}
- Education Required: ${vacancy.education_level ?? "N/A"}
- Field of Study: ${vacancy.field_of_study ?? "N/A"}
- State: ${vacancy.state ?? "Any"}
- Salary: ${vacancy.salary ?? "N/A"}
- Skills Required: ${vacancy.skills ?? "N/A"}
- Job Description: ${(vacancy.job_description ?? "N/A").slice(0, 500)}

CANDIDATES TO SCORE (${toScore.length} pre-filtered by education, salary, location):
${candidatesText}

For each candidate, provide a precise match assessment using Malaysian job market context (GLCs, MNCs, SMEs, bilingual expectations, state-level markets such as Selangor, KL, Johor, Penang). Score 0-100.`;

      try {
        const result = await callAi({
          model: "gpt-5.4",
          messages: [{ role: "user", content: prompt }],
          tool: CANDIDATE_MATCH_TOOL,
          busyMessage: "The matching engine is busy. Please try again in a moment.",
        });

        const raw = result.toolArgs as { matches?: Record<string, unknown>[] } | null;
        aiMatches = raw?.matches ?? [];

        if (aiMatches.length > 0) {
          const rows = aiMatches.map((m) => ({
            candidate_id: m.candidate_id as string,
            vacancy_id,
            match_score: m.match_score as number,
            skill_match_score: (m.skill_match_score as number) ?? null,
            education_match_score: (m.education_match_score as number) ?? null,
            salary_match_score: (m.salary_match_score as number) ?? null,
            location_match_score: (m.location_match_score as number) ?? null,
            experience_match_score: (m.experience_match_score as number) ?? null,
            explanation: m.explanation as string,
            matched_skills: m.matched_skills ?? [],
            transferable_skills: m.transferable_skills ?? [],
            skill_gaps: m.skill_gaps ?? [],
            taxonomy_relationship: (m.taxonomy_relationship as string) ?? null,
            model_used: "gpt-5.4",
          }));
          await supabaseAdmin.from("poc_match_results").upsert(rows, { onConflict: "candidate_id,vacancy_id" }).throwOnError().catch((e: Error) => {
            console.error("[matchJobToCandidates] cache save failed:", e.message);
          });
        }
      } catch (e) {
        console.error("[matchJobToCandidates] AI call failed:", e);
      }
    }

    const allScoredMap = new Map<string, Record<string, unknown>>();
    for (const c of cached ?? []) allScoredMap.set(c.candidate_id as string, c as Record<string, unknown>);
    for (const m of aiMatches) allScoredMap.set(m.candidate_id as string, m);

    // Load behaviour for top candidates
    const scoredIds = Array.from(allScoredMap.keys());
    const { data: behaviours } = await supabaseAdmin
      .from("poc_behaviour")
      .select("*")
      .in("candidate_id", scoredIds);
    const behaviourMap = new Map((behaviours ?? []).map((b: Record<string, unknown>) => [b.candidate_id as string, b]));

    const candidateMeta = new Map(ranked.map((c) => [c.id, c]));
    const matches = Array.from(allScoredMap.values())
      .map((m) => ({
        ...m,
        candidate: candidateMeta.get(m.candidate_id as string) ?? null,
        behaviour: behaviourMap.get(m.candidate_id as string) ?? null,
      }))
      .filter((m) => m.candidate)
      .sort((a, b) => (b.match_score as number) - (a.match_score as number))
      .slice(0, limit);

    return { matches, vacancy, error: null };
  });

// ─── 3. getMatchExplanation ───────────────────────────────────────────────────
export const getMatchExplanation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GetExplanationSchema.parse(input))
  .handler(async ({ data }) => {
    const { candidate_id, vacancy_id } = data;

    // Check cache first
    const { data: existing } = await supabaseAdmin
      .from("poc_match_results")
      .select("*")
      .eq("candidate_id", candidate_id)
      .eq("vacancy_id", vacancy_id)
      .maybeSingle();

    if (existing) return { result: existing, cached: true };

    // Generate on the fly
    const [{ data: candidate }, { data: vacancy }] = await Promise.all([
      supabaseAdmin.from("poc_candidates").select("*").eq("id", candidate_id).single(),
      supabaseAdmin.from("poc_vacancies").select("*").eq("id", vacancy_id).single(),
    ]);

    if (!candidate || !vacancy) throw new Error("Candidate or vacancy not found");

    const prompt = `You are an AI employment matching specialist for PERKESO Malaysia.
Provide a detailed match explanation for this specific candidate-vacancy pair.

CANDIDATE: ${candidate.id} | ${candidate.preferred_occupation ?? candidate.previous_occupation} | Edu: ${candidate.education_level} | Skills: ${candidate.skills ?? "N/A"} | State: ${candidate.preferred_state ?? "Any"} | Salary: ${candidate.preferred_salary ?? "N/A"}

VACANCY: ${vacancy.id} | ${vacancy.job_title} (${vacancy.occupation_name}) | Edu: ${vacancy.education_level} | Skills: ${vacancy.skills ?? "N/A"} | State: ${vacancy.state ?? "Any"} | Salary: ${vacancy.salary ?? "N/A"}

Provide a single, specific match result. Use Malaysian job market context.`;

    const result = await callAi({
      model: "gpt-5.4",
      messages: [{ role: "user", content: prompt }],
      tool: {
        ...MATCH_TOOL,
        function: { ...MATCH_TOOL.function, parameters: { type: "object", properties: { matches: { type: "array", maxItems: 1, items: MATCH_TOOL.function.parameters.properties?.matches?.items ?? {} } }, required: ["matches"] } },
      },
    });

    const raw = result.toolArgs as { matches?: Record<string, unknown>[] } | null;
    const match = raw?.matches?.[0];
    if (!match) throw new Error("AI returned no match result");

    const row = {
      candidate_id,
      vacancy_id,
      match_score: match.match_score as number,
      skill_match_score: (match.skill_match_score as number) ?? null,
      education_match_score: (match.education_match_score as number) ?? null,
      salary_match_score: (match.salary_match_score as number) ?? null,
      location_match_score: (match.location_match_score as number) ?? null,
      experience_match_score: (match.experience_match_score as number) ?? null,
      explanation: match.explanation as string,
      matched_skills: match.matched_skills ?? [],
      transferable_skills: match.transferable_skills ?? [],
      skill_gaps: match.skill_gaps ?? [],
      taxonomy_relationship: (match.taxonomy_relationship as string) ?? null,
      model_used: "gpt-5.4",
    };

    await supabaseAdmin.from("poc_match_results").upsert(row, { onConflict: "candidate_id,vacancy_id" }).throwOnError().catch((e: Error) => {
      console.error("[getMatchExplanation] cache save failed:", e.message);
    });

    return { result: row, cached: false };
  });

// ─── 4. getPocStats (for dashboard) ──────────────────────────────────────────
export const getPocStats = createServerFn({ method: "POST" })
  .handler(async () => {
    const [
      { count: vacancies },
      { count: candidates },
      { count: activityLogs },
      { count: behaviourRows },
      { data: eduDist },
      { data: stateDist },
    ] = await Promise.all([
      supabaseAdmin.from("poc_vacancies").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("poc_candidates").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("poc_activity_log").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("poc_behaviour").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("poc_candidates").select("education_level").limit(1449),
      supabaseAdmin.from("poc_candidates").select("preferred_state").limit(1449),
    ]);

    // Aggregate distributions
    const eduMap: Record<string, number> = {};
    for (const r of eduDist ?? []) {
      const k = (r.education_level ?? "Unknown").slice(0, 40);
      eduMap[k] = (eduMap[k] ?? 0) + 1;
    }
    const stateMap: Record<string, number> = {};
    for (const r of stateDist ?? []) {
      const k = r.preferred_state ?? "Unknown";
      stateMap[k] = (stateMap[k] ?? 0) + 1;
    }

    return {
      vacancies: vacancies ?? 0,
      candidates: candidates ?? 0,
      activityLogs: activityLogs ?? 0,
      behaviourRows: behaviourRows ?? 0,
      eduDistribution: Object.entries(eduMap).sort((a, b) => b[1] - a[1]).slice(0, 8),
      stateDistribution: Object.entries(stateMap).sort((a, b) => b[1] - a[1]).slice(0, 10),
    };
  });

// ─── 5. listPocCandidates (for selector) ─────────────────────────────────────
export const listPocCandidates = createServerFn({ method: "POST" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("poc_candidates")
      .select("id, preferred_occupation, nec_1d, education_level, preferred_state")
      .order("id")
      .limit(1449);
    return { candidates: data ?? [] };
  });

// ─── 6. listPocVacancies (for selector) ──────────────────────────────────────
export const listPocVacancies = createServerFn({ method: "POST" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("poc_vacancies")
      .select("id, job_title, occupation_name, state, salary")
      .order("id")
      .limit(5828);
    return { vacancies: data ?? [] };
  });
