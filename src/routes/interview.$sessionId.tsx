import { createFileRoute, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ChevronRight, Send, User, Mic, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getSession, saveSession, scoreAnswers } from "@/lib/interview-sessions";

export const Route = createFileRoute("/interview/$sessionId")({
  ssr: false,
  component: CandidateInterviewRoom,
  head: () => ({
    meta: [{ title: "AI Interview Room — PerksoPrax AI" }],
  }),
});

const CATEGORY_LABEL: Record<string, string> = {
  opening: "Opening",
  technical: "Technical",
  behavioural: "Behavioural",
  situational: "Situational",
  government: "Government / Public Sector",
  communication: "Communication",
};

function InterviewerAvatar({ gender }: { gender: "female" | "male" }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`flex size-20 items-center justify-center rounded-full border-4 ${
          gender === "female"
            ? "border-[#F97316]/30 bg-[#F97316]/10 text-[#F97316]"
            : "border-primary/30 bg-primary/10 text-primary"
        }`}
      >
        <User className="size-10" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">AI Interviewer</p>
        <p className="text-xs text-muted-foreground capitalize">{gender === "female" ? "Professional — Female" : "Professional — Male"}</p>
      </div>
    </div>
  );
}

function CandidateInterviewRoom() {
  const { sessionId } = Route.useParams();
  const isChildRoute = useRouterState({
    select: (s) => !s.location.pathname.endsWith(`/${sessionId}`),
  });
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getSession(sessionId));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!session) return;
    // Restore last answered index
    const answered = session.questions.filter((q) => session.answers[q.id]).length;
    setCurrentIndex(Math.min(answered, session.questions.length - 1));
  }, []);

  if (isChildRoute) return <Outlet />;

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Interview Session Not Found</h2>
          <p className="text-muted-foreground mb-6">This interview session does not exist or has expired.</p>
          <Button asChild variant="navy">
            <a href="/employer/interviews">Back to Interviews</a>
          </Button>
        </div>
      </div>
    );
  }

  const questions = session.questions;
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q) => session.answers[q.id]).length;
  const isLast = currentIndex === totalQuestions - 1;
  const allAnswered = answeredCount === totalQuestions;

  function saveAnswer() {
    if (!currentAnswer.trim()) return;
    const updated = {
      ...session!,
      answers: { ...session!.answers, [currentQuestion.id]: currentAnswer.trim() },
      status: "in-progress" as const,
    };
    saveSession(updated);
    setSession(updated);
    return updated;
  }

  function handleNext() {
    const updated = saveAnswer();
    if (!updated) return;
    setCurrentAnswer(updated.answers[questions[currentIndex + 1]?.id] ?? "");
    setCurrentIndex((i) => i + 1);
  }

  async function handleSubmit() {
    if (!session) return;
    const updatedWithAnswer = saveAnswer() ?? session;
    setSubmitting(true);

    const scores = scoreAnswers(updatedWithAnswer);
    const completed: typeof session = {
      ...updatedWithAnswer,
      scores,
      status: "completed",
      completedAt: new Date().toISOString(),
    };
    saveSession(completed);
    setSubmitting(false);
    void navigate({ to: "/employer/interviews/$sessionId/report", params: { sessionId } });
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
            <InterviewerAvatar gender={session.interviewerGender} />

            <div className="mt-6">
              <h1 className="text-2xl font-bold text-primary mb-1">AI Interview Session</h1>
              <p className="text-muted-foreground mb-1">Candidate: <strong>{session.candidateName}</strong></p>
              <p className="text-muted-foreground mb-6">Role: <strong>{session.targetRole}</strong></p>
            </div>

            <div className="rounded-xl bg-secondary/40 p-5 text-left space-y-3 mb-6">
              <h2 className="font-semibold text-foreground">Before you begin:</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="size-4 text-[var(--success)] mt-0.5 shrink-0" /> Answer each question in your own words. Be specific and use examples.</li>
                <li className="flex items-start gap-2"><CheckCircle className="size-4 text-[var(--success)] mt-0.5 shrink-0" /> For behavioural questions, use the STAR format: Situation, Task, Action, Result.</li>
                <li className="flex items-start gap-2"><CheckCircle className="size-4 text-[var(--success)] mt-0.5 shrink-0" /> You have <strong>{totalQuestions} questions</strong> to complete. Take your time with each one.</li>
                <li className="flex items-start gap-2"><CheckCircle className="size-4 text-[var(--success)] mt-0.5 shrink-0" /> Your answers will be reviewed and scored by the AI interviewer.</li>
              </ul>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6 rounded-lg border border-dashed border-border p-3">
              <Mic className="size-4 shrink-0" />
              <span>
                <strong>Voice Interview mode</strong> will be enabled in the next phase.
                <span className="ml-1.5 rounded-full border border-border px-1.5 py-0.5 text-[10px]">Phase 2</span>
              </span>
            </div>

            <Button variant="navy" size="xl" className="w-full" onClick={() => setStarted(true)}>
              Begin Interview
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="text-sm text-muted-foreground">
              {answeredCount} answered
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-[160px_1fr]">
          {/* Interviewer card */}
          <div className="flex flex-row items-center gap-4 md:flex-col md:items-start">
            <InterviewerAvatar gender={session.interviewerGender} />
          </div>

          {/* Question + answer */}
          <div className="space-y-4">
            {/* Category badge */}
            <div>
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {CATEGORY_LABEL[currentQuestion.category] ?? currentQuestion.category}
              </span>
            </div>

            {/* Question */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-base font-medium text-foreground leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>

            {/* Previously answered indicator */}
            {session.answers[currentQuestion.id] && !currentAnswer && (
              <div className="rounded-lg bg-[var(--success)]/10 px-4 py-2 text-sm text-[var(--success)]">
                ✓ You have already answered this question.
              </div>
            )}

            {/* Answer textarea */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Answer</label>
              <Textarea
                rows={6}
                value={currentAnswer || session.answers[currentQuestion.id] || ""}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here. Be specific and use real examples where possible..."
                className="resize-none"
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              {currentIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    saveAnswer();
                    setCurrentAnswer(session.answers[questions[currentIndex - 1]?.id] ?? "");
                    setCurrentIndex((i) => i - 1);
                  }}
                >
                  Previous
                </Button>
              )}
              <div className="flex-1" />
              {!isLast ? (
                <Button variant="navy" onClick={handleNext}>
                  Next Question <ChevronRight className="ml-1 size-4" />
                </Button>
              ) : (
                <Button
                  variant="navy"
                  onClick={handleSubmit}
                  disabled={submitting || (!currentAnswer.trim() && !session.answers[currentQuestion.id])}
                >
                  {submitting ? (
                    <><span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Submitting…</>
                  ) : (
                    <><Send className="mr-2 size-4" /> Submit Interview</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* All questions answered panel */}
        {allAnswered && !isLast && (
          <div className="mt-6 rounded-xl border border-[var(--success)] bg-[var(--success)]/5 p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--success)] font-medium">All questions answered. Ready to submit.</p>
            <Button variant="navy" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : <><Send className="mr-2 size-4" /> Submit Interview</>}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
