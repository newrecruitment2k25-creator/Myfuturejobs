export type InterviewQuestion = {
  id: string;
  category: "opening" | "technical" | "behavioural" | "situational" | "government" | "communication";
  question: string;
};

export type InterviewSession = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  targetRole: string;
  industry: string;
  employerType: string;
  experienceLevel: string;
  interviewerGender: "female" | "male";
  interviewType: "text";
  questionFocus: string[];
  cvSummary?: string;
  questions: InterviewQuestion[];
  answers: Record<string, string>;
  scores: InterviewScores | null;
  status: "draft" | "scheduled" | "in-progress" | "completed";
  createdAt: string;
  completedAt?: string;
};

export type Competency = {
  name: string;
  score: number;
  assessment: string;
  recommendation: string;
};

export type StrengthItem = {
  title: string;
  evidence: string;
};

export type DevelopmentArea = {
  title: string;
  detail: string;
  action: string;
};

export type RiskItem = {
  title: string;
  detail: string;
};

export type QuestionIntelligence = {
  questionId: string;
  competencyTested: string;
  assessment: string;
  improvementAdvice: string;
  score: number;
};

export type InterviewScores = {
  overall: number;
  completionRate: number;
  executiveSummary: string;
  competencies: Competency[];
  questionIntelligence: Record<string, QuestionIntelligence>;
  strengths: StrengthItem[];
  developmentAreas: DevelopmentArea[];
  riskItems: RiskItem[];
  recommendation: "Strong Shortlist" | "Shortlist" | "Consider With Caution" | "Not Recommended Yet";
  recommendationReasoning: string;
  nextAction: string;
  nextActionDetail: string;
  candidateReadiness: "Immediately Ready" | "Ready After Coaching" | "Ready After Upskilling" | "Long-Term Development";
  readinessReasoning: string;
  analytics: {
    avgResponseQuality: number;
    strongestCompetency: string;
    weakestCompetency: string;
    confidenceEstimate: "High" | "Moderate" | "Low";
    overallPerformance: string;
  };
  interviewRoadmap: string[];
};

const STORAGE_KEY = "MYFutureJobs:interviewSessions";

