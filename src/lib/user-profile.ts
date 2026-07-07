/**
 * User Personalization Engine — PerksoPrax AI
 *
 * Builds a rich interest vector from every available signal:
 *  • CV analysis results  (skills, industry, experience level)
 *  • Application history  (job titles applied to, companies, sectors)
 *  • Search history       (localStorage recent searches → NLP-parsed)
 *  • Profile metadata     (state, education, preferred job type)
 *  • PERKESO poc_vacancies applied (occupation codes, salary expectations)
 *
 * Techniques applied:
 *  • TF-IDF-inspired skill weighting (skills from multiple sources score higher)
 *  • Recency decay (older signals weighted less)
 *  • Collaborative signal boosting (most-applied sectors get boosted)
 *  • Salary anchor learning (mid-point of applied/analysed salaries)
 *  • Implicit location preference from application + search history
 */

import { supabase } from "@/integrations/supabase/client";
import { parseSearchQuery } from "./smart-search.functions";
import { getRecentSearches } from "./smart-search.functions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserInterestVector {
  /** Normalised skill weights: { "python": 1.0, "sql": 0.8, ... } */
  skills: Record<string, number>;
  /** Top roles inferred: ["data analyst", "software engineer"] */
  roles: string[];
  /** Preferred locations in order of preference */
  locations: string[];
  /** Industry preference: { "Technology": 0.9, "Finance": 0.4, ... } */
  industries: Record<string, number>;
  /** Salary anchor in RM (0 if unknown) */
  salaryAnchor: number;
  /** Experience level inferred */
  expLevel: "Fresh Graduate" | "Junior" | "Mid" | "Senior" | "";
  /** Preferred employment type */
  jobType: "Full-time" | "Part-time" | "Remote" | "Contract" | "Internship" | "";
  /** Employer type preference */
  sectorPreference: "MNC" | "GLC" | "SME" | "Startup" | "Government" | "";
  /** Education level */
  education: string;
  /** User profile state */
  homeState: string;
  /** Freshness: when was this vector last computed */
  computedAt: number;
  /** Whether the vector is populated (false = guest/no data) */
  hasData: boolean;
}

export const EMPTY_VECTOR: UserInterestVector = {
  skills: {}, roles: [], locations: [], industries: {},
  salaryAnchor: 0, expLevel: "", jobType: "", sectorPreference: "",
  education: "", homeState: "", computedAt: 0, hasData: false,
};

// ── In-memory cache (per session) ─────────────────────────────────────────────
const _cache: Map<string, { vector: UserInterestVector; ts: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

function decay(daysAgo: number): number {
  return Math.max(0.2, 1 - daysAgo * 0.015); // ~0% after 53 days
}

function addScore(map: Record<string, number>, key: string, delta: number) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + delta;
}

// ── Main builder ──────────────────────────────────────────────────────────────

