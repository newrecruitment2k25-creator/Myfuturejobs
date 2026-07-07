import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTemplate } from "@/lib/interview-templates.functions";

export const Route = createFileRoute("/employer/interview-templates/create")({
  ssr: false,
  component: CreateTemplatePage,
  head: () => ({
    meta: [{ title: "Create Interview Template — PerksoPrax AI" }],
  }),
});

type Question = {
  id: string;
  question_text: string;
  question_type: "open" | "behavioral" | "technical" | "situational";
  scoring_criteria: string;
  time_limit_seconds: string;
};

type JobRow = { id: string; job_title: string; company_name: string };

const INTERVIEW_TYPES = ["behavioral", "technical", "competency", "general", "situational", "mixed"];
const EXPERIENCE_LEVELS = ["Entry Level", "Junior", "Mid Level", "Senior", "Lead", "Manager", "Director", "C-Suite"];
const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail", "Education", "Government", "Construction", "Oil & Gas", "Telecommunications", "Other"];
const QUESTION_TYPES = ["open", "behavioral", "technical", "situational"] as const;

function uid() { return Math.random().toString(36).slice(2); }

function CreateTemplatePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const [instructions, setInstructions] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [linkedJobId, setLinkedJobId] = useState<string>("none");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([
    { id: uid(), question_text: "", question_type: "open", scoring_criteria: "", time_limit_seconds: "" },
  ]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { void navigate({ to: "/employer/login" }); return; }
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "employer") { void navigate({ to: "/employer/login" }); return; }
      setCheckingRole(false);
      setJobsLoading(true);
      const { data: jobRows } = await supabase
        .from("jobs")
        .select("id, job_title, company_name")
        .eq("employer_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      setJobs((jobRows ?? []) as JobRow[]);
      setJobsLoading(false);
    })();
  }, [authLoading, user, navigate]);

  const addQuestion = () => {
    if (questions.length >= 20) { toast.error("Maximum 20 questions allowed."); return; }
    setQuestions((prev) => [...prev, { id: uid(), question_text: "", question_type: "open", scoring_criteria: "", time_limit_seconds: "" }]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) { toast.error("At least 1 question required."); return; }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: string) => {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, [field]: value } : q));
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= questions.length) return;
    const arr = [...questions];
    [arr[index], arr[next]] = [arr[next], arr[index]];
    setQuestions(arr);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !roleTitle.trim() || !interviewType) {
      toast.error("Please fill in title, role title and interview type."); return;
    }
    const filledQuestions = questions.filter((q) => q.question_text.trim());
    if (filledQuestions.length === 0) {
      toast.error("Please add at least one question."); return;
    }

    setSubmitting(true);
    try {
      const { template_id } = await createTemplate({
        data: {
          employer_id: user.id,
          title: title.trim(),
          role_title: roleTitle.trim(),
          job_id: linkedJobId === "none" ? undefined : linkedJobId,
          company_name: companyName.trim() || undefined,
          industry: industry || undefined,
          experience_level: experienceLevel || undefined,
          interview_type: interviewType,
          instructions: instructions.trim() || undefined,
          time_limit_minutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : undefined,
          questions: filledQuestions.map((q) => ({
            question_text: q.question_text.trim(),
            question_type: q.question_type,
            scoring_criteria: q.scoring_criteria.trim() || undefined,
            time_limit_seconds: q.time_limit_seconds ? parseInt(q.time_limit_seconds) : undefined,
          })),
        },
      });
      toast.success("Template created!");
      void navigate({ to: "/employer/interviews" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create template.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || checkingRole) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:700, margin:'0 auto', padding:'32px 16px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--line)' }}>
            Interview Templates
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', margin: 0 }}>Create Interview Template</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Define your questions and scoring criteria, then invite candidates.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* ── Template Details ── */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Template Details</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="title">Template Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Software Engineer — L2 Technical Screen" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roleTitle">Role Title *</Label>
                <Input id="roleTitle" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="e.g. Software Engineer" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Sdn Bhd" />
              </div>
              <div className="space-y-1.5">
                <Label>Interview Type *</Label>
                <Select value={interviewType} onValueChange={setInterviewType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Experience Level</Label>
                <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timeLimit">Total Time Limit (minutes)</Label>
                <Input id="timeLimit" type="number" min={1} max={180} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(e.target.value)} placeholder="e.g. 30" />
              </div>
              {!jobsLoading && jobs.length > 0 && (
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Link to Job Vacancy (optional)</Label>
                  <Select value={linkedJobId} onValueChange={setLinkedJobId}>
                    <SelectTrigger><SelectValue placeholder="Select a vacancy to link candidates" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No linked vacancy</SelectItem>
                      {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.job_title} — {j.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">When linked, you can invite applicants from that vacancy directly.</p>
                </div>
              )}
              {jobsLoading && (
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Link to Job Vacancy (optional)</Label>
                  <div className="flex items-center gap-2 p-3 border rounded-md">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading vacancies...</span>
                  </div>
                </div>
              )}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="instructions">Instructions for Candidate</Label>
                <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Please answer each question clearly and concisely. This is a timed interview." rows={3} />
              </div>
            </div>
          </section>

          {/* ── Questions ── */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Questions <span className="text-sm font-normal text-muted-foreground">({questions.length}/20)</span></h2>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion} disabled={questions.length >= 20}>
                <Plus className="size-4 mr-1" /> Add Question
              </Button>
            </div>

            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold text-muted-foreground min-w-[2rem]">Q{i + 1}</span>
                    <div className="flex items-center gap-1 ml-auto">
                      <button type="button" onClick={() => moveQuestion(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                        <ChevronUp className="size-4" />
                      </button>
                      <button type="button" onClick={() => moveQuestion(i, 1)} disabled={i === questions.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                        <ChevronDown className="size-4" />
                      </button>
                      <button type="button" onClick={() => removeQuestion(q.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <Textarea
                    value={q.question_text}
                    onChange={(e) => updateQuestion(q.id, "question_text", e.target.value)}
                    placeholder="Enter your interview question…"
                    rows={2}
                    className="text-sm"
                  />

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Question Type</Label>
                      <Select value={q.question_type} onValueChange={(v) => updateQuestion(q.id, "question_type", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">Scoring Criteria <span className="text-muted-foreground font-normal">(optional — what should AI look for?)</span></Label>
                      <Input
                        value={q.scoring_criteria}
                        onChange={(e) => updateQuestion(q.id, "scoring_criteria", e.target.value)}
                        placeholder="e.g. Look for STAR method, technical depth, communication clarity"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/employer/interview-templates" })}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Create Template
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
