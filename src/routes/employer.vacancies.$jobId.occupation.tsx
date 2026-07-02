import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Brain, Users, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { OccupationReport } from "@/components/occupation-report";
import { classifyOccupation, type OccupationProfile } from "@/lib/masco-intelligence";

export const Route = createFileRoute("/employer/vacancies/$jobId/occupation")({
  ssr: false,
  component: VacancyOccupationPage,
  head: () => ({ meta: [{ title: "Occupation Intelligence — MYFutureJobs" }] }),
});

type JobRow = {
  id: string;
  job_title: string;
  company_name: string;
  employer_type: string;
  industry: string;
  location: string;
  description: string;
  requirements: string;
};

function VacancyOccupationPage() {
  const { jobId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobRow | null>(null);
  const [profile, setProfile] = useState<OccupationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { void navigate({ to: "/employer/login" }); return; }

    // Check sessionStorage cache first
    const cacheKey = `MYFutureJobs:occupationIntelligence:${jobId}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { job: cachedJob, profile: cachedProfile, ts } = JSON.parse(cached) as {
          job: JobRow; profile: OccupationProfile; ts: number;
        };
        // Use cache if < 30 minutes old
        if (Date.now() - ts < 1800000) {
          setJob(cachedJob);
          setProfile(cachedProfile);
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore */ }

    (async () => {
      const { data, error: err } = await supabase
        .from("jobs")
        .select("id, job_title, company_name, employer_type, industry, location, description, requirements")
        .eq("id", jobId)
        .maybeSingle();

      if (err || !data) {
        setError(err?.message ?? "Vacancy not found.");
        setLoading(false);
        return;
      }

      const jobRow = data as JobRow;
      const result = classifyOccupation(
        jobRow.job_title,
        jobRow.industry,
        jobRow.employer_type,
        jobRow.description,
        jobRow.requirements
      );

      setJob(jobRow);
      setProfile(result);
      setLoading(false);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ job: jobRow, profile: result, ts: Date.now() }));
      } catch { /* ignore */ }
    })();
  }, [authLoading, user, jobId, navigate]);

  if (loading || authLoading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--base)' }}>
        <Loader2 className="size-6 animate-spin" style={{ color:'var(--accent)' }} />
      </div>
    );
  }

  if (error || !job || !profile) {
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

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

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
                Occupation Intelligence
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>{job.job_title}</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                {job.company_name} · {job.employer_type} · {job.industry} · {job.location}
              </p>
            </div>
            <Brain style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
          </div>

          {/* Quick nav */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId }}>
                <Users className="mr-1.5 size-4" /> Match Candidates
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/employer/vacancies/$jobId/intelligence" params={{ jobId }}>
                <BarChart2 className="mr-1.5 size-4" /> Vacancy Intelligence
              </Link>
            </Button>
          </div>
        </div>

        {/* Occupation Report */}
        <OccupationReport profile={profile} jobTitle={job.job_title} />

      </main>
    </div>
  );
}
