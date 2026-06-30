// Vacancy Optimization & AI Vacancy Builder Engine
// Reuses MASCO occupation intelligence for alignment scoring

import { classifyOccupation, type OccupationProfile } from "./masco-intelligence";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type VacancyInput = {
  jobTitle: string;
  industry: string;
  employerType: string;
  experienceLevel: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  requiredSkills: string;
  preferredSkills: string;
  qualifications: string;
  responsibilities: string;
  benefits: string;
  location: string;
  description?: string;
};

export type ScoreCategory = {
  name: string;
  score: number;
  explanation: string;
  suggestions: string[];
};

export type ChecklistItem = {
  label: string;
  passed: boolean;
  action?: string;
};

export type PublishingReadiness = "Ready to Publish" | "Needs Minor Improvements" | "Needs Significant Improvements";

export type HiringSuccessPrediction = "High" | "Moderate" | "Low";
export type CandidatePoolForecast = "Strong Candidate Pool" | "Moderate Candidate Pool" | "Limited Candidate Pool";
export type AttractionLevel = "Excellent" | "Strong" | "Average" | "Low";

export type VacancyOptimizationReport = {
  // Overall
  vacancyQualityScore: number;
  publishingReadiness: PublishingReadiness;
  publishingReasoning: string;

  // 12 intelligence sections
  scoreCategories: ScoreCategory[];
  improvedDescription: string;
  improvedRequirements: string;
  mascoProfile: OccupationProfile;
  mascoAlignmentBefore: number;
  mascoAlignmentAfter: number;
  missingOccupationSkills: string[];
  suggestedOccupationKeywords: string[];

  requiredSkillsList: string[];
  preferredSkillsList: string[];
  missingSkills: string[];
  emergingSkills: string[];
  industrySkills: string[];
  govtSkills: string[];

  salaryMarketMin: string;
  salaryMarketMid: string;
  salaryMarketMax: string;
  salaryCompetitiveness: "Above Market" | "At Market" | "Below Market" | "Not Specified";
  salaryRecommendation: string;

  attractionScore: number;
  attractionLevel: AttractionLevel;
  attractionFactors: string[];

  completenessItems: ChecklistItem[];
  missingCompleteness: string[];

  hiringSuccessPrediction: HiringSuccessPrediction;
  hiringSuccessExplanation: string;

  candidatePoolForecast: CandidatePoolForecast;
  estimatedMatchRate: number;
  expectedApplicantQuality: string;
  potentialSkillShortages: string[];

  improvementChecklist: ChecklistItem[];
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
}

