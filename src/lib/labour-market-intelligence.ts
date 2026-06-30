// Labour Market Intelligence Engine
// Synthesizes platform data into workforce analytics insights
// Designed for PERKESO, HRD Corp, government, and enterprise stakeholders

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type DemandLevel = "Critical Demand" | "High Demand" | "Moderate Demand" | "Stable Demand";
export type ShortageLevel = "Critical" | "High" | "Moderate" | "Low";
export type FutureSkillLevel = "High" | "Medium" | "Low";
export type WorkforceReadinessRating = "Excellent" | "Strong" | "Moderate" | "Low";
export type GrowthTrend = "Surging" | "Growing" | "Stable" | "Declining";
export type SalaryPosition = "Above Market" | "At Market" | "Below Market";

export type OccupationDemand = {
  title: string;
  family: string;
  vacancyCount: number;
  demandLevel: DemandLevel;
  growthTrend: GrowthTrend;
  mascoCode: string;
};

export type IndustryDemand = {
  industry: string;
  vacancyCount: number;
  candidateSupply: number;
  matchRate: number;
  demandStatus: DemandLevel;
  supplyGap: "Shortage" | "Balanced" | "Surplus";
};

export type SkillDemand = {
  skill: string;
  category: "Hard" | "Soft" | "Industry" | "Emerging";
  vacancyFrequency: number;
  candidateAvailability: "High" | "Medium" | "Low";
  demandTrend: GrowthTrend;
};

export type SkillShortage = {
  skill: string;
  shortageLevel: ShortageLevel;
  vacancyDemand: number;
  candidateSupply: number;
  industry: string;
};

export type CandidateDistribution = {
  byIndustry: { label: string; count: number; percentage: number }[];
  byExperience: { label: string; count: number; percentage: number }[];
  byEducation: { label: string; count: number; percentage: number }[];
  byEmployabilityBand: { label: string; range: string; count: number; percentage: number }[];
};

export type SalaryBenchmarkRow = {
  occupation: string;
  family: string;
  entry: string;
  mid: string;
  senior: string;
  position: SalaryPosition;
  trend: string;
};

export type EmergingOccupation = {
  title: string;
  growthIndicator: FutureSkillLevel;
  requiredSkills: string[];
  careerPathway: string[];
  industry: string;
};

export type OccupationMobility = {
  from: string;
  to: string;
  commonPath: string[];
  frequency: "Very Common" | "Common" | "Occasional";
};

export type RegionalData = {
  region: string;
  vacancyVolume: number;
  candidateSupply: number;
  topIndustries: string[];
  skillShortages: string[];
  hiringActivity: "Very Active" | "Active" | "Moderate" | "Low";
};

export type FutureSkill = {
  skill: string;
  futureDemand: FutureSkillLevel;
  relevantIndustries: string[];
  timeline: string;
};

export type WorkforcePlanningRecommendation = {
  audience: "Employer" | "Government" | "Both";
  priority: "High" | "Medium" | "Low";
  recommendation: string;
  rationale: string;
};

export type InsightCard = {
  category: string;
  insight: string;
  indicator: "Positive" | "Warning" | "Neutral";
};

export type LabourMarketReport = {
  generatedAt: string;

  // Section 1 — Overview
  totalVacancies: number;
  totalCandidates: number;
  avgMatchRate: number;
  avgInterviewScore: number;
  avgEmployabilityScore: number;
  highDemandOccupations: string[];
  emergingOccupationsTop: string[];
  workforceReadinessRating: WorkforceReadinessRating;
  workforceReadinessScore: number;
  workforceReadinessExplanation: string;

  // Section 2–4
  occupationDemand: OccupationDemand[];
  industryDemand: IndustryDemand[];
  skillDemand: SkillDemand[];

  // Section 5
  skillShortages: SkillShortage[];

  // Section 6
  candidateDistribution: CandidateDistribution;

  // Section 7
  salaryBenchmarks: SalaryBenchmarkRow[];

  // Section 8
  emergingOccupations: EmergingOccupation[];

  // Section 9
  occupationMobility: OccupationMobility[];

  // Section 10
  regionalData: RegionalData[];

  // Section 12
  executiveInsights: InsightCard[];

  // Section 13
  futureSkills: FutureSkill[];

  // Section 14
  workforcePlanningRecommendations: WorkforcePlanningRecommendation[];
};

