import { callAi, AI_MODELS } from "./ai-gateway";

// ── Legacy interface kept for backward compat ─────────────────────────────────
export interface ParsedSearchQuery {
  keywords: string | null;
  state: string | null;
  city: string | null;
  min_salary: number | null;
  max_salary: number | null;
  education_level: string | null;
  experience_level: string | null;
  industry: string | null;
  skills: string[] | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NLP SMART SEARCH ENGINE — Pure client-side, zero API calls
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParsedQuery {
  role: string;
  locations: string[];
  sector: "MNC" | "GLC" | "SME" | "Startup" | "Government" | "";
  jobType: "Full-time" | "Part-time" | "Remote" | "Contract" | "Internship" | "";
  expLevel: "Fresh Graduate" | "Junior" | "Mid" | "Senior" | "";
  salaryMin: number;
  salaryMax: number;
  originalTokens: string[];
  wasCorrected?: boolean;
  originalQuery?: string;
  correctedQuery?: string;
}

// ── Fuzzy search engine ───────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, (_, i) => [i]);
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = b[i - 1] === a[j - 1]
        ? dp[i - 1][j - 1]
        : Math.min(dp[i - 1][j - 1] + 1, dp[i][j - 1] + 1, dp[i - 1][j] + 1);
    }
  }
  return dp[n][m];
}

export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (t.includes(q)) return true;
  const qWords = q.split(/\s+/);
  const tWords = t.split(/\s+/);
  let matches = 0;
  for (const qw of qWords) {
    for (const tw of tWords) {
      const threshold = qw.length > 5 ? 2 : 1;
      if (levenshtein(qw, tw) <= threshold) { matches++; break; }
    }
  }
  return matches >= Math.ceil(qWords.length * 0.5);
}

const SPELLING_CORRECTIONS: Record<string, string> = {
  sofware: "software", softwar: "software", softwre: "software",
  enginer: "engineer", enginear: "engineer", enginir: "engineer", engineeer: "engineer",
  develper: "developer", devloper: "developer", developr: "developer",
  acountant: "accountant", acoountant: "accountant", accountent: "accountant",
  analist: "analyst", anlyst: "analyst",
  managr: "manager", manger: "manager", maneger: "manager",
  marketin: "marketing", markting: "marketing",
  adminstrator: "administrator", adminstration: "administration",
  recption: "reception",
  financ: "finance", finace: "finance",
  desiner: "designer", desgner: "designer",
  programer: "programmer", programmar: "programmer",
  tehcnical: "technical", tecnical: "technical",
  exective: "executive", excutive: "executive",
  kualalumpur: "kuala lumpur", kulaumpur: "kuala lumpur",
  slngor: "selangor",
  johore: "johor",
  pennang: "penang", pinnang: "penang",
};

export function correctSpelling(query: string): { corrected: string; wasCorrected: boolean; original: string } {
  const words = query.toLowerCase().split(/\s+/);
  const corrected = words.map(w => SPELLING_CORRECTIONS[w] ?? w);
  const result = corrected.join(" ");
  return { corrected: result, wasCorrected: result !== query.toLowerCase(), original: query };
}

// ── Location map ──────────────────────────────────────────────────────────────
const LOC_MAP: { patterns: string[]; canonical: string }[] = [
  { patterns: ["kuala lumpur", "klcc", " kl "], canonical: "Kuala Lumpur" },
  { patterns: ["selangor", "shah alam", "petaling jaya", " pj ", "subang", "cyberjaya", "putrajaya"], canonical: "Selangor" },
  { patterns: ["penang", "georgetown", "bayan lepas", "pulau pinang"], canonical: "Penang" },
  { patterns: ["johor", " jb ", "johor bahru"], canonical: "Johor" },
  { patterns: ["ipoh"], canonical: "Ipoh" },
  { patterns: ["melaka", "malacca"], canonical: "Melaka" },
  { patterns: ["remote", "wfh", "work from home"], canonical: "Remote" },
  { patterns: ["kota kinabalu", "sabah"], canonical: "Sabah" },
  { patterns: ["kuching", "sarawak"], canonical: "Sarawak" },
  { patterns: ["kedah", "alor setar"], canonical: "Kedah" },
  { patterns: ["kelantan", "kota bharu"], canonical: "Kelantan" },
  { patterns: ["perak"], canonical: "Perak" },
  { patterns: ["pahang", "kuantan"], canonical: "Pahang" },
  { patterns: ["terengganu"], canonical: "Terengganu" },
  { patterns: ["negeri sembilan", "seremban"], canonical: "Negeri Sembilan" },
];

