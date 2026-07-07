// Caseworker Intelligence Engine
// Powers the PERKESO / PerksoPrax AI / Employment Officer dashboard
// Reuses outputs from employability, interview, matching, MASCO, and labour-market engines

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type PlacementReadiness = "Ready Now" | "Ready Soon" | "Requires Development" | "Long-Term Candidate";
export type RiskLevel = "Low Risk" | "Moderate Risk" | "High Risk" | "Critical Risk";
export type InterventionType =
  | "CV Improvement"
  | "Interview Coaching"
  | "Skills Training"
  | "Certification Program"
  | "Job Placement Assistance"
  | "Career Counseling"
  | "Mental Health & Wellbeing Support"
  | "Digital Literacy Training";
export type ProgressStage =
  | "Registration"
  | "CV Analysis"
  | "Skills Assessment"
  | "Training"
  | "Interview"
  | "Placement";
export type CandidateStatus = "Placement Ready" | "Near Ready" | "Needs Intervention" | "High Risk";
export type ActionType =
  | "Schedule coaching session"
  | "Assign training"
  | "Recommend certification"
  | "Match to vacancy"
  | "Schedule interview"
  | "Follow-up review"
  | "Career counseling session"
  | "Reassess employability";

export type Intervention = {
  type: InterventionType;
  priority: "High" | "Medium" | "Low";
  expectedImpact: string;
  estimatedTimeline: string;
};

export type ProgressStep = {
  stage: ProgressStage;
  status: "Completed" | "In Progress" | "Pending" | "Skipped";
  date?: string;
  note?: string;
};

export type TrainingRecord = {
  title: string;
  provider: string;
  status: "Completed" | "In Progress" | "Assigned" | "Recommended";
  completionPct: number;
  skillsAddressed: string[];
};

export type PlacementMatch = {
  jobTitle: string;
  employer: string;
  industry: string;
  matchScore: number;
  placementConfidence: "High" | "Moderate" | "Low";
  nextStep: string;
};

export type CandidateNote = {
  id: string;
  date: string;
  author: string;
  content: string;
  actionType: ActionType;
};

export type CandidateRecord = {
  id: string;
  name: string;
  email: string;
  industry: string;
  experienceLevel: string;
  educationLevel: string;
  location: string;

  // Scores
  employabilityScore: number;
  interviewScore: number;
  skillsMatchScore: number;
  placementReadinessScore: number;

  // Statuses
  candidateStatus: CandidateStatus;
  riskLevel: RiskLevel;
  placementReadiness: PlacementReadiness;
  currentStage: ProgressStage;

  // Details
  skillsGaps: string[];
  topSkills: string[];
  targetOccupation: string;
  mascoCode: string;

  // Progress
  progressTimeline: ProgressStep[];
  trainingRecords: TrainingRecord[];

  // Intelligence
  interventions: Intervention[];
  placementMatches: PlacementMatch[];
  notes: CandidateNote[];

  // Interview
  communicationScore: number;
  technicalScore: number;
  confidenceEstimate: number;
  interviewRecommendation: string;

  // Risk explanation
  riskExplanation: string;
  readinessExplanation: string;
};

export type CaseworkerOverview = {
  totalCandidates: number;
  placementReady: number;
  highRisk: number;
  inTraining: number;
  awaitingInterview: number;
  successfullyPlaced: number;
  placementRate: number;
  interviewSuccessRate: number;
  trainingCompletionRate: number;
  avgEmployabilityImprovement: number;
  avgPlacementTimeline: string;
};

export type WorkforceInsight = {
  category: string;
  insight: string;
  indicator: "Positive" | "Warning" | "Neutral";
};

export type CaseworkerReport = {
  generatedAt: string;
  overview: CaseworkerOverview;
  candidates: CandidateRecord[];
  insights: WorkforceInsight[];
  priorityQueue: string[]; // candidate IDs sorted by urgency
};

// ─────────────────────────────────────────────
// Generator
// ─────────────────────────────────────────────

