// MASCO & Occupation Intelligence Engine
// Rule-based occupational mapping for Malaysian job market
// Aligned with MASCO (Malaysian Standard Classification of Occupations)

export type SalaryBand = { entry: string; mid: string; senior: string };

export type OccupationProfile = {
  // Identity
  occupationTitle: string;
  mascoCategory: string;
  mascoCode: string;
  jobFamily: string;
  confidenceScore: number; // 0–100

  // Related occupations
  relatedOccupations: string[];

  // Skills taxonomy
  hardSkills: string[];
  softSkills: string[];
  industrySkills: string[];
  publicSectorSkills: string[];

  // Qualifications
  minimumQualification: string;
  preferredQualification: string;
  certifications: string[];
  experienceLevel: string;
  experienceYears: string;

  // Salary
  salaryBand: SalaryBand;
  salaryNote: string;

  // Career path
  careerProgression: string[]; // ordered from junior to senior

  // Labour market
  labourMarketRelevance: string;
  employerTypeAlignment: string;
  demandLevel: "High" | "Medium" | "Growing" | "Stable" | "Niche";

  // Vacancy intelligence
  vacancyOptimizationAdvice: string[];
  candidateMatchingCriteria: string[];

  // Flags
  isPublicSector: boolean;
  isGovtAligned: boolean;
};

// ─────────────────────────────────────────────
// Job Family Definitions
// ─────────────────────────────────────────────

type FamilyDefinition = {
  family: string;
  keywords: string[];
  mascoCategory: string;
  mascoCode: string;
  occupationTitle: string;
  relatedOccupations: string[];
  hardSkills: string[];
  softSkills: string[];
  industrySkills: string[];
  minQual: string;
  prefQual: string;
  certs: string[];
  expLevel: string;
  expYears: string;
  salary: SalaryBand;
  salaryNote: string;
  careerPath: string[];
  labourMarket: string;
  demandLevel: "High" | "Medium" | "Growing" | "Stable" | "Niche";
};