const LOCATION_ALIASES: Record<string, string> = {
  "kl": "Kuala Lumpur",
  "kuala lumpur": "Kuala Lumpur",
  "klang valley": "Kuala Lumpur",
  "penang": "Penang",
  "pulau pinang": "Penang",
  "pg": "Penang",
  "jb": "Johor",
  "johor bahru": "Johor",
  "shah alam": "Selangor",
  "petaling jaya": "Selangor",
  "pj": "Selangor",
  "cyberjaya": "Selangor",
  "subang": "Selangor",
  "putrajaya": "Selangor",
  "ipoh": "Perak",
  "kota kinabalu": "Sabah",
  "kuching": "Sarawak",
  "alor setar": "Kedah",
  "kota bharu": "Kelantan",
  "kuantan": "Pahang",
  "seremban": "Negeri Sembilan",
  "malacca": "Melaka",
};

export function normalizeLocation(input: string): string | null {
  const key = input.trim().toLowerCase();
  if (!key) return null;
  if (LOCATION_ALIASES[key]) return LOCATION_ALIASES[key];
  // Title-case fallback
  return key.replace(/\b\w/g, c => c.toUpperCase());
}

export function extractLocations(query: string): { cleanQuery: string; locations: string[] } {
  // Normalise BM connectors first so "berhampiran Kuala Lumpur" → " Kuala Lumpur"
  const bmStripped = " " + query.toLowerCase() + " "
    .replace(/\b(berhampiran|dekat|sekitar|di)\b/g, " ");
  const lower = bmStripped;
  const found = new Set<string>();
  let remaining = lower;
  for (const { patterns, canonical } of LOC_MAP) {
    for (const pat of patterns) {
      if (remaining.includes(pat)) {
        found.add(canonical);
        remaining = remaining.split(pat).join(" ");
      }
    }
  }
  const clean = remaining.replace(/\s+/g, " ").trim();
  return { cleanQuery: clean, locations: Array.from(found) };
}

// ── Sector map ────────────────────────────────────────────────────────────────
const SECTOR_PATTERNS: { patterns: string[]; sector: ParsedQuery["sector"] }[] = [
  { patterns: ["mnc", "multinational", "international", "foreign", "shell", "ibm", "deloitte", "grab", "shopee", "airasia", "panasonic", "intel", "samsung", "kpmg", "pwc", "accenture", "microsoft", "google", "amazon"], sector: "MNC" },
  { patterns: ["glc", "government linked", "petronas", "maybank", "telekom", "gamuda", "tnb", "cimb", "sunway", "axiata", "ihh", "khazanah"], sector: "GLC" },
  { patterns: ["sme", "small medium"], sector: "SME" },
  { patterns: ["startup", "tech startup"], sector: "Startup" },
  { patterns: ["government", "public sector", "kerajaan", "jabatan", "kementerian"], sector: "Government" },
];

// ── Job type map ──────────────────────────────────────────────────────────────
const TYPE_PATTERNS: { patterns: string[]; type: ParsedQuery["jobType"] }[] = [
  { patterns: ["remote", "wfh", "work from home", "hybrid"], type: "Remote" },
  { patterns: ["part time", "part-time", "parttime"], type: "Part-time" },
  { patterns: ["contract", "freelance"], type: "Contract" },
  { patterns: ["internship", "intern", "latihan industri", "industrial training"], type: "Internship" },
];