export function generateCaseworkerReport(): CaseworkerReport {
  const candidates = buildCandidates();
  const priorityQueue = candidates
    .slice()
    .sort((a, b) => {
      const urgency = (c: CandidateRecord) =>
        (c.riskLevel === "Critical Risk" ? 4 : c.riskLevel === "High Risk" ? 3 : c.riskLevel === "Moderate Risk" ? 2 : 1) * 10 +
        (100 - c.placementReadinessScore) / 10;
      return urgency(b) - urgency(a);
    })
    .map(c => c.id);

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      totalCandidates: candidates.length,
      placementReady: candidates.filter(c => c.candidateStatus === "Placement Ready").length,
      highRisk: candidates.filter(c => c.riskLevel === "High Risk" || c.riskLevel === "Critical Risk").length,
      inTraining: candidates.filter(c => c.currentStage === "Training").length,
      awaitingInterview: candidates.filter(c => c.currentStage === "Interview").length,
      successfullyPlaced: candidates.filter(c => c.currentStage === "Placement").length,
      placementRate: 38,
      interviewSuccessRate: 62,
      trainingCompletionRate: 71,
      avgEmployabilityImprovement: 12,
      avgPlacementTimeline: "8–12 weeks",
    },
    candidates,
    insights: buildInsights(candidates),
    priorityQueue,
  };
}

// ─────────────────────────────────────────────
// Candidate data
// ─────────────────────────────────────────────

