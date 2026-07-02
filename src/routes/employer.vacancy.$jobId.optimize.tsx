import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, Brain, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { VacancyOptimizationReportView } from "@/components/vacancy-optimization-report";
import {
  analyzeVacancy, type VacancyInput, type VacancyOptimizationReport,
} from "@/lib/vacancy-optimization";
import { getReadinessConfig } from "@/lib/vacancy-optimization";

export const Route = createFileRoute("/employer/vacancy/$jobId/optimize")({
  ssr: false,
  component: VacancyOptimizePage,
  head: () => ({ meta: [{ title: "Vacancy Optimization — MYFutureJobs" }] }),
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
  status: string;
};

function VacancyOptimizePage() {
  const { jobId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobRow | null>(null);
  const [report, setReport] = useState<VacancyOptimizationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { void navigate({ to: "/employer/login" }); return; }

    (async () => {
      const { data, error: err } = await supabase
        .from("jobs")
        .select("id, job_title, company_name, employer_type, industry, location, description, requirements, status")
        .eq("id", jobId)
        .maybeSingle();

      if (err || !data) {
        setError(err?.message ?? "Vacancy not found.");
        setLoading(false);
        return;
      }

      const jobRow = data as JobRow;
      setJob(jobRow);

      const input: VacancyInput = {
        jobTitle: jobRow.job_title,
        industry: jobRow.industry,
        employerType: jobRow.employer_type,
        experienceLevel: "",
        employmentType: "Full-time",
        salaryMin: "",
        salaryMax: "",
        requiredSkills: jobRow.requirements ?? "",
        preferredSkills: "",
        qualifications: jobRow.requirements ?? "",
        responsibilities: jobRow.description ?? "",
        benefits: "",
        location: jobRow.location,
        description: jobRow.description,
      };

      const result = analyzeVacancy(input);
      setReport(result);
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

  if (error || !job || !report) {
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

  const readinessCfg = getReadinessConfig(report.publishingReadiness);

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

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
                Vacancy Optimization Intelligence
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>{job.job_title}</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                {job.company_name} · {job.employer_type} · {job.industry} · {job.location}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', margin: 0 }}>{report.vacancyQualityScore}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>/100 Quality Score</p>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 ${readinessCfg.bg}`}>
                <span className={`size-2 rounded-full ${readinessCfg.dot}`} />
                <span className={`text-xs font-semibold ${readinessCfg.text}`}>{report.publishingReadiness}</span>
              </div>
            </div>
          </div>

          {/* Quick nav */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId }}>
                <Users className="mr-1.5 size-4" /> Match Candidates
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/employer/vacancies/$jobId/occupation" params={{ jobId }}>
                <Brain className="mr-1.5 size-4" /> MASCO Intelligence
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/employer/vacancy-builder">
                <Sparkles className="mr-1.5 size-4" /> Build New Vacancy
              </Link>
            </Button>
          </div>
        </div>

        {/* Report */}
        <VacancyOptimizationReportView report={report} />

      </main>
    </div>
  );
}