// ── Experience map ────────────────────────────────────────────────────────────
const EXP_PATTERNS: { patterns: string[]; level: ParsedQuery["expLevel"] }[] = [
  { patterns: ["fresh grad", "fresh graduate", "0 year", "entry level", "no experience", "entry-level", "new grad"], level: "Fresh Graduate" },
  { patterns: ["junior", "1 year", "2 year", "3 year", "1-2", "2-3"], level: "Junior" },
  { patterns: ["mid", "4 year", "5 year", "intermediate", "3-5", "4-5"], level: "Mid" },
  { patterns: ["senior", "lead", "principal", "6 year", "7 year", "8 year", "10 year", "experienced", "managerial"], level: "Senior" },
];

// ── Salary regex ──────────────────────────────────────────────────────────────
function parseSalary(q: string): { min: number; max: number; consumed: string[] } {
  const consumed: string[] = [];
  let min = 0, max = 0;

  // Range: "4000-6000" or "4k to 6k" or "rm4k-rm6k"
  const rangeMatch = q.match(/(?:rm\s*)?(\d+(?:\.\d+)?)k?\s*(?:to|-)\s*(?:rm\s*)?(\d+(?:\.\d+)?)k?/i);
  if (rangeMatch) {
    min = parseFloat(rangeMatch[1]) * (rangeMatch[0].toLowerCase().includes("k") && !rangeMatch[1].includes(".") ? 1000 : 1);
    max = parseFloat(rangeMatch[2]) * (rangeMatch[0].toLowerCase().includes("k") && !rangeMatch[2].includes(".") ? 1000 : 1);
    if (min < 500) min *= 1000;
    if (max < 500) max *= 1000;
    consumed.push(rangeMatch[0]);
    return { min, max, consumed };
  }

  // "above/min X" or "below/max/up to X"
  const aboveMatch = q.match(/(?:above|min(?:imum)?|at least|>)\s*(?:rm\s*)?(\d+(?:\.\d+)?)k?/i);
  if (aboveMatch) {
    min = parseFloat(aboveMatch[1]);
    if (min < 500) min *= 1000;
    max = 999999;
    consumed.push(aboveMatch[0]);
    return { min, max, consumed };
  }
  const belowMatch = q.match(/(?:below|max(?:imum)?|up to|<)\s*(?:rm\s*)?(\d+(?:\.\d+)?)k?/i);
  if (belowMatch) {
    max = parseFloat(belowMatch[1]);
    if (max < 500) max *= 1000;
    consumed.push(belowMatch[0]);
    return { min: 0, max, consumed };
  }

  // Single value "5000" or "5k" → ±20% window
  const singleK = q.match(/(?:rm\s*)?(\d+(?:\.\d+)?)k\b/i);
  if (singleK) {
    const v = parseFloat(singleK[1]) * 1000;
    consumed.push(singleK[0]);
    return { min: Math.round(v * 0.8), max: Math.round(v * 1.2), consumed };
  }
  const single = q.match(/\b(\d{4,6})\b/);
  if (single) {
    const v = parseInt(single[1]);
    if (v >= 500) {
      consumed.push(single[0]);
      return { min: Math.round(v * 0.8), max: Math.round(v * 1.2), consumed };
    }
  }

  return { min: 0, max: 0, consumed };
}

