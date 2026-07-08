import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  buildVacancyIntelligence,
  getMatchStatusConfig,
  getShortlistConfig,
  type CandidateMatch,
} from "@/lib/candidate-matching";

export const Route = createFileRoute("/employer/vacancies/$jobId/candidates/compare")({
  ssr: false,
  component: CompareCandidatesPage,
  head: () => ({ meta: [{ title: "Compare Candidates — MYFutureJobs" }] }),
});

type CompareRow = { label: string; getValue: (c: CandidateMatch) => string | number };

const ROWS: CompareRow[] = [
  { label: "Overall Match Score", getValue: (c) => `${c.overallMatchScore}%` },
  { label: "Skills Match", getValue: (c) => `${c.skillsMatch}%` },
  { label: "Industry Alignment", getValue: (c) => `${c.industryAlignment}%` },
  { label: "Employability Score", getValue: (c) => `${c.employabilityScore}%` },
  { label: "Career Readiness", getValue: (c) => `${c.careerReadiness}%` },
  { label: "Experience Level", getValue: (c) => c.experienceLevel },
  { label: "Target Role", getValue: (c) => c.targetRole },
  { label: "Industry", getValue: (c) => c.industry },
  { label: "Match Status", getValue: (c) => c.matchStatus },
  { label: "Shortlist Recommendation", getValue: (c) => c.shortlistRecommendation },
];

function scoreColor(val: string | number): string {
  const n = typeof val === "string" ? parseInt(val) : val;
  if (isNaN(n)) return "text-foreground";
  if (n >= 65) return "text-[var(--success)]";
  if (n >= 45) return "text-primary";
  return "text-[#F97316]";
}

function CompareCandidatesPage() {
  const { jobId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState<CandidateMatch[]>([]);
  const [vacancyTitle, setVacancyTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { void navigate({ to: "/employer/login" }); return; }

    const params = new URLSearchParams(window.location.search);
    const ids = (params.get("ids") ?? "").split(",").filter(Boolean);

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

      setVacancyTitle(job.job_title);
      const intel = buildVacancyIntelligence({
        id: job.id,
        jobTitle: job.job_title,
        companyName: job.company_name,
        employerType: job.employer_type,
        industry: job.industry,
        location: job.location,
        description: job.description,
        requirements: job.requirements,
      });

      const selected = ids.length > 0
        ? intel.rankedCandidates.filter((c) => ids.includes(c.sessionId))
        : intel.rankedCandidates.slice(0, 3);

      setCandidates(selected);
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

  if (error || candidates.length === 0) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--base)' }}>
        <div style={{ textAlign:'center' }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--ink)', marginBottom:12 }}>No Candidates to Compare</h2>
          <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId }} style={{ fontSize:13, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>Back to Candidates</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:1100, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

        <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to {vacancyTitle}
        </Link>

        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #512ACC 0%, #6B4FD6 60%, #512ACC 100%)', boxShadow: '0 4px 20px rgba(81,42,204,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              Candidate Comparison
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>Side-by-Side Assessment</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Comparing {candidates.length} candidates for {vacancyTitle}</p>
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-40">Attribute</th>
                {candidates.map((c, i) => {
                  const statusCfg = getMatchStatusConfig(c.matchStatus);
                  return (
                    <th key={c.sessionId} className="p-4 text-center min-w-[160px]">
                      <div className="flex flex-col items-center gap-1">
                        {i === 0 && <span className="text-xs font-bold text-primary">TOP PICK</span>}
                        <span className="font-semibold text-foreground">{c.candidateName}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                          {c.matchStatus}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => (
                <tr key={row.label} className={`border-b border-border last:border-0 ${ri % 2 === 0 ? "bg-secondary/20" : ""}`}>
                  <td className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{row.label}</td>
                  {candidates.map((c) => {
                    const val = row.getValue(c);
                    return (
                      <td key={c.sessionId} className={`p-4 text-center font-medium tabular-nums ${scoreColor(val)}`}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Matched skills row */}
              <tr className="border-b border-border bg-secondary/20">
                <td className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matched Skills</td>
                {candidates.map((c) => (
                  <td key={c.sessionId} className="p-4">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {c.matchedSkills.length > 0
                        ? c.matchedSkills.slice(0, 4).map((s) => (
                            <span key={s} className="rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-xs text-[var(--success)]">{s}</span>
                          ))
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Missing skills row */}
              <tr className="border-b border-border">
                <td className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Missing Skills</td>
                {candidates.map((c) => (
                  <td key={c.sessionId} className="p-4">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {c.missingSkills.length > 0
                        ? c.missingSkills.slice(0, 4).map((s) => (
                            <span key={s} className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">{s}</span>
                          ))
                        : <span className="text-xs text-muted-foreground">None</span>}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Shortlist row */}
              <tr>
                <td className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decision</td>
                {candidates.map((c) => {
                  const cfg = getShortlistConfig(c.shortlistRecommendation);
                  return (
                    <td key={c.sessionId} className="p-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                        {c.shortlistRecommendation}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Per-candidate actions */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(0,1fr))` }}>
          {candidates.map((c) => (
            <div key={c.sessionId} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">{c.candidateName}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.shortlistReasoning}</p>
              <div className="flex flex-col gap-2">
                <Button asChild size="sm" variant="navy">
                  <Link to="/employer/vacancies/$jobId/candidates/$candidateId" params={{ jobId, candidateId: c.sessionId }}>
                    Full Profile
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