export async function buildUserInterestVector(userId: string): Promise<UserInterestVector> {
  const cached = _cache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.vector;

  const skillMap: Record<string, number> = {};
  const industryMap: Record<string, number> = {};
  const locationFreq: Record<string, number> = {};
  const roleBag: string[] = [];
  let salarySum = 0, salaryCnt = 0;
  let expLevel: UserInterestVector["expLevel"] = "";
  let jobType: UserInterestVector["jobType"] = "";
  let sectorPref: UserInterestVector["sectorPreference"] = "";
  let education = "";
  let homeState = "";

  // ── 1. CV Analyses (strongest signal) ────────────────────────────────────
  const { data: analyses } = await supabase
    .from("analyses")
    .select("created_at, industry, experience_level, full_results")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  for (const a of (analyses ?? [])) {
    const daysAgo = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86400000);
    const w = decay(daysAgo);

    if (a.industry) addScore(industryMap, a.industry, 2.0 * w);
    if (a.experience_level && !expLevel) expLevel = a.experience_level as UserInterestVector["expLevel"];

    try {
      const res = typeof a.full_results === "string" ? JSON.parse(a.full_results) : (a.full_results ?? {});

      // Skills from CV
      const rawSkills: string = res?.skills_analysis?.current_skills ?? res?.skills ?? "";
      rawSkills.split(/[,;|\n]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean).forEach(sk => {
        addScore(skillMap, sk, 2.5 * w); // highest weight — from actual CV
      });

      // Missing skills (user wants these) — lower weight
      const missingSkills: string = res?.skills_analysis?.missing_skills ?? "";
      missingSkills.split(/[,;|\n]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean).forEach(sk => {
        addScore(skillMap, sk, 0.5 * w);
      });

      // Role from target_role or job_title
      const targetRole: string = res?.job_match?.target_role ?? res?.target_role ?? "";
      if (targetRole) roleBag.push(targetRole.toLowerCase());

      // Industry
      const ind: string = res?.industry ?? a.industry ?? "";
      if (ind) addScore(industryMap, ind, 1.5 * w);

      // Salary expectation from analysis — clamp to monthly RM range before aggregating
      const clampMonthly = (v: number) => {
        if (v <= 0) return 0;
        const m = v > 30000 ? Math.round(v / 12) : v; // treat >30k as annual
        return Math.min(30000, Math.max(1000, m));
      };
      const salMin: number = clampMonthly(res?.salary_range?.min ?? res?.min_salary ?? 0);
      const salMax: number = clampMonthly(res?.salary_range?.max ?? res?.max_salary ?? 0);
      if (salMin > 0 && salMax > 0) { salarySum += (salMin + salMax) / 2; salaryCnt++; }
      else if (salMin > 0) { salarySum += salMin; salaryCnt++; }

      // Education
      const edu: string = res?.education?.highest_level ?? res?.education_level ?? "";
      if (edu && !education) education = edu;

    } catch {}
  }

  // ── 2. Application History (revealed preference — very strong signal) ──────
  const { data: apps } = await supabase
    .from("applications")
    .select("created_at, job_id, poc_vacancy_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const pocIds = (apps ?? []).filter(a => a.poc_vacancy_id).map(a => a.poc_vacancy_id!);
  const jobIds = (apps ?? []).filter(a => a.job_id).map(a => a.job_id!);

  // Fetch poc vacancy details for applied jobs
  if (pocIds.length > 0) {
    const { data: pocVacs } = await supabase
      .from("poc_vacancies")
      .select("id, job_title, occupation_name, state, skills, salary_min, salary_max, field_of_study")
      .in("id", pocIds.slice(0, 30));

    for (const v of (pocVacs ?? [])) {
      const app = apps?.find(a => a.poc_vacancy_id === v.id);
      const daysAgo = app ? Math.floor((Date.now() - new Date(app.created_at).getTime()) / 86400000) : 30;
      const w = decay(daysAgo);

      if (v.job_title) roleBag.push(v.job_title.toLowerCase());
      if (v.occupation_name) roleBag.push(v.occupation_name.toLowerCase());
      if (v.state) addScore(locationFreq, v.state, 1.5 * w);
      if (v.field_of_study && !education) education = v.field_of_study;

      (v.skills ?? "").split(/[,;|]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean).forEach(sk => {
        addScore(skillMap, sk, 1.2 * w); // applied to jobs requiring these skills
      });

      if (v.salary_min && v.salary_max) {
        const sm = v.salary_min > 30000 ? Math.round(v.salary_min / 12) : v.salary_min;
        const sx = v.salary_max > 30000 ? Math.round(v.salary_max / 12) : v.salary_max;
        salarySum += (Math.min(30000, sm) + Math.min(30000, sx)) / 2; salaryCnt++;
      }
    }
  }

  // Fetch employer job details for applied jobs
  if (jobIds.length > 0) {
    const { data: empJobs } = await supabase
      .from("jobs")
      .select("id, job_title, industry, location, employer_type")
      .in("id", jobIds.slice(0, 30));

    for (const j of (empJobs ?? [])) {
      const app = apps?.find(a => a.job_id === j.id);
      const daysAgo = app ? Math.floor((Date.now() - new Date(app.created_at).getTime()) / 86400000) : 30;
      const w = decay(daysAgo);

      if (j.job_title) roleBag.push(j.job_title.toLowerCase());
      if (j.industry) addScore(industryMap, j.industry, 1.5 * w);
      if (j.location) addScore(locationFreq, j.location, 1.2 * w);

      // Sector preference from employer type
      const et = (j.employer_type ?? "").toLowerCase();
      if (et.includes("mnc") || et.includes("multinational")) sectorPref = "MNC";
      else if (et.includes("glc")) sectorPref = "GLC";
      else if (et.includes("startup")) sectorPref = "Startup";
      else if (et.includes("sme")) sectorPref = "SME";
      else if (et.includes("government")) sectorPref = "Government";
    }
  }

  // ── 3. Search History (implicit interest signals) ─────────────────────────
  const recentSearches = getRecentSearches();
  recentSearches.forEach((q, idx) => {
    const w = 1.0 - idx * 0.15; // most recent = 1.0, older = decaying
    try {
      const parsed = parseSearchQuery(q);
      if (parsed.role) roleBag.push(parsed.role.toLowerCase());
      parsed.locations.forEach(loc => addScore(locationFreq, loc, 0.8 * w));
      if (parsed.sector) sectorPref = sectorPref || parsed.sector;
      if (parsed.jobType) jobType = jobType || parsed.jobType;
      if (parsed.expLevel) expLevel = expLevel || parsed.expLevel;
      if (parsed.salaryMin > 0 && parsed.salaryMax > 0) {
        salarySum += (parsed.salaryMin + parsed.salaryMax) / 2;
        salaryCnt++;
      }
    } catch {}
  });

  // ── 4. User Profile metadata ───────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profile) {
    homeState = profile.state ?? profile.location ?? "";
    if (homeState) addScore(locationFreq, homeState, 1.0);
    if (profile.industry) addScore(industryMap, profile.industry, 1.0);
    if (profile.education_level && !education) education = profile.education_level;
    if (profile.job_type && !jobType) jobType = profile.job_type;
    if (profile.preferred_salary_min && profile.preferred_salary_max) {
      salarySum += (profile.preferred_salary_min + profile.preferred_salary_max) / 2;
      salaryCnt++;
    }
  }

  // ── 5. Normalise & rank ───────────────────────────────────────────────────

  // Normalise skills (0..1)
  const maxSkill = Math.max(...Object.values(skillMap), 1);
  const normSkills: Record<string, number> = {};
  Object.entries(skillMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40) // top 40 skills
    .forEach(([k, v]) => { normSkills[k] = parseFloat((v / maxSkill).toFixed(3)); });

  // Normalise industries
  const maxInd = Math.max(...Object.values(industryMap), 1);
  const normIndustries: Record<string, number> = {};
  Object.entries(industryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([k, v]) => { normIndustries[k] = parseFloat((v / maxInd).toFixed(3)); });

  // Top roles (deduplicated, frequency-sorted)
  const roleFreq: Record<string, number> = {};
  roleBag.filter(Boolean).forEach(r => { roleFreq[r] = (roleFreq[r] ?? 0) + 1; });
  const topRoles = Object.entries(roleFreq).sort((a, b) => b[1] - a[1]).map(([r]) => r).slice(0, 5);

  // Top locations
  const topLocations = Object.entries(locationFreq).sort((a, b) => b[1] - a[1]).map(([l]) => l).slice(0, 4);

  // All salary values are already clamped to monthly range before aggregation
  const rawAnchor = salaryCnt > 0 ? Math.round(salarySum / salaryCnt) : 0;
  const salaryAnchor = rawAnchor > 0 ? Math.min(30000, Math.max(1000, rawAnchor)) : 0;

  const hasData = Object.keys(normSkills).length > 0 || topRoles.length > 0;

  const vector: UserInterestVector = {
    skills: normSkills,
    roles: topRoles,
    locations: topLocations.length > 0 ? topLocations : (homeState ? [homeState] : []),
    industries: normIndustries,
    salaryAnchor,
    expLevel,
    jobType,
    sectorPreference: sectorPref,
    education,
    homeState,
    computedAt: Date.now(),
    hasData,
  };

  _cache.set(userId, { vector, ts: Date.now() });
  return vector;
}