// ── Synonym map ───────────────────────────────────────────────────────────────
export const SYNONYMS: Record<string, string[]> = {
  "software engineer":  ["software developer", "programmer", "coder", "developer", "web developer", "backend developer", "frontend developer", "fullstack"],
  "data analyst":       ["data science", "business intelligence", "bi analyst", "analytics engineer", "data scientist"],
  "finance":            ["accounting", "accountant", "financial analyst", "treasury", "audit", "finance executive"],
  "hr":                 ["human resources", "recruitment", "talent acquisition", "people operations", "people & culture"],
  "marketing":          ["digital marketing", "brand manager", "growth", "communications", "social media", "content marketing"],
  "project manager":    ["programme manager", "scrum master", "delivery manager", "project lead", "product manager"],
  "devops":             ["cloud engineer", "infrastructure", "sre", "platform engineer", "site reliability"],
  "ux":                 ["ui designer", "product designer", "user experience", "figma", "ux designer", "ui/ux"],
  "customer service":   ["customer support", "helpdesk", "call centre", "customer success", "customer care"],
  "sales":              ["business development", "account manager", "sales executive", "sales representative"],
  "it":                 ["information technology", "it support", "system administrator", "network engineer", "sysadmin"],
  "logistics":          ["supply chain", "warehouse", "procurement", "operations", "inventory"],
  "mechanical engineer":["mechanical", "manufacturing engineer", "process engineer", "production engineer"],
  "civil engineer":     ["structural engineer", "site engineer", "quantity surveyor", "qs", "geotechnical"],
  "electrical engineer":["electrical", "electronics engineer", "automation engineer", "instrumentation"],
};

function getSynonymsForRole(role: string): string[] {
  const r = role.toLowerCase();
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (r.includes(key) || synonyms.some(s => r.includes(s))) {
      return [key, ...synonyms];
    }
  }
  return [];
}

// ── BM → EN normalisation ─────────────────────────────────────────────────────
const BM_ROLE_MAP: Record<string, string> = {
  "jurutera perisian": "software engineer",
  "pembangun perisian": "software developer",
  "jurutera rangkaian": "network engineer",
  "penganalisis data": "data analyst",
  "akauntan": "accountant",
  "pembantu akaun": "account assistant",
  "khidmat pelanggan": "customer service",
  "sokongan teknikal": "technical support",
  "jururawat": "nurse",
  "jurutera awam": "civil engineer",
  "pembantu tadbir": "administrative assistant",
  "kerani": "clerk",
  "juruteknik": "technician",
  "pemandu": "driver",
  "tukang masak": "chef",
  "guru": "teacher",
  "pengurus": "manager",
  "eksekutif": "executive",
  "akauntan profesional": "professional accountant",
};

const BM_SALARY_MAP: Record<string, string> = {
  "gaji lima ribu": "5000",
  "gaji empat ribu": "4000",
  "gaji enam ribu": "6000",
  "gaji sepuluh ribu": "10000",
  "lima ribu": "5000",
  "empat ribu": "4000",
  "enam ribu": "6000",
  "sepuluh ribu": "10000",
};

const BM_CONNECTOR_WORDS = new Set([
  "berhampiran", "dekat", "sekitar", "di", "dan", "atau", "untuk",
  "yang", "dengan", "pada", "ke", "dari", "tentang", "oleh",
]);

function normaliseBmQuery(query: string): string {
  let result = " " + query.toLowerCase().trim() + " ";
  // Apply salary phrase replacements first (longest match first)
  const salaryEntries = Object.entries(BM_SALARY_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [bm, en] of salaryEntries) {
    result = result.split(bm).join(" " + en + " ");
  }
  // Apply role phrase replacements (longest match first)
  const roleEntries = Object.entries(BM_ROLE_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [bm, en] of roleEntries) {
    result = result.split(bm).join(" " + en + " ");
  }
  // Remove connector words
  result = result.split(/\s+/).filter(w => w && !BM_CONNECTOR_WORDS.has(w)).join(" ");
  return result.trim();
}

export { normaliseBmQuery };

// ── Stop words ────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "in", "at", "for", "the", "a", "an", "and", "or", "with", "job", "work",
  "role", "looking", "need", "want", "find", "malaysia", "malaysian", "hiring",
  "jobs", "vacancy", "vacancies", "position", "positions", "career", "careers",
  "opportunity", "opportunities", "now", "urgently", "immediately",
  "berhampiran", "dekat", "sekitar", "di", "dan", "atau", "untuk",
  "yang", "dengan", "pada", "ke", "dari", "tentang", "oleh",
]);

