import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";
import {
  FileText, Download, Loader2, Sparkles, ArrowRight,
  CheckCircle2, AlertCircle, Circle, TrendingUp, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/skills-passport")({
  ssr: false,
  component: SkillsPassportPage,
  head: () => ({
    meta: [
      { title: "Skills Passport — MYFutureJobs" },
      { name: "description", content: "Your portable skills profile, powered by AI analysis." },
    ],
  }),
});

type AnalysisResult = Record<string, any>;

interface SkillEntry {
  name: string;
  level: "strong" | "moderate" | "needs_improvement";
}

interface RadarEntry {
  category: string;
  score: number;
  fullMark: number;
}

interface ReadinessMeter {
  label: string;
  score: number;
  color: string;
}

function parseSkills(result: AnalysisResult): SkillEntry[] {
  const raw: string =
    result?.skills_analysis?.current_skills ??
    result?.skills_analysis?.strong_skills ??
    result?.skills ?? "";
  const weak: string =
    result?.skills_analysis?.skills_to_develop ??
    result?.skills_gaps?.join(", ") ?? "";

  const strongSet = new Set(
    raw.split(/[,;|\n]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean)
  );
  const weakSet = new Set(
    weak.split(/[,;|\n]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean)
  );

  const entries: SkillEntry[] = [];
  strongSet.forEach((s) => {
    if (s.length < 2) return;
    entries.push({ name: s, level: weakSet.has(s) ? "moderate" : "strong" });
  });
  weakSet.forEach((s) => {
    if (s.length < 2 || strongSet.has(s)) return;
    entries.push({ name: s, level: "needs_improvement" });
  });

  return entries.slice(0, 30);
}

function parseRadar(result: AnalysisResult, overall: number): RadarEntry[] {
  const sa = result?.skills_analysis ?? {};
  const score = (v: any, fallback: number) =>
    typeof v === "number" ? Math.min(100, Math.max(0, v)) : fallback;

  return [
    { category: "Technical",      score: score(sa.technical_score,      overall), fullMark: 100 },
    { category: "Communication",  score: score(sa.communication_score,  Math.round(overall * 0.85)), fullMark: 100 },
    { category: "Leadership",     score: score(sa.leadership_score,     Math.round(overall * 0.7)),  fullMark: 100 },
    { category: "Domain Knowledge", score: score(sa.domain_score,       Math.round(overall * 0.9)), fullMark: 100 },
    { category: "Tools",          score: score(sa.tools_score,          Math.round(overall * 0.8)), fullMark: 100 },
  ];
}

function parseReadiness(result: AnalysisResult, overall: number): ReadinessMeter[] {
  const r = result?.industry_readiness ?? result?.readiness ?? {};
  const s = (key: string, fallback: number) =>
    typeof r[key] === "number" ? Math.min(100, r[key]) : fallback;

  return [
    { label: "GLC / Government-Linked",  score: s("glc",  Math.round(overall * 0.9)), color: "bg-blue-500" },
    { label: "MNC / Multinational",      score: s("mnc",  Math.round(overall * 0.75)), color: "bg-violet-500" },
    { label: "SME / Local Companies",    score: s("sme",  Math.min(95, Math.round(overall * 1.05))), color: "bg-emerald-500" },
  ];
}

function parseGaps(result: AnalysisResult): string[] {
  const gaps: string =
    result?.skills_analysis?.skills_to_develop ??
    result?.improvement_areas ??
    result?.skills_gaps?.join(", ") ?? "";
  return gaps.split(/[,;|\n]+/).map((s: string) => s.trim()).filter((s) => s.length > 2).slice(0, 8);
}

const BADGE_STYLES: Record<SkillEntry["level"], string> = {
  strong:            "bg-emerald-100 text-emerald-700 border-emerald-200",
  moderate:          "bg-amber-100 text-amber-700 border-amber-200",
  needs_improvement: "bg-muted text-muted-foreground border-border",
};

const BADGE_ICON: Record<SkillEntry["level"], typeof CheckCircle2> = {
  strong:            CheckCircle2,
  moderate:          AlertCircle,
  needs_improvement: Circle,
};

const TRAINING_LINKS = [
  { label: "HRD Corp Upskilling Programmes", href: "https://www.hrdcorp.gov.my", external: true },
  { label: "MoHR e-Latihan Portal",           href: "https://elatihan.mohr.gov.my", external: true },
  { label: "MYFutureJobs AI Interview Prep",        href: "/interview-preparation", external: false },
  { label: "Browse Jobs by Skill",            href: "/jobs", external: false },
];