function buildCandidates(): CandidateRecord[] {
  return [
    {
      id: "C001",
      name: "Ahmad Faizal bin Kamaruddin",
      email: "ahmad.faizal@email.com",
      industry: "Finance & Banking",
      experienceLevel: "Mid-Level (4–6 years)",
      educationLevel: "Bachelor's Degree",
      location: "Kuala Lumpur",
      employabilityScore: 78,
      interviewScore: 72,
      skillsMatchScore: 74,
      placementReadinessScore: 76,
      candidateStatus: "Near Ready",
      riskLevel: "Low Risk",
      placementReadiness: "Ready Soon",
      currentStage: "Interview",
      skillsGaps: ["Compliance", "Financial Modelling", "IFRS Standards"],
      topSkills: ["Excel", "Financial Reporting", "Budgeting", "Communication"],
      targetOccupation: "Finance Executive",
      mascoCode: "MASCO 3312",
      progressTimeline: [
        { stage: "Registration", status: "Completed", date: "2025-03-01" },
        { stage: "CV Analysis", status: "Completed", date: "2025-03-05" },
        { stage: "Skills Assessment", status: "Completed", date: "2025-03-10" },
        { stage: "Training", status: "Completed", date: "2025-04-01", note: "Completed Excel Advanced" },
        { stage: "Interview", status: "In Progress" },
        { stage: "Placement", status: "Pending" },
      ],
      trainingRecords: [
        { title: "Excel Advanced & Power BI", provider: "HRD Corp", status: "Completed", completionPct: 100, skillsAddressed: ["Excel", "Power BI"] },
        { title: "Financial Compliance Essentials", provider: "MICPA", status: "In Progress", completionPct: 45, skillsAddressed: ["Compliance", "IFRS"] },
      ],
      interventions: [
        { type: "Interview Coaching", priority: "High", expectedImpact: "Improve interview score by 10–15 points", estimatedTimeline: "2 weeks" },
        { type: "Certification Program", priority: "Medium", expectedImpact: "Close compliance skills gap; increase match rate by ~15%", estimatedTimeline: "6 weeks" },
      ],
      placementMatches: [
        { jobTitle: "Finance Executive", employer: "Maybank", industry: "Finance & Banking", matchScore: 81, placementConfidence: "High", nextStep: "Submit application — vacancy aligns strongly with profile" },
        { jobTitle: "Accounts Executive", employer: "CIMB", industry: "Finance & Banking", matchScore: 74, placementConfidence: "Moderate", nextStep: "Recommend after interview coaching completion" },
      ],
      notes: [],
      communicationScore: 75,
      technicalScore: 69,
      confidenceEstimate: 71,
      interviewRecommendation: "Ready for interview. Focus on structured answers using STAR method for competency questions.",
      riskExplanation: "Low overall risk. Strong financial background with minor gaps in compliance and modelling. Salary expectations align with market.",
      readinessExplanation: "Near placement-ready. Completing interview coaching will significantly improve placement probability within 2–3 weeks.",
    },
    {
      id: "C002",
      name: "Nurul Hidayah binti Mohd Yusof",
      email: "nurul.hidayah@email.com",
      industry: "Government / Public Sector",
      experienceLevel: "Junior (1–3 years)",
      educationLevel: "Bachelor's Degree",
      location: "Putrajaya",
      employabilityScore: 62,
      interviewScore: 55,
      skillsMatchScore: 58,
      placementReadinessScore: 57,
      candidateStatus: "Needs Intervention",
      riskLevel: "Moderate Risk",
      placementReadiness: "Requires Development",
      currentStage: "Skills Assessment",
      skillsGaps: ["Policy Writing", "Public Administration", "Governance Frameworks", "Report Writing"],
      topSkills: ["Bahasa Malaysia", "Communication", "Microsoft Office", "Data Entry"],
      targetOccupation: "Government Officer / PTD",
      mascoCode: "MASCO 3359",
      progressTimeline: [
        { stage: "Registration", status: "Completed", date: "2025-02-15" },
        { stage: "CV Analysis", status: "Completed", date: "2025-02-20" },
        { stage: "Skills Assessment", status: "In Progress" },
        { stage: "Training", status: "Pending" },
        { stage: "Interview", status: "Pending" },
        { stage: "Placement", status: "Pending" },
      ],
      trainingRecords: [
        { title: "Civil Service Fundamentals", provider: "INTAN", status: "Assigned", completionPct: 0, skillsAddressed: ["Public Administration", "Governance"] },
      ],
      interventions: [
        { type: "Skills Training", priority: "High", expectedImpact: "Address policy writing and governance gap; improve match rate by ~20%", estimatedTimeline: "8 weeks" },
        { type: "Interview Coaching", priority: "High", expectedImpact: "Improve interview confidence and structured response delivery", estimatedTimeline: "3 weeks" },
        { type: "CV Improvement", priority: "Medium", expectedImpact: "Strengthen public sector CV format and MASCO keyword alignment", estimatedTimeline: "1 week" },
      ],
      placementMatches: [
        { jobTitle: "Administrative Officer", employer: "Jabatan Perkhidmatan Awam", industry: "Government / Public Sector", matchScore: 62, placementConfidence: "Moderate", nextStep: "Assign governance training before application" },
      ],
      notes: [],
      communicationScore: 58,
      technicalScore: 51,
      confidenceEstimate: 54,
      interviewRecommendation: "Requires 2–3 coaching sessions before interview readiness. Focus on structuring policy-related responses and formal presentation skills.",
      riskExplanation: "Moderate risk due to significant skills gaps in public sector competencies. Low interview score and early career stage increase placement difficulty.",
      readinessExplanation: "Requires governance and policy training before placement readiness. Estimated 8–10 weeks to reach Near Ready status with structured interventions.",
    },
    {
      id: "C003",
      name: "Rajendran a/l Subramaniam",
      email: "rajendran.sub@email.com",
      industry: "Technology & IT",
      experienceLevel: "Senior (7–10 years)",
      educationLevel: "Bachelor's Degree",
      location: "Selangor",
      employabilityScore: 85,
      interviewScore: 81,
      skillsMatchScore: 83,
      placementReadinessScore: 84,
      candidateStatus: "Placement Ready",
      riskLevel: "Low Risk",
      placementReadiness: "Ready Now",
      currentStage: "Interview",
      skillsGaps: ["Cloud Architecture (AWS)", "DevOps Practices"],
      topSkills: ["Java", "Python", "System Design", "Team Leadership", "Agile", "SQL"],
      targetOccupation: "Software Developer / Engineer",
      mascoCode: "MASCO 2512",
      progressTimeline: [
        { stage: "Registration", status: "Completed", date: "2025-01-10" },
        { stage: "CV Analysis", status: "Completed", date: "2025-01-12" },
        { stage: "Skills Assessment", status: "Completed", date: "2025-01-18" },
        { stage: "Training", status: "Completed", date: "2025-02-28", note: "AWS Cloud Practitioner completed" },
        { stage: "Interview", status: "In Progress" },
        { stage: "Placement", status: "Pending" },
      ],
      trainingRecords: [
        { title: "AWS Cloud Practitioner", provider: "Amazon Web Services", status: "Completed", completionPct: 100, skillsAddressed: ["Cloud Computing", "AWS"] },
        { title: "DevOps Fundamentals", provider: "Linux Foundation", status: "In Progress", completionPct: 60, skillsAddressed: ["DevOps", "CI/CD"] },
      ],
      interventions: [
        { type: "Job Placement Assistance", priority: "High", expectedImpact: "Immediate placement in senior engineering role within 2–4 weeks", estimatedTimeline: "2 weeks" },
      ],
      placementMatches: [
        { jobTitle: "Senior Software Engineer", employer: "Grab Malaysia", industry: "Technology & IT", matchScore: 88, placementConfidence: "High", nextStep: "Immediate application recommended — strong profile alignment" },
        { jobTitle: "Technical Lead", employer: "Axiata Digital", industry: "Technology & IT", matchScore: 82, placementConfidence: "High", nextStep: "Strong match — submit application this week" },
        { jobTitle: "Solutions Architect", employer: "Telekom Malaysia", industry: "Technology & IT", matchScore: 76, placementConfidence: "Moderate", nextStep: "Consider after AWS certification completion" },
      ],
      notes: [],
      communicationScore: 82,
      technicalScore: 85,
      confidenceEstimate: 80,
      interviewRecommendation: "Interview-ready. Strong technical profile. Focus on leadership and system design narratives for senior roles.",
      riskExplanation: "Minimal risk. Strong technical background, competitive salary profile, and high platform match scores. Active job market for this profile.",
      readinessExplanation: "Ready for immediate placement. Vacancy recommendations have been generated. Officer action: initiate placement matching this week.",
    },
    {
      id: "C004",
      name: "Siti Aminah binti Abdullah",
      email: "siti.aminah@email.com",
      industry: "Healthcare",
      experienceLevel: "Mid-Level (4–6 years)",
      educationLevel: "Diploma",
      location: "Penang",
      employabilityScore: 44,
      interviewScore: 38,
      skillsMatchScore: 41,
      placementReadinessScore: 40,
      candidateStatus: "High Risk",
      riskLevel: "High Risk",
      placementReadiness: "Requires Development",
      currentStage: "CV Analysis",
      skillsGaps: ["Clinical Documentation", "Medical Terminology", "Patient Management Systems", "Emergency Protocols"],
      topSkills: ["Patient Care", "Communication", "Empathy", "Basic Medical Procedures"],
      targetOccupation: "Nurse / Allied Health Professional",
      mascoCode: "MASCO 2210",
      progressTimeline: [
        { stage: "Registration", status: "Completed", date: "2025-04-01" },
        { stage: "CV Analysis", status: "In Progress" },
        { stage: "Skills Assessment", status: "Pending" },
        { stage: "Training", status: "Pending" },
        { stage: "Interview", status: "Pending" },
        { stage: "Placement", status: "Pending" },
      ],
      trainingRecords: [],
      interventions: [
        { type: "CV Improvement", priority: "High", expectedImpact: "Improve CV quality and keyword alignment for healthcare roles", estimatedTimeline: "1 week" },
        { type: "Skills Training", priority: "High", expectedImpact: "Address clinical documentation and patient management gaps; critical for placement", estimatedTimeline: "10 weeks" },
        { type: "Interview Coaching", priority: "High", expectedImpact: "Build confidence and structured interview responses for healthcare settings", estimatedTimeline: "4 weeks" },
        { type: "Career Counseling", priority: "Medium", expectedImpact: "Clarify career pathway and set realistic placement timeline expectations", estimatedTimeline: "2 sessions" },
      ],
      placementMatches: [
        { jobTitle: "Healthcare Assistant", employer: "Hospital Penang", industry: "Healthcare", matchScore: 52, placementConfidence: "Low", nextStep: "Not yet ready — complete clinical training first" },
      ],
      notes: [],
      communicationScore: 45,
      technicalScore: 32,
      confidenceEstimate: 35,
      interviewRecommendation: "Not interview-ready. Requires significant coaching and skills development before employer referral.",
      riskExplanation: "High risk of long-term unemployment without immediate intervention. Low employability and interview scores combined with critical clinical skills gaps require urgent officer action.",
      readinessExplanation: "Significant development required. Estimated 10–14 weeks with full intervention plan before approaching interview-ready status.",
    },
    {
      id: "C005",
      name: "Lee Chong Wei",
      email: "lee.cw@email.com",
      industry: "Sales",
      experienceLevel: "Junior (1–3 years)",
      educationLevel: "Bachelor's Degree",
      location: "Johor Bahru",
      employabilityScore: 69,
      interviewScore: 65,
      skillsMatchScore: 67,
      placementReadinessScore: 67,
      candidateStatus: "Near Ready",
      riskLevel: "Low Risk",
      placementReadiness: "Ready Soon",
      currentStage: "Training",
      skillsGaps: ["CRM Software (Salesforce)", "Sales Forecasting", "Account Management"],
      topSkills: ["Communication", "Negotiation", "Product Knowledge", "Customer Service", "Bahasa Malaysia"],
      targetOccupation: "Sales Executive",
      mascoCode: "MASCO 2431",
      progressTimeline: [
        { stage: "Registration", status: "Completed", date: "2025-03-15" },
        { stage: "CV Analysis", status: "Completed", date: "2025-03-18" },
        { stage: "Skills Assessment", status: "Completed", date: "2025-03-25" },
        { stage: "Training", status: "In Progress" },
        { stage: "Interview", status: "Pending" },
        { stage: "Placement", status: "Pending" },
      ],
      trainingRecords: [
        { title: "Salesforce CRM Essentials", provider: "Trailhead / HRD Corp", status: "In Progress", completionPct: 70, skillsAddressed: ["CRM", "Salesforce"] },
        { title: "Sales Fundamentals", provider: "Malaysian Retail Chain", status: "Completed", completionPct: 100, skillsAddressed: ["Sales", "Customer Management"] },
      ],
      interventions: [
        { type: "Job Placement Assistance", priority: "High", expectedImpact: "Ready for placement upon CRM training completion in ~2 weeks", estimatedTimeline: "2 weeks" },
        { type: "Interview Coaching", priority: "Medium", expectedImpact: "Polish interview delivery for sales role competency questions", estimatedTimeline: "1 week" },
      ],
      placementMatches: [
        { jobTitle: "Sales Executive", employer: "Nestlé Malaysia", industry: "Retail & FMCG", matchScore: 73, placementConfidence: "Moderate", nextStep: "Apply after CRM training completion" },
        { jobTitle: "Business Development Executive", employer: "Sunway Group", industry: "Property & Real Estate", matchScore: 68, placementConfidence: "Moderate", nextStep: "Submit application — good cultural fit" },
      ],
      notes: [],
      communicationScore: 72,
      technicalScore: 58,
      confidenceEstimate: 66,
      interviewRecommendation: "Ready for interview coaching. Strong interpersonal skills. Focus on quantifying sales achievements and structured STAR responses.",
      riskExplanation: "Low risk. Strong soft skills with targeted technical gaps currently being addressed. Positive trajectory.",
      readinessExplanation: "On track for placement within 3 weeks. Complete CRM training and 1 interview coaching session before employer referral.",
    },
    {
      id: "C006",
      name: "Faridah binti Hamzah",
      email: "faridah.h@email.com",
      industry: "Administration",
      experienceLevel: "Fresh Graduate / Entry Level",
      educationLevel: "Diploma",
      location: "Kuala Lumpur",
      employabilityScore: 31,
      interviewScore: 29,
      skillsMatchScore: 33,
      placementReadinessScore: 30,
      candidateStatus: "High Risk",
      riskLevel: "Critical Risk",
      placementReadiness: "Long-Term Candidate",
      currentStage: "Registration",
      skillsGaps: ["MS Office Proficiency", "Business Communication", "Administrative Procedures", "Time Management", "Report Writing"],
      topSkills: ["Bahasa Malaysia", "Willingness to learn"],
      targetOccupation: "Administrative Executive",
      mascoCode: "MASCO 4110",
      progressTimeline: [
        { stage: "Registration", status: "In Progress" },
        { stage: "CV Analysis", status: "Pending" },
        { stage: "Skills Assessment", status: "Pending" },
        { stage: "Training", status: "Pending" },
        { stage: "Interview", status: "Pending" },
        { stage: "Placement", status: "Pending" },
      ],
      trainingRecords: [],
      interventions: [
        { type: "Career Counseling", priority: "High", expectedImpact: "Establish realistic career plan and understand pathway to employment", estimatedTimeline: "1–2 sessions" },
        { type: "Digital Literacy Training", priority: "High", expectedImpact: "Build foundational MS Office and digital skills required for any administrative role", estimatedTimeline: "4 weeks" },
        { type: "CV Improvement", priority: "High", expectedImpact: "Create a functional CV from scratch", estimatedTimeline: "1 week" },
        { type: "Skills Training", priority: "High", expectedImpact: "Address core administrative competency gaps to reach baseline employability", estimatedTimeline: "8–10 weeks" },
        { type: "Mental Health & Wellbeing Support", priority: "Medium", expectedImpact: "Address confidence and motivation barriers", estimatedTimeline: "Ongoing" },
      ],
      placementMatches: [],
      notes: [],
      communicationScore: 30,
      technicalScore: 24,
      confidenceEstimate: 27,
      interviewRecommendation: "Not ready for interview. Complete foundational skills training and 3–4 coaching sessions before any employer engagement.",
      riskExplanation: "Critical risk. Extremely low baseline skills and employability score. Fresh graduate with minimal practical experience. Requires intensive and structured long-term intervention.",
      readinessExplanation: "Long-term development required. Estimated 14–20 weeks with full intervention plan. Officer should set realistic milestones and provide close case management.",
    },
    {
      id: "C007",
      name: "Muhammad Hafiz bin Roslan",
      email: "mhafiz.r@email.com",
      industry: "Data & Analytics",
      experienceLevel: "Mid-Level (4–6 years)",
      educationLevel: "Bachelor's Degree",
      location: "Kuala Lumpur",
      employabilityScore: 80,
      interviewScore: 76,
      skillsMatchScore: 79,
      placementReadinessScore: 79,
      candidateStatus: "Near Ready",
      riskLevel: "Low Risk",
      placementReadiness: "Ready Soon",
      currentStage: "Interview",
      skillsGaps: ["Machine Learning (PyTorch)", "Databricks", "Data Governance"],
      topSkills: ["SQL", "Python", "Power BI", "Excel", "Statistical Analysis", "Communication"],
      targetOccupation: "Data Analyst / BI Analyst",
      mascoCode: "MASCO 2511",
      progressTimeline: [
        { stage: "Registration", status: "Completed", date: "2025-02-01" },
        { stage: "CV Analysis", status: "Completed", date: "2025-02-05" },
        { stage: "Skills Assessment", status: "Completed", date: "2025-02-12" },
        { stage: "Training", status: "Completed", date: "2025-03-20", note: "Power BI PL-300 completed" },
        { stage: "Interview", status: "In Progress" },
        { stage: "Placement", status: "Pending" },
      ],
      trainingRecords: [
        { title: "Microsoft PL-300 (Power BI)", provider: "Microsoft", status: "Completed", completionPct: 100, skillsAddressed: ["Power BI", "Data Visualisation"] },
        { title: "Data Governance Fundamentals", provider: "PDPC Malaysia", status: "Assigned", completionPct: 0, skillsAddressed: ["PDPA", "Data Governance"] },
      ],
      interventions: [
        { type: "Job Placement Assistance", priority: "High", expectedImpact: "Placement in mid-level data role within 2–4 weeks", estimatedTimeline: "2 weeks" },
        { type: "Certification Program", priority: "Medium", expectedImpact: "Data governance cert adds premium to profile for fintech and government roles", estimatedTimeline: "4 weeks" },
      ],
      placementMatches: [
        { jobTitle: "BI Analyst", employer: "RHB Bank", industry: "Finance & Banking", matchScore: 83, placementConfidence: "High", nextStep: "Immediate application recommended" },
        { jobTitle: "Data Analyst", employer: "Petronas Digital", industry: "Oil & Gas", matchScore: 78, placementConfidence: "Moderate", nextStep: "Strong candidate — submit this week" },
      ],
      notes: [],
      communicationScore: 78,
      technicalScore: 80,
      confidenceEstimate: 74,
      interviewRecommendation: "Ready for interview. Strong analytical profile. Prepare data storytelling and business impact narratives.",
      riskExplanation: "Low risk. Strong data skills, high-demand occupation, growing market. Minor gaps will not impede placement.",
      readinessExplanation: "Near placement-ready. Data roles are in critical demand. Initiate employer matching immediately.",
    },
    {
      id: "C008",
      name: "Priya a/p Krishnamurthy",
      email: "priya.k@email.com",
      industry: "Human Resources",
      experienceLevel: "Junior (1–3 years)",
      educationLevel: "Bachelor's Degree",
      location: "Selangor",
      employabilityScore: 58,
      interviewScore: 60,
      skillsMatchScore: 55,
      placementReadinessScore: 57,
      candidateStatus: "Needs Intervention",
      riskLevel: "Moderate Risk",
      placementReadiness: "Requires Development",
      currentStage: "Skills Assessment",
      skillsGaps: ["HRIS Systems (SAP / Workday)", "Talent Analytics", "Employment Law", "Recruitment Metrics"],
      topSkills: ["Communication", "Interpersonal Skills", "MS Office", "Interviewing Basics", "Bahasa Malaysia"],
      targetOccupation: "HR Executive / Talent Specialist",
      mascoCode: "MASCO 2423",
      progressTimeline: [
        { stage: "Registration", status: "Completed", date: "2025-03-20" },
        { stage: "CV Analysis", status: "Completed", date: "2025-03-24" },
        { stage: "Skills Assessment", status: "In Progress" },
        { stage: "Training", status: "Pending" },
        { stage: "Interview", status: "Pending" },
        { stage: "Placement", status: "Pending" },
      ],
      trainingRecords: [
        { title: "Employment Act 1955 & Labour Law", provider: "Malaysian Institute of HR", status: "Recommended", completionPct: 0, skillsAddressed: ["Employment Law", "HR Compliance"] },
      ],
      interventions: [
        { type: "Skills Training", priority: "High", expectedImpact: "HRIS and employment law training closes primary gaps — improves match rate by ~18%", estimatedTimeline: "6 weeks" },
        { type: "Interview Coaching", priority: "Medium", expectedImpact: "Moderate improvement in structured HR interview responses", estimatedTimeline: "2 weeks" },
        { type: "CV Improvement", priority: "Medium", expectedImpact: "Strengthen HR-specific keywords and quantified achievements", estimatedTimeline: "1 week" },
      ],
      placementMatches: [
        { jobTitle: "HR Executive", employer: "Sunway Healthcare", industry: "Healthcare", matchScore: 61, placementConfidence: "Moderate", nextStep: "Assign HRIS training then reassess in 6 weeks" },
      ],
      notes: [],
      communicationScore: 65,
      technicalScore: 48,
      confidenceEstimate: 60,
      interviewRecommendation: "Moderate interview readiness. Strong communication but weak technical HR knowledge. Assign training before employer referral.",
      riskExplanation: "Moderate risk. Adequate soft skills but significant technical HR gaps. Competitive HR market requires stronger functional competencies.",
      readinessExplanation: "Requires 6–8 weeks of targeted HR training before placement readiness. Strong soft skills foundation gives positive outlook.",
    },
  ];
}