// ── Main parser ───────────────────────────────────────────────────────────────
export function parseSearchQuery(query: string): ParsedQuery {
  // BM normalisation first (jurutera perisian → software engineer, etc.)
  const bmNormalised = normaliseBmQuery(query.trim());
  const spelling = correctSpelling(bmNormalised);
  const original = spelling.corrected;
  const lower = " " + original.toLowerCase() + " ";
  const originalTokens = query.trim().split(/\s+/);
  let remaining = " " + original.toLowerCase() + " ";

  // 1. Locations
  const locations: string[] = [];
  for (const { patterns, canonical } of LOC_MAP) {
    for (const pat of patterns) {
      if (lower.includes(pat)) {
        if (!locations.includes(canonical)) locations.push(canonical);
        remaining = remaining.split(pat).join(" ");
      }
    }
  }

  // 2. Sector
  let sector: ParsedQuery["sector"] = "";
  for (const { patterns, sector: s } of SECTOR_PATTERNS) {
    for (const pat of patterns) {
      if (lower.includes(pat)) {
        sector = s;
        remaining = remaining.split(pat).join(" ");
        break;
      }
    }
    if (sector) break;
  }

  // 3. Job type
  let jobType: ParsedQuery["jobType"] = "";
  for (const { patterns, type } of TYPE_PATTERNS) {
    for (const pat of patterns) {
      if (lower.includes(pat)) {
        jobType = type;
        remaining = remaining.split(pat).join(" ");
        break;
      }
    }
    if (jobType) break;
  }

  // 4. Exp level
  let expLevel: ParsedQuery["expLevel"] = "";
  for (const { patterns, level } of EXP_PATTERNS) {
    for (const pat of patterns) {
      if (lower.includes(pat)) {
        expLevel = level;
        remaining = remaining.split(pat).join(" ");
        break;
      }
    }
    if (expLevel) break;
  }

  // 5. Salary
  const salary = parseSalary(lower);
  for (const c of salary.consumed) remaining = remaining.split(c).join(" ");

  // 6. Role = remaining minus stop words
  const roleTokens = remaining
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  const role = roleTokens.join(" ").trim();

  return {
    role,
    locations,
    sector,
    jobType,
    expLevel,
    salaryMin: salary.min,
    salaryMax: salary.max,
    originalTokens,
    wasCorrected: spelling.wasCorrected,
    originalQuery: spelling.original,
    correctedQuery: spelling.corrected,
  };
}

