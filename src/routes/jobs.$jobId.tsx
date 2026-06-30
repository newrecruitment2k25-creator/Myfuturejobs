import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav, PublicFooter } from "@/components/public-layout";
import { useEffect, useState } from "react";
import {
  MapPin, DollarSign, GraduationCap, Briefcase, ArrowLeft,
  Loader2, CheckCircle2, BookOpen, Building2, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/jobs/$jobId")({
  ssr: false,
  component: JobDetailPage,
  head: () => ({ meta: [{ title: "Job Detail — MYFutureJobs" }] }),
});

type PocVacancy = {
  id: string; job_title: string | null; occupation_name: string | null;
  job_description: string | null; education_level: string | null;
  field_of_study: string | null; state: string | null; city: string | null;
  salary: string | null; salary_min: number | null; salary_max: number | null;
  skills: string | null;
};
type EmployerJob = {
  id: string; job_title: string; company_name: string; employer_type: string;
  industry: string; location: string; description: string; requirements: string;
  status: string; created_at: string;
};
type JobDetail = { source: "poc"; data: PocVacancy } | { source: "employer"; data: EmployerJob };
type SimilarJob = { id: string; job_title: string | null; state: string | null; salary: string | null; source: "poc" | "employer" };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function skillList(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(/[,;|]+/).map((s) => s.trim()).filter(Boolean);
}

function salaryDisplay(v: PocVacancy): string {
  if (v.salary) return v.salary.startsWith("RM") ? v.salary : `RM ${v.salary}`;
  if (v.salary_min != null && v.salary_max != null)
    return `RM ${v.salary_min.toLocaleString()} – RM ${v.salary_max.toLocaleString()}`;
  if (v.salary_min != null) return `From RM ${v.salary_min.toLocaleString()}`;
  return "Salary not specified";
}

