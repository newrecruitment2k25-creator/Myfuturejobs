import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft, Users, Search, SlidersHorizontal, BarChart2,
  ChevronRight, TrendingUp, Brain,
  ClipboardList, Video, ChevronDown, History, Sparkles, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppStatusBadge, ALL_STATUSES, STATUS_CONFIG } from "@/components/app-status";
import { listJobApplications, updateApplicationStatus, type AppApplication, type AppStatus } from "@/lib/ops-api";
import { toast } from "sonner";
import {
  buildVacancyIntelligence,
  buildIntelligenceFromPoc,
  getMatchStatusConfig,
  getShortlistConfig,
  type CandidateMatch,
  type VacancyIntelligence,
  type PocCandidate,
} from "@/lib/candidate-matching";
import { classifyOccupation, type OccupationProfile } from "@/lib/masco-intelligence";

interface PocMatch {
  id: string;
  candidate_id: string;
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  education_level: string | null;
  field_of_study: string | null;
  preferred_state: string | null;
  preferred_salary: string | null;
  preferred_occupation: string | null;
  previous_occupation: string | null;
  previous_years_experience: string | null;
  skills: string | null;
  applications: number;
  interviews: number;
  offers: number;
}

export const Route = createFileRoute("/employer/vacancies/$jobId/candidates")({
  ssr: false,
  component: CandidateMatchingPage,
  head: () => ({ meta: [{ title: "Candidate Matching — MYFutureJobs" }] }),
});

type Filter = "All" | "Strong Match" | "Recommended" | "Potential Match" | "Low Match";
const FILTERS: Filter[] = ["All", "Strong Match", "Recommended", "Potential Match", "Low Match"];

