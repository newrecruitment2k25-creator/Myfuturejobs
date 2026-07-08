import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft, CheckCircle, AlertTriangle, XCircle, TrendingUp,
  User, Target, ChevronRight, Shield, Lightbulb, MapPin, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  buildVacancyIntelligence,
  getMatchStatusConfig,
  getShortlistConfig,
  type CandidateMatch,
} from "@/lib/candidate-matching";

export const Route = createFileRoute("/employer/vacancies/$jobId/candidates/$candidateId")({
  ssr: false,
  component: CandidateDetailPage,
  head: () => ({ meta: [{ title: "Candidate Profile — MYFutureJobs" }] }),
});

function ScoreBar({ label, value, note }: { label: string; value: number; note?: string }) {
  const color = value >= 65 ? "bg-[var(--success)]" : value >= 45 ? "bg-primary" : "bg-[#F97316]";
  const textColor = value >= 65 ? "text-[var(--success)]" : value >= 45 ? "text-primary" : "text-[#F97316]";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${textColor}`}>{value}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-secondary mb-1">
        <div className={`h-1.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      {note && <p className="text-xs text-muted-foreground italic">{note}</p>}
    </div>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-primary">{icon}</span>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function CandidateDetailPage() {
  const { jobId, candidateId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState<CandidateMatch | null>(null);
  const [vacancyTitle, setVacancyTitle] = useState("");
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

      const found = intel.rankedCandidates.find((c) => c.sessionId === candidateId) ?? null;
      setCandidate(found);
      setLoading(false);
    })();
  }, [authLoading, user, jobId, candidateId, navigate]);

  if (loading || authLoading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--base)' }}>
        <Loader2 className="size-6 animate-spin" style={{ color:'var(--accent)' }} />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--base)' }}>
        <div style={{ textAlign:'center' }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--ink)', marginBottom:12 }}>Candidate Not Found</h2>
          <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId }} style={{ fontSize:13, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>Back to Candidates</Link>
        </div>
      </div>
    );
  }

  const statusCfg = getMatchStatusConfig(candidate.matchStatus);
  const shortlistCfg = getShortlistConfig(candidate.shortlistRecommendation);

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

        {/* Back */}
        <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to {vacancyTitle}
        </Link>

        {/* Header */}
        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #512ACC 0%, #6B4FD6 60%, #512ACC 100%)', boxShadow: '0 4px 20px rgba(81,42,204,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Candidate Assessment
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>{candidate.candidateName}</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{candidate.targetRole} · {candidate.industry} · {candidate.experienceLevel}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <p style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{candidate.overallMatchScore}%</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Match Score</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 w-full h-2 rounded-full bg-secondary">
            <div
              className={`h-2 rounded-full transition-all ${candidate.overallMatchScore >= 78 ? "bg-[var(--success)]" : candidate.overallMatchScore >= 60 ? "bg-primary" : "bg-[#F97316]"}`}
              style={{ width: `${candidate.overallMatchScore}%` }}
            />
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
              {candidate.matchStatus}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${shortlistCfg.bg} ${shortlistCfg.text}`}>
              {candidate.shortlistRecommendation}
            </span>
          </div>
        </div>

        {/* Match Explanation */}
        <SectionCard icon={<CheckCircle className="size-5" />} title="Match Explanation">
          <p className="text-sm leading-relaxed text-foreground">{candidate.matchExplanation}</p>
        </SectionCard>

        {/* Score Breakdown */}
        <SectionCard icon={<TrendingUp className="size-5" />} title="Score Breakdown">
          <div className="space-y-4">
            <ScoreBar label="Skills Match" value={candidate.skillsMatch} note="Overlap between candidate skills and vacancy requirements" />
            <ScoreBar label="Industry Alignment" value={candidate.industryAlignment} note="Sector and employer type compatibility" />
            <ScoreBar label="Keyword Relevance" value={candidate.keywordRelevance} note="CV and role keyword overlap" />
            <ScoreBar label="Experience Match" value={candidate.experienceMatch} note="Experience level vs role expectations" />
            <ScoreBar label="Employability Score" value={candidate.employabilityScore} note="Derived from competency assessment" />
            <ScoreBar label="Career Readiness" value={candidate.careerReadiness} note="Deployment readiness estimate" />
          </div>
        </SectionCard>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Strengths */}
          <SectionCard icon={<CheckCircle className="size-5" />} title="Strengths">
            <ul className="space-y-2">
              {candidate.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--success)] shrink-0" />
                  <span className="text-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Gaps */}
          <SectionCard icon={<AlertTriangle className="size-5" />} title="Gaps">
            <ul className="space-y-2">
              {candidate.gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#F97316] shrink-0" />
                  <span className="text-foreground">{g}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        {/* Matched Skills */}
        <SectionCard icon={<Target className="size-5" />} title="Skills Analysis">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Matched Skills</p>
              <div className="flex flex-wrap gap-2">
                {candidate.matchedSkills.length > 0
                  ? candidate.matchedSkills.map((s) => (
                      <span key={s} className="rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 px-3 py-1 text-xs font-medium text-[var(--success)]">{s}</span>
                    ))
                  : <p className="text-sm text-muted-foreground">No skills matched from CV.</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Missing Skills</p>
              <div className="flex flex-wrap gap-2">
                {candidate.missingSkills.length > 0
                  ? candidate.missingSkills.map((s) => (
                      <span key={s} className="rounded-full bg-destructive/10 border border-destructive/20 px-3 py-1 text-xs font-medium text-destructive">{s}</span>
                    ))
                  : <p className="text-sm text-muted-foreground">No critical skill gaps identified.</p>}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Shortlist Recommendation */}
        <div className="grid gap-5 md:grid-cols-2">
          <SectionCard icon={<Shield className="size-5" />} title="Shortlist Recommendation">
            <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 mb-4 ${shortlistCfg.bg} ${shortlistCfg.text} border`}>
              <ChevronRight className="size-4" />
              <span className="font-semibold text-sm">{candidate.shortlistRecommendation}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{candidate.shortlistReasoning}</p>
          </SectionCard>

          {/* Talent Pool */}
          <SectionCard icon={<MapPin className="size-5" />} title="Talent Pool Assessment">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Future Role Fit</p>
                <p className="text-sm text-foreground">{candidate.futureFit}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Alternative Roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.alternativeRoles.map((r) => (
                    <span key={r} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{r}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Reskilling Potential</p>
                <p className="text-sm text-foreground">{candidate.reskillingPotential}</p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-end pb-4">
          <Button asChild variant="outline">
            <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId }}>Back to Candidates</Link>
          </Button>
        </div>

      </main>
    </div>
  );
}