function ApplyModal({
  open, jobTitle, jobId, isPoc, onClose, onSuccess,
}: {
  open: boolean; jobTitle: string; jobId: string; isPoc: boolean;
  onClose: () => void; onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { user_id: user.id, status: "applied", cover_letter: coverLetter || null };
      if (isPoc) payload.poc_vacancy_id = jobId;
      else payload.job_id = jobId;
      const { error } = await supabase.from("applications").insert(payload as any);
      if (error) throw error;
      toast.success("Application submitted! 🎉");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply to {jobTitle}</DialogTitle>
          <DialogDescription>Submit your application for this role.</DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="space-y-1.5">
            <Label>Cover Letter <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea placeholder="Briefly introduce yourself…" rows={5} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 mr-2 animate-spin" />} Submit Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [similar, setSimilar] = useState<SimilarJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<any | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  // isPoc: PERKESO IDs are like "V0001" or short alpha-numeric; employer IDs are UUIDs (36 chars with dashes)
  const isPoc = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      .then(({ data }) => setRole(data?.role ?? "job_seeker"));
  }, [user]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (isPoc) {
          const { data, error: err } = await supabase
            .from("poc_vacancies")
            .select("*")
            .eq("id", jobId)
            .single();
          if (err || !data) throw new Error("Job not found.");
          setJob({ source: "poc", data: data as PocVacancy });

          // Similar jobs: same occupation or overlapping skills
          const { data: sim } = await supabase
            .from("poc_vacancies")
            .select("id, job_title, state, salary")
            .eq("occupation_name", (data as PocVacancy).occupation_name ?? "")
            .neq("id", jobId)
            .limit(5);
          setSimilar((sim ?? []).map((s: any) => ({ ...s, source: "poc" as const })));
        } else {
          const { data, error: err } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", jobId)
            .single();
          if (err || !data) throw new Error("Job not found.");
          setJob({ source: "employer", data: data as EmployerJob });

          const { data: sim } = await supabase
            .from("jobs")
            .select("id, job_title, location, created_at")
            .eq("industry", (data as EmployerJob).industry)
            .eq("status", "open")
            .neq("id", jobId)
            .limit(5);
          setSimilar((sim ?? []).map((s: any) => ({ id: s.id, job_title: s.job_title, state: s.location, salary: null, source: "employer" as const })));
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, isPoc]);

  // Optional AI match explanation — never blocks the page
  useEffect(() => {
    if (!job || !user) return;
    (async () => {
      setLoadingExplain(true);
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const jobData = job.source === "poc" ? job.data : job.data;
        const candidate: any = { target_role: jobData.job_title, skills: job.source === "poc" ? jobData.skills : null };
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ action: "explain_match", candidate, job: jobData, score: 80 }),
        });
        if (!res.ok) {
          console.warn("AI match explanation non-OK:", res.status);
          return;
        }
        const data = await res.json();
        if (data?.ok && data.explanation) setExplanation(data.explanation);
      } catch (e) {
        console.warn("AI match explanation failed:", e);
      } finally {
        setLoadingExplain(false);
      }
    })();
  }, [job, user]);

  // Check if already applied
  useEffect(() => {
    if (!user || loading) return;
    (async () => {
      let q = supabase.from("applications").select("id").eq("user_id", user.id);
      if (isPoc) q = q.eq("poc_vacancy_id", jobId);
      else q = q.eq("job_id", jobId);
      const { data } = await q.maybeSingle();
      if (data) setApplied(true);
    })();
  }, [user, loading, jobId, isPoc]);

  const canApply = !authLoading && user && role === "job_seeker";

  if (loading) return (
    <><PublicNav />
    <div style={{ minHeight: '100vh', background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 style={{ width: 28, height: 28, color: 'var(--brand)' }} className="animate-spin" />
    </div>
    <PublicFooter /></>);

  if (error || !job) return (
    <><PublicNav />
    <div style={{ minHeight: '100vh', background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <p style={{ color: '#dc2626', fontSize: 14 }}>{error ?? "Job not found."}</p>
      <Link to="/jobs" style={{ fontSize: 13, color: 'var(--brand)', textDecoration: 'none' }}>← Back to Jobs</Link>
    </div>
    <PublicFooter /></>
  );

  const title = job.source === "poc" ? (job.data.job_title ?? job.data.occupation_name ?? "Untitled") : job.data.job_title;
  const company = job.source === "poc" ? (job.data.occupation_name ?? "PERKESO Vacancy") : job.data.company_name;
  const location = job.source === "poc" ? [job.data.city, job.data.state].filter(Boolean).join(", ") : job.data.location;
  const salary = job.source === "poc" ? salaryDisplay(job.data) : "See job description";
  const education = job.source === "poc" ? job.data.education_level : null;
  const fieldOfStudy = job.source === "poc" ? job.data.field_of_study : null;
  const skills = skillList(job.source === "poc" ? job.data.skills : null);
  const description = job.source === "poc" ? job.data.job_description : job.data.description;
  const requirements = job.source === "employer" ? job.data.requirements : null;
  const postedDate = job.source === "employer" ? job.data.created_at : null;

  return (
    <>
    <PublicNav />
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 0' }}>
        <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Back to Jobs
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                  <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Building2 className="size-4 shrink-0" /> {company}
                  </p>
                </div>
                {job.source === "poc" && (
                  <span className="rounded-full bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-semibold shrink-0">PERKESO</span>
                )}
                {job.source === "employer" && (
                  <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold shrink-0">Employer Posted</span>
                )}
              </div>

              {/* Meta */}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2.5 text-sm text-muted-foreground">
                {location && (
                  <span className="flex items-center gap-1.5"><MapPin className="size-4 shrink-0" />{location}</span>
                )}
                <span className="flex items-center gap-1.5"><DollarSign className="size-4 shrink-0" />{salary}</span>
                {education && (
                  <span className="flex items-center gap-1.5"><GraduationCap className="size-4 shrink-0" />{education}</span>
                )}
                {fieldOfStudy && (
                  <span className="flex items-center gap-1.5"><BookOpen className="size-4 shrink-0" />{fieldOfStudy}</span>
                )}
                {postedDate && (
                  <span className="flex items-center gap-1.5"><Clock className="size-4 shrink-0" />Posted {timeAgo(postedDate)}</span>
                )}
              </div>

              {/* Apply button */}
              <div className="mt-5">
                {applied ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="size-4" /> Applied ✓
                  </span>
                ) : canApply ? (
                  <Button size="lg" onClick={() => setShowModal(true)}>Apply Now</Button>
                ) : !user ? (
                  <Link to="/login" className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
                    Login to Apply
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s, i) => (
                    <span key={i} className="rounded-lg bg-muted border border-border px-3 py-1 text-sm text-foreground">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {description && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Job Description</h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{description}</div>
              </div>
            )}

            {/* Requirements (employer jobs) */}
            {requirements && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Requirements</h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{requirements}</div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Quick info card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Job Overview</h3>
              <div className="space-y-2.5 text-sm">
                {location && <div className="flex gap-2"><MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" /><span>{location}</span></div>}
                <div className="flex gap-2"><DollarSign className="size-4 text-muted-foreground shrink-0 mt-0.5" /><span>{salary}</span></div>
                {education && <div className="flex gap-2"><GraduationCap className="size-4 text-muted-foreground shrink-0 mt-0.5" /><span>{education}</span></div>}
                {fieldOfStudy && <div className="flex gap-2"><BookOpen className="size-4 text-muted-foreground shrink-0 mt-0.5" /><span>{fieldOfStudy}</span></div>}
                {job.source === "employer" && <div className="flex gap-2"><Briefcase className="size-4 text-muted-foreground shrink-0 mt-0.5" /><span>{job.data.industry}</span></div>}
              </div>
            </div>

            {/* Semantic AI match explanation (optional) */}
            {loadingExplain && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Analyzing match…
                </div>
              </div>
            )}
            {explanation && !loadingExplain && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Semantic AI match</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{explanation.summary}</p>
                {explanation.strengths?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-emerald-700">Skill signals</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {explanation.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {explanation.gaps?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-amber-700">Occupation / Education signals</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {explanation.gaps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Similar jobs */}
            {similar.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Similar Jobs</h3>
                <div className="space-y-2">
                  {similar.map((s) => (
                    <Link
                      key={s.id}
                      to="/jobs/$jobId"
                      params={{ jobId: s.id }}
                      className="block rounded-lg hover:bg-muted/50 p-2.5 transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground truncate">{s.job_title ?? "Untitled"}</p>
                      <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                        {s.state && <span className="flex items-center gap-0.5"><MapPin className="size-3" />{s.state}</span>}
                        {s.salary && <span className="flex items-center gap-0.5"><DollarSign className="size-3" />{s.salary}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <ApplyModal
        open={showModal}
        jobTitle={title}
        jobId={jobId}
        isPoc={isPoc}
        onClose={() => setShowModal(false)}
        onSuccess={() => setApplied(true)}
      />
    </div>
    <PublicFooter />
    </>
  );
}