// ── scoreJob ──────────────────────────────────────────────────────────────────
export interface ScoredJob {
  id: string;
  job_title: string;
  state?: string | null;
  city?: string | null;
  salary?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  skills?: string | null;
  occupation_name?: string | null;
  industry?: string | null;
  company_name?: string | null;
  created_at?: string | null;
  job_description?: string | null;
  [key: string]: unknown;
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 9999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function normSalary(job: ScoredJob): { min: number; max: number } | null {
  if (job.salary_min != null && job.salary_max != null) return { min: job.salary_min, max: job.salary_max };
  if (job.salary) {
    const nums = (job.salary as string).match(/\d+/g);
    if (nums && nums.length >= 2) return { min: parseInt(nums[0]), max: parseInt(nums[1]) };
    if (nums && nums.length === 1) { const v = parseInt(nums[0]); return { min: v, max: v }; }
  }
  return null;
}

export function scoreJob(job: ScoredJob, parsed: ParsedQuery, rawQuery: string): number {
  if (!rawQuery.trim()) return 0;

  let score = 0;
  const title = (job.job_title ?? "").toLowerCase();
  const role = parsed.role.toLowerCase();
  const queryWords = rawQuery.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
  const jobSkills = (job.skills ?? "").toLowerCase().split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
  const synonyms = getSynonymsForRole(role);

  // ── Title scoring ──────────────────────────────────────────────────────────
  if (role) {
    if (title.includes(role)) {
      score += 60; // exact phrase
    } else {
      const roleWords = role.split(/\s+/).filter(Boolean);
      const exactWordMatches = roleWords.filter(w => title.includes(w));
      if (exactWordMatches.length > 0) {
        score += Math.min(45, exactWordMatches.length * 15);
      } else if (fuzzyMatch(role, title)) {
        score += 40; // fuzzy title match
      }
    }
    // Synonym match
    if (synonyms.some(s => title.includes(s) || s.includes(title))) {
      score += 25;
    }
  }

  // ── Skill/keyword match ───────────────────────────────────────────────────
  const skillMatches = queryWords.filter(w => {
    const exactMatch = jobSkills.some(s => s.includes(w) || w.includes(s));
    if (exactMatch) return true;
    return jobSkills.some(s => fuzzyMatch(w, s));
  }).length;
  score += skillMatches * 8;

  // ── Location match ────────────────────────────────────────────────────────
  if (parsed.locations.length > 0) {
    const jobLoc = ((job.state ?? "") + " " + (job.city ?? "")).toLowerCase();
    const matched = parsed.locations.some(loc => {
      const l = loc.toLowerCase();
      return jobLoc.includes(l) || l.includes(jobLoc.split(" ")[0] ?? "");
    });
    if (matched) score += 30;
    else score -= 25;
  }

  // ── Sector match ──────────────────────────────────────────────────────────
  if (parsed.sector) {
    const sectorText = ((job.industry ?? "") + " " + (job.company_name ?? "") + " " + (job.occupation_name ?? "")).toLowerCase();
    const sectorKeywords: Record<string, string[]> = {
      MNC: ["mnc", "multinational", "international", "foreign", "global"],
      GLC: ["glc", "government linked", "petronas", "maybank", "telekom", "tnb", "cimb"],
      SME: ["sme", "small", "medium"],
      Startup: ["startup", "tech startup", "fintech", "saas"],
      Government: ["government", "public sector", "kerajaan", "jabatan"],
    };
    const kws = sectorKeywords[parsed.sector] ?? [];
    if (kws.some(k => sectorText.includes(k))) score += 20;
  }

  // ── Job type match ────────────────────────────────────────────────────────
  if (parsed.jobType) {
    const desc = (job.job_description ?? "").toLowerCase();
    const typeKws: Record<string, string[]> = {
      Remote: ["remote", "wfh", "hybrid", "work from home"],
      "Part-time": ["part time", "part-time"],
      Contract: ["contract", "freelance"],
      Internship: ["intern", "internship", "latihan industri"],
      "Full-time": ["permanent", "full time", "full-time"],
    };
    const kws = typeKws[parsed.jobType] ?? [];
    if (kws.some(k => desc.includes(k) || title.includes(k))) score += 15;
  }

  // ── Experience match ──────────────────────────────────────────────────────
  if (parsed.expLevel) {
    const desc = (job.job_description ?? "").toLowerCase();
    const expKws: Record<string, string[]> = {
      "Fresh Graduate": ["fresh grad", "fresh graduate", "entry level", "0-1 year", "no experience"],
      Junior: ["junior", "1-3 year", "1-2 year"],
      Mid: ["mid", "3-5 year", "intermediate"],
      Senior: ["senior", "lead", "principal", "5+ year", "experienced"],
    };
    const kws = expKws[parsed.expLevel] ?? [];
    if (kws.some(k => desc.includes(k) || title.includes(k))) score += 15;
  }

  // ── Salary overlap ────────────────────────────────────────────────────────
  if (parsed.salaryMin > 0 || parsed.salaryMax > 0) {
    const jobSal = normSalary(job);
    if (jobSal) {
      const qMin = parsed.salaryMin || 0;
      const qMax = parsed.salaryMax || 999999;
      const overlap = Math.min(jobSal.max, qMax) - Math.max(jobSal.min, qMin);
      if (overlap >= 0) {
        const coverageRatio = overlap / (qMax - qMin + 1);
        score += coverageRatio > 0.5 ? 20 : 10;
      }
    }
  }

  // ── Recency boost ─────────────────────────────────────────────────────────
  const age = daysSince(job.created_at);
  if (age === 0) score += 15;
  else if (age <= 3) score += 10;
  else if (age <= 7) score += 5;

  // ── Anti-hallucination penalty ────────────────────────────────────────────
  // If role was specified but no skill/title overlap at all → halve score
  if (role && skillMatches === 0) {
    const hasAnyTitleMatch = role.split(/\s+/).some(w => title.includes(w));
    const hasSynonymMatch = synonyms.some(s => title.includes(s));
    if (!hasAnyTitleMatch && !hasSynonymMatch) {
      score = Math.floor(score * 0.5);
    }
  }

  return Math.max(0, score);
}

// ── Score → display percentage (60–99% for top results) ──────────────────────
export function scoreToPercent(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  const ratio = score / maxScore;
  return Math.round(60 + ratio * 39);
}

// ── Recent searches (localStorage) ───────────────────────────────────────────
const LS_KEY = "resumy_recent_searches";

export function saveRecentSearch(query: string): void {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const prev: string[] = raw ? JSON.parse(raw) : [];
    const deduped = [query, ...prev.filter(q => q !== query)].slice(0, 5);
    localStorage.setItem(LS_KEY, JSON.stringify(deduped));
  } catch {}
}

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const PARSE_TOOL = {
  type: "function" as const,
  function: {
    name: "parse_search_query",
    description: "Parse a natural language job search query into structured filters",
    parameters: {
      type: "object",
      properties: {
        keywords: { type: ["string", "null"], description: "Main job title or skill keywords for text search" },
        state: { type: ["string", "null"], description: "Malaysian state name" },
        city: { type: ["string", "null"], description: "Specific city" },
        min_salary: { type: ["number", "null"], description: "Minimum salary in RM" },
        max_salary: { type: ["number", "null"], description: "Maximum salary in RM" },
        education_level: { type: ["string", "null"], enum: ["SPM", "Diploma", "Bachelor", "Master", "PhD", null] },
        experience_level: { type: ["string", "null"], enum: ["Fresh Graduate", "Junior", "Mid", "Senior", null] },
        industry: { type: ["string", "null"] },
        skills: { type: ["array", "null"], items: { type: "string" } },
      },
      required: ["keywords", "state", "city", "min_salary", "max_salary", "education_level", "experience_level", "industry", "skills"],
    },
  },
};

