import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  ArrowRight, Loader2, Sparkles, Brain, ChevronRight,
  DollarSign, Clock, BookOpen, FileText, TrendingUp,
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
      { title: "Career Pathway Explorer — PerksoPrax AI" },
      { name: "description", content: "Visualise your career progression, salary growth, and skills needed at every level." },
    ],
  }),
});

interface PathwayNode {
  title: string;
  level: "current" | "bridge" | "target" | "aspirational";
  salaryRange: string;
  timeline: string;
  keySkills: string[];
  transitionSkills: string[];
  training: string[];
}

interface ParsedPathway {
  nodes: PathwayNode[];
  summary: string;
}

// Level colour config
const LEVEL_CONFIG: Record<PathwayNode["level"], { bg: string; border: string; badge: string; label: string }> = {
  current:     { bg: "bg-card", border: "border-primary", badge: "bg-primary text-primary-foreground", label: "Current Role" },
  bridge:      { bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-400", badge: "bg-blue-500 text-white", label: "Bridge Role" },
  target:      { bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-400", badge: "bg-violet-600 text-white", label: "Target Role" },
  aspirational:{ bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-400", badge: "bg-amber-500 text-white", label: "Aspirational" },
};

const LEVEL_ORDER: PathwayNode["level"][] = ["current", "bridge", "target", "aspirational"];

// MASCO suggestions for autocomplete
const ROLE_SUGGESTIONS = [
  "Software Developer", "Systems Analyst", "Data Analyst", "IT Project Manager",
  "Network Engineer", "Cybersecurity Analyst", "DevOps Engineer", "Product Manager",
  "Marketing Executive", "Sales Executive", "HR Officer", "Accountant",
  "Civil Engineer", "Mechanical Engineer", "Electrical Engineer", "Quantity Surveyor",
  "Medical Officer", "Nurse", "Pharmacist", "Financial Analyst", "Auditor",
  "Graphic Designer", "UX Designer", "Business Analyst", "Operations Manager",
  "Customer Service Officer", "Logistics Coordinator", "Teacher", "Lecturer",
];

function parsePathwayFromAI(text: string, currentRole: string): ParsedPathway {
  // Try to extract structured nodes from AI free-text response
  const nodes: PathwayNode[] = [];

  // Split into sections by common patterns like "Level 1:", "Step 1:", "Junior", "Senior", role names
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract roles: look for lines that contain salary/timeline patterns
  const salaryPattern = /RM\s*[\d,]+\s*[-–]\s*RM\s*[\d,]+|RM\s*[\d,]+\+?/gi;
  const timelinePattern = /(\d+[-–]\d+|\d+)\s*(year|month|yr)/gi;

  // Build nodes from sections
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

  const levelKeys = LEVEL_ORDER;

  sections.slice(0, 4).forEach((section, i) => {
    const block = section.join(" ");
    const salaryMatches = block.match(salaryPattern);
    const timelineMatches = block.match(timelinePattern);

    // Extract title: first line that looks like a role title
    const titleLine = section.find((l) =>
      l.length > 3 && l.length < 80 && !/skills:|salary:|timeline:|training:/i.test(l)
    ) ?? (i === 0 ? currentRole : `Role Level ${i + 1}`);

    // Extract skills: lines after "Skills:" or bullet points
    const skillsLine = section.find((l) => /skills/i.test(l)) ?? "";
    const skills = skillsLine
      .replace(/skills[:\s]*/i, "")
      .split(/[,;•\-]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
      .slice(0, 5);

    nodes.push({
      title: titleLine.replace(/^[\d.#*\s]+/, "").trim() || (i === 0 ? currentRole : `Career Level ${i + 1}`),
      level: levelKeys[i] ?? "aspirational",
      salaryRange: salaryMatches?.[0] ?? "Market rate",
      timeline: timelineMatches?.[0] ? `${timelineMatches[0]}s` : i === 0 ? "Now" : `+${i * 2}-${i * 3} years`,
      keySkills: skills.length > 0 ? skills : ["Core competencies", "Industry knowledge"],
      transitionSkills: i > 0 ? skills.slice(0, 3) : [],
      training: ["HRD Corp Programmes", "Professional Certification"],
    });
  });

  // If parsing failed — build minimal fallback
  if (nodes.length < 2) {
    const role = currentRole.trim();
    nodes.length = 0;
    nodes.push({ title: role, level: "current", salaryRange: "RM 3,000 – 5,000", timeline: "Now", keySkills: ["Core skills", "Communication", "Domain knowledge"], transitionSkills: [], training: [] });
    nodes.push({ title: `Senior ${role}`, level: "bridge", salaryRange: "RM 6,000 – 9,000", timeline: "2-4 years", keySkills: ["Leadership", "Project Management", "Technical depth"], transitionSkills: ["Leadership", "Mentoring"], training: ["PMP Certification", "HRD Corp"] });
    nodes.push({ title: `${role} Manager / Lead`, level: "target", salaryRange: "RM 10,000 – 15,000", timeline: "4-7 years", keySkills: ["Team Leadership", "Strategy", "Stakeholder Management"], transitionSkills: ["Executive presence", "P&L management"], training: ["MBA", "Executive programmes"] });
    nodes.push({ title: `Director / Head of ${role.split(" ").pop()}`, level: "aspirational", salaryRange: "RM 18,000+", timeline: "8+ years", keySkills: ["Vision", "Business acumen", "Industry authority"], transitionSkills: ["Board exposure", "Industry networking"], training: ["Executive MBA", "Board director programmes"] });
  }

  return { nodes, summary: text.slice(0, 300) };
}

async function fetchPathwayFromAI(role: string): Promise<string> {
  const prompt = `Show career pathway from "${role}" to senior and executive levels in Malaysia. For each of exactly 4 stages (current, bridge, target, aspirational), provide: role title, salary range in RM, key skills (comma-separated), timeline to reach from previous stage, and 2 recommended training programmes. Keep each stage concise. Format with clear numbered sections.`;

  const res = await fetch("/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "chat", message: prompt }),
  });
  if (!res.ok) throw new Error("AI request failed");
  const data = await res.json();
  return data.reply ?? data.message ?? data.response ?? JSON.stringify(data);
}

function PathwayNodeCard({ node, index, total }: { node: PathwayNode; index: number; total: number }) {
  const cfg = LEVEL_CONFIG[node.level];
  return (
    <div className="flex items-stretch gap-0">
      <div className={`flex-1 rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-5 shadow-sm`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.badge} mb-2`}>
              {cfg.label}
            </span>
            <h3 className="text-base font-bold text-foreground leading-tight">{node.title}</h3>
          </div>
          <span className="shrink-0 text-xl font-extrabold text-muted-foreground/20">
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

        {node.transitionSkills.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">To progress here, develop</p>
            <div className="flex flex-wrap gap-1">
              {node.transitionSkills.map((s) => (
                <span key={s} className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {index < total - 1 && (
        <div className="hidden md:flex items-center px-1">
          <ChevronRight className="size-6 text-muted-foreground/40" />
        </div>
      )}
    </div>
  );
}

function CareerPathwayPage() {
  const { user, loading: authLoading } = useAuth();
  const [currentRole, setCurrentRole] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pathway, setPathway] = useState<ParsedPathway | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill current role from latest CV analysis
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
      const parsed =
        typeof data[0].full_results === "string"
          ? JSON.parse(data[0].full_results)
          : data[0].full_results;
      const role =
        parsed?.target_role ??
        parsed?.profile?.current_role ??
        parsed?.current_role ??
        "";
      if (role) setCurrentRole(role);
    })();
  }, [authLoading, user]);

  const handleRoleInput = (val: string) => {
    setCurrentRole(val);
    if (val.length >= 2) {
      const filtered = ROLE_SUGGESTIONS.filter((r) =>
        r.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleGenerate = async () => {
    if (!currentRole.trim()) return;
    setAiLoading(true);
    setError(null);
    setPathway(null);
    setShowSuggestions(false);
    try {
      const aiText = await fetchPathwayFromAI(currentRole.trim());
      setPathway(parsePathwayFromAI(aiText, currentRole.trim()));
    } catch (e: any) {
      setError(e.message ?? "Failed to generate pathway. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="border-b border-border bg-gradient-to-br from-muted/40 to-background px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              <Brain className="size-3.5" /> AI Tools · Career Pathway Explorer
            </div>
            <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Where does your career{" "}
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">go next?</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
              Enter your current role — our AI maps your full career progression with salary ranges, key skills, and timelines at every stage.
            </p>

            {/* Input */}
            <div className="mt-8 relative max-w-xl mx-auto">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    placeholder="e.g. Software Developer, HR Officer, Civil Engineer…"
                    value={currentRole}
                    onChange={(e) => handleRoleInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleGenerate(); if (e.key === "Escape") setShowSuggestions(false); }}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    className="h-12 text-base pr-4"
                  />
                  {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          onMouseDown={() => { setCurrentRole(s); setShowSuggestions(false); }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!currentRole.trim() || aiLoading}
                  size="lg"
                  className="shrink-0 h-12 px-6"
                >
                  {aiLoading
                    ? <><Loader2 className="mr-2 size-4 animate-spin" /> Generating…</>
                    : <><Sparkles className="mr-2 size-4" /> Generate Pathway</>
                  }
                </Button>
              </div>
            </div>

            {/* Popular examples */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["Software Developer", "Marketing Executive", "Civil Engineer", "Data Analyst", "HR Officer"].map((r) => (
                <button
                  key={r}
                  onClick={() => { setCurrentRole(r); setShowSuggestions(false); }}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pathway result ───────────────────────────────── */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          {aiLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="size-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">AI is mapping your career pathway…</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
              {error}
              <br />
              <Button variant="outline" size="sm" className="mt-3" onClick={handleGenerate}>Retry</Button>
            </div>
          )}

          {pathway && !aiLoading && (
            <div className="space-y-8">
              {/* Summary */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <TrendingUp className="size-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Career Pathway: {currentRole}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-3">{pathway.summary}</p>
                  </div>
                </div>
              </div>

              {/* Nodes — horizontal on desktop, vertical on mobile */}
              <div className="grid gap-4 md:grid-cols-4">
                {pathway.nodes.map((node, i) => (
                  <PathwayNodeCard key={i} node={node} index={i} total={pathway.nodes.length} />
                ))}
              </div>

              {/* Arrows between nodes on mobile */}
              <div className="md:hidden flex justify-center">
                <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                  {pathway.nodes.slice(0, -1).map((_, i) => (
                    <ArrowRight key={i} className="size-5 rotate-90" />
                  ))}
                </div>
              </div>

              {/* Training resources */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Recommended Training & Development</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: "HRD Corp Upskilling Programmes", href: "https://www.hrdcorp.gov.my", ext: true },
                    { label: "MoHR e-Latihan Portal",           href: "https://elatihan.mohr.gov.my", ext: true },
                    { label: "TalentCorp Malaysia",             href: "https://www.talentcorp.com.my", ext: true },
                    { label: "AI Interview Prep",               href: "/interview-preparation", ext: false },
                    { label: "Analyze My CV",                   href: "/analyze", ext: false },
                    { label: "Browse Jobs by Role",             href: "/jobs", ext: false },
                  ].map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target={l.ext ? "_blank" : undefined}
                      rel={l.ext ? "noopener noreferrer" : undefined}
                      className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-xs font-medium text-foreground hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      {l.label}
                      <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Ready to start your journey?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Analyze your CV to see exactly where you stand on this pathway.</p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/analyze"><FileText className="mr-1.5 size-3.5" /> Analyze CV</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/jobs"><ArrowRight className="mr-1.5 size-3.5" /> Find Jobs</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!pathway && !aiLoading && !error && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Brain className="size-16 text-muted-foreground/20 mb-4" />
              <h2 className="text-lg font-semibold text-foreground">Enter your role to begin</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Type your current job title above and click "Generate Pathway" to see your full career map.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