const JOB_FAMILIES: FamilyDefinition[] = [
  {
    family: "Finance & Banking",
    keywords: [
      "finance", "financial", "banking", "treasury", "investment", "portfolio",
      "wealth", "asset", "fund", "capital", "credit", "loan", "mortgage", "risk",
      "corporate finance", "trade finance",
    ],
    mascoCategory: "Finance & Accounting Associate Professionals",
    mascoCode: "MASCO 3312",
    occupationTitle: "Finance / Banking Associate Professional",
    relatedOccupations: [
      "Finance Executive", "Treasury Analyst", "Credit Analyst",
      "Investment Analyst", "Risk Analyst", "Relationship Manager",
      "Financial Planner", "Portfolio Executive",
    ],
    hardSkills: [
      "Financial modelling", "Financial reporting", "Treasury management",
      "Credit analysis", "Risk assessment", "Excel / Power BI",
      "Banking regulations", "KYC / AML compliance", "Capital markets",
    ],
    softSkills: [
      "Analytical thinking", "Attention to detail", "Communication",
      "Problem solving", "Integrity", "Negotiation",
    ],
    industrySkills: [
      "BNM regulatory knowledge", "IFRS / MFRS", "Bloomberg / Reuters",
      "Core banking systems", "Basel III/IV awareness",
    ],
    minQual: "Diploma in Finance, Accounting, Business or related field",
    prefQual: "Degree in Finance, Accounting, Economics, Business Administration",
    certs: ["CFA (preferred)", "ACCA (partial)", "CFP", "Risk Management Certification"],
    expLevel: "Entry to Senior",
    expYears: "1–8 years",
    salary: { entry: "RM3,500", mid: "RM6,000", senior: "RM12,000+" },
    salaryNote: "Based on Malaysian banking and financial services sector norms",
    careerPath: [
      "Finance / Banking Assistant",
      "Finance Executive / Credit Analyst",
      "Senior Finance Executive / Relationship Manager",
      "Finance Manager / Team Lead",
      "Finance Director / Head of Treasury",
    ],
    labourMarket: "Finance and banking remains a high-demand sector in Malaysia, particularly in Kuala Lumpur's financial corridor (KLFC). BNM-regulated institutions, GLCs, and MNCs actively recruit qualified finance professionals.",
    demandLevel: "High",
  },
  {
    family: "Accounting",
    keywords: [
      "account", "accountant", "accounting", "audit", "auditor", "tax",
      "bookkeep", "ledger", "payable", "receivable", "payroll", "gl", "ap", "ar",
      "statutory", "compliance", "ssm", "lhdn", "gst", "sst",
    ],
    mascoCategory: "Accounting Associate Professionals",
    mascoCode: "MASCO 3313",
    occupationTitle: "Accounting / Audit Associate Professional",
    relatedOccupations: [
      "Accounts Executive", "Financial Accountant", "Tax Executive",
      "Internal Auditor", "External Auditor", "Management Accountant",
      "Payroll Executive", "Cost Accountant",
    ],
    hardSkills: [
      "Financial reporting", "Tax compliance (LHDN, SST)", "Audit procedures",
      "Budgeting & forecasting", "Excel / ERP systems", "Accounting standards (MPERS/MFRS)",
      "Bank reconciliation", "Accounts payable & receivable",
    ],
    softSkills: [
      "Attention to detail", "Integrity", "Communication",
      "Analytical thinking", "Time management", "Problem solving",
    ],
    industrySkills: [
      "MYOB / SQL Accounting / AutoCount", "SAP / Oracle Financials",
      "CTOS / credit reporting", "Companies Commission (SSM) filings",
    ],
    minQual: "Diploma in Accounting, Finance or related field",
    prefQual: "Degree in Accounting, Finance, Business Administration",
    certs: ["ACCA", "ICAEW", "CPA Malaysia", "MIA membership"],
    expLevel: "Entry to Mid",
    expYears: "1–5 years",
    salary: { entry: "RM2,800", mid: "RM5,500", senior: "RM10,000+" },
    salaryNote: "Varies by firm size; Big 4 audit firms and GLCs offer competitive packages",
    careerPath: [
      "Accounts Assistant / Junior Auditor",
      "Accounts Executive / Audit Associate",
      "Senior Accounts Executive / Audit Senior",
      "Accounts Manager / Audit Manager",
      "Finance Controller / Finance Director",
    ],
    labourMarket: "Accounting professionals are consistently in demand across all sectors in Malaysia. Ongoing tax reforms (SST, e-invoicing mandate) and corporate governance requirements drive sustained recruitment.",
    demandLevel: "High",
  },
  {
    family: "Administration",
    keywords: [
      "admin", "administration", "administrator", "clerk", "secretary",
      "office", "coordinator", "executive assistant", "pa", "personal assistant",
      "receptionist", "filing", "documentation",
    ],
    mascoCategory: "General Office Clerks",
    mascoCode: "MASCO 4110",
    occupationTitle: "Administrative / Office Support Professional",
    relatedOccupations: [
      "Administrative Executive", "Office Coordinator", "Executive Secretary",
      "Personal Assistant", "Office Manager", "Company Secretary",
      "Document Controller", "Administrative Officer",
    ],
    hardSkills: [
      "MS Office Suite", "Document management", "Data entry",
      "Meeting coordination", "Travel management", "Filing systems",
      "Basic bookkeeping", "Correspondence drafting",
    ],
    softSkills: [
      "Organisation", "Communication", "Discretion",
      "Multitasking", "Time management", "Professionalism",
    ],
    industrySkills: [
      "SharePoint / Google Workspace", "ERP data entry",
      "CRM systems", "Calendar management tools",
    ],
    minQual: "SPM / Diploma in Business Administration or related field",
    prefQual: "Diploma or Degree in Business Administration, Management",
    certs: ["MAICSA (for company secretarial)", "Office Management Certification"],
    expLevel: "Entry to Mid",
    expYears: "1–4 years",
    salary: { entry: "RM2,000", mid: "RM3,800", senior: "RM6,500+" },
    salaryNote: "Senior administrative roles in MNCs and GLCs offer higher compensation",
    careerPath: [
      "Office Assistant / Clerk",
      "Administrative Executive",
      "Senior Administrative Executive",
      "Office Manager / Personal Assistant to Director",
      "Head of Administration",
    ],
    labourMarket: "Administrative roles remain foundational across all industries. Digital transformation is elevating requirements — candidates with ERP and digital tool proficiency are preferred.",
    demandLevel: "Stable",
  },
  {
    family: "Human Resources",
    keywords: [
      "hr", "human resource", "hris", "talent", "recruitment", "recruiter",
      "people", "workforce", "payroll", "compensation", "benefits", "learning",
      "development", "training", "culture", "engagement", "industrial relation",
      "ir officer",
    ],
    mascoCategory: "Personnel and Industrial Relations Professionals",
    mascoCode: "MASCO 2423",
    occupationTitle: "Human Resource / People Management Professional",
    relatedOccupations: [
      "HR Executive", "Talent Acquisition Specialist", "Recruitment Consultant",
      "Compensation & Benefits Analyst", "Learning & Development Executive",
      "HR Business Partner", "Industrial Relations Officer", "Payroll Executive",
    ],
    hardSkills: [
      "Recruitment & selection", "HR policies & procedures", "Payroll management",
      "Employment Act 1955 knowledge", "HRDF / HRD Corp", "Performance management",
      "Compensation & benefits administration", "HRIS systems",
    ],
    softSkills: [
      "Communication", "Empathy", "Confidentiality",
      "Problem solving", "Conflict resolution", "Stakeholder management",
    ],
    industrySkills: [
      "HR2000 / Talenox / ADP", "Jobstreet / LinkedIn Recruiter",
      "Malaysian Labour Law", "Industrial Relations Act 1967",
    ],
    minQual: "Diploma in HR, Business Administration or related",
    prefQual: "Degree in Human Resource Management, Psychology, Business Administration",
    certs: ["SHRM-CP", "CIPD", "HRDF Train the Trainer", "Malaysian HR Institute (MIHRM)"],
    expLevel: "Entry to Senior",
    expYears: "1–8 years",
    salary: { entry: "RM2,800", mid: "RM5,500", senior: "RM10,000+" },
    salaryNote: "HRBP and Talent Lead roles command premium compensation in MNCs",
    careerPath: [
      "HR Assistant / Talent Assistant",
      "HR Executive / Recruiter",
      "Senior HR Executive / Senior Recruiter",
      "HR Manager / Talent Acquisition Lead",
      "HR Director / Chief People Officer",
    ],
    labourMarket: "HR professionals are critical enablers of organisational growth. Talent acquisition specialists and HR business partners are among the most sought-after roles in Malaysia's corporate sector.",
    demandLevel: "High",
  },
  {
    family: "IT / Software",
    keywords: [
      "software", "developer", "engineer", "programmer", "coding", "backend",
      "frontend", "fullstack", "full stack", "devops", "cloud", "api",
      "mobile", "ios", "android", "react", "angular", "node", "java",
      "python", "dotnet", ".net", "php", "laravel", "microservice",
    ],
    mascoCategory: "Software and Applications Developers",
    mascoCode: "MASCO 2512",
    occupationTitle: "Software Developer / Engineer",
    relatedOccupations: [
      "Software Engineer", "Backend Developer", "Frontend Developer",
      "Full Stack Developer", "Mobile Developer", "DevOps Engineer",
      "Cloud Engineer", "Solutions Architect", "Technical Lead",
    ],
    hardSkills: [
      "Software development lifecycle (SDLC)", "Version control (Git)",
      "API development (REST / GraphQL)", "Cloud platforms (AWS / Azure / GCP)",
      "Database management (SQL / NoSQL)", "Containerisation (Docker / Kubernetes)",
      "CI/CD pipelines", "Unit and integration testing",
    ],
    softSkills: [
      "Problem solving", "Logical thinking", "Collaboration",
      "Communication", "Adaptability", "Attention to detail",
    ],
    industrySkills: [
      "Agile / Scrum methodology", "JIRA / Confluence", "GitHub / GitLab",
      "Security-aware coding (OWASP)", "Malaysian PDPA compliance",
    ],
    minQual: "Diploma in Computer Science, Information Technology or related",
    prefQual: "Degree in Computer Science, Software Engineering, Information Technology",
    certs: ["AWS Certified Developer", "Azure Developer Associate", "Google Associate Cloud Engineer", "Scrum Master"],
    expLevel: "Entry to Senior",
    expYears: "1–8 years",
    salary: { entry: "RM3,500", mid: "RM7,000", senior: "RM15,000+" },
    salaryNote: "MNCs and product companies offer top-range compensation; tech startups offer equity",
    careerPath: [
      "Junior Developer / Graduate Engineer",
      "Software Engineer / Developer",
      "Senior Software Engineer",
      "Lead Engineer / Technical Architect",
      "Engineering Manager / CTO",
    ],
    labourMarket: "Software development is the most in-demand technical field in Malaysia. MDEC and MSC Malaysia initiatives drive sustained tech talent requirements across Klang Valley and Penang.",
    demandLevel: "High",
  },
  {
    family: "Data & Analytics",
    keywords: [
      "data", "analytics", "analyst", "business intelligence", "bi",
      "data science", "machine learning", "ml", "ai", "artificial intelligence",
      "tableau", "power bi", "sql", "python", "r language", "statistics",
      "visualization", "etl", "warehouse", "big data", "spark",
    ],
    mascoCategory: "Information and Communications Technology Analysts",
    mascoCode: "MASCO 2511",
    occupationTitle: "Data / Business Intelligence Analyst",
    relatedOccupations: [
      "Data Analyst", "Business Intelligence Analyst", "Data Engineer",
      "Data Scientist", "Business Analyst", "Reporting Analyst",
      "Analytics Consultant", "MIS Executive",
    ],
    hardSkills: [
      "SQL & database querying", "Python / R for data analysis",
      "Power BI / Tableau / Qlik", "ETL processes", "Statistical analysis",
      "Data modelling", "Machine learning fundamentals", "Excel (advanced)",
    ],
    softSkills: [
      "Analytical thinking", "Storytelling with data", "Communication",
      "Attention to detail", "Problem solving", "Curiosity",
    ],
    industrySkills: [
      "Azure Synapse / Databricks", "Google Analytics", "CRM analytics",
      "PDPA data governance", "Malaysian business context",
    ],
    minQual: "Diploma in Statistics, IT, Mathematics or related",
    prefQual: "Degree in Data Science, Statistics, Computer Science, Mathematics",
    certs: ["Google Data Analytics Certificate", "Microsoft PL-300 (Power BI)", "AWS Data Analytics Specialty"],
    expLevel: "Entry to Senior",
    expYears: "1–6 years",
    salary: { entry: "RM3,200", mid: "RM6,500", senior: "RM13,000+" },
    salaryNote: "Data science specialists with ML expertise command premium salaries in fintech and e-commerce",
    careerPath: [
      "Data / Reporting Assistant",
      "Data Analyst / BI Analyst",
      "Senior Data Analyst / Data Engineer",
      "Lead Data Scientist / BI Manager",
      "Head of Analytics / Chief Data Officer",
    ],
    labourMarket: "Data and analytics roles are growing rapidly in Malaysia driven by digital transformation, fintech expansion, and government data initiatives under MyDIGITAL.",
    demandLevel: "Growing",
  },
  {
    family: "Sales",
    keywords: [
      "sales", "business development", "bd", "account manager", "territory",
      "key account", "channel", "retail", "enterprise sales", "b2b", "b2c",
      "trade", "client", "revenue", "commission", "quota", "pipeline",
    ],
    mascoCategory: "Sales and Marketing Professionals",
    mascoCode: "MASCO 2431",
    occupationTitle: "Sales / Business Development Professional",
    relatedOccupations: [
      "Sales Executive", "Business Development Executive", "Account Manager",
      "Key Account Manager", "Territory Manager", "Sales Representative",
      "Channel Sales Manager", "Enterprise Sales Manager",
    ],
    hardSkills: [
      "Sales pipeline management", "CRM (Salesforce / HubSpot)",
      "Proposal & quotation preparation", "Negotiation",
      "Product knowledge", "Market analysis", "Revenue forecasting",
    ],
    softSkills: [
      "Communication", "Persuasion", "Resilience",
      "Relationship building", "Goal orientation", "Self-motivation",
    ],
    industrySkills: [
      "Malaysian market knowledge", "B2B / B2C sales cycles",
      "Tender and procurement processes", "GST/SST pricing",
    ],
    minQual: "Diploma in Business, Marketing or related",
    prefQual: "Degree in Business Administration, Marketing, Management",
    certs: ["Professional Sales Certification", "Salesforce Certified", "Negotiation Skills Certificate"],
    expLevel: "Entry to Senior",
    expYears: "1–8 years",
    salary: { entry: "RM2,500 + commission", mid: "RM5,000 + commission", senior: "RM10,000 + OTE" },
    salaryNote: "Commission and OTE can significantly increase total compensation",
    careerPath: [
      "Sales Coordinator / Junior Sales Executive",
      "Sales Executive / Account Executive",
      "Senior Sales Executive / Key Account Manager",
      "Sales Manager / Territory Manager",
      "Sales Director / VP Sales",
    ],
    labourMarket: "Sales talent is perpetually in demand. B2B technology sales, financial product sales, and FMCG trade sales are among Malaysia's most active hiring segments.",
    demandLevel: "High",
  },
  {
    family: "Marketing",
    keywords: [
      "marketing", "brand", "branding", "digital marketing", "seo", "sem",
      "social media", "content", "campaign", "advertising", "media",
      "communications", "pr", "public relations", "event", "growth",
    ],
    mascoCategory: "Advertising and Marketing Professionals",
    mascoCode: "MASCO 2431",
    occupationTitle: "Marketing / Digital Marketing Professional",
    relatedOccupations: [
      "Marketing Executive", "Digital Marketing Executive", "Brand Manager",
      "Content Strategist", "Social Media Manager", "Growth Hacker",
      "Marketing Analyst", "Communications Manager",
    ],
    hardSkills: [
      "Digital marketing strategy", "SEO / SEM", "Social media management",
      "Content creation", "Email marketing", "Google Analytics / Meta Ads",
      "Marketing automation", "Campaign performance tracking",
    ],
    softSkills: [
      "Creativity", "Communication", "Analytical thinking",
      "Collaboration", "Adaptability", "Brand awareness",
    ],
    industrySkills: [
      "Malaysian consumer behaviour", "Shopee / Lazada e-commerce", "Bahasa Malaysia copywriting",
      "PDPA compliance for marketing", "Influencer marketing (Malaysia context)",
    ],
    minQual: "Diploma in Marketing, Communications, Business or related",
    prefQual: "Degree in Marketing, Mass Communications, Business Administration",
    certs: ["Google Ads Certification", "Meta Blueprint", "HubSpot Marketing Certification", "Digital Marketing Institute"],
    expLevel: "Entry to Senior",
    expYears: "1–7 years",
    salary: { entry: "RM2,500", mid: "RM5,000", senior: "RM10,000+" },
    salaryNote: "Digital specialists with performance marketing expertise command higher rates",
    careerPath: [
      "Marketing Coordinator / Junior Executive",
      "Marketing Executive / Digital Specialist",
      "Senior Marketing Executive / Brand Executive",
      "Marketing Manager / Brand Manager",
      "Marketing Director / CMO",
    ],
    labourMarket: "Marketing roles are high-growth in Malaysia's e-commerce, fintech, and consumer goods sectors. Digital marketing competencies are now mandatory across all marketing job families.",
    demandLevel: "Growing",
  },
  {
    family: "Customer Service",
    keywords: [
      "customer service", "customer care", "customer success", "support",
      "helpdesk", "call centre", "contact centre", "client service",
      "after sales", "complaint", "service desk", "crm",
    ],
    mascoCategory: "Customer Information Services Clerks",
    mascoCode: "MASCO 4221",
    occupationTitle: "Customer Service / Support Professional",
    relatedOccupations: [
      "Customer Service Executive", "Customer Care Officer", "Client Support Specialist",
      "Helpdesk Analyst", "Contact Centre Agent", "Customer Success Manager",
      "Service Delivery Coordinator",
    ],
    hardSkills: [
      "CRM systems (Zendesk / Freshdesk / Salesforce Service Cloud)",
      "Complaint resolution", "SLA management",
      "Ticketing systems", "Product/service knowledge",
      "Live chat / email support", "Reporting",
    ],
    softSkills: [
      "Communication", "Empathy", "Patience",
      "Active listening", "Problem solving", "Conflict resolution",
    ],
    industrySkills: [
      "Bahasa Malaysia fluency", "Mandarin/Tamil (customer demographic)",
      "Malaysian consumer rights awareness", "Telecommunications/Banking service context",
    ],
    minQual: "SPM / Diploma in any field",
    prefQual: "Diploma or Degree in Business, Communications, Management",
    certs: ["CCNA (contact centre focus)", "COPC Certification", "Customer Experience Professional"],
    expLevel: "Entry to Mid",
    expYears: "1–4 years",
    salary: { entry: "RM1,800", mid: "RM3,500", senior: "RM6,000+" },
    salaryNote: "Customer success and service management roles offer significantly higher compensation",
    careerPath: [
      "Customer Service Agent / Call Centre Officer",
      "Customer Service Executive",
      "Senior Customer Service Executive / Team Lead",
      "Customer Service Manager",
      "Head of Customer Experience",
    ],
    labourMarket: "Customer service roles are among the highest volume recruitment areas in Malaysia, particularly in banking, telecommunications, and e-commerce.",
    demandLevel: "High",
  },
  {
    family: "Operations",
    keywords: [
      "operations", "operations manager", "ops", "supply chain", "logistics",
      "warehouse", "procurement", "purchasing", "vendor", "inventory",
      "production", "manufacturing", "quality", "process improvement", "lean", "six sigma",
    ],
    mascoCategory: "Production and Operations Managers",
    mascoCode: "MASCO 1321",
    occupationTitle: "Operations / Supply Chain Professional",
    relatedOccupations: [
      "Operations Executive", "Supply Chain Analyst", "Procurement Executive",
      "Logistics Coordinator", "Warehouse Supervisor", "Quality Assurance Executive",
      "Production Planner", "Operations Manager",
    ],
    hardSkills: [
      "Supply chain management", "Inventory control", "Procurement",
      "ERP systems (SAP / Oracle)", "Logistics coordination",
      "Quality management (ISO)", "KPI reporting", "Process improvement",
    ],
    softSkills: [
      "Problem solving", "Leadership", "Communication",
      "Attention to detail", "Analytical thinking", "Multitasking",
    ],
    industrySkills: [
      "Malaysian import/export regulations", "Customs (Kastam) procedures",
      "Lean manufacturing", "Halal supply chain awareness",
    ],
    minQual: "Diploma in Business, Logistics, Supply Chain or related",
    prefQual: "Degree in Supply Chain, Business Administration, Engineering",
    certs: ["CIPS (Chartered Institute of Procurement & Supply)", "APICS CSCP", "Six Sigma Green Belt"],
    expLevel: "Entry to Senior",
    expYears: "2–8 years",
    salary: { entry: "RM2,800", mid: "RM5,500", senior: "RM10,000+" },
    salaryNote: "Operations managers in manufacturing and logistics can earn significantly more with experience",
    careerPath: [
      "Operations / Logistics Assistant",
      "Operations Executive / Procurement Executive",
      "Senior Operations Executive / Supply Chain Analyst",
      "Operations Manager / Supply Chain Manager",
      "Director of Operations / COO",
    ],
    labourMarket: "Supply chain and operations roles surged post-pandemic. Manufacturing, logistics, and e-commerce fulfilment are Malaysia's highest-volume operations recruiters.",
    demandLevel: "High",
  },
  {
    family: "Engineering",
    keywords: [
      "engineer", "engineering", "mechanical", "electrical", "civil",
      "structural", "chemical", "industrial", "process", "automation",
      "instrumentation", "hvac", "oil gas", "petrochemical", "construction",
      "project engineer", "design engineer", "site engineer",
    ],
    mascoCategory: "Engineering Professionals",
    mascoCode: "MASCO 2141",
    occupationTitle: "Engineering Professional",
    relatedOccupations: [
      "Mechanical Engineer", "Electrical Engineer", "Civil Engineer",
      "Process Engineer", "Project Engineer", "Design Engineer",
      "Quality Engineer", "Site Engineer",
    ],
    hardSkills: [
      "Engineering design & calculations", "AutoCAD / SolidWorks / CATIA",
      "Project management", "Technical documentation",
      "Standards & codes compliance (IEM, DOSH)", "Commissioning & testing",
      "Failure analysis", "Cost estimation",
    ],
    softSkills: [
      "Problem solving", "Attention to detail", "Communication",
      "Teamwork", "Analytical thinking", "Safety awareness",
    ],
    industrySkills: [
      "Malaysian engineering standards (MS / JKR)", "DOSH compliance",
      "CIDB Green Card", "Oil & gas (PETRONAS) regulations",
    ],
    minQual: "Degree in Engineering (BEng / BSc)",
    prefQual: "Degree in relevant engineering discipline; IEM registration preferred",
    certs: ["IEM Registered Engineer", "DOSH Competency", "Project Management Professional (PMP)"],
    expLevel: "Graduate to Senior",
    expYears: "0–10 years",
    salary: { entry: "RM3,000", mid: "RM7,000", senior: "RM15,000+" },
    salaryNote: "Oil & gas and specialised engineering command premium rates; FPT / PETRONAS vendors offer competitive packages",
    careerPath: [
      "Graduate Engineer / Junior Engineer",
      "Engineer / Project Engineer",
      "Senior Engineer / Lead Engineer",
      "Principal Engineer / Engineering Manager",
      "Director of Engineering / Chief Engineer",
    ],
    labourMarket: "Engineering talent is critical to Malaysia's manufacturing and infrastructure sectors. Electrical, mechanical, and process engineers are among the most consistently recruited.",
    demandLevel: "Stable",
  },
  {
    family: "Healthcare",
    keywords: [
      "doctor", "nurse", "nursing", "medical", "clinical", "pharmacist",
      "pharmacy", "physiotherapy", "radiology", "lab", "healthcare", "hospital",
      "patient", "health", "paramedic", "surgeon", "specialist",
    ],
    mascoCategory: "Health Professionals",
    mascoCode: "MASCO 2210",
    occupationTitle: "Healthcare / Medical Professional",
    relatedOccupations: [
      "Medical Officer", "Registered Nurse", "Clinical Pharmacist",
      "Medical Laboratory Technologist", "Physiotherapist",
      "Radiographer", "Clinical Research Coordinator", "Healthcare Administrator",
    ],
    hardSkills: [
      "Clinical assessment", "Patient care", "Medical documentation",
      "Pharmacology knowledge", "Diagnostic interpretation",
      "Emergency response", "Infection control", "Electronic health records (HIS)",
    ],
    softSkills: [
      "Empathy", "Communication", "Attention to detail",
      "Stress management", "Teamwork", "Integrity",
    ],
    industrySkills: [
      "MOH clinical guidelines", "Malaysian Medical Council (MMC) registration",
      "BLS / ACLS certification", "HIMS / Medisystems",
    ],
    minQual: "Diploma in Nursing / Medical-related programme",
    prefQual: "MBBS / Degree in Nursing, Pharmacy, Allied Health Science",
    certs: ["MMC / Nursing Board registration", "BLS/ACLS", "Specialist Board certification"],
    expLevel: "Graduate to Specialist",
    expYears: "0–15 years",
    salary: { entry: "RM2,500", mid: "RM7,000", senior: "RM20,000+" },
    salaryNote: "Specialists and consultants in private hospitals command significantly higher compensation",
    careerPath: [
      "House Officer / Junior Nurse",
      "Medical Officer / Staff Nurse",
      "Senior Medical Officer / Senior Nurse",
      "Specialist / Head of Department",
      "Consultant / Chief Medical Officer",
    ],
    labourMarket: "Healthcare professionals are perpetually in demand in Malaysia. Private hospital expansion, ageing demographics, and MOH digitalisation drive sustained recruitment.",
    demandLevel: "High",
  },
  {
    family: "Education",
    keywords: [
      "teacher", "lecturer", "educator", "tutor", "academic", "trainer",
      "education", "curriculum", "school", "university", "college",
      "training", "e-learning", "instructional", "coach",
    ],
    mascoCategory: "Higher Education Teachers",
    mascoCode: "MASCO 2310",
    occupationTitle: "Educator / Academic Professional",
    relatedOccupations: [
      "Secondary School Teacher", "University Lecturer", "Corporate Trainer",
      "Curriculum Developer", "Learning & Development Specialist",
      "Instructional Designer", "Academic Advisor", "Education Coordinator",
    ],
    hardSkills: [
      "Curriculum design", "Lesson planning", "Student assessment",
      "Learning management systems (LMS)", "Educational technology",
      "Subject matter expertise", "Research methodology",
    ],
    softSkills: [
      "Communication", "Patience", "Adaptability",
      "Mentoring", "Organisation", "Creativity",
    ],
    industrySkills: [
      "MOE / MQA framework knowledge", "Malaysian CEFR English proficiency",
      "Bahasa Malaysia instruction", "HRDCORP Train the Trainer",
    ],
    minQual: "Diploma in Education or relevant subject field",
    prefQual: "Degree in Education or subject discipline; Postgraduate for lecturers",
    certs: ["KPM Teaching License (PTG)", "TESOL / TESL", "Train the Trainer (TTT)", "PhD (for academic positions)"],
    expLevel: "Entry to Senior Academic",
    expYears: "1–15 years",
    salary: { entry: "RM2,500", mid: "RM5,000", senior: "RM10,000+" },
    salaryNote: "Private university and international school educators receive competitive packages; government teachers follow JPA salary scales",
    careerPath: [
      "Trainee Teacher / Junior Lecturer",
      "Teacher / Lecturer",
      "Senior Teacher / Senior Lecturer",
      "Head of Department / Programme Leader",
      "Principal / Dean / Director of Academic",
    ],
    labourMarket: "Education professionals are foundational to Malaysia's human capital development agenda. MOE initiatives and private education expansion sustain continuous demand.",
    demandLevel: "Stable",
  },
  {
    family: "Government / Public Sector",
    keywords: [
      "government", "civil service", "public sector", "jabatan", "kementerian",
      "ministry", "department", "policy", "governance", "civil servant",
      "ptd", "mcs", "goverment officer", "public administration", "regulatory",
      "enforcement", "compliance officer", "jpa", "spa",
    ],
    mascoCategory: "Government Associate Professionals",
    mascoCode: "MASCO 3359",
    occupationTitle: "Public Sector / Government Officer",
    relatedOccupations: [
      "Administrative and Diplomatic Officer (PTD)", "Policy Analyst",
      "Enforcement Officer", "Compliance Officer", "Government Auditor",
      "Public Works Officer", "Social Welfare Officer", "Customs Officer",
    ],
    hardSkills: [
      "Policy formulation & analysis", "Government budgeting (RMK cycles)",
      "Administrative law", "Report writing (BM & English)",
      "Public procurement (Perbendaharaan)", "Data management",
      "Programme evaluation", "Inter-agency coordination",
    ],
    softSkills: [
      "Integrity", "Professionalism", "Communication (BM & English)",
      "Analytical thinking", "Stakeholder management", "Patience",
    ],
    industrySkills: [
      "ePerolehan (government procurement system)", "HRMIS",
      "MAMPU digital services", "Dasar & Undang-Undang Malaysia",
      "ISO compliance in government context",
    ],
    minQual: "Diploma in Public Administration, Management, or related field",
    prefQual: "Degree in Public Administration, Law, Economics, Political Science",
    certs: ["SPA qualification", "JPA leadership programmes", "INTAN training certificates"],
    expLevel: "Entry (Grade 19/29) to Senior (Grade 41+)",
    expYears: "0–20 years",
    salary: { entry: "RM1,800 (Grade 19)", mid: "RM3,500 (Grade 41)", senior: "RM8,000+ (JUSA)" },
    salaryNote: "Government salaries follow JPA salary scales; allowances, pension, and benefits add significant value",
    careerPath: [
      "Pegawai Tadbir (Administrative Officer)",
      "Penolong Pegawai Tadbir / Junior Officer",
      "Pegawai Tadbir Diplomatik (PTD) / Senior Officer",
      "Principal Assistant Director / Deputy Director",
      "Director / Deputy Secretary General / Secretary General",
    ],
    labourMarket: "Public sector remains Malaysia's largest single employer. JPA and SPA continue to recruit across all government agencies. Digital government transformation (GDT) creates demand for tech-savvy civil servants.",
    demandLevel: "Stable",
  },
];

