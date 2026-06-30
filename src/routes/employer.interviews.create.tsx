import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, Mic, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { generateLiveInterviewQuestions } from "@/lib/live-interview.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  generateId,
  saveSession,
  buildFallbackQuestions,
  type InterviewSession,
} from "@/lib/interview-sessions";

export const Route = createFileRoute("/employer/interviews/create")({
  ssr: false,
  component: CreateInterviewPage,
  head: () => ({
    meta: [{ title: "Create AI Interview — MYFutureJobs" }],
  }),
});

const INDUSTRIES = [
  "Finance & Banking", "Technology", "Government / Public Sector",
  "Healthcare", "Education", "Manufacturing", "Retail", "Logistics", "Legal", "Other",
];
const EMPLOYER_TYPES = ["Government", "GLC", "MNC", "Local Private", "SME", "NGO"];
const EXPERIENCE_LEVELS = ["Fresh Graduate", "1–3 years", "3–5 years", "5–10 years", "10+ years"];
const FOCUS_OPTIONS = [
  "Technical", "Behavioural", "Situational",
  "Government / Civil Service", "Communication",
];

function CreateInterviewPage() {
  const navigate = useNavigate();
  const genQuestions = useServerFn(generateLiveInterviewQuestions);

  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [employerType, setEmployerType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [interviewerGender, setInterviewerGender] = useState<"female" | "male">("female");
  const [questionFocus, setQuestionFocus] = useState<string[]>(["Technical", "Behavioural"]);
  const [cvSummary, setCvSummary] = useState(() => {
    try {
      const raw = sessionStorage.getItem("MYFutureJobs:lastResult");
      if (!raw) return "";
      const { result } = JSON.parse(raw);
      const skills = result?.keywords?.present_keywords?.slice(0, 8).join(", ") ?? "";
      return skills ? `Candidate has skills in: ${skills}` : "";
    } catch {
      return "";
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFocus(opt: string) {
    setQuestionFocus((prev) =>
      prev.includes(opt) ? prev.filter((f) => f !== opt) : [...prev, opt]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!candidateName || !targetRole || !industry || !employerType || !experienceLevel) {
      setError("Please fill in all required fields."); return;
    }
    if (questionFocus.length === 0) {
      setError("Select at least one question focus area."); return;
    }

    setSubmitting(true);
    setError(null);

    let questions: InterviewSession["questions"];

    try {
      const result = await genQuestions({
        data: { targetRole, industry, employerType, experienceLevel, questionFocus, cvSummary: cvSummary || undefined },
      });
      questions = result.questions;
    } catch {
      questions = buildFallbackQuestions(targetRole, industry, employerType, questionFocus);
    }

    const session: InterviewSession = {
      id: generateId(),
      candidateName,
      candidateEmail,
      targetRole,
      industry,
      employerType,
      experienceLevel,
      interviewerGender,
      interviewType: "text",
      questionFocus,
      cvSummary: cvSummary || undefined,
      questions,
      answers: {},
      scores: null,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };

    saveSession(session);
    setSubmitting(false);
    void navigate({ to: "/interview/$sessionId", params: { sessionId: session.id } });
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:700, margin:'0 auto', padding:'32px 16px' }}>
        <div className="mb-6">
          <Link
            to="/employer/interviews"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Interviews
          </Link>
        </div>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Interview Setup</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary">Create Interview Session</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure the AI interview for your candidate.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Candidate Details */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground mb-4">Candidate Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="candidateName">Candidate Name <span className="text-destructive">*</span></Label>
                <Input id="candidateName" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="e.g. Ahmad bin Razif" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="candidateEmail">Candidate Email</Label>
                <Input id="candidateEmail" type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} placeholder="candidate@email.com" />
              </div>
            </div>
          </div>

          {/* Role Details */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground mb-4">Role & Industry</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="targetRole">Target Role <span className="text-destructive">*</span></Label>
                <Input id="targetRole" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Finance Executive" required />
              </div>
              <div className="grid gap-2">
                <Label>Industry <span className="text-destructive">*</span></Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Employer Type <span className="text-destructive">*</span></Label>
                <Select value={employerType} onValueChange={setEmployerType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Experience Level <span className="text-destructive">*</span></Label>
                <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Interview Config */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground mb-4">Interview Configuration</h2>
            <div className="space-y-5">
              {/* Interview type */}
              <div>
                <Label className="mb-2 block">Interview Type</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-4 text-left transition-colors"
                  >
                    <MessageSquare className="size-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Text Interview</p>
                      <p className="text-xs text-muted-foreground">MVP — Available now</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 opacity-60 cursor-not-allowed">
                    <Mic className="size-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Voice Interview</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px]">Phase 2</span> Coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interviewer gender */}
              <div>
                <Label className="mb-2 block">AI Interviewer</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["female", "male"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setInterviewerGender(g)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                        interviewerGender === g
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`flex size-9 items-center justify-center rounded-full ${g === "female" ? "bg-[#F97316]/10 text-[#F97316]" : "bg-primary/10 text-primary"} font-bold text-lg`}>
                        {g === "female" ? "F" : "M"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground capitalize">{g} Interviewer</p>
                        <p className="text-xs text-muted-foreground">Professional AI interviewer</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question focus */}
              <div>
                <Label className="mb-2 block">Question Focus <span className="text-destructive">*</span></Label>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleFocus(opt)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        questionFocus.includes(opt)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CV Summary */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground mb-1">Candidate CV Summary</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Optional. Pre-filled from last CV analysis if available. Used to tailor questions.
            </p>
            <Textarea
              rows={4}
              value={cvSummary}
              onChange={(e) => setCvSummary(e.target.value)}
              placeholder="Paste a brief summary of the candidate's background, skills, or experience..."
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <Button asChild variant="outline">
              <Link to="/employer/interviews">Cancel</Link>
            </Button>
            <Button type="submit" variant="navy" disabled={submitting} className="min-w-[180px]">
              {submitting ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Generating Questions…</>
              ) : (
                "Create & Open Interview Room"
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