export function loadSessions(): InterviewSession[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InterviewSession[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: InterviewSession): void {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getSession(id: string): InterviewSession | null {
  return loadSessions().find((s) => s.id === id) ?? null;
}

export function generateId(): string {
  return `iv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Category → competency mapping
const CATEGORY_COMPETENCY: Record<string, string> = {
  opening: "Communication",
  technical: "Technical Knowledge",
  behavioural: "Problem Solving",
  situational: "Critical Thinking",
  government: "Public Service Motivation",
  communication: "Communication",
};

function scoreOneAnswer(ans: string, roleKeywords: string[]): number {
  const a = ans.toLowerCase().trim();
  if (!a) return 0;
  const wordCount = a.split(/\s+/).length;
  const lengthScore = Math.min(35, wordCount * 1.5);
  const keywordHits = roleKeywords.filter((kw) => a.includes(kw)).length;
  const keywordScore = Math.min(35, keywordHits * 8);
  const starWords = ["situation", "task", "action", "result", "because", "therefore", "achieved", "improved", "led", "managed", "resolved"];
  const structureScore = starWords.filter((w) => a.includes(w)).length >= 2 ? 30 : 15;
  return Math.min(100, Math.round(lengthScore + keywordScore + structureScore));
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function scoreAnswers(session: InterviewSession): InterviewScores {
  const { questions, answers, targetRole, industry, employerType, experienceLevel, questionFocus, candidateName } = session;

  const roleKeywords = [
    ...targetRole.toLowerCase().split(/\s+/),
    ...industry.toLowerCase().split(/\s+/),
    employerType.toLowerCase(),
  ].filter((w) => w.length > 2);

  // Score every question
  const qScores: Record<string, number> = {};
  const qIntel: Record<string, QuestionIntelligence> = {};
  let answered = 0;
  let totalRaw = 0;

  for (const q of questions) {
    const ans = answers[q.id] ?? "";
    const score = scoreOneAnswer(ans, roleKeywords);
    qScores[q.id] = score;
    if (ans.trim()) {
      answered++;
      totalRaw += score;
    }

    const competencyTested = CATEGORY_COMPETENCY[q.category] ?? "Communication";
    let assessment: string;
    let improvementAdvice: string;

    if (!ans.trim()) {
      assessment = "No response was provided for this question.";
      improvementAdvice = "Ensure all questions are answered. Unanswered questions significantly impact the overall assessment.";
    } else if (score >= 70) {
      assessment = `The candidate provided a well-structured response demonstrating clear ${competencyTested.toLowerCase()} capability. The answer included relevant context and specific examples.`;
      improvementAdvice = "Strengthen responses further by quantifying outcomes where possible (e.g., percentages, timelines, results achieved).";
    } else if (score >= 45) {
      assessment = `The candidate gave a satisfactory response showing basic ${competencyTested.toLowerCase()} awareness. The answer lacked specific examples or measurable outcomes.`;
      improvementAdvice = "Use the STAR method (Situation, Task, Action, Result) to structure answers more effectively and demonstrate concrete impact.";
    } else {
      assessment = `The response demonstrated limited ${competencyTested.toLowerCase()} proficiency. The answer was brief and lacked specificity or relevance to the role.`;
      improvementAdvice = `Develop more detailed examples from past experience relevant to ${targetRole}. Preparation of role-specific scenarios is strongly advised.`;
    }

    qIntel[q.id] = { questionId: q.id, competencyTested, assessment, improvementAdvice, score };
  }

  const completionRate = questions.length > 0 ? answered / questions.length : 0;
  const avgRaw = answered > 0 ? totalRaw / answered : 0;
  const overall = clamp(Math.round(avgRaw * completionRate));
  const isGov = employerType.toLowerCase().includes("gov") || questionFocus.includes("Government / Civil Service");

  // Competency scores
  const byCategory: Record<string, number[]> = {};
  for (const q of questions) {
    const cat = q.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(qScores[q.id]);
  }
  const avgCat = (cat: string) => {
    const scores = byCategory[cat];
    if (!scores || scores.length === 0) return overall;
    return clamp(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
  };

  const commScore = clamp(Math.round((avgCat("opening") + avgCat("communication")) / 2));
  const techScore = avgCat("technical");
  const problemScore = avgCat("behavioural");
  const criticalScore = avgCat("situational");
  const profScore = clamp(overall + 6);
  const adaptScore = clamp(Math.round((problemScore + criticalScore) / 2) - 4);
  const leaderScore = clamp(overall - 8);
  const govScore = isGov ? avgCat("government") : null;

  const competencies: Competency[] = [
    {
      name: "Communication",
      score: commScore,
      assessment: commScore >= 65
        ? "Candidate articulates thoughts clearly and maintains a professional tone throughout responses."
        : commScore >= 45
        ? "Communication is adequate but responses could be more structured and concise."
        : "Communication clarity requires improvement. Responses lacked organisation and professional tone.",
      recommendation: commScore >= 65
        ? "Maintain communication standard. Encourage use of data-driven examples."
        : "Enrol in professional communication or presentation skills training prior to next interview stage.",
    },
    {
      name: "Technical Knowledge",
      score: techScore,
      assessment: techScore >= 65
        ? `Candidate demonstrates solid technical understanding relevant to the ${targetRole} role in ${industry}.`
        : techScore >= 45
        ? `Foundational technical knowledge is present but depth in ${industry}-specific areas is limited.`
        : `Technical responses indicate insufficient domain knowledge for a ${targetRole} position at this stage.`,
      recommendation: techScore >= 65
        ? "Proceed to technical assessment for validation of specific competencies."
        : `Recommend supplementary technical assessment or request portfolio/work samples relevant to ${industry}.`,
    },
    {
      name: "Problem Solving",
      score: problemScore,
      assessment: problemScore >= 65
        ? "Candidate demonstrates a logical approach to challenges with evidence of structured thinking."
        : problemScore >= 45
        ? "Problem-solving responses show awareness but lack specificity and measurable outcomes."
        : "Responses indicate limited structured problem-solving experience relevant to the role.",
      recommendation: problemScore >= 65
        ? "Validate with a practical case study or situational assessment."
        : "Request specific written examples of past problem resolution before proceeding.",
    },
    {
      name: "Critical Thinking",
      score: criticalScore,
      assessment: criticalScore >= 65
        ? "Candidate evaluates scenarios thoughtfully and demonstrates awareness of consequences and alternatives."
        : criticalScore >= 45
        ? "Some evidence of analytical thinking but responses lacked depth in exploring multiple options."
        : "Critical thinking responses were surface-level. Candidate may benefit from structured decision-making frameworks.",
      recommendation: criticalScore >= 65
        ? "Consider panel interview to further probe decision-making under ambiguity."
        : "Provide scenario-based assessments prior to proceeding to the next stage.",
    },
    {
      name: "Professionalism",
      score: profScore,
      assessment: profScore >= 70
        ? "Candidate maintains a professional tone and demonstrates a mature, measured approach throughout the interview."
        : profScore >= 50
        ? "Professionalism is acceptable but responses occasionally lacked consistency in tone."
        : "Professional conduct in interview responses requires development before placement consideration.",
      recommendation: profScore >= 70
        ? "No immediate concern. Observe conduct during in-person assessment."
        : "Conduct a structured reference check and in-person interview to validate professional conduct.",
    },
    {
      name: "Adaptability",
      score: adaptScore,
      assessment: adaptScore >= 60
        ? "Responses indicate a candidate who adapts to changing circumstances and embraces new challenges."
        : adaptScore >= 40
        ? "Some adaptability evident but candidate may require a more structured environment initially."
        : "Limited evidence of adaptability in responses. May struggle in dynamic or ambiguous work environments.",
      recommendation: adaptScore >= 60
        ? "Explore further in situational interview with complex, multi-variable scenarios."
        : "Assess cultural fit carefully. Consider roles with clear structure and defined processes.",
    },
    {
      name: "Leadership Potential",
      score: leaderScore,
      assessment: leaderScore >= 65
        ? "Candidate demonstrates early leadership attributes including initiative, accountability, and team orientation."
        : leaderScore >= 45
        ? "Leadership indicators are present but not consistently demonstrated across responses."
        : "Limited evidence of leadership experience or potential at this stage of assessment.",
      recommendation: leaderScore >= 65
        ? "Explore leadership capability further during hiring manager interview."
        : "Consider candidate for individual contributor roles rather than leadership tracks at this stage.",
    },
    ...(isGov
      ? [{
          name: "Public Service Motivation",
          score: govScore ?? overall,
          assessment: (govScore ?? overall) >= 60
            ? "Candidate articulates genuine motivation for public service and understanding of government values."
            : "Public service motivation responses were present but lacked conviction and specificity.",
          recommendation: (govScore ?? overall) >= 60
            ? "Suitable for public sector placement. Validate with integrity and values interview."
            : "Assess alignment with public sector values further. Consider structured values-based interview.",
        }]
      : []),
  ];

  // Determine strongest / weakest
  const sorted = [...competencies].sort((a, b) => b.score - a.score);
  const strongest = sorted[0].name;
  const weakest = sorted[sorted.length - 1].name;

  // Strengths
  const strengths: StrengthItem[] = [];
  if (completionRate === 1)
    strengths.push({ title: "Thorough Interview Completion", evidence: `${candidateName} responded to all ${questions.length} interview questions, demonstrating commitment and preparation.` });
  if (commScore >= 60)
    strengths.push({ title: "Clear Communication", evidence: "Opening and communication responses were well-structured, indicating strong verbal and written articulation skills." });
  if (techScore >= 60)
    strengths.push({ title: "Role-Relevant Technical Knowledge", evidence: `Technical responses referenced concepts pertinent to ${targetRole} in the ${industry} sector.` });
  if (problemScore >= 60)
    strengths.push({ title: "Structured Problem Solving", evidence: "Behavioural responses demonstrated a logical approach to challenges with evidence of past initiative." });
  if (isGov && (govScore ?? 0) >= 55)
    strengths.push({ title: "Public Sector Awareness", evidence: "Candidate demonstrated an understanding of public service values and the responsibilities associated with government roles." });
  if (strengths.length === 0)
    strengths.push({ title: "Assessment Participation", evidence: `${candidateName} engaged with the AI interview process and provided responses across multiple question categories.` });

  // Development areas
  const developmentAreas: DevelopmentArea[] = [];
  if (techScore < 55)
    developmentAreas.push({ title: "Technical Depth", detail: `Responses in the technical category lacked industry-specific depth expected for a ${targetRole} role.`, action: `Review core technical requirements for ${industry}. Request a skills assessment or portfolio sample before proceeding.` });
  if (completionRate < 1)
    developmentAreas.push({ title: "Interview Completion", detail: `Candidate did not complete ${Math.round((1 - completionRate) * 100)}% of interview questions.`, action: "Request a follow-up interview to address unanswered questions before making a hiring decision." });
  if (problemScore < 50)
    developmentAreas.push({ title: "Use of Measurable Examples", detail: "Problem-solving responses lacked quantifiable outcomes and specific result statements.", action: "Provide candidate with guidance on STAR method responses. Consider a structured written assessment." });
  if (isGov && (govScore ?? 0) < 50)
    developmentAreas.push({ title: "Public Sector Readiness", detail: "Government-focused responses lacked demonstrated understanding of public sector values and accountability frameworks.", action: "Assess alignment with public service values through a dedicated values-based interview." });
  if (developmentAreas.length === 0)
    developmentAreas.push({ title: "Quantifying Achievements", detail: "While responses were generally satisfactory, outcomes and achievements could be strengthened with measurable data.", action: "Encourage the use of specific metrics, percentages, and timeframes when describing past achievements." });

  // Risk items
  const riskItems: RiskItem[] = [];
  if (overall < 40)
    riskItems.push({ title: "Low Overall Response Quality", detail: "The overall quality of interview responses falls below the threshold expected for this role. Further validation is strongly recommended before proceeding." });
  if (completionRate < 0.7)
    riskItems.push({ title: "High Incompletion Rate", detail: `Only ${Math.round(completionRate * 100)}% of questions were answered. This limits the reliability of the assessment and introduces scoring gaps.` });
  if (criticalScore < 40)
    riskItems.push({ title: "Weak Situational Judgement", detail: "Situational responses suggest limited experience navigating complex or ambiguous workplace scenarios." });
  if (riskItems.length === 0 && overall < 60)
    riskItems.push({ title: "Limited Role-Specific Depth", detail: "While no critical risks were identified, the overall depth of responses warrants additional validation before a final hiring decision." });

  // Recommendation
  let recommendation: InterviewScores["recommendation"];
  let recommendationReasoning: string;
  if (overall >= 75) {
    recommendation = "Strong Shortlist";
    recommendationReasoning = `${candidateName} demonstrated consistent performance across competency areas with strong communication and relevant role knowledge. The candidate is recommended for immediate progression to the next hiring stage.`;
  } else if (overall >= 55) {
    recommendation = "Shortlist";
    recommendationReasoning = `${candidateName} performed satisfactorily across most competency areas. Some development areas were identified but do not present barriers to progression. Recommend proceeding to the next interview stage with targeted assessment of weaker areas.`;
  } else if (overall >= 35) {
    recommendation = "Consider With Caution";
    recommendationReasoning = `${candidateName} showed potential in certain areas but demonstrated significant gaps in ${weakest.toLowerCase()} that require further evaluation. Recommend a follow-up technical or panel interview before making a final decision.`;
  } else {
    recommendation = "Not Recommended Yet";
    recommendationReasoning = `${candidateName}'s interview performance indicates insufficient readiness for the ${targetRole} position at this stage. The candidate may benefit from coaching, upskilling, or further industry exposure before reapplication.`;
  }

  // Next action
  let nextAction: string;
  let nextActionDetail: string;
  if (overall >= 75) {
    nextAction = "Proceed to Final Interview";
    nextActionDetail = `Schedule a hiring manager or panel interview. Focus on cultural fit, leadership alignment, and role-specific scenario assessment.`;
  } else if (overall >= 55) {
    nextAction = "Conduct Technical Assessment";
    nextActionDetail = `Administer a role-specific technical assessment or case study to validate ${weakest.toLowerCase()} capability before final interview.`;
  } else if (overall >= 35) {
    nextAction = "Request Portfolio or Work Samples";
    nextActionDetail = `Request tangible evidence of past work relevant to ${targetRole}. This will supplement the interview assessment and provide a more complete candidate picture.`;
  } else {
    nextAction = "Keep in Talent Pool";
    nextActionDetail = `Do not proceed at this stage. Retain candidate profile in the talent pool for reassessment following upskilling or additional experience in ${industry}.`;
  }

  // Readiness
  let candidateReadiness: InterviewScores["candidateReadiness"];
  let readinessReasoning: string;
  if (overall >= 75 && completionRate === 1) {
    candidateReadiness = "Immediately Ready";
    readinessReasoning = `Interview performance indicates the candidate is prepared to take on the ${targetRole} role with minimal onboarding. Strong scores across competencies and full completion of the assessment support immediate placement.`;
  } else if (overall >= 55) {
    candidateReadiness = "Ready After Coaching";
    readinessReasoning = `The candidate demonstrates core capability but would benefit from targeted coaching in ${weakest.toLowerCase()} before commencing the role. Estimated readiness: 4–8 weeks with structured onboarding.`;
  } else if (overall >= 35) {
    candidateReadiness = "Ready After Upskilling";
    readinessReasoning = `Significant skill gaps were identified in ${weakest.toLowerCase()} and related areas. The candidate would require structured upskilling in ${industry} before being deployment-ready. Estimated timeline: 3–6 months.`;
  } else {
    candidateReadiness = "Long-Term Development";
    readinessReasoning = `The candidate is at an early stage of professional development relative to the requirements of this role. A long-term development pathway of 6–12 months is recommended before reconsideration.`;
  }

  // Analytics
  const confidenceEstimate: "High" | "Moderate" | "Low" =
    overall >= 65 ? "High" : overall >= 45 ? "Moderate" : "Low";
  const overallPerformance =
    overall >= 75 ? "Above Expectation" :
    overall >= 55 ? "Meets Expectation" :
    overall >= 35 ? "Below Expectation" : "Significantly Below Expectation";

  // Roadmap
  const interviewRoadmap: string[] = [];
  if (overall >= 65) interviewRoadmap.push("Hiring Manager Interview");
  if (techScore < 65) interviewRoadmap.push("Technical Skills Assessment");
  if (overall >= 55) interviewRoadmap.push("Panel Interview");
  if (isGov) interviewRoadmap.push("Values and Integrity Interview");
  interviewRoadmap.push("Reference Check");
  if (leaderScore >= 60) interviewRoadmap.push("Leadership Assessment");

  // Executive summary
  const executiveSummary = `${candidateName} completed a ${Math.round(completionRate * 100)}% AI screening interview for the ${targetRole} position within ${industry}. ` +
    `The candidate demonstrated ${commScore >= 60 ? "strong" : commScore >= 45 ? "moderate" : "limited"} communication capability and ${techScore >= 60 ? "adequate" : "insufficient"} role-specific technical knowledge. ` +
    `Problem-solving responses were ${problemScore >= 65 ? "well-structured with clear examples" : problemScore >= 45 ? "satisfactory but lacked measurable outcomes" : "underdeveloped and lacked specificity"}. ` +
    `Overall, the candidate is assessed as ${recommendation.toLowerCase()} with a readiness classification of ${candidateReadiness.toLowerCase()}. ` +
    (riskItems.length > 0 && overall < 60 ? `Recruiters should note: ${riskItems[0].title.toLowerCase()} was identified as a concern. ` : "") +
    `Recommended next step: ${nextAction}.`;

  return {
    overall,
    completionRate: Math.round(completionRate * 100),
    executiveSummary,
    competencies,
    questionIntelligence: qIntel,
    strengths,
    developmentAreas,
    riskItems,
    recommendation,
    recommendationReasoning,
    nextAction,
    nextActionDetail,
    candidateReadiness,
    readinessReasoning,
    analytics: {
      avgResponseQuality: Math.round(avgRaw),
      strongestCompetency: strongest,
      weakestCompetency: weakest,
      confidenceEstimate,
      overallPerformance,
    },
    interviewRoadmap,
  };
}

// Fallback question bank used when AI call fails
export function buildFallbackQuestions(
  targetRole: string,
  industry: string,
  employerType: string,
  questionFocus: string[]
): InterviewQuestion[] {
  const isGov =
    employerType.toLowerCase().includes("gov") ||
    questionFocus.includes("Government / Civil Service");

  const opening: InterviewQuestion[] = [
    { id: "q_o1", category: "opening", question: `Tell me about yourself and why you are applying for the ${targetRole} role.` },
    { id: "q_o2", category: "opening", question: `What do you know about the ${industry} industry and how does it relate to this position?` },
  ];

  const technical: InterviewQuestion[] = [
    { id: "q_t1", category: "technical", question: `What core technical skills do you bring to the ${targetRole} role?` },
    { id: "q_t2", category: "technical", question: `Describe a technical challenge you have solved that is relevant to ${industry}.` },
  ];

  const behavioural: InterviewQuestion[] = [
    { id: "q_b1", category: "behavioural", question: "Tell me about a time you had to work under pressure. What did you do and what was the outcome?" },
    { id: "q_b2", category: "behavioural", question: "Describe a situation where you had a conflict with a colleague. How did you resolve it?" },
  ];

  const situational: InterviewQuestion[] = [
    { id: "q_s1", category: "situational", question: `If you were assigned a project with an unclear brief in your first week as ${targetRole}, how would you approach it?` },
    { id: "q_s2", category: "situational", question: "How would you handle a situation where your manager's instructions conflict with established procedures?" },
  ];

  const government: InterviewQuestion[] = isGov
    ? [
        { id: "q_g1", category: "government", question: "Why do you want to work in the public sector rather than the private sector?" },
        { id: "q_g2", category: "government", question: "What role does integrity play in government service and how do you demonstrate it?" },
      ]
    : [];

  return [...opening, ...technical, ...behavioural, ...situational, ...government];
}