// ─────────────────────────────────────────────
// Core matching engine
// ─────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);
}

function scoreFamilyMatch(text: string, family: FamilyDefinition): number {
  const tokens = tokenize(text);
  let score = 0;
  for (const kw of family.keywords) {
    const kwTokens = tokenize(kw);
    if (kwTokens.every((k) => tokens.some((t) => t.includes(k) || k.includes(t)))) {
      score += kw.includes(" ") ? 3 : 1; // multi-word keywords score higher
    }
  }
  return score;
}

export function classifyOccupation(
  jobTitle: string,
  industry = "",
  employerType = "",
  description = "",
  requirements = ""
): OccupationProfile {
  const searchText = `${jobTitle} ${industry} ${description} ${requirements}`.toLowerCase();

  // Score each family
  const scores = JOB_FAMILIES.map((f) => ({
    family: f,
    score: scoreFamilyMatch(searchText, f),
  })).sort((a, b) => b.score - a.score);

  // Check for government/public sector boost
  const isGovt =
    employerType.toLowerCase() === "government" ||
    tokenize(searchText).some((t) =>
      ["government", "public", "jabatan", "kementerian", "ministry", "ptd", "civil", "jpa"].includes(t)
    );

  let best = scores[0];

  // If government and not already matched to govt family, check if govt family has any score
  if (isGovt) {
    const govtEntry = scores.find((s) => s.family.family === "Government / Public Sector");
    if (govtEntry && govtEntry.score > 0) best = govtEntry;
    else if (best.score === 0) {
      best = { family: JOB_FAMILIES.find((f) => f.family === "Government / Public Sector")!, score: 1 };
    }
  }

  const f = best.family;
  const confidence = Math.min(95, best.score === 0 ? 35 : Math.min(95, 45 + best.score * 10));

  // Public sector skills injection
  const publicSectorSkills =
    isGovt || f.family === "Government / Public Sector"
      ? [
          "Public sector awareness",
          "Policy understanding",
          "Integrity & governance",
          "Bahasa Malaysia proficiency",
          "Compliance & regulatory awareness",
          "Inter-agency coordination",
        ]
      : [];

  // Vacancy optimisation advice
  const advice: string[] = [];
  if (!requirements || requirements.length < 50) advice.push("Expand the requirements section with specific skill expectations");
  if (!description || description.length < 80) advice.push("Add a detailed job description to improve candidate alignment");
  if (!industry) advice.push("Specify the industry to attract sector-matched candidates");
  advice.push(`Align job title with MASCO category: "${f.mascoCategory}"`);
  advice.push(`Include ${f.certs.slice(0, 2).join(" / ")} certification preferences`);
  advice.push("State salary range explicitly to reduce unqualified applications");
  if (isGovt) advice.push("Mention SPA / JPA application requirements and grade level");

  // Candidate matching criteria
  const matchCriteria: string[] = [
    `Skill match: Candidates evaluated against ${f.hardSkills.slice(0, 3).join(", ")}`,
    `Experience match: ${f.expYears} of relevant experience expected`,
    `Education match: Minimum ${f.minQual}`,
    `Industry alignment: ${f.family} sector experience preferred`,
    ...(isGovt ? ["Government sector alignment and integrity assessment required"] : []),
    "Employer type fit: Validated against candidate's preferred employer type",
    "Interview score factored if AI interview assessment is available",
  ];

  return {
    occupationTitle: f.occupationTitle,
    mascoCategory: f.mascoCategory,
    mascoCode: f.mascoCode,
    jobFamily: f.family,
    confidenceScore: confidence,
    relatedOccupations: f.relatedOccupations,
    hardSkills: f.hardSkills,
    softSkills: f.softSkills,
    industrySkills: f.industrySkills,
    publicSectorSkills,
    minimumQualification: f.minQual,
    preferredQualification: f.prefQual,
    certifications: f.certs,
    experienceLevel: f.expLevel,
    experienceYears: f.expYears,
    salaryBand: f.salary,
    salaryNote: f.salaryNote,
    careerProgression: f.careerPath,
    labourMarketRelevance: f.labourMarket,
    employerTypeAlignment: isGovt
      ? "Optimised for Government / Public Sector recruitment"
      : employerType
      ? `Aligned for ${employerType} employer profile`
      : "Applicable across GLC, MNC, and Private sector",
    demandLevel: f.demandLevel,
    vacancyOptimizationAdvice: advice,
    candidateMatchingCriteria: matchCriteria,
    isPublicSector: isGovt || f.family === "Government / Public Sector",
    isGovtAligned: isGovt,
  };
}

export const INDUSTRIES = [
  "Finance & Banking", "Accounting", "Technology & IT", "Manufacturing",
  "Healthcare", "Education", "Retail & FMCG", "Oil & Gas", "Construction",
  "Logistics & Supply Chain", "Professional Services", "Government / Public Sector",
  "Media & Communications", "Hospitality & Tourism", "Agriculture", "Other",
];

export const EMPLOYER_TYPES = ["GLC", "MNC", "Local", "Government"];

export function getDemandBadgeConfig(level: OccupationProfile["demandLevel"]) {
  switch (level) {
    case "High": return { bg: "bg-[var(--success)]/10 border-[var(--success)]/20", text: "text-[var(--success)]" };
    case "Growing": return { bg: "bg-primary/10 border-primary/20", text: "text-primary" };
    case "Stable": return { bg: "bg-secondary border-border", text: "text-muted-foreground" };
    case "Medium": return { bg: "bg-[#F97316]/10 border-[#F97316]/20", text: "text-[#F97316]" };
    case "Niche": return { bg: "bg-secondary border-border", text: "text-muted-foreground" };
  }
}