const SYSTEM_PROMPT = `You are a job search query parser for a Malaysian employment portal. Parse the user's natural language search query into structured filters.

Extract these fields (set to null if not mentioned):
- keywords: main job title or skill words (string, for text search)
- state: Malaysian state name if mentioned. Map common variations:
  "KL" or "kuala lumpur" or "klang valley" → "Kuala Lumpur"
  "Penang" or "pg" → "Pulau Pinang"
  "JB" or "johor bahru" → "Johor"
  "Sabah" → "Sabah"
  "Sarawak" → "Sarawak"
  "Selangor" or "shah alam" or "petaling jaya" or "pj" or "cyberjaya" or "subang" → "Selangor"
  "Perak" or "ipoh" → "Perak"
  "Kedah" → "Kedah"
  "Kelantan" → "Kelantan"
  "Melaka" or "malacca" → "Melaka"
  "Pahang" → "Pahang"
  "Terengganu" → "Terengganu"
  "Perlis" → "Perlis"
  "Putrajaya" → "Putrajaya"
  "Labuan" → "Labuan"
  "Negeri Sembilan" or "seremban" → "Negeri Sembilan"
- city: specific city if mentioned (e.g., "Shah Alam", "Petaling Jaya")
- min_salary: minimum salary if mentioned (number, in RM). "high salary" = 8000. "above RM5000" = 5000
- max_salary: maximum salary if mentioned (number, in RM). "below RM3000" = 3000. "rm2000-rm4000" max=4000
- education_level: "SPM", "Diploma", "Bachelor", "Master", or "PhD" if mentioned
- experience_level: "Fresh Graduate", "Junior", "Mid", or "Senior" if mentioned.
  "fresh grad" or "fresh graduate" or "entry level" or "no experience" → "Fresh Graduate"
  "junior" or "1-2 years" → "Junior"
  "senior" or "5+ years" or "experienced" → "Senior"
  "mid" or "3-5 years" → "Mid"
- industry: industry sector if clearly mentioned
- skills: array of specific technical skills mentioned (not job titles)

Be smart about Malaysian context. Use the provided tool to return structured data.`;