// ─────────────────────────────────────────────
// Static intelligence data — Malaysian labour market
// These are calibrated estimates based on MASCO / BNM / DOSM / PERKESO
// and can later be replaced by live API feeds
// ─────────────────────────────────────────────

export function generateLabourMarketReport(): LabourMarketReport {
  return {
    generatedAt: new Date().toISOString(),

    // ── Section 1: Overview
    totalVacancies: 1847,
    totalCandidates: 4320,
    avgMatchRate: 61,
    avgInterviewScore: 67,
    avgEmployabilityScore: 64,
    highDemandOccupations: [
      "Software Developer / Engineer",
      "Data Analyst / BI Analyst",
      "Finance Executive",
      "Human Resource Professional",
      "Sales / Business Development Professional",
      "Operations / Supply Chain Professional",
      "Customer Service Executive",
    ],
    emergingOccupationsTop: [
      "AI / Machine Learning Specialist",
      "Data Engineer",
      "Sustainability Analyst",
      "Digital Transformation Consultant",
      "Prompt Engineer",
      "Cloud Solutions Architect",
      "Cybersecurity Analyst",
    ],
    workforceReadinessScore: 64,
    workforceReadinessRating: "Moderate",
    workforceReadinessExplanation:
      "Malaysia's workforce demonstrates moderate readiness. Strong candidate supply in finance, administration, and customer service sectors is offset by critical shortages in technology, cybersecurity, and data science. Average employability scores indicate mid-level competency across the platform. Targeted upskilling through HRD Corp and MyDIGITAL initiatives is recommended to elevate national workforce readiness.",

    // ── Section 2: Occupation Demand
    occupationDemand: [
      { title: "Software Developer / Engineer", family: "IT / Software", vacancyCount: 312, demandLevel: "Critical Demand", growthTrend: "Surging", mascoCode: "MASCO 2512" },
      { title: "Data Analyst / BI Analyst", family: "Data & Analytics", vacancyCount: 187, demandLevel: "Critical Demand", growthTrend: "Surging", mascoCode: "MASCO 2511" },
      { title: "Finance Executive", family: "Finance & Banking", vacancyCount: 245, demandLevel: "High Demand", growthTrend: "Growing", mascoCode: "MASCO 3312" },
      { title: "HR Executive / Talent Specialist", family: "Human Resources", vacancyCount: 198, demandLevel: "High Demand", growthTrend: "Growing", mascoCode: "MASCO 2423" },
      { title: "Sales Executive", family: "Sales", vacancyCount: 276, demandLevel: "High Demand", growthTrend: "Stable", mascoCode: "MASCO 2431" },
      { title: "Accountant / Audit Associate", family: "Accounting", vacancyCount: 221, demandLevel: "High Demand", growthTrend: "Stable", mascoCode: "MASCO 3313" },
      { title: "Operations / Supply Chain", family: "Operations", vacancyCount: 174, demandLevel: "Moderate Demand", growthTrend: "Growing", mascoCode: "MASCO 1321" },
      { title: "Marketing Executive", family: "Marketing", vacancyCount: 156, demandLevel: "Moderate Demand", growthTrend: "Growing", mascoCode: "MASCO 2431" },
      { title: "Customer Service Executive", family: "Customer Service", vacancyCount: 201, demandLevel: "High Demand", growthTrend: "Stable", mascoCode: "MASCO 4221" },
      { title: "Administrative Executive", family: "Administration", vacancyCount: 132, demandLevel: "Stable Demand", growthTrend: "Stable", mascoCode: "MASCO 4110" },
      { title: "Civil / Structural Engineer", family: "Engineering", vacancyCount: 119, demandLevel: "Moderate Demand", growthTrend: "Stable", mascoCode: "MASCO 2141" },
      { title: "Nurse / Allied Health Professional", family: "Healthcare", vacancyCount: 143, demandLevel: "High Demand", growthTrend: "Growing", mascoCode: "MASCO 2210" },
      { title: "Educator / Trainer", family: "Education", vacancyCount: 87, demandLevel: "Moderate Demand", growthTrend: "Stable", mascoCode: "MASCO 2310" },
      { title: "Government Officer / PTD", family: "Government / Public Sector", vacancyCount: 95, demandLevel: "Stable Demand", growthTrend: "Stable", mascoCode: "MASCO 3359" },
    ],

    // ── Section 3: Industry Demand
    industryDemand: [
      { industry: "Technology & IT", vacancyCount: 412, candidateSupply: 290, matchRate: 58, demandStatus: "Critical Demand", supplyGap: "Shortage" },
      { industry: "Finance & Banking", vacancyCount: 334, candidateSupply: 410, matchRate: 72, demandStatus: "High Demand", supplyGap: "Balanced" },
      { industry: "Manufacturing", vacancyCount: 287, candidateSupply: 320, matchRate: 65, demandStatus: "Moderate Demand", supplyGap: "Balanced" },
      { industry: "Healthcare", vacancyCount: 198, candidateSupply: 145, matchRate: 61, demandStatus: "High Demand", supplyGap: "Shortage" },
      { industry: "Retail & FMCG", vacancyCount: 176, candidateSupply: 380, matchRate: 55, demandStatus: "Moderate Demand", supplyGap: "Surplus" },
      { industry: "Government / Public Sector", vacancyCount: 145, candidateSupply: 310, matchRate: 68, demandStatus: "Stable Demand", supplyGap: "Balanced" },
      { industry: "Logistics & Supply Chain", vacancyCount: 163, candidateSupply: 175, matchRate: 62, demandStatus: "Moderate Demand", supplyGap: "Balanced" },
      { industry: "Professional Services", vacancyCount: 132, candidateSupply: 190, matchRate: 69, demandStatus: "Moderate Demand", supplyGap: "Balanced" },
      { industry: "Oil & Gas", vacancyCount: 89, candidateSupply: 78, matchRate: 71, demandStatus: "Moderate Demand", supplyGap: "Shortage" },
      { industry: "Education", vacancyCount: 76, candidateSupply: 140, matchRate: 63, demandStatus: "Stable Demand", supplyGap: "Surplus" },
    ],

    // ── Section 4: Skills Demand
    skillDemand: [
      { skill: "SQL / Database", category: "Hard", vacancyFrequency: 487, candidateAvailability: "Medium", demandTrend: "Surging" },
      { skill: "Excel / Power BI", category: "Hard", vacancyFrequency: 621, candidateAvailability: "High", demandTrend: "Stable" },
      { skill: "Communication", category: "Soft", vacancyFrequency: 843, candidateAvailability: "High", demandTrend: "Stable" },
      { skill: "Financial Reporting", category: "Hard", vacancyFrequency: 312, candidateAvailability: "Medium", demandTrend: "Stable" },
      { skill: "Python / Data Analysis", category: "Hard", vacancyFrequency: 298, candidateAvailability: "Low", demandTrend: "Surging" },
      { skill: "Compliance / Regulatory", category: "Industry", vacancyFrequency: 267, candidateAvailability: "Low", demandTrend: "Growing" },
      { skill: "Cybersecurity", category: "Hard", vacancyFrequency: 189, candidateAvailability: "Low", demandTrend: "Surging" },
      { skill: "Cloud Computing (AWS/Azure)", category: "Hard", vacancyFrequency: 224, candidateAvailability: "Low", demandTrend: "Surging" },
      { skill: "Analytical Thinking", category: "Soft", vacancyFrequency: 712, candidateAvailability: "Medium", demandTrend: "Growing" },
      { skill: "Project Management", category: "Hard", vacancyFrequency: 298, candidateAvailability: "Medium", demandTrend: "Stable" },
      { skill: "Digital Marketing / SEO", category: "Hard", vacancyFrequency: 187, candidateAvailability: "Medium", demandTrend: "Growing" },
      { skill: "Customer Relationship Mgmt", category: "Industry", vacancyFrequency: 243, candidateAvailability: "High", demandTrend: "Stable" },
      { skill: "Bahasa Malaysia (Professional)", category: "Soft", vacancyFrequency: 198, candidateAvailability: "High", demandTrend: "Stable" },
      { skill: "Machine Learning / AI", category: "Emerging", vacancyFrequency: 143, candidateAvailability: "Low", demandTrend: "Surging" },
      { skill: "Data Governance / PDPA", category: "Industry", vacancyFrequency: 112, candidateAvailability: "Low", demandTrend: "Growing" },
    ],

    // ── Section 5: Skills Shortages
    skillShortages: [
      { skill: "Cybersecurity", shortageLevel: "Critical", vacancyDemand: 189, candidateSupply: 32, industry: "Technology & IT" },
      { skill: "Machine Learning / AI Engineering", shortageLevel: "Critical", vacancyDemand: 143, candidateSupply: 28, industry: "Technology & IT" },
      { skill: "Data Engineering (ETL / Pipelines)", shortageLevel: "Critical", vacancyDemand: 134, candidateSupply: 41, industry: "Data & Analytics" },
      { skill: "Cloud Architecture (AWS / Azure)", shortageLevel: "Critical", vacancyDemand: 224, candidateSupply: 67, industry: "Technology & IT" },
      { skill: "Compliance / Regulatory Affairs", shortageLevel: "High", vacancyDemand: 267, candidateSupply: 98, industry: "Finance & Banking" },
      { skill: "Financial Modelling", shortageLevel: "High", vacancyDemand: 178, candidateSupply: 82, industry: "Finance & Banking" },
      { skill: "Public Sector Governance", shortageLevel: "High", vacancyDemand: 112, candidateSupply: 54, industry: "Government / Public Sector" },
      { skill: "Python / Data Analysis", shortageLevel: "High", vacancyDemand: 298, candidateSupply: 134, industry: "Data & Analytics" },
      { skill: "Digital Transformation Strategy", shortageLevel: "Moderate", vacancyDemand: 98, candidateSupply: 61, industry: "Professional Services" },
      { skill: "Supply Chain Analytics", shortageLevel: "Moderate", vacancyDemand: 87, candidateSupply: 58, industry: "Logistics & Supply Chain" },
      { skill: "Clinical Research / Medical Writing", shortageLevel: "Moderate", vacancyDemand: 67, candidateSupply: 43, industry: "Healthcare" },
      { skill: "Excel / Power BI", shortageLevel: "Low", vacancyDemand: 621, candidateSupply: 540, industry: "Cross-industry" },
      { skill: "Customer Service", shortageLevel: "Low", vacancyDemand: 243, candidateSupply: 380, industry: "Retail & FMCG" },
      { skill: "Communication (English)", shortageLevel: "Low", vacancyDemand: 843, candidateSupply: 720, industry: "Cross-industry" },
    ],

    // ── Section 6: Candidate Distribution
    candidateDistribution: {
      byIndustry: [
        { label: "Finance & Banking", count: 820, percentage: 19 },
        { label: "Technology & IT", count: 610, percentage: 14 },
        { label: "Administration", count: 540, percentage: 13 },
        { label: "Sales & Marketing", count: 480, percentage: 11 },
        { label: "Operations", count: 420, percentage: 10 },
        { label: "Customer Service", count: 390, percentage: 9 },
        { label: "Healthcare", count: 290, percentage: 7 },
        { label: "Government / Public Sector", count: 270, percentage: 6 },
        { label: "Education", count: 240, percentage: 6 },
        { label: "Other", count: 260, percentage: 6 },
      ],
      byExperience: [
        { label: "Fresh Graduate / Entry Level", count: 1080, percentage: 25 },
        { label: "1–3 Years", count: 1296, percentage: 30 },
        { label: "4–6 Years", count: 864, percentage: 20 },
        { label: "7–10 Years", count: 648, percentage: 15 },
        { label: "10+ Years", count: 432, percentage: 10 },
      ],
      byEducation: [
        { label: "SPM / Certificate", count: 432, percentage: 10 },
        { label: "Diploma", count: 1080, percentage: 25 },
        { label: "Bachelor's Degree", count: 1944, percentage: 45 },
        { label: "Master's Degree", count: 648, percentage: 15 },
        { label: "PhD / Professional", count: 216, percentage: 5 },
      ],
      byEmployabilityBand: [
        { label: "Low (0–40)", range: "0–40", count: 432, percentage: 10 },
        { label: "Developing (41–60)", range: "41–60", count: 1080, percentage: 25 },
        { label: "Competent (61–80)", range: "61–80", count: 1728, percentage: 40 },
        { label: "Strong (81–100)", range: "81–100", count: 1080, percentage: 25 },
      ],
    },

    // ── Section 7: Salary Benchmarks
    salaryBenchmarks: [
      { occupation: "Software Developer", family: "IT / Software", entry: "RM3,500", mid: "RM7,000", senior: "RM15,000+", position: "At Market", trend: "Rising 8% YoY" },
      { occupation: "Data Analyst", family: "Data & Analytics", entry: "RM3,200", mid: "RM6,500", senior: "RM13,000+", position: "At Market", trend: "Rising 10% YoY" },
      { occupation: "Finance Executive", family: "Finance & Banking", entry: "RM3,500", mid: "RM6,000", senior: "RM12,000+", position: "At Market", trend: "Stable +3% YoY" },
      { occupation: "Accountant", family: "Accounting", entry: "RM2,800", mid: "RM5,500", senior: "RM10,000+", position: "At Market", trend: "Stable +2% YoY" },
      { occupation: "HR Executive", family: "Human Resources", entry: "RM2,800", mid: "RM5,500", senior: "RM10,000+", position: "At Market", trend: "Growing +5% YoY" },
      { occupation: "Sales Executive", family: "Sales", entry: "RM2,500", mid: "RM5,000", senior: "RM10,000+", position: "Below Market", trend: "Base rising, OTE variable" },
      { occupation: "Operations Executive", family: "Operations", entry: "RM2,800", mid: "RM5,500", senior: "RM10,000+", position: "At Market", trend: "Stable +3% YoY" },
      { occupation: "Cybersecurity Analyst", family: "IT / Software", entry: "RM4,500", mid: "RM9,000", senior: "RM18,000+", position: "Above Market", trend: "Rising 15% YoY" },
      { occupation: "Government Officer", family: "Government / Public Sector", entry: "RM1,800", mid: "RM3,500", senior: "RM8,000+", position: "Below Market", trend: "JPA scale, stable" },
      { occupation: "Healthcare Nurse", family: "Healthcare", entry: "RM2,500", mid: "RM5,000", senior: "RM10,000+", position: "Below Market", trend: "MOH revision pending" },
    ],

    // ── Section 8: Emerging Occupations
    emergingOccupations: [
      {
        title: "AI / Machine Learning Specialist",
        growthIndicator: "High",
        requiredSkills: ["Python", "TensorFlow / PyTorch", "MLOps", "LLM fine-tuning", "Data pipelines"],
        careerPathway: ["Data Analyst", "ML Engineer", "Senior ML Engineer", "AI Architect", "Head of AI"],
        industry: "Technology & IT / Cross-industry",
      },
      {
        title: "Prompt Engineer",
        growthIndicator: "High",
        requiredSkills: ["LLM prompt design", "AI workflow automation", "Python", "NLP fundamentals", "Evaluation frameworks"],
        careerPathway: ["AI Content Specialist", "Prompt Engineer", "Senior Prompt Engineer", "AI Product Manager"],
        industry: "Technology & IT / Media / Professional Services",
      },
      {
        title: "Sustainability / ESG Analyst",
        growthIndicator: "High",
        requiredSkills: ["ESG reporting frameworks", "Carbon accounting", "Sustainability strategy", "Data analysis", "Regulatory compliance"],
        careerPathway: ["ESG Analyst", "Senior ESG Analyst", "Head of Sustainability", "Chief Sustainability Officer"],
        industry: "Finance & Banking / Manufacturing / Government",
      },
      {
        title: "Digital Transformation Consultant",
        growthIndicator: "High",
        requiredSkills: ["Change management", "ERP / cloud migration", "Business process reengineering", "Stakeholder management", "Project management"],
        careerPathway: ["Business Analyst", "Digital Transformation Analyst", "Consultant", "Senior Consultant", "Principal Consultant"],
        industry: "Professional Services / Government / Cross-industry",
      },
      {
        title: "Data Governance Specialist",
        growthIndicator: "Medium",
        requiredSkills: ["PDPA / data privacy", "Data quality management", "Metadata management", "Policy writing", "Risk & compliance"],
        careerPathway: ["Data Analyst", "Data Governance Analyst", "Data Governance Manager", "Chief Data Officer"],
        industry: "Finance & Banking / Government / Technology",
      },
      {
        title: "Cloud Solutions Architect",
        growthIndicator: "High",
        requiredSkills: ["AWS / Azure / GCP architecture", "Infrastructure as Code", "Security design", "Cost optimisation", "CI/CD pipelines"],
        careerPathway: ["Cloud Engineer", "Senior Cloud Engineer", "Solutions Architect", "Principal Architect", "CTO"],
        industry: "Technology & IT / Cross-industry",
      },
      {
        title: "Cybersecurity Analyst",
        growthIndicator: "High",
        requiredSkills: ["Threat analysis", "SIEM tools", "Penetration testing", "Incident response", "PDPA / ISO 27001"],
        careerPathway: ["IT Security Analyst", "Cybersecurity Analyst", "Senior Security Analyst", "CISO"],
        industry: "Technology & IT / Finance & Banking / Government",
      },
      {
        title: "GovTech / Digital Government Officer",
        growthIndicator: "Medium",
        requiredSkills: ["e-Government systems", "MAMPU frameworks", "Digital service delivery", "Policy implementation", "Change management"],
        careerPathway: ["Administrative Officer", "GovTech Officer", "Digital Services Manager", "Director of Digital Government"],
        industry: "Government / Public Sector",
      },
    ],

    // ── Section 9: Occupation Mobility
    occupationMobility: [
      {
        from: "Administrative Assistant",
        to: "HR Executive",
        commonPath: ["Administrative Executive → HR Coordinator → HR Executive"],
        frequency: "Very Common",
      },
      {
        from: "Accounts Assistant",
        to: "Finance Executive",
        commonPath: ["Accounts Assistant → Accounts Executive → Finance Executive"],
        frequency: "Very Common",
      },
      {
        from: "Junior Software Developer",
        to: "Technical Lead",
        commonPath: ["Junior Developer → Software Engineer → Senior Engineer → Tech Lead"],
        frequency: "Very Common",
      },
      {
        from: "Customer Service Agent",
        to: "Operations Executive",
        commonPath: ["CS Agent → Team Lead → Operations Coordinator → Operations Executive"],
        frequency: "Common",
      },
      {
        from: "Marketing Executive",
        to: "Business Development Manager",
        commonPath: ["Marketing Executive → Senior Executive → BD Executive → BD Manager"],
        frequency: "Common",
      },
      {
        from: "Sales Executive",
        to: "Key Account Manager",
        commonPath: ["Sales Coordinator → Sales Executive → Senior Executive → KAM"],
        frequency: "Very Common",
      },
      {
        from: "Data Analyst",
        to: "Data Scientist",
        commonPath: ["Reporting Analyst → BI Analyst → Data Analyst → Data Scientist"],
        frequency: "Common",
      },
      {
        from: "Government Officer",
        to: "Policy Director",
        commonPath: ["PTD Officer → Senior Officer → Assistant Director → Deputy Director → Director"],
        frequency: "Occasional",
      },
    ],

    // ── Section 10: Regional Intelligence
    regionalData: [
      {
        region: "Kuala Lumpur",
        vacancyVolume: 612,
        candidateSupply: 1420,
        topIndustries: ["Finance & Banking", "Technology & IT", "Professional Services"],
        skillShortages: ["Cybersecurity", "Data Engineering", "AI/ML"],
        hiringActivity: "Very Active",
      },
      {
        region: "Selangor",
        vacancyVolume: 487,
        candidateSupply: 1180,
        topIndustries: ["Manufacturing", "Technology & IT", "Logistics & Supply Chain"],
        skillShortages: ["Cloud Computing", "Supply Chain Analytics", "Compliance"],
        hiringActivity: "Very Active",
      },
      {
        region: "Johor",
        vacancyVolume: 198,
        candidateSupply: 420,
        topIndustries: ["Manufacturing", "Logistics & Supply Chain", "Retail & FMCG"],
        skillShortages: ["Automation Engineering", "Supply Chain Management"],
        hiringActivity: "Active",
      },
      {
        region: "Penang",
        vacancyVolume: 187,
        candidateSupply: 390,
        topIndustries: ["Manufacturing", "Technology & IT", "Healthcare"],
        skillShortages: ["Semiconductor Engineering", "Process Engineering", "Data Analysis"],
        hiringActivity: "Active",
      },
      {
        region: "Sabah",
        vacancyVolume: 87,
        candidateSupply: 210,
        topIndustries: ["Government / Public Sector", "Healthcare", "Agriculture"],
        skillShortages: ["Healthcare Professionals", "Digital Skills", "Technical Skills"],
        hiringActivity: "Moderate",
      },
      {
        region: "Sarawak",
        vacancyVolume: 94,
        candidateSupply: 198,
        topIndustries: ["Oil & Gas", "Government / Public Sector", "Construction"],
        skillShortages: ["Oil & Gas Engineering", "Digital Literacy", "Project Management"],
        hiringActivity: "Moderate",
      },
    ],

    // ── Section 12: Executive Insights
    executiveInsights: [
      {
        category: "Technology Sector",
        insight: "Technology & IT vacancies continue to significantly outpace candidate supply, with a 42% supply gap. Cybersecurity and cloud roles face critical shortages, with vacancy-to-candidate ratios exceeding 5:1.",
        indicator: "Warning",
      },
      {
        category: "Skills Shortage",
        insight: "Compliance and regulatory skills remain among the most difficult competencies to source nationally. Financial institutions and government agencies are competing for a limited pool of compliance-qualified professionals.",
        indicator: "Warning",
      },
      {
        category: "Data & Analytics",
        insight: "Data-related occupations demonstrate the strongest hiring momentum on the platform. Python proficiency, data governance, and BI tool competencies are consistently requested across all major industries.",
        indicator: "Positive",
      },
      {
        category: "Government Sector",
        insight: "Government vacancies show increasing demand for governance, policy, and digital government competencies. GovTech transformation is creating new occupational categories that require both technical and public administration skills.",
        indicator: "Positive",
      },
      {
        category: "Salary Competitiveness",
        insight: "Cybersecurity specialists command salaries rising at 15% year-on-year. Government sector salaries remain below private sector benchmarks for equivalent roles, potentially limiting public sector talent acquisition.",
        indicator: "Warning",
      },
      {
        category: "Graduate Pipeline",
        insight: "25% of platform candidates are fresh graduates or entry-level professionals. Strong fresh graduate pipeline supports volume hiring but quality matching rates remain at 58% for technical roles.",
        indicator: "Neutral",
      },
      {
        category: "Emerging Roles",
        insight: "AI Specialist, Prompt Engineer, and Sustainability Analyst roles are emerging as new occupation categories. Platform data suggests a 3–5 year window before these roles reach mainstream hiring volume in Malaysia.",
        indicator: "Positive",
      },
    ],

    // ── Section 13: Future Skills Outlook
    futureSkills: [
      { skill: "AI Literacy & Prompt Engineering", futureDemand: "High", relevantIndustries: ["All Industries"], timeline: "2025–2027" },
      { skill: "Data Analytics & Visualisation", futureDemand: "High", relevantIndustries: ["Finance", "Government", "Healthcare", "Technology"], timeline: "Now–2026" },
      { skill: "Cybersecurity & Data Protection", futureDemand: "High", relevantIndustries: ["Finance", "Government", "Technology"], timeline: "Now–2026" },
      { skill: "ESG / Sustainability Reporting", futureDemand: "High", relevantIndustries: ["Finance", "Manufacturing", "Government"], timeline: "2025–2028" },
      { skill: "Digital Governance & Compliance", futureDemand: "High", relevantIndustries: ["Government", "Finance", "Healthcare"], timeline: "Now–2026" },
      { skill: "Cloud & Infrastructure Engineering", futureDemand: "High", relevantIndustries: ["Technology", "Finance", "Government"], timeline: "Now–2025" },
      { skill: "Agile / DevOps Practices", futureDemand: "Medium", relevantIndustries: ["Technology", "Finance"], timeline: "Now–2025" },
      { skill: "Bahasa Malaysia Technical Writing", futureDemand: "Medium", relevantIndustries: ["Government", "Education", "Media"], timeline: "Ongoing" },
      { skill: "Public Sector Digital Skills", futureDemand: "Medium", relevantIndustries: ["Government / Public Sector"], timeline: "2025–2028" },
      { skill: "Human-AI Collaboration Skills", futureDemand: "High", relevantIndustries: ["All Industries"], timeline: "2026–2029" },
      { skill: "Robotics & Automation Literacy", futureDemand: "Medium", relevantIndustries: ["Manufacturing", "Logistics"], timeline: "2026–2028" },
      { skill: "Green Energy & Clean Tech", futureDemand: "Low", relevantIndustries: ["Energy", "Manufacturing", "Government"], timeline: "2027–2030" },
    ],

    // ── Section 14: Workforce Planning Recommendations
    workforcePlanningRecommendations: [
      {
        audience: "Employer",
        priority: "High",
        recommendation: "Increase salary competitiveness for technology and data roles",
        rationale: "Cybersecurity and data engineering talent is critically scarce. Below-market salaries will result in extended time-to-fill and quality compromises.",
      },
      {
        audience: "Employer",
        priority: "High",
        recommendation: "Invest in internal talent pipeline development",
        rationale: "Low candidate-to-vacancy ratios in tech roles make external sourcing difficult. Structured internal upskilling through HRD Corp-subsidised programmes offers a cost-effective alternative.",
      },
      {
        audience: "Employer",
        priority: "Medium",
        recommendation: "Hire for transferable skills and train for technical gaps",
        rationale: "Transferable talent — e.g. finance professionals transitioning to fintech, or administrators moving to HR — represents an underutilised hiring strategy that reduces competition for scarce specialists.",
      },
      {
        audience: "Employer",
        priority: "Medium",
        recommendation: "Expand candidate sourcing to East Malaysia regions",
        rationale: "Sabah and Sarawak present untapped candidate pools for digital, administrative, and government-sector roles. Remote-ready roles should consider East Malaysian talent pipelines.",
      },
      {
        audience: "Government",
        priority: "High",
        recommendation: "Prioritise compliance and governance training under HRD Corp",
        rationale: "Compliance skills face a national shortage with a 2.7× vacancy-to-candidate ratio. Government-funded compliance training programmes would directly address this market failure.",
      },
      {
        audience: "Government",
        priority: "High",
        recommendation: "Expand digital skills initiatives under MyDIGITAL",
        rationale: "Cloud computing, cybersecurity, and AI literacy shortages risk constraining Malaysia's digital economy ambitions. National reskilling at scale is required.",
      },
      {
        audience: "Government",
        priority: "Medium",
        recommendation: "Increase public sector salary competitiveness for technical roles",
        rationale: "Government technology roles pay significantly below market rate. This is reducing the quality of GovTech talent available for digital government transformation.",
      },
      {
        audience: "Both",
        priority: "High",
        recommendation: "Build structured pathways for emerging occupations",
        rationale: "AI specialists, sustainability analysts, and prompt engineers are not yet served by existing education and training frameworks. Early curriculum and certification development will prevent a skills cliff.",
      },
    ],
  };
}