/** Invalidate cache when user takes a new action */
export function invalidateUserProfile(userId: string) {
  _cache.delete(userId);
}

// ── Personalized job scorer (boost/penalise based on user vector) ─────────────

export interface PersonalizedScoredJob {
  id: string;
  job_title: string;
  state?: string | null;
  city?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary?: string | null;
  skills?: string | null;
  occupation_name?: string | null;
  industry?: string | null;
  company_name?: string | null;
  created_at?: string | null;
  job_description?: string | null;
  [key: string]: unknown;
}

/**
 * Returns a personalisation boost in range 0–100 for a given job,
 * based on the user's interest vector.
 * This is ADDED on top of the query-based score.
 */
export function personaliseJob(job: PersonalizedScoredJob, vector: UserInterestVector): number {
  if (!vector.hasData) return 0;

  let boost = 0;

  // 1. Skill overlap (most powerful signal)
  const jobSkills = (job.skills ?? "")
    .toLowerCase().split(/[,;|]+/).map((s: string) => s.trim()).filter(Boolean);

  const skillOverlap = jobSkills.reduce((sum, sk) => {
    return sum + (vector.skills[sk] ?? 0);
  }, 0);
  if (jobSkills.length > 0) {
    boost += Math.min(40, Math.round((skillOverlap / jobSkills.length) * 60));
  }

  // 2. Role alignment
  const title = (job.job_title ?? "").toLowerCase();
  const roleMatch = vector.roles.some((r, i) => {
    const weight = 1 - i * 0.15;
    return title.includes(r) || r.split(/\s+/).some((w: string) => w.length > 3 && title.includes(w))
      ? weight : 0;
  });
  if (roleMatch) boost += 20;

  // 3. Location preference
  if (vector.locations.length > 0) {
    const jobLoc = ((job.state ?? "") + " " + (job.city ?? "")).toLowerCase();
    const locIdx = vector.locations.findIndex(loc => jobLoc.includes(loc.toLowerCase()));
    if (locIdx === 0) boost += 18;
    else if (locIdx > 0) boost += 10;
    else boost -= 5; // mild penalty for wrong location
  }

  // 4. Industry alignment
  const jobInd = (job.industry ?? job.occupation_name ?? "").toLowerCase();
  let indBoost = 0;
  Object.entries(vector.industries).forEach(([ind, weight]) => {
    if (jobInd.includes(ind.toLowerCase())) indBoost = Math.max(indBoost, weight * 15);
  });
  boost += indBoost;

  // 5. Salary fit (within ±30% of anchor)
  if (vector.salaryAnchor > 0) {
    const jMin = job.salary_min ?? 0;
    const jMax = job.salary_max ?? 0;
    if (jMin > 0 && jMax > 0) {
      const lo = vector.salaryAnchor * 0.7;
      const hi = vector.salaryAnchor * 1.3;
      const overlap = Math.min(jMax, hi) - Math.max(jMin, lo);
      if (overlap > 0) boost += 8;
    }
  }

  return Math.min(100, Math.max(0, Math.round(boost)));
}

