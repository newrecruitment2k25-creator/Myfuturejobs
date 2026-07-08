import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft, BarChart2, Users, TrendingUp, CheckCircle,
  AlertTriangle, Target, ChevronRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  buildVacancyIntelligence,
  getMatchStatusConfig,
  type VacancyIntelligence,
} from "@/lib/candidate-matching";

export const Route = createFileRoute("/employer/vacancies/$jobId/intelligence")({
  ssr: false,
  component: VacancyIntelligencePage,
  head: () => ({ meta: [{ title: "Vacancy Intelligence — MYFutureJobs" }] }),
});

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-secondary/40 px-5 py-4 text-center">
      <p className="text-3xl font-extrabold text-primary tabular-nums">{value}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function VacancyIntelligencePage() {
  const { jobId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [intel, setIntel] = useState<VacancyIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { void navigate({ to: "/employer/login" }); return; }

    (async () => {
      const { data: job, error: err } = await supabase
        .from("jobs")
        .select("id, job_title, company_name, employer_type, industry, location, description, requirements")
        .eq("id", jobId)
        .maybeSingle();

      if (err || !job) {
        setError(err?.message ?? "Vacancy not found.");
        setLoading(false);
        return;
      }

      const result = buildVacancyIntelligence({
        id: job.id,
        jobTitle: job.job_title,
        companyName: job.company_name,
        employerType: job.employer_type,
        industry: job.industry,
        location: job.location,
        description: job.description,
        requirements: job.requirements,
      });
      setIntel(result);
      setLoading(false);
    })();
  }, [authLoading, user, jobId, navigate]);

  if (loading || authLoading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--base)' }}>
        <Loader2 className="size-6 animate-spin" style={{ color:'var(--accent)' }} />
      </div>
    );
  }

  if (error || !intel) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--base)' }}>
        <div style={{ textAlign:'center' }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--ink)', marginBottom:12 }}>Not Found</h2>
          <Link to="/employer/dashboard" style={{ fontSize:13, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const { vacancy, rankedCandidates } = intel;

  // Distribution
  const dist = {
    "Strong Match": rankedCandidates.filter((c) => c.matchStatus === "Strong Match").length,
    "Recommended": rankedCandidates.filter((c) => c.matchStatus === "Recommended").length,
    "Potential Match": rankedCandidates.filter((c) => c.matchStatus === "Potential Match").length,
    "Low Match": rankedCandidates.filter((c) => c.matchStatus === "Low Match").length,
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

        {/* Back */}
        <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Candidates
        </Link>

        {/* Header */}
        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #512ACC 0%, #6B4FD6 60%, #512ACC 100%)', boxShadow: '0 4px 20px rgba(81,42,204,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Vacancy Intelligence
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>{vacancy.jobTitle}</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{vacancy.companyName} · {vacancy.employerType} · {vacancy.industry}</p>
            </div>
            <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s' }}
            >
              <Users style={{ width: 14, height: 14 }} /> View Candidates
            </Link>
          </div>
        </div>

        {/* Core stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Total Applicants" value={intel.totalApplicants} />
          <StatCard label="Matched Candidates" value={intel.matchedCandidates} sub="≥ 42% match score" />
          <StatCard label="Average Match Score" value={`${intel.averageMatchScore}%`} />
        </div>

        {/* Candidate quality distribution */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Candidate Quality Distribution</h2>
          </div>
          <div className="space-y-4">
            {(Object.entries(dist) as [keyof typeof dist, number][]).map(([status, count]) => {
              const cfg = getMatchStatusConfig(status);
              const pct = intel.totalApplicants > 0 ? Math.round((count / intel.totalApplicants) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-medium ${cfg.text}`}>{status}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        status === "Strong Match" ? "bg-[var(--success)]" :
                        status === "Recommended" ? "bg-primary" :
                        status === "Potential Match" ? "bg-[#F97316]" :
                        "bg-secondary-foreground/30"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Skills intelligence */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle className="size-5 text-[var(--success)]" />
              <h2 className="text-lg font-semibold text-foreground">Top Skills Found</h2>
            </div>
            {intel.topSkillsFound.length > 0 ? (
              <div className="space-y-2">
                {intel.topSkillsFound.map((skill, i) => (
                  <div key={skill} className="flex items-center gap-3">
                    <span className="flex size-5 items-center justify-center rounded-full bg-[var(--success)]/10 text-xs font-bold text-[var(--success)] shrink-0">{i + 1}</span>
                    <span className="text-sm text-foreground">{skill}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No skill data available yet.</p>
            )}
          </div>

          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="size-5 text-destructive" />
              <h2 className="text-lg font-semibold text-foreground">Top Skills Missing</h2>
            </div>
            {intel.topSkillsMissing.length > 0 ? (
              <div className="space-y-2">
                {intel.topSkillsMissing.map((skill, i) => (
                  <div key={skill} className="flex items-center gap-3">
                    <span className="flex size-5 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive shrink-0">{i + 1}</span>
                    <span className="text-sm text-foreground">{skill}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No skill gap data available.</p>
            )}
          </div>
        </div>

        {/* Top candidates summary */}
        {rankedCandidates.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="size-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Top Candidates</h2>
            </div>
            <div className="space-y-3">
              {rankedCandidates.slice(0, 5).map((c, i) => {
                const cfg = getMatchStatusConfig(c.matchStatus);
                return (
                  <div key={c.sessionId} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                        #{i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.candidateName}</p>
                        <p className="text-xs text-muted-foreground">{c.targetRole} · {c.experienceLevel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`hidden sm:inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                        {c.matchStatus}
                      </span>
                      <span className="text-lg font-bold text-primary tabular-nums">{c.overallMatchScore}%</span>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/employer/vacancies/$jobId/candidates/$candidateId" params={{ jobId, candidateId: c.sessionId }}>
                          <ChevronRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {rankedCandidates.length > 5 && (
              <div className="mt-4 text-center">
                <Button asChild variant="outline">
                  <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId }}>
                    View All {rankedCandidates.length} Candidates
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Vacancy requirements */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Target className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Vacancy Requirements</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{vacancy.description}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Requirements</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{vacancy.requirements}</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
