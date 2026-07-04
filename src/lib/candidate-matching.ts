import { loadSessions, type InterviewSession } from "./interview-sessions";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type VacancyRequirements = {
  id: string;
  jobTitle: string;
  companyName: string;
  employerType: string;
  industry: string;
  location: string;
  description: string;
  requirements: string;
};

export type SkillMatchItem = { skill: string; matched: boolean };

export type CandidateMatchStatus =
  | "Strong Match"
  | "Recommended"
  | "Potential Match"
  | "Low Match";

export type ShortlistRecommendation =
  | "Shortlist Immediately"
  | "Interview Recommended"
  | "Keep in Talent Pool"
  | "Consider for Future Roles"
  | "Not Recommended";

export type CandidateMatch = {
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  targetRole: string;
  industry: string;
  employerType: string;
  experienceLevel: string;

  // Scores
  overallMatchScore: number;
  skillsMatch: number;
  experienceMatch: number;
  industryAlignment: number;
  employabilityScore: number;
  interviewScore: number | null;
  careerReadiness: number;
  keywordRelevance: number;

  // Intelligence
  matchStatus: CandidateMatchStatus;
  matchExplanation: string;
  shortlistRecommendation: ShortlistRecommendation;
  shortlistReasoning: string;

  // Skills
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];

  // Talent pool
  futureFit: string;
  alternativeRoles: string[];
  reskillingPotential: string;

  hasInterviewData: boolean;
};