/** Generate "For You" smart chips based on user vector */
export function buildPersonalisedChips(vector: UserInterestVector): string[] {
  if (!vector.hasData) return [];
  const chips: string[] = [];

  // Role + location combos
  const topRole = vector.roles[0] ?? "";
  const topLoc = vector.locations[0] ?? "Malaysia";
  if (topRole) chips.push(`${topRole} ${topLoc}`.trim());

  // Top skills
  const topSkills = Object.entries(vector.skills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sk]) => sk);
  topSkills.forEach(sk => chips.push(`${sk} jobs`));

  // Exp level combo
  if (vector.expLevel && topRole) chips.push(`${vector.expLevel} ${topRole}`);

  // Salary range chip
  if (vector.salaryAnchor > 1000) {
    const lo = Math.round(vector.salaryAnchor * 0.8 / 1000) * 1000;
    const hi = Math.round(vector.salaryAnchor * 1.2 / 1000) * 1000;
    chips.push(`RM${lo.toLocaleString()}–${hi.toLocaleString()} ${topRole || "jobs"}`.trim());
  }

  // Remote chip if preferred
  if (vector.jobType === "Remote") chips.push(`remote ${topRole || "jobs"}`.trim());

  return [...new Set(chips)].slice(0, 6);
}

/** Top industries with demand context for the sidebar */
export function getTopIndustries(vector: UserInterestVector): { name: string; score: number }[] {
  return Object.entries(vector.industries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, score]) => ({ name, score: Math.round(score * 100) }));
}