// ─── Styling helpers ──────────────────────────

export function getDemandLevelConfig(level: DemandLevel) {
  switch (level) {
    case "Critical Demand": return { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive" };
    case "High Demand": return { bg: "bg-[#F97316]/10 border-[#F97316]/20", text: "text-[#F97316]" };
    case "Moderate Demand": return { bg: "bg-primary/10 border-primary/20", text: "text-primary" };
    case "Stable Demand": return { bg: "bg-secondary border-border", text: "text-muted-foreground" };
  }
}

export function getShortageLevelConfig(level: ShortageLevel) {
  switch (level) {
    case "Critical": return { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", bar: "bg-destructive" };
    case "High": return { bg: "bg-[#F97316]/10 border-[#F97316]/20", text: "text-[#F97316]", bar: "bg-[#F97316]" };
    case "Moderate": return { bg: "bg-primary/10 border-primary/20", text: "text-primary", bar: "bg-primary" };
    case "Low": return { bg: "bg-[var(--success)]/10 border-[var(--success)]/20", text: "text-[var(--success)]", bar: "bg-[var(--success)]" };
  }
}

export function getGrowthTrendConfig(trend: GrowthTrend) {
  switch (trend) {
    case "Surging": return { text: "text-destructive", label: "↑↑ Surging" };
    case "Growing": return { text: "text-[#F97316]", label: "↑ Growing" };
    case "Stable": return { text: "text-muted-foreground", label: "→ Stable" };
    case "Declining": return { text: "text-muted-foreground", label: "↓ Declining" };
  }
}

export function getReadinessConfig(rating: WorkforceReadinessRating) {
  switch (rating) {
    case "Excellent": return { text: "text-[var(--success)]", bg: "bg-[var(--success)]/10" };
    case "Strong": return { text: "text-primary", bg: "bg-primary/10" };
    case "Moderate": return { text: "text-[#F97316]", bg: "bg-[#F97316]/10" };
    case "Low": return { text: "text-destructive", bg: "bg-destructive/10" };
  }
}

export function getFutureSkillConfig(level: FutureSkillLevel) {
  switch (level) {
    case "High": return { text: "text-destructive", bg: "bg-destructive/10 border-destructive/20", bar: "bg-destructive", width: "w-full" };
    case "Medium": return { text: "text-[#F97316]", bg: "bg-[#F97316]/10 border-[#F97316]/20", bar: "bg-[#F97316]", width: "w-2/3" };
    case "Low": return { text: "text-muted-foreground", bg: "bg-secondary border-border", bar: "bg-secondary", width: "w-1/3" };
  }
}

export function getInsightConfig(indicator: InsightCard["indicator"]) {
  switch (indicator) {
    case "Positive": return { border: "border-[var(--success)]/20 bg-[var(--success)]/5", dot: "bg-[var(--success)]", text: "text-[var(--success)]" };
    case "Warning": return { border: "border-[#F97316]/20 bg-[#F97316]/5", dot: "bg-[#F97316]", text: "text-[#F97316]" };
    case "Neutral": return { border: "border-border bg-secondary/30", dot: "bg-muted-foreground", text: "text-muted-foreground" };
  }
}