function buildInsights(candidates: CandidateRecord[]): WorkforceInsight[] {
  const highRiskCount = candidates.filter(c => c.riskLevel === "High Risk" || c.riskLevel === "Critical Risk").length;
  const readyCount = candidates.filter(c => c.candidateStatus === "Placement Ready").length;
  const techCandidates = candidates.filter(c => c.industry === "Technology & IT" || c.industry === "Data & Analytics");

  return [
    {
      category: "Interview Readiness",
      insight: `${Math.round((candidates.filter(c => c.interviewScore < 60).length / candidates.length) * 100)}% of active candidates score below 60 on interview readiness. Interview coaching remains the fastest single intervention for improving placement rates.`,
      indicator: "Warning",
    },
    {
      category: "Skills Gap Pattern",
      insight: "Compliance and governance knowledge gaps are consistently observed across finance and government candidates. Targeted compliance training programmes should be prioritised at programme level.",
      indicator: "Warning",
    },
    {
      category: "High Potential Candidates",
      insight: `${readyCount} candidate${readyCount !== 1 ? "s are" : " is"} placement-ready. Immediate employer matching for these profiles is recommended to maximise placement outcomes this quarter.`,
      indicator: "Positive",
    },
    {
      category: "Technology Sector",
      insight: `${techCandidates.length > 0 ? "Technology and data candidates on this caseload" : "Data and technology"} show above-average employability scores. Vacancy demand in these sectors is critical — expedited placement matching is advised.`,
      indicator: "Positive",
    },
    {
      category: "At-Risk Caseload",
      insight: `${highRiskCount} candidate${highRiskCount !== 1 ? "s require" : " requires"} immediate intensive intervention. Without structured action plans, long-term unemployment risk increases significantly beyond 6 months.`,
      indicator: "Warning",
    },
    {
      category: "Training Effectiveness",
      insight: "Candidates completing assigned training programmes show an average 12-point improvement in employability scores. Training completion rates should be actively monitored by caseworkers.",
      indicator: "Positive",
    },
    {
      category: "Government Sector Candidates",
      insight: "Candidates targeting government and public sector roles consistently demonstrate lower policy writing and governance competency scores. INTAN and JPA-aligned training should be prioritised for this group.",
      indicator: "Warning",
    },
  ];
}