export type VacancyIntelligence = {
  vacancy: VacancyRequirements;
  totalApplicants: number;
  matchedCandidates: number;
  averageMatchScore: number;
  topSkillsFound: string[];
  topSkillsMissing: string[];
  interviewCompletionRate: number;
  rankedCandidates: CandidateMatch[];
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function overlap(a: string[], b: string[]): number {
  if (!b.length) return 0;
  const hits = a.filter((w) => b.includes(w)).length;
  return clamp((hits / b.length) * 100);
}

// Extract skill-like keywords from requirement text
function extractSkillKeywords(text: string): string[] {
  const tokens = tokenize(text);
  // Common filler words to exclude
  const stopwords = new Set([
    "and", "the", "with", "for", "that", "this", "will", "are", "has",
    "have", "been", "from", "our", "you", "all", "any", "can", "able",
    "must", "work", "role", "team", "good", "strong", "years", "minimum",
    "experience", "skill", "skills", "ability", "knowledge", "understanding",
    "excellent", "proficient", "familiar", "degree", "bachelor", "master",
    "relevant", "related", "demonstrated", "proven", "candidate", "required",
    "preferred", "ideally", "plus", "including", "such", "well", "high",
  ]);
  return [...new Set(tokens.filter((t) => !stopwords.has(t)))].slice(0, 30);
}

// ─────────────────────────────────────────────
// Core matching engine
// ─────────────────────────────────────────────

function matchCandidate(
  session: InterviewSession,
  vacancy: VacancyRequirements,
  vacancyKeywords: string[]
): CandidateMatch {
  const { scores: interviewScores } = session;

  // 1. Keyword relevance — candidate role/industry tokens vs vacancy requirements
  const candidateTokens = tokenize(
    `${session.targetRole} ${session.industry} ${session.employerType} ${session.cvSummary ?? ""}`
  );
  const keywordRelevance = clamp(overlap(candidateTokens, vacancyKeywords) * 1.2);

  // 2. Skills match — from CV summary tokens vs vacancy tokens
  const cvTokens = tokenize(session.cvSummary ?? `${session.targetRole} ${session.industry}`);
  const skillsMatch = clamp(overlap(cvTokens, vacancyKeywords) * 1.3);

  // 3. Experience match — experience level alignment
  const expMap: Record<string, number> = {
    "Fresh Graduate": 40,
    "1–3 years": 55,
    "3–5 years": 70,
    "5–10 years": 85,
    "10+ years": 95,
  };
  const experienceMatch = expMap[session.experienceLevel] ?? 50;

  // 4. Industry alignment
  const candIndustry = session.industry.toLowerCase();
  const vacIndustry = vacancy.industry.toLowerCase();
  const candEmployer = session.employerType.toLowerCase();
  const vacEmployer = vacancy.employerType.toLowerCase();
  const industryTokenOverlap = overlap(tokenize(candIndustry), tokenize(vacIndustry));
  const employerBonus = (candEmployer === vacEmployer || vacEmployer.includes(candEmployer)) ? 15 : 0;
  const industryAlignment = clamp(industryTokenOverlap + employerBonus);

  // 5. Interview score (if available)
  const interviewScore = interviewScores ? interviewScores.overall : null;

  // 6. Employability score — derived from interview competencies if available
  const employabilityScore = interviewScores
    ? clamp(
        interviewScores.competencies.reduce((s, c) => s + c.score, 0) /
          interviewScores.competencies.length
      )
    : clamp(skillsMatch * 0.6 + experienceMatch * 0.4);

  // 7. Career readiness
  const careerReadiness = interviewScores
    ? (() => {
        switch (interviewScores.candidateReadiness) {
          case "Immediately Ready": return 95;
          case "Ready After Coaching": return 72;
          case "Ready After Upskilling": return 50;
          case "Long-Term Development": return 28;
          default: return 50;
        }
      })()
    : clamp(experienceMatch * 0.5 + skillsMatch * 0.5);

  // ── Overall score: weighted composite ──
  const weights = {
    skillsMatch: 0.25,
    industryAlignment: 0.20,
    keywordRelevance: 0.15,
    experienceMatch: 0.15,
    employabilityScore: 0.10,
    interviewScore: 0.10,
    careerReadiness: 0.05,
  };
  const overallMatchScore = clamp(
    skillsMatch * weights.skillsMatch +
    industryAlignment * weights.industryAlignment +
    keywordRelevance * weights.keywordRelevance +
    experienceMatch * weights.experienceMatch +
    employabilityScore * weights.employabilityScore +
    (interviewScore ?? employabilityScore) * weights.interviewScore +
    careerReadiness * weights.careerReadiness
  );

  // ── Match status ──
  let matchStatus: CandidateMatchStatus;
  if (overallMatchScore >= 78) matchStatus = "Strong Match";
  else if (overallMatchScore >= 60) matchStatus = "Recommended";
  else if (overallMatchScore >= 42) matchStatus = "Potential Match";
  else matchStatus = "Low Match";

  // ── Shortlist recommendation ──
  let shortlistRecommendation: ShortlistRecommendation;
  let shortlistReasoning: string;
  if (overallMatchScore >= 78 && interviewScore !== null && interviewScore >= 65) {
    shortlistRecommendation = "Shortlist Immediately";
    shortlistReasoning = `${session.candidateName} demonstrates a ${overallMatchScore}% match with strong interview performance (${interviewScore}/100). Immediate shortlisting is recommended.`;
  } else if (overallMatchScore >= 60) {
    shortlistRecommendation = "Interview Recommended";
    shortlistReasoning = `${session.candidateName} shows a ${overallMatchScore}% role alignment. Proceed to structured interview to validate ${interviewScore === null ? "performance and" : ""} technical competencies.`;
  } else if (overallMatchScore >= 45) {
    shortlistRecommendation = "Keep in Talent Pool";
    shortlistReasoning = `${session.candidateName} has relevant potential but a ${overallMatchScore}% match falls below the shortlist threshold. Retain in talent pool for future vacancies.`;
  } else if (overallMatchScore >= 30) {
    shortlistRecommendation = "Consider for Future Roles";
    shortlistReasoning = `${session.candidateName} is not an immediate fit for this role (${overallMatchScore}% match) but may be suitable for related positions after upskilling.`;
  } else {
    shortlistRecommendation = "Not Recommended";
    shortlistReasoning = `${session.candidateName}'s profile indicates insufficient alignment (${overallMatchScore}%) with this vacancy's requirements at this stage.`;
  }

  // ── Skills analysis ──
  const matchedSkills = vacancyKeywords
    .filter((kw) => cvTokens.includes(kw) || candidateTokens.includes(kw))
    .slice(0, 8);
  const missingSkills = vacancyKeywords
    .filter((kw) => !cvTokens.includes(kw) && !candidateTokens.includes(kw))
    .slice(0, 6);

  // ── Strengths ──
  const strengths: string[] = [];
  if (industryAlignment >= 60) strengths.push(`${session.industry} industry experience`);
  if (skillsMatch >= 60) strengths.push("Relevant skills profile");
  if (experienceMatch >= 70) strengths.push(`${session.experienceLevel} experience level`);
  if (interviewScore !== null && interviewScore >= 65) strengths.push("Strong interview performance");
  if (careerReadiness >= 70) strengths.push("High career readiness");
  if (matchedSkills.length >= 4) strengths.push(`Matches ${matchedSkills.length} key requirements`);
  if (strengths.length === 0) strengths.push("Candidate has relevant background to build upon");

  // ── Gaps ──
  const gaps: string[] = [];
  if (industryAlignment < 50) gaps.push(`Limited ${vacancy.industry} sector experience`);
  if (missingSkills.length > 3) gaps.push(`Missing: ${missingSkills.slice(0, 3).join(", ")}`);
  if (interviewScore !== null && interviewScore < 50) gaps.push("Below average interview performance");
  if (!interviewScore) gaps.push("No interview assessment on record");
  if (gaps.length === 0) gaps.push("No critical gaps identified");

  // ── Match explanation ──
  const matchExplanation =
    `${session.candidateName} achieves a ${overallMatchScore}% match with this vacancy. ` +
    `The candidate demonstrates ${skillsMatch >= 60 ? "strong" : skillsMatch >= 40 ? "moderate" : "limited"} skills alignment ` +
    `and ${industryAlignment >= 60 ? "good" : "partial"} industry fit within ${session.industry}. ` +
    (interviewScore !== null
      ? `AI interview assessment score is ${interviewScore}/100 (${interviewScore >= 65 ? "above" : interviewScore >= 45 ? "at" : "below"} average). `
      : "No interview assessment has been completed. ") +
    (missingSkills.length > 0
      ? `Key gaps include: ${missingSkills.slice(0, 3).join(", ")}. `
      : "No significant skill gaps identified. ") +
    shortlistReasoning;

  // ── Talent pool ──
  const futureFit =
    overallMatchScore >= 60
      ? `Well-suited for ${vacancy.jobTitle} roles and adjacent positions in ${vacancy.industry}.`
      : `Better fit for entry-level or adjacent ${session.industry} positions. Consider in ${6 - Math.floor(overallMatchScore / 20)} months after upskilling.`;

  const alternativeRoles: string[] = [];
  if (session.industry !== vacancy.industry) alternativeRoles.push(`${session.industry} Specialist`);
  alternativeRoles.push(`Junior ${vacancy.jobTitle}`);
  if (experienceMatch >= 70) alternativeRoles.push(`Senior ${session.targetRole}`);

  const reskillingPotential =
    careerReadiness >= 70
      ? "High reskilling potential. Candidate demonstrates strong foundational capability."
      : careerReadiness >= 50
      ? "Moderate reskilling potential with 3–6 months of targeted training."
      : "Requires structured upskilling programme before deployment readiness.";

  return {
    sessionId: session.id,
    candidateName: session.candidateName,
    candidateEmail: session.candidateEmail,
    targetRole: session.targetRole,
    industry: session.industry,
    employerType: session.employerType,
    experienceLevel: session.experienceLevel,
    overallMatchScore,
    skillsMatch,
    experienceMatch,
    industryAlignment,
    employabilityScore,
    interviewScore,
    careerReadiness,
    keywordRelevance,
    matchStatus,
    matchExplanation,
    shortlistRecommendation,
    shortlistReasoning,
    matchedSkills,
    missingSkills,
    strengths,
    gaps,
    futureFit,
    alternativeRoles,
    reskillingPotential,
    hasInterviewData: interviewScore !== null,
  };
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export function buildVacancyIntelligence(vacancy: VacancyRequirements): VacancyIntelligence {
  const sessions = loadSessions().filter((s) => s.status === "completed" || s.answers && Object.keys(s.answers).length > 0);
  const vacancyKeywords = extractSkillKeywords(`${vacancy.jobTitle} ${vacancy.description} ${vacancy.requirements} ${vacancy.industry} ${vacancy.employerType}`);

  const rankedCandidates = sessions
    .map((s) => matchCandidate(s, vacancy, vacancyKeywords))
    .sort((a, b) => b.overallMatchScore - a.overallMatchScore);

  const matchedCandidates = rankedCandidates.filter((c) => c.overallMatchScore >= 42).length;
  const avgScore =
    rankedCandidates.length > 0
      ? Math.round(rankedCandidates.reduce((s, c) => s + c.overallMatchScore, 0) / rankedCandidates.length)
      : 0;

  // Aggregate skills
  const allMatched = rankedCandidates.flatMap((c) => c.matchedSkills);
  const allMissing = rankedCandidates.flatMap((c) => c.missingSkills);
  const countSkill = (arr: string[]) => {
    const freq: Record<string, number> = {};
    for (const s of arr) freq[s] = (freq[s] ?? 0) + 1;
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([s]) => s).slice(0, 6);
  };

  const interviewCompletion =
    sessions.length > 0
      ? Math.round((sessions.filter((s) => s.status === "completed").length / sessions.length) * 100)
      : 0;

  return {
    vacancy,
    totalApplicants: sessions.length,
    matchedCandidates,
    averageMatchScore: avgScore,
    topSkillsFound: countSkill(allMatched),
    topSkillsMissing: countSkill(allMissing),
    interviewCompletionRate: interviewCompletion,
    rankedCandidates,
  };
}

export type PocCandidate = {
  id: string;
  candidate_id: string;
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  education_level: string | null;
  field_of_study: string | null;
  preferred_state: string | null;
  preferred_salary: string | null;
  preferred_occupation: string | null;
  previous_occupation: string | null;
  previous_years_experience: string | null;
  skills: string | null;
  applications: number;
  interviews: number;
  offers: number;
};

function experienceFromYears(years: string | null): string {
  if (!years) return "1–3 years";
  const n = parseInt(years, 10);
  if (isNaN(n)) return "1–3 years";
  if (n === 0) return "Fresh Graduate";
  if (n <= 3) return "1–3 years";
  if (n <= 5) return "3–5 years";
  if (n <= 10) return "5–10 years";
  return "10+ years";
}

export function buildIntelligenceFromPoc(
  vacancy: VacancyRequirements,
  pocCandidates: PocCandidate[]
): VacancyIntelligence {
  const vacancyKeywords = extractSkillKeywords(
    `${vacancy.jobTitle} ${vacancy.description} ${vacancy.requirements} ${vacancy.industry} ${vacancy.employerType}`
  );

  const rankedCandidates: CandidateMatch[] = pocCandidates.map((c) => {
    const score = c.score;
    const matchedSkills = c.matched_skills ?? [];
    const missingSkills = c.missing_skills ?? [];
    const experienceLevel = experienceFromYears(c.previous_years_experience);
    const targetRole = c.preferred_occupation ?? c.previous_occupation ?? "—";
    const industry = c.field_of_study ?? vacancy.industry;

    let matchStatus: CandidateMatchStatus;
    if (score >= 78) matchStatus = "Strong Match";
    else if (score >= 60) matchStatus = "Recommended";
    else if (score >= 42) matchStatus = "Potential Match";
    else matchStatus = "Low Match";

    let shortlistRecommendation: ShortlistRecommendation;
    let shortlistReasoning: string;
    if (score >= 78) {
      shortlistRecommendation = "Shortlist Immediately";
      shortlistReasoning = `Candidate demonstrates a ${score}% match with vacancy requirements. Immediate shortlisting recommended.`;
    } else if (score >= 60) {
      shortlistRecommendation = "Interview Recommended";
      shortlistReasoning = `Candidate shows a ${score}% role alignment. Proceed to structured interview to validate competencies.`;
    } else if (score >= 45) {
      shortlistRecommendation = "Keep in Talent Pool";
      shortlistReasoning = `Candidate has relevant potential but a ${score}% match falls below the shortlist threshold. Retain in talent pool.`;
    } else if (score >= 30) {
      shortlistRecommendation = "Consider for Future Roles";
      shortlistReasoning = `Candidate is not an immediate fit (${score}%) but may be suitable for related positions after upskilling.`;
    } else {
      shortlistRecommendation = "Not Recommended";
      shortlistReasoning = `Candidate's profile indicates insufficient alignment (${score}%) with this vacancy's requirements.`;
    }

    const strengths: string[] = [];
    if (matchedSkills.length >= 4) strengths.push(`Matches ${matchedSkills.length} key requirements`);
    if (score >= 60) strengths.push("Strong overall alignment");
    if (c.applications > 20) strengths.push("Active job seeker");
    if (c.offers > 0) strengths.push("Has received job offers");
    if (strengths.length === 0) strengths.push("Candidate has relevant background to build upon");

    const gaps: string[] = [];
    if (missingSkills.length > 3) gaps.push(`Missing: ${missingSkills.slice(0, 3).join(", ")}`);
    if (c.applications < 5) gaps.push("Low application activity");
    if (gaps.length === 0) gaps.push("No critical gaps identified");

    return {
      sessionId: c.id,
      candidateName: c.candidate_id ?? c.id,
      candidateEmail: "",
      targetRole,
      industry,
      employerType: vacancy.employerType,
      experienceLevel,
      overallMatchScore: score,
      skillsMatch: clamp((matchedSkills.length / Math.max(vacancyKeywords.length, 1)) * 100),
      experienceMatch: 50,
      industryAlignment: clamp(score * 0.8),
      employabilityScore: clamp(score * 0.7),
      interviewScore: null,
      careerReadiness: clamp(score * 0.6),
      keywordRelevance: clamp(score * 0.5),
      matchStatus,
      matchExplanation: `Candidate achieves a ${score}% match. ${matchedSkills.length} skills matched, ${missingSkills.length} gaps identified.`,
      shortlistRecommendation,
      shortlistReasoning,
      matchedSkills,
      missingSkills,
      strengths,
      gaps,
      futureFit: score >= 60
        ? `Well-suited for ${vacancy.jobTitle} roles and adjacent positions.`
        : `Better fit for entry-level or adjacent positions. Consider after upskilling.`,
      alternativeRoles: [`Junior ${vacancy.jobTitle}`, targetRole],
      reskillingPotential: score >= 70
        ? "High reskilling potential with strong foundational capability."
        : "Moderate reskilling potential with targeted training.",
      hasInterviewData: false,
    };
  });

  rankedCandidates.sort((a, b) => b.overallMatchScore - a.overallMatchScore);

  const matchedCandidates = rankedCandidates.filter((c) => c.overallMatchScore >= 42).length;
  const avgScore = rankedCandidates.length > 0
    ? Math.round(rankedCandidates.reduce((s, c) => s + c.overallMatchScore, 0) / rankedCandidates.length)
    : 0;

  const allMatched = rankedCandidates.flatMap((c) => c.matchedSkills);
  const allMissing = rankedCandidates.flatMap((c) => c.missingSkills);
  const countSkill = (arr: string[]) => {
    const freq: Record<string, number> = {};
    for (const s of arr) freq[s] = (freq[s] ?? 0) + 1;
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([s]) => s).slice(0, 6);
  };

  return {
    vacancy,
    totalApplicants: rankedCandidates.length,
    matchedCandidates,
    averageMatchScore: avgScore,
    topSkillsFound: countSkill(allMatched),
    topSkillsMissing: countSkill(allMissing),
    interviewCompletionRate: 0,
    rankedCandidates,
  };
}

export function getMatchStatusConfig(status: CandidateMatchStatus) {
  switch (status) {
    case "Strong Match":
      return { bg: "bg-[var(--success)]/10 border-[var(--success)]/20", text: "text-[var(--success)]" };
    case "Recommended":
      return { bg: "bg-primary/10 border-primary/20", text: "text-primary" };
    case "Potential Match":
      return { bg: "bg-[#F97316]/10 border-[#F97316]/20", text: "text-[#F97316]" };
    case "Low Match":
      return { bg: "bg-secondary border-border", text: "text-muted-foreground" };
  }
}

export function getShortlistConfig(rec: ShortlistRecommendation) {
  switch (rec) {
    case "Shortlist Immediately":
      return { text: "text-[var(--success)]", bg: "bg-[var(--success)]/10" };
    case "Interview Recommended":
      return { text: "text-primary", bg: "bg-primary/10" };
    case "Keep in Talent Pool":
      return { text: "text-[#F97316]", bg: "bg-[#F97316]/10" };
    case "Consider for Future Roles":
      return { text: "text-muted-foreground", bg: "bg-secondary" };
    case "Not Recommended":
      return { text: "text-destructive", bg: "bg-destructive/10" };
  }
}