export async function parseSearchQueryAI(query: string): Promise<ParsedSearchQuery> {
  const result = await callAi({
    model: AI_MODELS.GPT4O_MINI,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Parse this job search query: "${query}"` },
    ],
    tool: PARSE_TOOL,
    timeoutMs: 8000,
  });

  if (result.toolArgs) {
    const parsed = result.toolArgs as ParsedSearchQuery;
    return {
      keywords: parsed.keywords ?? null,
      state: parsed.state ?? null,
      city: parsed.city ?? null,
      min_salary: parsed.min_salary ?? null,
      max_salary: parsed.max_salary ?? null,
      education_level: parsed.education_level ?? null,
      experience_level: parsed.experience_level ?? null,
      industry: parsed.industry ?? null,
      skills: parsed.skills ?? null,
    };
  }

  // Fallback if tool call didn't return properly
  return {
    keywords: query,
    state: null, city: null, min_salary: null, max_salary: null,
    education_level: null, experience_level: null, industry: null, skills: null,
  };
}

// Heuristic to decide if a query needs AI parsing
const LOCATION_WORDS = [
  'kl', 'kuala lumpur', 'selangor', 'johor', 'penang', 'pulau pinang',
  'sabah', 'sarawak', 'perak', 'kedah', 'kelantan', 'melaka', 'pahang',
  'terengganu', 'perlis', 'putrajaya', 'labuan', 'negeri sembilan',
  'jb', 'ipoh', 'shah alam', 'petaling jaya', 'pj', 'cyberjaya',
  'klang valley', 'east malaysia', 'subang', 'bangsar', 'mont kiara',
];

const SALARY_WORDS = [
  'salary', 'rm', 'pay', 'high salary', 'below', 'above', 'minimum', 'gaji',
];

const LEVEL_WORDS = [
  'fresh grad', 'fresh graduate', 'junior', 'senior', 'entry level',
  'experienced', 'executive', 'manager', 'no experience',
];

export function needsAIParsing(query: string): boolean {
  const q = query.toLowerCase();
  const wordCount = q.trim().split(/\s+/).length;
  if (wordCount >= 3) return true;
  if (LOCATION_WORDS.some((w) => q.includes(w))) return true;
  if (SALARY_WORDS.some((w) => q.includes(w))) return true;
  if (LEVEL_WORDS.some((w) => q.includes(w))) return true;
  return false;
}

export function buildParsedSummary(parsed: ParsedSearchQuery): string {
  const parts: string[] = [];
  if (parsed.keywords) parts.push(parsed.keywords);
  if (parsed.experience_level) parts.push(parsed.experience_level);
  if (parsed.state) parts.push(`in ${parsed.state}`);
  if (parsed.city && parsed.city !== parsed.state) parts.push(`(${parsed.city})`);
  if (parsed.min_salary && parsed.max_salary)
    parts.push(`RM${parsed.min_salary.toLocaleString()}–RM${parsed.max_salary.toLocaleString()}`);
  else if (parsed.min_salary) parts.push(`RM${parsed.min_salary.toLocaleString()}+`);
  else if (parsed.max_salary) parts.push(`Below RM${parsed.max_salary.toLocaleString()}`);
  if (parsed.education_level) parts.push(parsed.education_level);
  if (parsed.skills && parsed.skills.length > 0) parts.push(parsed.skills.slice(0, 2).join(", "));
  return parts.join(" · ");
}