// ─────────────────────────────────────────────
// Styling helpers
// ─────────────────────────────────────────────

export function getRiskConfig(level: RiskLevel) {
  switch (level) {
    case "Critical Risk": return { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", dot: "bg-destructive" };
    case "High Risk": return { bg: "bg-[#F97316]/10 border-[#F97316]/20", text: "text-[#F97316]", dot: "bg-[#F97316]" };
    case "Moderate Risk": return { bg: "bg-primary/10 border-primary/20", text: "text-primary", dot: "bg-primary" };
    case "Low Risk": return { bg: "bg-[var(--success)]/10 border-[var(--success)]/20", text: "text-[var(--success)]", dot: "bg-[var(--success)]" };
  }
}

export function getReadinessConfig(r: PlacementReadiness) {
  switch (r) {
    case "Ready Now": return { bg: "bg-[var(--success)]/10 border-[var(--success)]/20", text: "text-[var(--success)]" };
    case "Ready Soon": return { bg: "bg-primary/10 border-primary/20", text: "text-primary" };
    case "Requires Development": return { bg: "bg-[#F97316]/10 border-[#F97316]/20", text: "text-[#F97316]" };
    case "Long-Term Candidate": return { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive" };
  }
}

export function getStatusConfig(s: CandidateStatus) {
  switch (s) {
    case "Placement Ready": return { bg: "bg-[var(--success)]/10 border-[var(--success)]/20", text: "text-[var(--success)]" };
    case "Near Ready": return { bg: "bg-primary/10 border-primary/20", text: "text-primary" };
    case "Needs Intervention": return { bg: "bg-[#F97316]/10 border-[#F97316]/20", text: "text-[#F97316]" };
    case "High Risk": return { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive" };
  }
}

export function getInterventionConfig(t: InterventionType) {
  const map: Record<InterventionType, string> = {
    "CV Improvement": "bg-primary/8 border-primary/20 text-primary",
    "Interview Coaching": "bg-[#F97316]/8 border-[#F97316]/20 text-[#F97316]",
    "Skills Training": "bg-purple-50 border-purple-200 text-purple-700",
    "Certification Program": "bg-[var(--success)]/8 border-[var(--success)]/20 text-[var(--success)]",
    "Job Placement Assistance": "bg-destructive/8 border-destructive/20 text-destructive",
    "Career Counseling": "bg-secondary border-border text-muted-foreground",
    "Mental Health & Wellbeing Support": "bg-secondary border-border text-muted-foreground",
    "Digital Literacy Training": "bg-primary/8 border-primary/20 text-primary",
  };
  return map[t];
}

export function getStageConfig(status: ProgressStep["status"]) {
  switch (status) {
    case "Completed": return { ring: "ring-[var(--success)]", bg: "bg-[var(--success)]", text: "text-[var(--success)]" };
    case "In Progress": return { ring: "ring-primary", bg: "bg-primary", text: "text-primary" };
    case "Pending": return { ring: "ring-border", bg: "bg-secondary", text: "text-muted-foreground" };
    case "Skipped": return { ring: "ring-border", bg: "bg-secondary", text: "text-muted-foreground" };
  }
}

export function getInsightConfig(indicator: WorkforceInsight["indicator"]) {
  switch (indicator) {
    case "Positive": return { border: "border-[var(--success)]/20 bg-[var(--success)]/5", dot: "bg-[var(--success)]", text: "text-[var(--success)]" };
    case "Warning": return { border: "border-[#F97316]/20 bg-[#F97316]/5", dot: "bg-[#F97316]", text: "text-[#F97316]" };
    case "Neutral": return { border: "border-border bg-secondary/30", dot: "bg-muted-foreground", text: "text-muted-foreground" };
  }
}