function ScorePill({ value, label }: { value: number; label: string }) {
  const color = value >= 65 ? "text-[var(--success)]" : value >= 45 ? "text-primary" : "text-[#F97316]";
  return (
    <div className="text-center">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function CandidateCard({ candidate, jobId, selected, onSelect }: {
  candidate: CandidateMatch;
  jobId: string;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const statusCfg = getMatchStatusConfig(candidate.matchStatus);
  const shortlistCfg = getShortlistConfig(candidate.shortlistRecommendation);

  return (
    <div className={`rounded-2xl border bg-card p-5 shadow-sm transition-all ${selected ? "border-primary ring-1 ring-primary" : "border-border"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(candidate.sessionId)}
              className="mr-3 h-4 w-4 rounded border-border accent-primary"
            />
          </label>
          <div>
            <p className="font-semibold text-foreground">{candidate.candidateName}</p>
            <p className="text-xs text-muted-foreground">{candidate.targetRole} · {candidate.experienceLevel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-primary tabular-nums">{candidate.overallMatchScore}%</p>
          <p className="text-xs text-muted-foreground">Match Score</p>
        </div>
      </div>

      {/* Match bar */}
      <div className="w-full h-1.5 rounded-full bg-secondary mb-4">
        <div
          className={`h-1.5 rounded-full transition-all ${candidate.overallMatchScore >= 78 ? "bg-[var(--success)]" : candidate.overallMatchScore >= 60 ? "bg-primary" : "bg-[#F97316]"}`}
          style={{ width: `${candidate.overallMatchScore}%` }}
        />
      </div>

      {/* Score row */}
      <div className="grid grid-cols-4 gap-2 mb-4 rounded-xl bg-secondary/40 p-3">
        <ScorePill value={candidate.skillsMatch} label="Skills" />
        <ScorePill value={candidate.industryAlignment} label="Industry" />
        <ScorePill value={candidate.employabilityScore} label="Employability" />
        <ScorePill value={candidate.interviewScore ?? 0} label="Interview" />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
          {candidate.matchStatus}
        </span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${shortlistCfg.bg} ${shortlistCfg.text}`}>
          {candidate.shortlistRecommendation}
        </span>
        {!candidate.hasInterviewData && (
          <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
            No Interview
          </span>
        )}
      </div>

      {/* Skills snippets */}
      {candidate.matchedSkills.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Matched Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {candidate.matchedSkills.slice(0, 5).map((s) => (
              <span key={s} className="rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-xs text-[var(--success)] font-medium">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <Button asChild size="sm" variant="navy" className="flex-1">
          <Link to="/employer/vacancies/$jobId/candidates/$candidateId" params={{ jobId, candidateId: candidate.sessionId }}>
            View Profile <ChevronRight className="ml-1 size-3" />
          </Link>
        </Button>
        {candidate.hasInterviewData && (
          <Button asChild size="sm" variant="outline">
            <Link to="/employer/interviews/$sessionId/report" params={{ sessionId: candidate.sessionId }}>
              Report
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function CandidateMatchingPage() {
  const { jobId } = Route.useParams();
  const isChildRoute = useRouterState({
    select: (s) => !s.location.pathname.endsWith("/candidates"),
  });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [intelligence, setIntelligence] = useState<VacancyIntelligence | null>(null);
  const [pocIntelligence, setPocIntelligence] = useState<VacancyIntelligence | null>(null);
  const [occupationProfile, setOccupationProfile] = useState<OccupationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [applications, setApplications] = useState<AppApplication[] | null>(null);
  const [appsLoading, setAppsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"matched" | "applications" | "poc">("applications");
  const [pocMatches, setPocMatches] = useState<PocMatch[]>([]);
  const [pocLoading, setPocLoading] = useState(false);
  const [selectedPoc, setSelectedPoc] = useState<PocMatch | null>(null);

  const fetchApplications = useCallback(async () => {
    setAppsLoading(true);
    try {
      const { applications: apps } = await listJobApplications(jobId);
      setApplications(apps);
    } catch {
      setApplications([]);
    } finally {
      setAppsLoading(false);
    }
  }, [jobId]);

  // Fetch POC candidate matches for this vacancy
  const fetchPocMatches = useCallback(async (jobTitle: string, location: string, requirements: string, description: string) => {
    setPocLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "talent_search",
          query: `${jobTitle} ${location}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPocMatches(data.candidates ?? []);
      }
    } catch (e) {
      console.error("[vacancy/poc] fetch failed:", e);
    } finally {
      setPocLoading(false);
    }
  }, []);

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

      const vacancyReq = {
        id: job.id,
        jobTitle: job.job_title,
        companyName: job.company_name,
        employerType: job.employer_type,
        industry: job.industry,
        location: job.location,
        description: job.description,
        requirements: job.requirements,
      };
      const intel = buildVacancyIntelligence(vacancyReq);
      const occ = classifyOccupation(job.job_title, job.industry, job.employer_type, job.description, job.requirements);
      setIntelligence(intel);
      setOccupationProfile(occ);
      setLoading(false);

      // Kick off POC matching
      void fetchPocMatches(job.job_title, job.location ?? "", job.requirements ?? "", job.description ?? "");
    })();

    void fetchApplications();
  }, [authLoading, user, jobId, navigate, fetchApplications, fetchPocMatches]);

  // Build intelligence from POC matches when they arrive
  useEffect(() => {
    if (pocMatches.length > 0 && intelligence) {
      const pocIntel = buildIntelligenceFromPoc(intelligence.vacancy, pocMatches as PocCandidate[]);
      setPocIntelligence(pocIntel);
    } else {
      setPocIntelligence(null);
    }
  }, [pocMatches, intelligence]);

  const handleStatusChange = async (appId: string, newStatus: AppStatus) => {
    setUpdatingId(appId);
    try {
      await updateApplicationStatus(appId, newStatus);
      setApplications((prev) =>
        prev ? prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a) : prev
      );
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Use POC intelligence if session-based intelligence has no candidates
  const effectiveIntelligence = (intelligence && intelligence.totalApplicants > 0)
    ? intelligence
    : (pocIntelligence ?? intelligence);

  const filtered = useMemo(() => {
    if (!effectiveIntelligence) return [];
    return effectiveIntelligence.rankedCandidates.filter((c) => {
      const matchesFilter = filter === "All" || c.matchStatus === filter;
      const matchesSearch =
        !search ||
        c.candidateName.toLowerCase().includes(search.toLowerCase()) ||
        c.targetRole.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [effectiveIntelligence, filter, search]);

  if (isChildRoute) return <Outlet />;

  if (loading || authLoading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--base)' }}>
        <Loader2 className="size-6 animate-spin" style={{ color:'var(--accent)' }} />
      </div>
    );
  }

  if (error || !intelligence) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--base)' }}>
        <div style={{ textAlign:'center' }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>Vacancy Not Found</h2>
          <p style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>{error ?? 'This vacancy does not exist.'}</p>
          <Link to="/employer/dashboard" style={{ fontSize:13, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const { vacancy } = effectiveIntelligence ?? intelligence;

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:1100, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

        {/* Back */}
        <Link to="/employer/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #0A2647 0%, #144272 60%, #205295 100%)', boxShadow: '0 4px 20px rgba(10,38,71,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Candidate Matching
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>{vacancy.jobTitle}</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{vacancy.companyName} · {vacancy.employerType} · {vacancy.industry} · {vacancy.location}</p>
            </div>
            <Link to="/employer/vacancies/$jobId/intelligence" params={{ jobId }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s' }}
            >
              <BarChart2 style={{ width: 14, height: 14 }} /> Vacancy Intelligence
            </Link>
          </div>

          {/* Quick stats */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Candidates", value: (effectiveIntelligence ?? intelligence).totalApplicants },
              { label: "Matched", value: (effectiveIntelligence ?? intelligence).matchedCandidates },
              { label: "Avg Match Score", value: `${(effectiveIntelligence ?? intelligence).averageMatchScore}%` },
              { label: "Interview Completion", value: `${(effectiveIntelligence ?? intelligence).interviewCompletionRate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-secondary/40 px-4 py-3 text-center">
                <p className="text-xl font-bold text-primary">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vacancy Occupation Profile */}
        {occupationProfile && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Brain className="size-5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Vacancy Occupation Profile</h2>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/employer/vacancies/$jobId/occupation" params={{ jobId }}>
                  Full Analysis
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl bg-secondary/40 px-3 py-2">
                <p className="text-xs text-muted-foreground mb-0.5">MASCO Category</p>
                <p className="text-xs font-semibold text-foreground leading-snug">{occupationProfile.mascoCategory}</p>
              </div>
              <div className="rounded-xl bg-secondary/40 px-3 py-2">
                <p className="text-xs text-muted-foreground mb-0.5">Job Family</p>
                <p className="text-xs font-semibold text-foreground">{occupationProfile.jobFamily}</p>
              </div>
              <div className="rounded-xl bg-secondary/40 px-3 py-2">
                <p className="text-xs text-muted-foreground mb-0.5">Experience</p>
                <p className="text-xs font-semibold text-foreground">{occupationProfile.experienceYears}</p>
              </div>
              <div className="rounded-xl bg-secondary/40 px-3 py-2">
                <p className="text-xs text-muted-foreground mb-0.5">Salary Range</p>
                <p className="text-xs font-semibold text-foreground">{occupationProfile.salaryBand.entry} – {occupationProfile.salaryBand.mid}</p>
              </div>
            </div>
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Related Roles</p>
              <div className="flex flex-wrap gap-1.5">
                {occupationProfile.relatedOccupations.slice(0, 5).map((r) => (
                  <span key={r} className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{r}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {occupationProfile.hardSkills.slice(0, 6).map((s) => (
                  <span key={s} className="rounded-full bg-primary/8 border border-primary/20 px-2.5 py-0.5 text-xs text-primary font-medium">{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Compare banner */}
        {selected.size >= 2 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-foreground">{selected.size} candidates selected for comparison</p>
            <Button asChild size="sm" variant="navy">
              <Link
                to="/employer/vacancies/$jobId/candidates/compare"
                params={{ jobId }}
                search={{ ids: [...selected].join(",") }}
              >
                Compare Side-by-Side
              </Link>
            </Button>
          </div>
        )}

        {/* Filters + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate grid */}
        {(effectiveIntelligence ?? intelligence).totalApplicants === 0 ? (
          pocLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
              <div className="mx-auto size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
              <p className="text-sm text-muted-foreground">Searching PERKESO database for matching candidates…</p>
            </div>
          ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
            <Users className="mx-auto size-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Candidates Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Candidates who apply to this vacancy will appear here ranked by their match score.
            </p>
            <Button asChild variant="navy">
              <Link to="/employer/talent-discovery">Find Talent</Link>
            </Button>
          </div>
          )
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">No candidates match the current filter.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c, i) => (
              <div key={c.sessionId} className="relative">
                {i < 3 && (
                  <div className="absolute -top-2 -left-2 z-10 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                    #{i + 1}
                  </div>
                )}
                <CandidateCard
                  candidate={c}
                  jobId={jobId}
                  selected={selected.has(c.sessionId)}
                  onSelect={toggleSelect}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Applications Tab ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 p-5 border-b border-border">
            <button
              onClick={() => setActiveTab("applications")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "applications" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ClipboardList className="size-4" />
              Applications ({applications?.length ?? "…"})
            </button>
            <button
              onClick={() => setActiveTab("matched")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "matched" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Brain className="size-4" />
              AI Matched ({(effectiveIntelligence ?? intelligence)?.totalApplicants ?? "…"})
            </button>
            <button
              onClick={() => setActiveTab("poc")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "poc" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-4" />
              PERKESO Matches ({pocLoading ? "…" : pocMatches.length})
            </button>
          </div>

          {activeTab === "poc" && (
            <div className="p-5">
              {pocLoading ? (
                <div className="flex justify-center py-10">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : pocMatches.length === 0 ? (
                <div className="py-12 text-center">
                  <Sparkles className="mx-auto size-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">No PERKESO matches found</p>
                  <p className="text-xs text-muted-foreground mt-1">AI could not find matching candidates in the PERKESO database for this vacancy.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-3">Top {pocMatches.length} candidates from the 1,449 PERKESO database, ranked by match score.</p>
                  {pocMatches.map((c, i) => (
                    <div key={c.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="shrink-0 flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">#{i + 1}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">{c.candidate_id}</p>
                              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">PERKESO</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {c.preferred_occupation ?? c.previous_occupation ?? "—"}
                              {c.preferred_state && <> · {c.preferred_state}</>}
                              {c.education_level && <> · {c.education_level}</>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className={`text-lg font-bold tabular-nums ${
                              c.score >= 70 ? "text-green-600" : c.score >= 50 ? "text-primary" : "text-orange-500"
                            }`}>{c.score}%</p>
                            <p className="text-xs text-muted-foreground">Match</p>
                          </div>
                          <button onClick={() => setSelectedPoc(c)}
                            className="inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                            View
                          </button>
                        </div>
                      </div>
                      {c.matched_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {c.matched_skills.slice(0, 5).map(s => (
                            <span key={s} className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700 font-medium">{s}</span>
                          ))}
                          {c.missing_skills.slice(0, 3).map(s => (
                            <span key={s} className="rounded-full bg-secondary border border-border px-2 py-0.5 text-xs text-muted-foreground">{s}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{c.applications} apps</span>
                        <span>{c.interviews} interviews</span>
                        {c.offers > 0 && <span className="text-green-600 font-semibold">{c.offers} offers</span>}
                        {c.preferred_salary && <span>{c.preferred_salary}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "applications" && (
            <div className="p-5">
              {appsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : !applications || applications.length === 0 ? (
                <div className="py-12 text-center">
                  <ClipboardList className="mx-auto size-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">No applications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Candidates who apply to this vacancy will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div key={app.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        {/* Candidate info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{app.candidate_email}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {app.industry && <span>{app.industry}</span>}
                            {app.experience_level && <span>{app.experience_level}</span>}
                            {app.overall_score !== null && (
                              <span className="font-medium text-primary">CV Score: {app.overall_score}</span>
                            )}
                            {app.interview_score !== null && (
                              <span className="font-medium text-orange-600">Interview: {app.interview_score}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Applied {new Date(app.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>

                        {/* Status + controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <AppStatusBadge status={app.status} />

                          {/* Status dropdown */}
                          <div className="relative group">
                            <button
                              disabled={updatingId === app.id}
                              className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
                            >
                              {updatingId === app.id ? (
                                <span className="size-3 animate-spin rounded-full border border-primary border-t-transparent" />
                              ) : (
                                <ChevronDown className="size-3" />
                              )}
                              Change
                            </button>
                            <div className="absolute right-0 top-full mt-1 z-20 hidden group-hover:block w-36 rounded-xl border border-border bg-card shadow-lg py-1">
                              {ALL_STATUSES.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleStatusChange(app.id, s)}
                                  disabled={app.status === s}
                                  className={`w-full px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-accent ${
                                    app.status === s ? "text-muted-foreground" : "text-foreground"
                                  }`}
                                >
                                  {STATUS_CONFIG[s].label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Send interview button when shortlisted/interview */}
                          {(app.status === "shortlisted" || app.status === "interview") && app.interview_session_id === null && (
                            <Button asChild size="sm" variant="outline" className="gap-1 text-xs">
                              <Link to="/employer/interviews/create">
                                <Video className="size-3" /> Send Interview
                              </Link>
                            </Button>
                          )}
                          {app.interview_session_id && (
                            <Button asChild size="sm" variant="outline" className="gap-1 text-xs">
                              <Link to="/employer/interviews/$sessionId/report" params={{ sessionId: app.interview_session_id }}>
                                Report
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Status history */}
                      {app.status_history && app.status_history.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {app.status_history.map((h, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                              <History className="size-2.5" />
                              {h.from} → {h.to} · {new Date(h.changed_at).toLocaleDateString("en-MY")}
                              {h.notes ? ` · ${h.notes}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Talent pool section */}
        {intelligence.rankedCandidates.filter((c) => c.overallMatchScore < 42).length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="size-5 text-primary" />
              <h2 className="font-semibold text-foreground">Talent Pool</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {intelligence.rankedCandidates.filter((c) => c.overallMatchScore < 42).length} candidates below match threshold
              </span>
            </div>
            <div className="space-y-3">
              {intelligence.rankedCandidates
                .filter((c) => c.overallMatchScore < 42)
                .slice(0, 5)
                .map((c) => (
                  <div key={c.sessionId} className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{c.candidateName}</p>
                      <p className="text-xs text-muted-foreground">{c.targetRole} · {c.experienceLevel}</p>
                      <p className="text-xs text-muted-foreground mt-1">{c.futureFit}</p>
                      {c.alternativeRoles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.alternativeRoles.map((r) => (
                            <span key={r} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-muted-foreground">{c.overallMatchScore}%</p>
                      <p className="text-xs text-muted-foreground">Match</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
