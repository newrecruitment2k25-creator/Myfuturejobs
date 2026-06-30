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
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vacancy Optimization Intelligence</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary">{job.job_title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {job.company_name} · {job.employer_type} · {job.industry} · {job.location}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-4xl font-extrabold tabular-nums text-primary">{report.vacancyQualityScore}</p>
                <p className="text-xs text-muted-foreground">/100 Quality Score</p>
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