function SkillsPassportPage() {
  const { user, loading: authLoading } = useAuth();
  const [analysis, setAnalysis] = useState<{ result: AnalysisResult; overall: number; industry: string; createdAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const passportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("analyses")
        .select("full_results, overall_score, industry, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!data?.[0]) { setLoading(false); return; }
      const row = data[0] as any;
      const parsed =
        typeof row.full_results === "string"
          ? JSON.parse(row.full_results)
          : (row.full_results ?? {});
      setAnalysis({
        result: parsed,
        overall: row.overall_score ?? 0,
        industry: row.industry ?? "General",
        createdAt: row.created_at,
      });
      setLoading(false);
    })();
  }, [authLoading, user]);

  const handleDownload = async () => {
    if (!passportRef.current) return;
    const { default: html2canvas } = await import(
      /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js"
    );
    const canvas = await html2canvas(passportRef.current, { scale: 2, useCORS: true });
    const link = document.createElement("a");
    link.download = "MYFutureJobs-Skills-Passport.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center px-4 py-20 text-center">
          <div>
            <FileText className="mx-auto size-12 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Sign in to view your Skills Passport</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your portable skills profile is generated from your CV analysis.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild><Link to="/login">Log In</Link></Button>
              <Button asChild variant="outline"><Link to="/signup">Sign Up</Link></Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center px-4 py-20 text-center">
          <div>
            <Sparkles className="mx-auto size-12 text-primary/40 mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Generate Your Skills Passport</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Analyze your CV first — we'll build a visual, portable skills profile you can share with employers.
            </p>
            <Button asChild className="mt-6">
              <Link to="/analyze"><FileText className="mr-2 size-4" /> Analyze My CV</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const skills   = parseSkills(analysis.result);
  const radar    = parseRadar(analysis.result, analysis.overall);
  const readiness = parseReadiness(analysis.result, analysis.overall);
  const gaps     = parseGaps(analysis.result);
  const strong   = skills.filter((s) => s.level === "strong");
  const moderate = skills.filter((s) => s.level === "moderate");
  const improve  = skills.filter((s) => s.level === "needs_improvement");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="border-b border-border bg-muted/20 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-5xl flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Tools · Skills Passport</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary">My Skills Passport</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {analysis.industry} · Overall Score: <strong>{analysis.overall}/100</strong> · Generated {new Date(analysis.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 size-4" /> Download PNG
              </Button>
              <Button asChild size="sm">
                <Link to="/analyze"><FileText className="mr-2 size-4" /> Re-analyze CV</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Passport card (printable) ─────────────────────── */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
          <div ref={passportRef} className="space-y-6">

            {/* Passport ID card */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-1">MYFutureJobs · Malaysia Employment Portal 🇲🇾</p>
                  <h2 className="text-xl font-extrabold">Skills Passport</h2>
                  <p className="text-sm text-blue-200 mt-0.5">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-black tabular-nums text-white">{analysis.overall}</p>
                  <p className="text-xs text-blue-300">/100 Employability Score</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-4">
                {readiness.map((r) => (
                  <div key={r.label} className="flex-1 min-w-[140px]">
                    <p className="text-xs text-blue-300 mb-1.5">{r.label}</p>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className={`h-2 rounded-full ${r.color}`} style={{ width: `${r.score}%` }} />
                    </div>
                    <p className="text-xs text-white font-semibold mt-1">{r.score}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2-col: Radar + Industry Readiness */}
            <div className="grid gap-6 md:grid-cols-2">

              {/* Radar chart */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground mb-4">Skills Radar</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radar} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Radar
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Industry Readiness */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                <h3 className="text-sm font-semibold text-foreground">Industry Readiness</h3>
                {readiness.map((r) => (
                  <div key={r.label}>
                    <div className="flex justify-between mb-1.5 text-xs">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="font-semibold text-foreground">{r.score}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-secondary">
                      <div className={`h-2.5 rounded-full ${r.color} transition-all`} style={{ width: `${r.score}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Based on latest CV analysis · {analysis.industry}</p>
                </div>
              </div>
            </div>

            {/* Skills list */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-1">Skills Inventory</h3>
              <p className="text-xs text-muted-foreground mb-5">{skills.length} skills identified from your CV</p>

              {[
                { title: "Strong Skills", items: strong, level: "strong" as const },
                { title: "Moderate Skills", items: moderate, level: "moderate" as const },
                { title: "Needs Development", items: improve, level: "needs_improvement" as const },
              ].filter((g) => g.items.length > 0).map((group) => {
                const Icon = BADGE_ICON[group.level];
                return (
                  <div key={group.title} className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`size-3.5 ${group.level === "strong" ? "text-emerald-500" : group.level === "moderate" ? "text-amber-500" : "text-muted-foreground"}`} />
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((s) => (
                        <span key={s.name} className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${BADGE_STYLES[s.level]}`}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills Gap (outside printable area) */}
          {gaps.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:bg-amber-950/20 dark:border-amber-900/30">
              <div className="flex items-start gap-3 mb-4">
                <TrendingUp className="size-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Skills to Develop</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Close these gaps to improve your employability score.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {gaps.map((g) => (
                  <span key={g} className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40">
                    {g}
                  </span>
                ))}
              </div>

              <div className="border-t border-amber-200/60 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="size-3.5 text-amber-600" />
                  <p className="text-xs font-semibold text-foreground">Recommended Training</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TRAINING_LINKS.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target={l.external ? "_blank" : undefined}
                      rel={l.external ? "noopener noreferrer" : undefined}
                      className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-xs font-medium text-foreground hover:border-amber-400 hover:shadow-sm transition-all dark:bg-amber-950/40"
                    >
                      {l.label}
                      <ArrowRight className="size-3 text-amber-500 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
