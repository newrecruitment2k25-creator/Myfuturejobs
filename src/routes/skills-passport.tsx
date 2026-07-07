import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  FileText, Download, Loader2, Sparkles, ArrowRight, ArrowUpRight,
  CheckCircle2, AlertCircle, Circle, TrendingUp, BookOpen,
  Award, Zap, Target, Briefcase, GraduationCap, Star,
  BarChart3, Rocket, Lightbulb, Trophy, Medal, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/skills-passport")({
  ssr: false,
  component: SkillsPassportPage,
  head: () => ({
    meta: [
      { title: "Skills Passport — PerksoPrax AI" },
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
  { label: "PerksoPrax AI AI Interview Prep",        href: "/interview-preparation", external: false },
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
    link.download = "PerksoPrax AI-Skills-Passport.png";
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

  const skills    = parseSkills(analysis.result);
  const radar     = parseRadar(analysis.result, analysis.overall);
  const readiness = parseReadiness(analysis.result, analysis.overall);
  const gaps      = parseGaps(analysis.result);
  const strong    = skills.filter((s) => s.level === "strong");
  const moderate  = skills.filter((s) => s.level === "moderate");
  const improve   = skills.filter((s) => s.level === "needs_improvement");

  const scoreColor = analysis.overall >= 75 ? '#10b981' : analysis.overall >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = analysis.overall >= 75 ? 'Highly Employable' : analysis.overall >= 50 ? 'Developing' : 'Needs Focus';
  const topReadiness = [...readiness].sort((a, b) => b.score - a.score)[0];

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#f8fafc' }}>
      <main className="flex-1">

        {/* ── Hero header with score ring ─────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #0A2647 0%, #144272 50%, #1e40af 100%)',
          padding: '40px 16px 500px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', left: -30, bottom: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(243,108,33,0.08)' }} />
          <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                  <Sparkles style={{ width: 10, height: 10 }} /> AI Tools · Skills Passport
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>My Skills Passport</h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                  {analysis.industry} · Generated {new Date(analysis.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleDownload} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <Download style={{ width: 14, height: 14 }} /> Download PNG
                </button>
                <Link to="/analyze" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #f36c21 0%, #ff8c42 100%)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 12px rgba(243,108,33,0.3)' }}>
                  <FileText style={{ width: 14, height: 14 }} /> Re-analyze CV
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────── */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6" style={{ marginTop: 0 }}>
          <div ref={passportRef} className="space-y-5">

            {/* ── Score Hero Card ────────────────────────────── */}
            <div style={{
              background: '#fff', borderRadius: 20, padding: 28,
              boxShadow: '0 4px 24px rgba(10,38,71,0.08)',
              border: '1px solid #e2e8f0',
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24,
            }}>
              {/* Score ring — fixed size, never shrinks */}
              <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0, flexBasis: 120 }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ display: 'block' }}>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(analysis.overall / 100) * 327} 327`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#0A2647', lineHeight: 1 }}>{analysis.overall}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>out of 100</span>
                </div>
              </div>

              {/* Score details — takes remaining space, min 240px so heading never overlaps circle */}
              <div style={{ flex: '1 1 240px', minWidth: 240, paddingLeft: 4 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: `${scoreColor}15`, marginBottom: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: scoreColor }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor }}>{scoreLabel}</span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0A2647', margin: '0 0 4px' }}>Employability Score</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                  Based on your CV analysis in the <strong style={{ color: '#0A2647' }}>{analysis.industry}</strong> sector.
                  {topReadiness && <> Best fit: <strong style={{ color: '#0A2647' }}>{topReadiness.label}</strong> ({topReadiness.score}%).</>}
                </p>
              </div>

              {/* Quick stats — fixed column, wraps below on small screens */}
              <div style={{ display: 'flex', gap: 16, flexShrink: 0, flexBasis: 'auto', marginLeft: 'auto' }}>
                <div style={{ textAlign: 'center', width: 56 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                    <CheckCircle2 style={{ width: 22, height: 22, color: '#10b981' }} />
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#0A2647', margin: 0 }}>{strong.length}</p>
                  <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, margin: 0 }}>Strong</p>
                </div>
                <div style={{ textAlign: 'center', width: 56 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                    <AlertCircle style={{ width: 22, height: 22, color: '#f59e0b' }} />
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#0A2647', margin: 0 }}>{moderate.length}</p>
                  <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, margin: 0 }}>Moderate</p>
                </div>
                <div style={{ textAlign: 'center', width: 56 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                    <Target style={{ width: 22, height: 22, color: '#ef4444' }} />
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#0A2647', margin: 0 }}>{improve.length + gaps.length}</p>
                  <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, margin: 0 }}>To Develop</p>
                </div>
              </div>
            </div>

            {/* ── Industry Readiness Cards ───────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {readiness.map((r, i) => {
                const icons = [Briefcase, Zap, Rocket];
                const Icon = icons[i] || Briefcase;
                const colors = ['#3b82f6', '#8b5cf6', '#10b981'];
                const c = colors[i] || '#3b82f6';
                return (
                  <div key={r.label} style={{
                    background: '#fff', borderRadius: 16, padding: 18,
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon style={{ width: 18, height: 18, color: c }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{r.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: '#0A2647', lineHeight: 1 }}>{r.score}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 2 }}>%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: c, width: `${r.score}%`, transition: 'width 0.6s' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Skills Radar (custom bars) + Skill Breakdown ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="skills-radar-grid">
              {/* Skill category bars */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <BarChart3 style={{ width: 16, height: 16, color: '#205295' }} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A2647', margin: 0 }}>Skill Categories</h3>
                </div>
                <div>
                  {radar.map((cat) => (
                    <div key={cat.category} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{cat.category}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0A2647' }}>{cat.score}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          background: cat.score >= 75 ? 'linear-gradient(90deg, #10b981, #34d399)' : cat.score >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                          width: `${cat.score}%`, transition: 'width 0.6s',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skill level distribution */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Award style={{ width: 16, height: 16, color: '#f36c21' }} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A2647', margin: 0 }}>Skill Levels</h3>
                </div>
                {[
                  { label: 'Strong Skills', count: strong.length, items: strong, color: '#10b981', bg: '#ecfdf5', icon: Trophy },
                  { label: 'Moderate Skills', count: moderate.length, items: moderate, color: '#f59e0b', bg: '#fffbeb', icon: Medal },
                  { label: 'Needs Development', count: improve.length, items: improve, color: '#64748b', bg: '#f8fafc', icon: Flame },
                ].map((g) => (
                  <div key={g.label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: g.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <g.icon style={{ width: 14, height: 14, color: g.color }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{g.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: g.color, marginLeft: 'auto' }}>{g.count}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {g.items.slice(0, 6).map((s) => (
                        <span key={s.name} style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                          background: g.bg, color: g.color, textTransform: 'capitalize',
                        }}>
                          {s.name}
                        </span>
                      ))}
                      {g.items.length > 6 && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', color: '#94a3b8' }}>
                          +{g.items.length - 6} more
                        </span>
                      )}
                      {g.items.length === 0 && (
                        <span style={{ fontSize: 10, color: '#cbd5e1' }}>None identified</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Passport ID Card ────────────────────────────── */}
            <div style={{
              background: 'linear-gradient(135deg, #0A2647 0%, #144272 60%, #1e3a5f 100%)',
              borderRadius: 16, padding: 22, color: '#fff',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>PerksoPrax AI · Malaysia Employment Portal 🇲🇾</p>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Skills Passport ID</h3>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{user.email}</p>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{analysis.overall}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Score</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{skills.length}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Skills</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{readiness.length}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Sectors</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Skills Inventory (full list) ────────────────── */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 22, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star style={{ width: 16, height: 16, color: '#f36c21' }} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A2647', margin: 0 }}>Skills Inventory</h3>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{skills.length} skills identified</span>
              </div>

              {[
                { title: 'Strong Skills', items: strong, level: 'strong' as const },
                { title: 'Moderate Skills', items: moderate, level: 'moderate' as const },
                { title: 'Needs Development', items: improve, level: 'needs_improvement' as const },
              ].filter((g) => g.items.length > 0).map((group) => {
                const Icon = BADGE_ICON[group.level];
                return (
                  <div key={group.title} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Icon style={{ width: 13, height: 13, color: group.level === 'strong' ? '#10b981' : group.level === 'moderate' ? '#f59e0b' : '#94a3b8' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>{group.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>({group.items.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {group.items.map((s) => (
                        <span key={s.name} style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                          textTransform: 'capitalize',
                          ...(
                            group.level === 'strong'
                              ? { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }
                              : group.level === 'moderate'
                              ? { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }
                              : { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }
                          ),
                        }}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {skills.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Lightbulb style={{ width: 32, height: 32, color: '#cbd5e1', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: '#94a3b8' }}>No skills identified yet. Try re-analyzing your CV.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Skills Gap + Training (outside printable) ────── */}
          {gaps.length > 0 && (
            <div style={{
              marginTop: 16, background: '#fff', borderRadius: 16, padding: 22,
              border: '1px solid #fde68a',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp style={{ width: 20, height: 20, color: '#f59e0b' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A2647', margin: '0 0 2px' }}>Skills to Develop</h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Close these gaps to boost your employability score.</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {gaps.map((g) => (
                  <span key={g} style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                    background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a',
                  }}>
                    {g}
                  </span>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #fde68a', paddingTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <BookOpen style={{ width: 14, height: 14, color: '#f59e0b' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0A2647' }}>Recommended Training</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                  {TRAINING_LINKS.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target={l.external ? '_blank' : undefined}
                      rel={l.external ? 'noopener noreferrer' : undefined}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb',
                        padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#475569',
                        textDecoration: 'none', transition: 'all 0.15s',
                      }}
                    >
                      {l.label}
                      <ArrowRight style={{ width: 12, height: 12, color: '#f59e0b', flexShrink: 0 }} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Career Suggestions CTA ──────────────────────── */}
          <div style={{
            marginTop: 16, marginBottom: 32,
            background: 'linear-gradient(135deg, #f36c21 0%, #ff8c42 100%)',
            borderRadius: 16, padding: 24, color: '#fff',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap style={{ width: 22, height: 22 }} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 2px' }}>Boost Your Career</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: 0 }}>Practice AI interviews, explore career pathways, and find jobs matched to your skills.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to="/interview-preparation" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                AI Interview Prep <ArrowUpRight style={{ width: 12, height: 12 }} />
              </Link>
              <Link to="/career-pathway" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                Career Pathway <ArrowUpRight style={{ width: 12, height: 12 }} />
              </Link>
              <Link to="/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 10, background: '#fff', color: '#f36c21', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                Browse Jobs <ArrowUpRight style={{ width: 12, height: 12 }} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