function parseSalary(s: string): number {
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

const EMERGING_SKILLS_MAP: Record<string, string[]> = {
  "Finance & Banking": ["ESG reporting", "Regtech", "Open banking", "BNPL analysis"],
  "Accounting": ["AI-assisted auditing", "e-Invoicing (LHDN)", "Blockchain auditing"],
  "IT / Software": ["AI/ML integration", "LLM prompt engineering", "WebAssembly", "Edge computing"],
  "Data & Analytics": ["Generative AI analytics", "Real-time streaming (Kafka)", "MLOps"],
  "Human Resources": ["AI-assisted recruitment", "People analytics", "DEI strategy"],
  "Marketing": ["AI content generation", "Generative AI marketing", "First-party data strategy"],
  "Operations": ["Digital twin", "Autonomous logistics", "Supply chain AI"],
  "Engineering": ["Digital twin simulation", "Additive manufacturing", "Smart manufacturing IoT"],
  "Healthcare": ["Telemedicine", "AI diagnostics", "Digital health records (EMR)"],
  "Education": ["AI-powered learning", "Metaverse education", "Micro-credentials"],
  "Government / Public Sector": ["GovTech", "MyDIGITAL initiatives", "e-Government services"],
  "Sales": ["AI-assisted selling", "Revenue intelligence", "Conversational AI (chatbots)"],
  "Customer Service": ["Conversational AI", "Sentiment analysis", "Omnichannel CX"],
  "Administration": ["RPA (Robotic Process Automation)", "Digital document management"],
};

// ─────────────────────────────────────────────
// Vacancy description/requirements writer
// ─────────────────────────────────────────────

function generateImprovedDescription(input: VacancyInput, occ: OccupationProfile): string {
  const expYears = input.experienceLevel || occ.experienceYears;
  const empType = input.employmentType || "Full-time";
  const location = input.location || "Malaysia";

  return `About the Role

We are seeking a motivated and detail-oriented ${input.jobTitle} to join our ${input.employerType || "organisation"} team. This is a ${empType} position based in ${location}, offering an excellent opportunity to contribute to ${input.industry || occ.jobFamily} operations and grow your career within a structured and supportive environment.

Key Responsibilities

• ${occ.hardSkills.slice(0, 3).map(s => `Apply ${s} to deliver high-quality outcomes`).join("\n• ")}
• Collaborate with cross-functional teams to support ${input.industry || occ.jobFamily} objectives
• Prepare and maintain accurate documentation, reports, and records
• Ensure compliance with relevant industry standards and organisational policies
• Contribute to continuous improvement initiatives within your area of responsibility
• Communicate effectively with stakeholders at all levels

Why Join Us

${input.employerType === "Government" || input.employerType === "GLC"
  ? "• Stable employment with structured career progression aligned to public service frameworks\n• Competitive government / GLC compensation and benefits package\n• Opportunities for professional development through INTAN / HRDCorp programmes"
  : "• Competitive salary package with performance-based incentives\n• Structured career development and progression opportunities\n• Dynamic and collaborative work environment\n• Learning and development support"}
${input.benefits ? `• ${input.benefits.split(/[,\n]/).map(b => b.trim()).filter(Boolean).join("\n• ")}` : ""}`.trim();
}

function generateImprovedRequirements(input: VacancyInput, occ: OccupationProfile): string {
  const skillLines = [
    ...(input.requiredSkills ? input.requiredSkills.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : occ.hardSkills.slice(0, 5)),
  ];
  const prefLines = [
    ...(input.preferredSkills ? input.preferredSkills.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : occ.softSkills.slice(0, 3)),
  ];
  const quals = input.qualifications || occ.minimumQualification;
  const expLevel = input.experienceLevel || occ.experienceLevel;

  return `Qualifications & Experience

• ${quals}
• ${expLevel} of relevant experience in ${input.industry || occ.jobFamily}
${input.employerType === "Government" ? "• Malaysian citizenship required\n• SPA / JPA application eligibility" : ""}

Required Skills & Competencies

${skillLines.map(s => `• ${s}`).join("\n")}

Preferred Skills

${prefLines.map(s => `• ${s}`).join("\n")}
${occ.certifications.length > 0 ? `\nCertifications (Advantageous)\n${occ.certifications.slice(0, 3).map(c => `• ${c}`).join("\n")}` : ""}

Personal Attributes

${occ.softSkills.slice(0, 4).map(s => `• ${s}`).join("\n")}
${occ.isPublicSector ? "\n• High integrity and commitment to public service values\n• Proficiency in Bahasa Malaysia (written and spoken)\n• Understanding of government policies and procedures" : ""}`.trim();
}

// ─────────────────────────────────────────────
// Score categories
// ─────────────────────────────────────────────

function scoreJobTitle(input: VacancyInput, occ: OccupationProfile): ScoreCategory {
  let score = 50;
  const suggestions: string[] = [];

  if (input.jobTitle.length >= 5) score += 15;
  if (input.jobTitle.length > 40) { score -= 10; suggestions.push("Shorten the job title to under 40 characters for better ATS readability"); }
  if (!input.jobTitle.match(/manager|director|executive|officer|analyst|engineer|specialist|coordinator|assistant|developer/i)) {
    suggestions.push(`Consider aligning title with MASCO occupation: "${occ.occupationTitle}"`);
  } else { score += 15; }
  if (occ.confidenceScore >= 70) score += 20;
  else { score += 10; suggestions.push(`Improve title clarity to better align with MASCO category: ${occ.mascoCategory}`); }

  return {
    name: "Job Title Quality",
    score: clamp(score),
    explanation: `The title "${input.jobTitle}" ${occ.confidenceScore >= 70 ? "aligns well" : "partially aligns"} with the MASCO occupation category "${occ.mascoCategory}" (${occ.mascoCode}).`,
    suggestions: suggestions.length ? suggestions : ["Job title is clear and professionally framed"],
  };
}

function scoreSkillsDefinition(input: VacancyInput, occ: OccupationProfile): ScoreCategory {
  const reqSkills = input.requiredSkills.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  const prefSkills = input.preferredSkills.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  let score = 20;
  const suggestions: string[] = [];

  if (reqSkills.length >= 3) score += 25;
  else { suggestions.push("Add at least 3 specific required skills to improve matching accuracy"); }
  if (reqSkills.length >= 6) score += 15;
  if (prefSkills.length >= 2) score += 15;
  else { suggestions.push("Add preferred skills to attract higher-quality candidates"); }

  const tokens = tokenize(`${input.requiredSkills} ${input.preferredSkills}`);
  const occTokens = tokenize(occ.hardSkills.join(" "));
  const overlap = occTokens.filter(t => tokens.includes(t)).length;
  if (overlap >= 3) score += 20;
  else { suggestions.push(`Include occupation-standard skills: ${occ.hardSkills.slice(0, 3).join(", ")}`); }
  if (overlap >= 6) score += 5;

  return {
    name: "Skills Definition",
    score: clamp(score),
    explanation: `${reqSkills.length} required and ${prefSkills.length} preferred skills identified. ${overlap} overlap with MASCO ${occ.jobFamily} standard skills taxonomy.`,
    suggestions: suggestions.length ? suggestions : ["Skills definition is comprehensive and well-aligned"],
  };
}

function scoreSalaryTransparency(input: VacancyInput, occ: OccupationProfile): ScoreCategory {
  const min = parseSalary(input.salaryMin);
  const max = parseSalary(input.salaryMax);
  let score = 10;
  const suggestions: string[] = [];

  if (min > 0) score += 30;
  else suggestions.push("Add a minimum salary figure — vacancies with salary ranges receive up to 3× more applications");
  if (max > 0) score += 20;
  else suggestions.push("Specify maximum salary to attract candidates who self-select appropriately");
  if (min > 0 && max > 0 && max > min) score += 20;
  if (min > 0 && max > 0 && (max - min) <= min * 0.5) score += 20;
  else if (min > 0 && max > 0) suggestions.push("Narrow the salary band for more precise candidate targeting");

  const marketMid = parseInt(occ.salaryBand.mid.replace(/[^0-9]/g, ""), 10) || 0;
  if (min > 0 && marketMid > 0 && min < marketMid * 0.85) {
    suggestions.push(`Current minimum (RM${min.toLocaleString()}) is below market mid (${occ.salaryBand.mid}). Consider revising upward.`);
  }

  return {
    name: "Salary Transparency",
    score: clamp(score),
    explanation: min > 0 && max > 0
      ? `Salary range RM${min.toLocaleString()}–RM${max.toLocaleString()} is ${score >= 60 ? "well-defined" : "partially defined"}.`
      : "No salary range specified. This significantly reduces application quality and volume.",
    suggestions: suggestions.length ? suggestions : ["Salary range is clearly specified and competitive"],
  };
}

function scoreQualificationClarity(input: VacancyInput, occ: OccupationProfile): ScoreCategory {
  let score = 20;
  const suggestions: string[] = [];

  if (input.qualifications.length >= 20) score += 30;
  else { score += 10; suggestions.push(`Specify minimum qualification: "${occ.minimumQualification}"`); }
  if (input.qualifications.match(/diploma|degree|bachelor|master|phd|certificate|spm/i)) score += 25;
  else suggestions.push("Use specific Malaysian qualification terminology (SPM, Diploma, Degree, Masters)");
  if (input.experienceLevel) score += 15;
  else suggestions.push("State the required experience level explicitly (e.g. Entry Level, 1–3 years, Senior)");
  if (input.qualifications.length > 0 && input.experienceLevel) score += 10;

  return {
    name: "Qualification Clarity",
    score: clamp(score),
    explanation: `Qualification requirements are ${score >= 60 ? "clearly" : "partially"} defined. ${input.experienceLevel ? `Experience level "${input.experienceLevel}" is specified.` : "No experience level stated."}`,
    suggestions: suggestions.length ? suggestions : ["Qualification and experience requirements are well-defined"],
  };
}

function scoreAtsReadiness(input: VacancyInput, occ: OccupationProfile): ScoreCategory {
  const fullText = `${input.jobTitle} ${input.requiredSkills} ${input.responsibilities} ${input.qualifications}`.toLowerCase();
  const tokens = tokenize(fullText);
  const occTokens = tokenize(occ.hardSkills.concat(occ.softSkills).join(" "));
  const keywordDensity = occTokens.filter(t => tokens.includes(t)).length;
  let score = 30;
  const suggestions: string[] = [];

  if (keywordDensity >= 3) score += 20;
  else suggestions.push(`Add occupation keywords to improve ATS indexing: ${occ.hardSkills.slice(0, 3).join(", ")}`);
  if (keywordDensity >= 6) score += 20;
  if (input.responsibilities.length >= 100) score += 15;
  else suggestions.push("Expand responsibilities section with specific, measurable duties");
  if (input.jobTitle.match(/^[a-zA-Z\s\/\-]+$/)) score += 15;
  else suggestions.push("Simplify job title — avoid special characters, numbers, or internal codes");

  return {
    name: "ATS Readiness",
    score: clamp(score),
    explanation: `${keywordDensity} occupation-standard keywords detected. ${score >= 60 ? "Good ATS compatibility." : "Keyword density needs improvement for better ATS ranking."}`,
    suggestions: suggestions.length ? suggestions : ["Vacancy is well-optimized for ATS indexing"],
  };
}

function scoreCandidateAttraction(input: VacancyInput, occ: OccupationProfile): ScoreCategory {
  let score = 20;
  const suggestions: string[] = [];

  if (parseSalary(input.salaryMin) > 0) score += 20;
  else suggestions.push("Salary transparency improves attraction score significantly");
  if (input.benefits.length >= 20) score += 20;
  else suggestions.push("Add employee benefits (medical, EPF, leave entitlements, training) to improve attractiveness");
  if (input.responsibilities.length >= 80) score += 15;
  else suggestions.push("Describe career growth and learning opportunities in the responsibilities section");
  if (input.employerType === "MNC" || input.employerType === "GLC") score += 15;
  else if (input.employerType === "Government") score += 20;
  if (input.requiredSkills.split(/[,\n]/).filter(Boolean).length >= 4) score += 10;

  return {
    name: "Candidate Attraction",
    score: clamp(score),
    explanation: `Attraction factors: salary ${parseSalary(input.salaryMin) > 0 ? "specified" : "missing"}, benefits ${input.benefits.length >= 20 ? "included" : "insufficient"}, employer type "${input.employerType || "unspecified"}".`,
    suggestions: suggestions.length ? suggestions : ["Vacancy has strong candidate attraction characteristics"],
  };
}

function scoreMascoAlignment(input: VacancyInput, occ: OccupationProfile): ScoreCategory {
  const score = clamp(occ.confidenceScore);
  const suggestions: string[] = [];

  if (score < 70) suggestions.push(`Refine job title to better align with MASCO category: "${occ.mascoCategory}"`);
  if (score < 80) suggestions.push(`Add occupation keywords: ${occ.hardSkills.slice(0, 3).join(", ")}`);
  if (score >= 80) suggestions.push("Maintain strong MASCO alignment in final published version");

  return {
    name: "MASCO Alignment",
    score,
    explanation: `${score}% alignment with MASCO ${occ.mascoCode} — "${occ.mascoCategory}". Job family: ${occ.jobFamily}.`,
    suggestions: suggestions.length ? suggestions : ["Strong MASCO occupation alignment detected"],
  };
}

// ─────────────────────────────────────────────
// Public API — main analyser
// ─────────────────────────────────────────────

export function analyzeVacancy(input: VacancyInput): VacancyOptimizationReport {
  const occ = classifyOccupation(
    input.jobTitle,
    input.industry,
    input.employerType,
    input.description ?? `${input.responsibilities} ${input.requiredSkills}`,
    input.qualifications
  );

  const isGovt = input.employerType === "Government" || occ.isPublicSector;

  // Score categories
  const titleScore = scoreJobTitle(input, occ);
  const skillsScore = scoreSkillsDefinition(input, occ);
  const salaryScore = scoreSalaryTransparency(input, occ);
  const qualScore = scoreQualificationClarity(input, occ);
  const atsScore = scoreAtsReadiness(input, occ);
  const attractionScore = scoreCandidateAttraction(input, occ);
  const mascoScore = scoreMascoAlignment(input, occ);

  const scoreCategories = [titleScore, skillsScore, salaryScore, qualScore, atsScore, attractionScore, mascoScore];
  const vacancyQualityScore = clamp(
    scoreCategories.reduce((s, c) => s + c.score, 0) / scoreCategories.length
  );

  // MASCO alignment before/after
  const mascoAlignmentBefore = occ.confidenceScore;
  const mascoAlignmentAfter = clamp(Math.min(95, occ.confidenceScore + 15 + skillsScore.score * 0.1));

  // Missing occupation skills
  const inputTokens = tokenize(`${input.requiredSkills} ${input.preferredSkills} ${input.responsibilities}`);
  const missingOccupationSkills = occ.hardSkills.filter(s => !tokenize(s).every(t => inputTokens.some(i => i.includes(t) || t.includes(i)))).slice(0, 6);
  const suggestedOccupationKeywords = occ.hardSkills.slice(0, 5).concat(occ.softSkills.slice(0, 3));

  // Skills
  const requiredSkillsList = input.requiredSkills.split(/[,\n]/).map(s => s.trim()).filter(Boolean).length > 0
    ? input.requiredSkills.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    : occ.hardSkills.slice(0, 6);
  const preferredSkillsList = input.preferredSkills.split(/[,\n]/).map(s => s.trim()).filter(Boolean).length > 0
    ? input.preferredSkills.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    : occ.softSkills.slice(0, 4);
  const missingSkills = missingOccupationSkills;
  const emergingSkills = EMERGING_SKILLS_MAP[occ.jobFamily] ?? [];
  const industrySkills = occ.industrySkills;
  const govtSkills = isGovt ? occ.publicSectorSkills : [];

  // Salary
  const min = parseSalary(input.salaryMin);
  const max = parseSalary(input.salaryMax);
  const marketMid = parseInt(occ.salaryBand.mid.replace(/[^0-9]/g, ""), 10) || 0;
  let salaryCompetitiveness: VacancyOptimizationReport["salaryCompetitiveness"] = "Not Specified";
  let salaryRecommendation = "Add a salary range to attract qualified candidates.";
  if (min > 0 && marketMid > 0) {
    if (min >= marketMid * 0.95) { salaryCompetitiveness = "At Market"; salaryRecommendation = "Salary is competitive. Maintain current range."; }
    else if (min >= marketMid * 0.8) { salaryCompetitiveness = "Below Market"; salaryRecommendation = `Consider increasing the minimum salary to at least ${occ.salaryBand.mid} to attract quality applicants.`; }
    else { salaryCompetitiveness = "Below Market"; salaryRecommendation = `Salary is significantly below market rate (${occ.salaryBand.mid}). Revise upward to remain competitive.`; }
    if (max > 0 && max > marketMid * 1.15) { salaryCompetitiveness = "Above Market"; salaryRecommendation = "Salary is above market rate. Expect strong applicant volume."; }
  }

  // Attraction
  const attrScore = attractionScore.score;
  let attractionLevel: AttractionLevel = "Low";
  if (attrScore >= 80) attractionLevel = "Excellent";
  else if (attrScore >= 60) attractionLevel = "Strong";
  else if (attrScore >= 40) attractionLevel = "Average";
  const attractionFactors: string[] = [];
  if (parseSalary(input.salaryMin) > 0) attractionFactors.push("Salary transparency");
  if (input.benefits.length >= 20) attractionFactors.push("Benefits package included");
  if (input.employerType === "Government") attractionFactors.push("Government stability & pension");
  else if (input.employerType === "MNC") attractionFactors.push("MNC brand and career opportunities");
  else if (input.employerType === "GLC") attractionFactors.push("GLC stability and structured growth");
  if (input.responsibilities.length >= 80) attractionFactors.push("Clear role responsibilities");
  if (attractionFactors.length === 0) attractionFactors.push("Role title and industry signal");

  // Completeness
  const completenessItems: ChecklistItem[] = [
    { label: "Job Responsibilities", passed: input.responsibilities.length >= 50, action: "Add detailed day-to-day responsibilities" },
    { label: "Required Skills", passed: input.requiredSkills.split(/[,\n]/).filter(Boolean).length >= 3, action: "List at least 3 specific required skills" },
    { label: "Qualifications", passed: input.qualifications.length >= 15, action: "Specify minimum educational qualification" },
    { label: "Experience Level", passed: input.experienceLevel.length > 0, action: "State the expected years / level of experience" },
    { label: "Salary Range", passed: parseSalary(input.salaryMin) > 0, action: "Include a salary range to improve application quality" },
    { label: "Benefits", passed: input.benefits.length >= 15, action: "List employee benefits (EPF, medical, annual leave)" },
    { label: "Location", passed: input.location.length >= 3, action: "Specify the work location" },
    { label: "Employment Type", passed: input.employmentType.length > 0, action: "Specify full-time, part-time, or contract" },
    { label: "Career Growth Information", passed: input.responsibilities.toLowerCase().includes("grow") || input.responsibilities.toLowerCase().includes("develop") || input.benefits.toLowerCase().includes("training"), action: "Mention career progression or learning opportunities" },
  ];
  const missingCompleteness = completenessItems.filter(c => !c.passed).map(c => c.label);

  // Hiring success prediction
  let hiringSuccessPrediction: HiringSuccessPrediction = "Low";
  let hiringSuccessExplanation = "";
  if (vacancyQualityScore >= 70) {
    hiringSuccessPrediction = "High";
    hiringSuccessExplanation = `This vacancy scores ${vacancyQualityScore}/100. Strong skills definition, ${salaryCompetitiveness !== "Not Specified" ? "specified salary" : "salary gaps"}, and ${occ.demandLevel.toLowerCase()} market demand position this role for successful placement.`;
  } else if (vacancyQualityScore >= 50) {
    hiringSuccessPrediction = "Moderate";
    hiringSuccessExplanation = `Vacancy scores ${vacancyQualityScore}/100. Moderate quality with ${missingCompleteness.length} incomplete sections. Address key gaps to improve placement success.`;
  } else {
    hiringSuccessPrediction = "Low";
    hiringSuccessExplanation = `Vacancy scores ${vacancyQualityScore}/100. Significant gaps in ${missingCompleteness.slice(0, 3).join(", ")} reduce candidate quality and application volume.`;
  }

  // Candidate pool forecast
  let candidatePoolForecast: CandidatePoolForecast;
  let estimatedMatchRate = 0;
  let expectedApplicantQuality = "";
  const potentialSkillShortages = missingOccupationSkills.slice(0, 3);

  if (vacancyQualityScore >= 70 && occ.demandLevel !== "Niche") {
    candidatePoolForecast = "Strong Candidate Pool";
    estimatedMatchRate = clamp(55 + (vacancyQualityScore - 70));
    expectedApplicantQuality = "High proportion of qualified, job-ready candidates expected.";
  } else if (vacancyQualityScore >= 50) {
    candidatePoolForecast = "Moderate Candidate Pool";
    estimatedMatchRate = clamp(35 + (vacancyQualityScore - 50));
    expectedApplicantQuality = "Mixed applicant quality. Expect some unqualified applications.";
  } else {
    candidatePoolForecast = "Limited Candidate Pool";
    estimatedMatchRate = clamp(15 + vacancyQualityScore * 0.3);
    expectedApplicantQuality = "Low applicant quality expected due to unclear or incomplete vacancy.";
  }

  // Improvement checklist
  const improvementChecklist: ChecklistItem[] = [
    { label: "Add salary range", passed: parseSalary(input.salaryMin) > 0 },
    { label: "Add required certifications", passed: input.qualifications.toLowerCase().includes("cert") || occ.certifications.some(c => tokenize(input.qualifications).includes(tokenize(c)[0])) },
    { label: "Clarify experience level", passed: input.experienceLevel.length > 0 },
    { label: "Include career progression", passed: input.responsibilities.toLowerCase().includes("grow") || input.benefits.toLowerCase().includes("develop") },
    { label: "Add occupation keywords", passed: atsScore.score >= 60 },
    { label: "Align job title with MASCO", passed: occ.confidenceScore >= 70 },
    { label: "Define required skills (3+)", passed: input.requiredSkills.split(/[,\n]/).filter(Boolean).length >= 3 },
    { label: "Specify benefits package", passed: input.benefits.length >= 15 },
    { label: "Include ATS-friendly keywords", passed: atsScore.score >= 55 },
    { label: "Expand responsibilities section", passed: input.responsibilities.length >= 80 },
    ...(isGovt ? [
      { label: "Include Bahasa Malaysia requirement", passed: input.qualifications.toLowerCase().includes("bahasa") || input.responsibilities.toLowerCase().includes("bahasa") },
      { label: "Specify government grade / scheme", passed: false },
    ] : []),
  ];

  // Publishing readiness
  let publishingReadiness: PublishingReadiness;
  let publishingReasoning = "";
  const passedChecks = improvementChecklist.filter(c => c.passed).length;
  const totalChecks = improvementChecklist.length;
  const passRate = passedChecks / totalChecks;

  if (vacancyQualityScore >= 70 && passRate >= 0.7) {
    publishingReadiness = "Ready to Publish";
    publishingReasoning = `Vacancy scores ${vacancyQualityScore}/100 with ${passedChecks}/${totalChecks} checklist items complete. This vacancy is well-structured, MASCO-aligned, and ready for publication.`;
  } else if (vacancyQualityScore >= 50 || passRate >= 0.5) {
    publishingReadiness = "Needs Minor Improvements";
    publishingReasoning = `Vacancy scores ${vacancyQualityScore}/100. Address ${missingCompleteness.slice(0, 3).join(", ")} to improve candidate quality before publishing.`;
  } else {
    publishingReadiness = "Needs Significant Improvements";
    publishingReasoning = `Vacancy scores ${vacancyQualityScore}/100. Critical gaps in ${missingCompleteness.slice(0, 4).join(", ")} will significantly reduce application quality and quantity.`;
  }

  return {
    vacancyQualityScore,
    publishingReadiness,
    publishingReasoning,
    scoreCategories,
    improvedDescription: generateImprovedDescription(input, occ),
    improvedRequirements: generateImprovedRequirements(input, occ),
    mascoProfile: occ,
    mascoAlignmentBefore,
    mascoAlignmentAfter,
    missingOccupationSkills,
    suggestedOccupationKeywords,
    requiredSkillsList,
    preferredSkillsList,
    missingSkills,
    emergingSkills,
    industrySkills,
    govtSkills,
    salaryMarketMin: occ.salaryBand.entry,
    salaryMarketMid: occ.salaryBand.mid,
    salaryMarketMax: occ.salaryBand.senior,
    salaryCompetitiveness,
    salaryRecommendation,
    attractionScore: attrScore,
    attractionLevel,
    attractionFactors,
    completenessItems,
    missingCompleteness,
    hiringSuccessPrediction,
    hiringSuccessExplanation,
    candidatePoolForecast,
    estimatedMatchRate,
    expectedApplicantQuality,
    potentialSkillShortages,
    improvementChecklist,
  };
}

export const EXPERIENCE_LEVELS = [
  "Fresh Graduate / Entry Level", "1–2 years", "2–4 years",
  "5–7 years", "8–10 years", "10+ years",
];

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Temporary"];

export function getReadinessConfig(r: PublishingReadiness) {
  switch (r) {
    case "Ready to Publish": return { bg: "bg-[var(--success)]/10 border-[var(--success)]/20", text: "text-[var(--success)]", dot: "bg-[var(--success)]" };
    case "Needs Minor Improvements": return { bg: "bg-[#F97316]/10 border-[#F97316]/20", text: "text-[#F97316]", dot: "bg-[#F97316]" };
    case "Needs Significant Improvements": return { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", dot: "bg-destructive" };
  }
}

export function getAttractionConfig(l: AttractionLevel) {
  switch (l) {
    case "Excellent": return { text: "text-[var(--success)]", bg: "bg-[var(--success)]/10" };
    case "Strong": return { text: "text-primary", bg: "bg-primary/10" };
    case "Average": return { text: "text-[#F97316]", bg: "bg-[#F97316]/10" };
    case "Low": return { text: "text-destructive", bg: "bg-destructive/10" };
  }
}

export function getHiringSuccessConfig(h: HiringSuccessPrediction) {
  switch (h) {
    case "High": return { text: "text-[var(--success)]", bg: "bg-[var(--success)]/10" };
    case "Moderate": return { text: "text-[#F97316]", bg: "bg-[#F97316]/10" };
    case "Low": return { text: "text-destructive", bg: "bg-destructive/10" };
  }
}
