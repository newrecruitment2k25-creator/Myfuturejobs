import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  ArrowRight, Loader2, Sparkles, Brain, ChevronRight,
  DollarSign, Clock, BookOpen, FileText, TrendingUp,
  Briefcase, GraduationCap, Target, Wrench, Award,
  MapPin, Rocket, Lightbulb, BadgeCheck, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/career-pathway")({
  ssr: false,
  component: CareerPathwayPage,
  head: () => ({
    meta: [
      { title: "Career Pathway Explorer — MYFutureJobs" },
      { name: "description", content: "Map your career progression, salary growth, and real courses to get there." },
    ],
  }),
});

interface CareerProfile {
  currentRole: string;
  experience: string;
  education: string;
  skills: string;
  goal: string;
  industry: string;
}

interface PathwayNode {
  title: string;
  level: "current" | "bridge" | "target" | "aspirational";
  salaryRange: string;
  timeline: string;
  keySkills: string[];
  transitionSkills: string[];
  certs: string[];
}

interface ParsedPathway {
  nodes: PathwayNode[];
  summary: string;
}

const LEVEL_CONFIG: Record<PathwayNode["level"], { bg: string; border: string; badge: string; label: string; accent: string }> = {
  current:     { bg: "bg-card", border: "border-primary", badge: "bg-primary text-primary-foreground", label: "You Are Here", accent: "#512ACC" },
  bridge:      { bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-400", badge: "bg-blue-500 text-white", label: "Next Step", accent: "#2563eb" },
  target:      { bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-400", badge: "bg-violet-600 text-white", label: "Target Role", accent: "#7c3aed" },
  aspirational:{ bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-400", badge: "bg-amber-500 text-white", label: "Future Vision", accent: "#d97706" },
};

const LEVEL_ORDER: PathwayNode["level"][] = ["current", "bridge", "target", "aspirational"];

const ROLE_SUGGESTIONS = [
  "Software Developer", "Systems Analyst", "Data Analyst", "IT Project Manager",
  "Network Engineer", "Cybersecurity Analyst", "DevOps Engineer", "Product Manager",
  "Marketing Executive", "Sales Executive", "HR Officer", "Accountant",
  "Civil Engineer", "Mechanical Engineer", "Electrical Engineer", "Quantity Surveyor",
  "Medical Officer", "Nurse", "Pharmacist", "Financial Analyst", "Auditor",
  "Graphic Designer", "UX Designer", "Business Analyst", "Operations Manager",
  "Customer Service Officer", "Logistics Coordinator", "Teacher", "Lecturer",
];

const REAL_COURSES: Record<string, { title: string; provider: string; href: string; mode: string }[]> = {
  "data analytics": [
    { title: "Google Data Analytics Certificate", provider: "Coursera", href: "https://www.coursera.org/professional-certificates/google-data-analytics", mode: "Online" },
    { title: "Data Analyst Career Path", provider: "DataCamp", href: "https://www.datacamp.com/career-tracks/data-analyst-with-python", mode: "Online" },
  ],
  "project management": [
    { title: "Google Project Management Certificate", provider: "Coursera", href: "https://www.coursera.org/professional-certificates/google-project-management", mode: "Online" },
    { title: "Project Management Professional (PMP)", provider: "PMI", href: "https://www.pmi.org/certifications/project-management-pmp", mode: "Exam" },
  ],
  "leadership": [
    { title: "Leadership & Management", provider: "LinkedIn Learning", href: "https://www.linkedin.com/learning/topics/leadership-and-management", mode: "Online" },
    { title: "Harvard ManageMentor", provider: "Harvard Business Publishing", href: "https://hbsp.harvard.edu/product/1460BC-PDF-ENG", mode: "Online" },
  ],
  "cloud": [
    { title: "AWS Cloud Practitioner Essentials", provider: "AWS Training", href: "https://aws.amazon.com/certification/certified-cloud-practitioner/", mode: "Online + Exam" },
    { title: "Microsoft Azure Fundamentals", provider: "Microsoft Learn", href: "https://learn.microsoft.com/en-us/training/paths/azure-fundamentals/", mode: "Online" },
  ],
  "cybersecurity": [
    { title: "CompTIA Security+", provider: "CompTIA", href: "https://www.comptia.org/certifications/security", mode: "Online + Exam" },
    { title: "Google Cybersecurity Certificate", provider: "Coursera", href: "https://www.coursera.org/professional-certificates/google-cybersecurity", mode: "Online" },
  ],
  "digital marketing": [
    { title: "Google Digital Marketing & E-commerce", provider: "Coursera", href: "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce", mode: "Online" },
    { title: "Meta Social Media Marketing", provider: "Coursera", href: "https://www.coursera.org/professional-certificates/meta-social-media-marketing", mode: "Online" },
  ],
  "accounting": [
    { title: "Chartered Accountant (CA)", provider: "MICPA / ICAEW", href: "https://www.micpa.com.my/", mode: "Professional" },
    { title: "ACCA Qualification", provider: "ACCA", href: "https://www.accaglobal.com/", mode: "Professional" },
  ],
  "hr": [
    { title: "Certified Human Resource Manager", provider: "MIHRM", href: "https://mihrm.org.my/", mode: "Workshop + Exam" },
    { title: "SHRM-CP / SHRM-SCP", provider: "SHRM", href: "https://www.shrm.org/certification", mode: "Exam" },
  ],
  "engineering": [
    { title: "Professional Engineer (PE) Registration", provider: "BEM Malaysia", href: "https://www.boardofengineersmalaysia.gov.my/", mode: "Professional" },
    { title: "Project Management for Engineers", provider: "Udemy", href: "https://www.udemy.com/topic/project-management/", mode: "Online" },
  ],
  "software": [
    { title: "Meta Front-End Developer", provider: "Coursera", href: "https://www.coursera.org/professional-certificates/meta-front-end-developer", mode: "Online" },
    { title: "AWS Developer Associate", provider: "AWS Training", href: "https://aws.amazon.com/certification/certified-developer-associate/", mode: "Online + Exam" },
  ],
};

const GENERAL_COURSES = [
  { title: "HRD Corp Upskilling Programmes", provider: "HRD Corp", href: "https://www.hrdcorp.gov.my", mode: "Malaysia" },
  { title: "MoHR e-Latihan Portal", provider: "MoHR Malaysia", href: "https://elatihan.mohr.gov.my", mode: "Malaysia" },
  { title: "TalentCorp Malaysia", provider: "TalentCorp", href: "https://www.talentcorp.com.my", mode: "Malaysia" },
];

function parsePathwayFromAI(text: string, profile: CareerProfile): ParsedPathway {
  const nodes: PathwayNode[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const salaryPattern = /RM\s*[\d,]+\s*[-–]\s*RM\s*[\d,]+|RM\s*[\d,]+\+?/gi;
  const timelinePattern = /(\d+[-–]\d+|\d+)\s*(year|month|yr)/gi;

  const sections: string[][] = [];
  let current: string[] = [];
  lines.forEach((line) => {
    if (/^(level|step|stage|phase|\d+\.|##|###)/i.test(line) && current.length > 0) {
      sections.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  });
  if (current.length > 0) sections.push(current);

  sections.slice(0, 4).forEach((section, i) => {
    const block = section.join(" ");
    const salaryMatches = block.match(salaryPattern);
    const timelineMatches = block.match(timelinePattern);
    const titleLine = section.find((l) =>
      l.length > 3 && l.length < 80 && !/skills:|salary:|timeline:|certifications?:|training:/i.test(l)
    ) ?? (i === 0 ? profile.currentRole : `Career Level ${i + 1}`);
    const skillsLine = section.find((l) => /skills/i.test(l)) ?? "";
    const skills = skillsLine
      .replace(/skills[:\s]*/i, "")
      .split(/[,;•\-]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
      .slice(0, 5);
    const certsLine = section.find((l) => /certifications?|training/i.test(l)) ?? "";
    const certs = certsLine
      .replace(/certifications?[:\s]*/i, "").replace(/training[:\s]*/i, "")
      .split(/[,;•\-]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
      .slice(0, 3);

    nodes.push({
      title: titleLine.replace(/^[\d.#*\s]+/, "").trim() || (i === 0 ? profile.currentRole : `Career Level ${i + 1}`),
      level: LEVEL_ORDER[i] ?? "aspirational",
      salaryRange: salaryMatches?.[0] ?? "Market rate",
      timeline: timelineMatches?.[0] ? `${timelineMatches[0]}s` : i === 0 ? "Now" : `+${i * 2}-${i * 3} years`,
      keySkills: skills.length > 0 ? skills : ["Core competencies", "Industry knowledge"],
      transitionSkills: i > 0 ? skills.slice(0, 3) : [],
      certs: certs.length > 0 ? certs : ["Professional certification"],
    });
  });

  if (nodes.length < 2) {
    const role = profile.currentRole.trim();
    const goal = profile.goal.trim() || `Senior ${role}`;
    nodes.length = 0;
    nodes.push({ title: role, level: "current", salaryRange: "RM 3,000 – 5,500", timeline: "Now", keySkills: ["Core skills", "Communication", "Domain knowledge"], transitionSkills: [], certs: [] });
    nodes.push({ title: goal.includes(role) ? goal : `Senior ${role} / ${goal}`, level: "bridge", salaryRange: "RM 6,000 – 9,500", timeline: "2-4 years", keySkills: ["Leadership", "Project Management", "Technical depth"], transitionSkills: ["Leadership", "Mentoring"], certs: ["PMP", "HRD Corp"] });
    nodes.push({ title: `${role.split(" ").pop()} Manager / Lead`, level: "target", salaryRange: "RM 10,000 – 16,000", timeline: "5-8 years", keySkills: ["Team Leadership", "Strategy", "Stakeholder Management"], transitionSkills: ["Executive presence", "P&L management"], certs: ["MBA", "Executive programme"] });
    nodes.push({ title: `Director / Head of ${role.split(" ").pop()}`, level: "aspirational", salaryRange: "RM 18,000+", timeline: "9+ years", keySkills: ["Vision", "Business acumen", "Industry authority"], transitionSkills: ["Board exposure", "Industry networking"], certs: ["Executive MBA", "Board director programme"] });
  }

  return { nodes, summary: text.slice(0, 320) };
}

async function fetchPathwayFromAI(profile: CareerProfile): Promise<string> {
  const prompt = `Act as a Malaysian career coach. Given this profile: Current role = "${profile.currentRole}", Years of experience = "${profile.experience}", Education = "${profile.education}", Skills = "${profile.skills}", Career goal = "${profile.goal}", Preferred industry = "${profile.industry}". Show a 4-stage career pathway (current, bridge, target, aspirational). For each stage provide: role title, salary range in RM, key skills, certifications/training, and timeline. Keep it concise.`;
  const res = await fetch("/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "chat", message: prompt }),
  });
  if (!res.ok) throw new Error("AI request failed");
  const data = await res.json();
  return data.reply ?? data.message ?? data.response ?? JSON.stringify(data);
}

function FlowNode({ node, index }: { node: PathwayNode; index: number }) {
  const cfg = LEVEL_CONFIG[node.level];
  return (
    <div className="relative flex flex-col items-center">
      <div className="w-full rounded-2xl border-2 p-5 shadow-sm transition-all hover:shadow-md" style={{ borderColor: cfg.accent, background: `${cfg.accent}08` }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2" style={{ background: cfg.accent, color: "#fff" }}>
              {cfg.label}
            </span>
            <h3 className="text-base font-bold text-foreground leading-tight">{node.title}</h3>
          </div>
          <span className="shrink-0 text-xl font-extrabold" style={{ color: `${cfg.accent}40` }}>
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="size-3.5 text-emerald-500 shrink-0" />
            <span>{node.salaryRange}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3.5 text-blue-500 shrink-0" />
            <span>{node.timeline}</span>
          </div>
        </div>
        {node.keySkills.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Key Skills</p>
            <div className="flex flex-wrap gap-1">
              {node.keySkills.map((s) => (
                <span key={s} className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">{s}</span>
              ))}
            </div>
          </div>
        )}
        {node.certs.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Recommended Certs</p>
            <div className="flex flex-wrap gap-1">
              {node.certs.map((s) => (
                <span key={s} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `${cfg.accent}15`, color: cfg.accent, border: `1px solid ${cfg.accent}25` }}>{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CourseRecommendations({ skills }: { skills: string[] }) {
  const matched = useMemo(() => {
    const found: { key: string; courses: typeof REAL_COURSES["data analytics"] }[] = [];
    const userSkills = skills.map((s) => s.toLowerCase());
    for (const [key, courses] of Object.entries(REAL_COURSES)) {
      if (userSkills.some((s) => key.includes(s) || s.includes(key))) {
        found.push({ key, courses });
      }
    }
    if (found.length === 0) return [{ key: "general", courses: GENERAL_COURSES }];
    return [...found, { key: "general", courses: GENERAL_COURSES }];
  }, [skills]);

  return (
    <div className="space-y-4">
      {matched.map(({ key, courses }) => (
        <div key={key}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {key === "general" ? "Malaysian Government & General Resources" : `${key.charAt(0).toUpperCase() + key.slice(1)} Courses`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <a
                key={c.title}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-xl border border-border bg-background p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <BadgeCheck className="size-4 text-primary shrink-0" />
                  <span className="text-[10px] font-medium text-muted-foreground border border-border rounded-full px-2 py-0.5">{c.mode}</span>
                </div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.provider}</p>
                <div className="mt-3 flex items-center gap-1 text-[10px] font-medium text-primary">
                  View course <ExternalLink className="size-3" />
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CareerPathwayPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<CareerProfile>({
    currentRole: "", experience: "", education: "", skills: "", goal: "", industry: "",
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pathway, setPathway] = useState<ParsedPathway | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data } = await supabase
        .from("analyses")
        .select("full_results")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!data?.[0]?.full_results) return;
      const parsed = typeof data[0].full_results === "string" ? JSON.parse(data[0].full_results) : data[0].full_results;
      setProfile((p) => ({
        ...p,
        currentRole: parsed?.target_role ?? parsed?.profile?.current_role ?? parsed?.current_role ?? "",
        skills: Array.isArray(parsed?.skills) ? parsed.skills.join(", ") : parsed?.skills_analysis?.skills?.join(", ") ?? "",
        industry: parsed?.industry ?? "",
      }));
    })();
  }, [authLoading, user]);

  const update = (k: keyof CareerProfile, v: string) => setProfile((p) => ({ ...p, [k]: v }));

  const handleRoleInput = (val: string) => {
    update("currentRole", val);
    if (val.length >= 2) {
      const filtered = ROLE_SUGGESTIONS.filter((r) => r.toLowerCase().includes(val.toLowerCase())).slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleGenerate = async () => {
    if (!profile.currentRole.trim()) return;
    setAiLoading(true);
    setError(null);
    setPathway(null);
    setShowSuggestions(false);
    try {
      const aiText = await fetchPathwayFromAI(profile);
      setPathway(parsePathwayFromAI(aiText, profile));
    } catch (e: any) {
      setError(e.message ?? "Failed to generate pathway. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const allSkills = useMemo(() => {
    const list = new Set<string>();
    pathway?.nodes.forEach((n) => n.keySkills.forEach((s) => list.add(s)));
    profile.skills.split(/[,;|]+/).forEach((s) => { const t = s.trim(); if (t) list.add(t); });
    return Array.from(list);
  }, [pathway, profile.skills]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="border-b border-border bg-gradient-to-br from-muted/40 to-background px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              <Rocket className="size-3.5" /> AI Tools · Career Pathway Explorer
            </div>
            <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Map your{" "}
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">next 10 years</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl mx-auto">
              Tell us a bit more about where you are and where you want to go — AI will draw a step-by-step pathway with salary ranges, skill gaps, and real courses.
            </p>
          </div>
        </div>

        {/* ── Input Panel ───────────────────────────────── */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Lightbulb className="size-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Career Profile</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current Role *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={profile.currentRole}
                    onChange={(e) => handleRoleInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleGenerate(); if (e.key === "Escape") setShowSuggestions(false); }}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="e.g. Software Developer"
                    className="pl-9 h-11"
                  />
                  {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          onMouseDown={() => { update("currentRole", s); setShowSuggestions(false); }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Years of Experience</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <select
                    value={profile.experience}
                    onChange={(e) => update("experience", e.target.value)}
                    className="w-full h-11 rounded-lg border border-input bg-background px-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select…</option>
                    <option value="0-1">0 – 1 year (Fresh Graduate)</option>
                    <option value="1-3">1 – 3 years (Junior)</option>
                    <option value="3-5">3 – 5 years (Mid-level)</option>
                    <option value="5-10">5 – 10 years (Senior)</option>
                    <option value="10+">10+ years (Executive)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Highest Education</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <select
                    value={profile.education}
                    onChange={(e) => update("education", e.target.value)}
                    className="w-full h-11 rounded-lg border border-input bg-background px-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select…</option>
                    <option value="SPM">SPM / O-Level</option>
                    <option value="Diploma">Diploma / STPM</option>
                    <option value="Bachelor">Bachelor's Degree</option>
                    <option value="Master">Master's Degree</option>
                    <option value="PhD">PhD / Professional</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Preferred Industry</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input value={profile.industry} onChange={(e) => update("industry", e.target.value)} placeholder="e.g. Technology & IT, Finance, Healthcare" className="pl-9 h-11" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Top Skills (comma-separated)</label>
                <div className="relative">
                  <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input value={profile.skills} onChange={(e) => update("skills", e.target.value)} placeholder="e.g. SQL, Python, Project Management, Digital Marketing" className="pl-9 h-11" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Career Goal / Target Role</label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input value={profile.goal} onChange={(e) => update("goal", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void handleGenerate(); }} placeholder="e.g. Data Analytics Manager, CTO, HR Director" className="pl-9 h-11" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <Button onClick={handleGenerate} disabled={!profile.currentRole.trim() || aiLoading} size="lg" className="gap-2 w-full sm:w-auto">
                {aiLoading ? <><Loader2 className="size-4 animate-spin" /> Mapping…</> : <><Sparkles className="size-4" /> Generate Pathway</>}
              </Button>
              <p className="text-xs text-muted-foreground">* Required field. Your data stays in this session.</p>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
              {error}
              <br />
              <Button variant="outline" size="sm" className="mt-3" onClick={handleGenerate}>Retry</Button>
            </div>
          )}

          {!pathway && !aiLoading && !error && (
            <div className="mt-12 flex flex-col items-center justify-center text-center">
              <Brain className="size-16 text-muted-foreground/20 mb-4" />
              <h2 className="text-lg font-semibold text-foreground">Fill your career profile to begin</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                The more details you share, the more personalised your pathway and course recommendations will be.
              </p>
            </div>
          )}

          {aiLoading && (
            <div className="mt-12 flex flex-col items-center justify-center gap-4">
              <div className="size-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">AI is mapping your career pathway…</p>
            </div>
          )}

          {/* ── Pathway result ───────────────────────────────── */}
          {pathway && !aiLoading && (
            <div className="mt-10 space-y-10">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <TrendingUp className="size-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Your Pathway: {profile.currentRole} → {profile.goal || "Senior roles"}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{pathway.summary}</p>
                  </div>
                </div>
              </div>

              {/* Flowchart */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Award className="size-4 text-primary" /> Career Flowchart
                </p>
                <div className="relative grid gap-4 md:grid-cols-4">
                  {pathway.nodes.map((node, i) => (
                    <div key={i} className="relative">
                      <FlowNode node={node} index={i} />
                      {i < pathway.nodes.length - 1 && (
                        <>
                          <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                            <ArrowRight className="size-5 text-muted-foreground/40" />
                          </div>
                          <div className="md:hidden flex justify-center py-2">
                            <ArrowRight className="size-5 rotate-90 text-muted-foreground/40" />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Courses */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Recommended Real Courses</h3>
                </div>
                <CourseRecommendations skills={allSkills} />
              </div>

              {/* CTA */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Ready to close the gaps?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Analyse your CV or find jobs that match your target role.</p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/analyze"><FileText className="mr-1.5 size-3.5" /> Analyse CV</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/jobs"><ArrowRight className="mr-1.5 size-3.5" /> Find Jobs</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
