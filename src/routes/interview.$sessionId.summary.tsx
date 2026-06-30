import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ChevronDown, RotateCcw, LayoutDashboard, Share2, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import type { InterviewSummary } from "@/lib/interview.functions";

export const Route = createFileRoute("/interview/$sessionId/summary")({
  component: InterviewSummaryPage,
  ssr: false,
  head: () => ({
    meta: [{ title: "Interview Summary — MYFutureJobs" }],
  }),
});

type SessionRow = {
  id: string;
  role_title: string;
  company_type: string | null;
  industry: string | null;
  interview_type: string;
  experience_level: string | null;
  overall_score: number | null;
  ai_summary: InterviewSummary | null;
  status: string;
  created_at: string;
  total_questions: number;
};

type ResponseRow = {
  id: string;
  question_number: number;
  question_text: string;
  answer_text: string | null;
  score: number | null;
  feedback: { strengths: string[]; improvements: string[]; competencies_demonstrated: string[] } | null;
};

const recColors: Record<string, { label: string; cls: string }> = {
  strong_hire: { label: "Strong Hire", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  hire: { label: "Hire", cls: "bg-blue-100 text-blue-800 border-blue-300" },
  maybe: { label: "Maybe", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  no_hire: { label: "No Hire", cls: "bg-red-100 text-red-800 border-red-300" },
};

function scoreColor(s: number) {
  if (s >= 70) return "var(--success, #10b981)";
  if (s >= 50) return "#f59e0b";
  return "var(--destructive, #ef4444)";
}

function InterviewSummaryPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const { sessionId } = useParams({ from: "/interview/$sessionId/summary" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) void navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || !sessionId) return;
    (async () => {
      const { data: s } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      const { data: r } = await supabase
        .from("interview_responses")
        .select("*")
        .eq("session_id", sessionId)
        .order("question_number", { ascending: true });
      setSession(s as SessionRow);
      setResponses((r ?? []) as ResponseRow[]);
      setLoading(false);
    })();
  }, [user, sessionId]);

  if (!isMounted || authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Session not found.</p>
      </main>
    </div>
  );

  const summary = session.ai_summary;
  const score = session.overall_score ?? 0;
  const rec = summary?.hiring_recommendation ? recColors[summary.hiring_recommendation] : null;
  const tabSwitches = 0; // stored in component state during room; read from sessionStorage if available
  const tabCount = Number(sessionStorage.getItem(`MYFutureJobs:interview:tabs:${sessionId}`) ?? 0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{session.role_title}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {session.company_type} · {session.industry} · {session.interview_type} Interview
            </p>
          </div>
          {rec && (
            <span className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-semibold ${rec.cls}`}>
              {rec.label}
            </span>
          )}
        </div>

        {/* Score + Summary */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Radial score */}
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Overall Score</p>
            <div className="relative h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
                  barSize={12} data={[{ value: score, fill: scoreColor(score) }]}
                  startAngle={90} endAngle={90 - (score / 100) * 360}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "var(--muted)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          {summary?.summary && (
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-center">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">AI Assessment</p>
              <p className="text-sm text-foreground leading-relaxed">{summary.summary}</p>
            </div>
          )}
        </div>

        {/* Strengths & Weaknesses */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <h3 className="font-semibold text-foreground">Strengths</h3>
              </div>
              <ul className="space-y-1.5">
                {summary.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="size-4 text-amber-500" />
                <h3 className="font-semibold text-foreground">Areas to Improve</h3>
              </div>
              <ul className="space-y-1.5">
                {summary.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 rounded-full bg-amber-500 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Competency scores */}
        {summary?.competency_scores && summary.competency_scores.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="size-4 text-primary" />
              <h3 className="font-semibold text-foreground">Competency Scores</h3>
            </div>
            <div className="space-y-3">
              {summary.competency_scores.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="text-muted-foreground">{c.score}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${c.score}%`, backgroundColor: scoreColor(c.score) }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement areas */}
        {summary?.improvement_areas && summary.improvement_areas.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-3">Improvement Recommendations</h3>
            <ul className="space-y-2">
              {summary.improvement_areas.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary font-semibold shrink-0">{i + 1}.</span> {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Q&A breakdown */}
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Question-by-Question Breakdown</h3>
          </div>
          <div className="divide-y divide-border">
            {responses.map((r) => {
              const open = expanded === r.id;
              const sc = r.score ?? 0;
              return (
                <div key={r.id}>
                  <button
                    onClick={() => setExpanded(open ? null : r.id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Q{r.question_number}</p>
                      <p className="text-sm text-foreground truncate">{r.question_text}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.score !== null && (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold border"
                          style={{ color: scoreColor(sc), borderColor: scoreColor(sc) + "40", backgroundColor: scoreColor(sc) + "15" }}
                        >
                          {sc}
                        </span>
                      )}
                      <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {open && (
                    <div className="px-5 pb-5 space-y-3">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Candidate's Answer</p>
                        <p className="text-sm text-foreground">{r.answer_text ?? "(No answer provided)"}</p>
                      </div>
                      {r.feedback && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {r.feedback.strengths?.length > 0 && (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                              <p className="text-xs font-medium text-emerald-700 mb-1">Strengths</p>
                              <ul className="space-y-0.5">
                                {r.feedback.strengths.map((s, i) => <li key={i} className="text-xs text-emerald-800">· {s}</li>)}
                              </ul>
                            </div>
                          )}
                          {r.feedback.improvements?.length > 0 && (
                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                              <p className="text-xs font-medium text-amber-700 mb-1">Improvements</p>
                              <ul className="space-y-0.5">
                                {r.feedback.improvements.map((s, i) => <li key={i} className="text-xs text-amber-800">· {s}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Proctoring summary */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-3">Proctoring Summary</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div><span className="text-muted-foreground">Tab switches:</span> <span className={`font-medium ${tabCount > 0 ? "text-amber-600" : "text-foreground"}`}>{tabCount}</span></div>
            <div><span className="text-muted-foreground">Questions answered:</span> <span className="font-medium text-foreground">{responses.filter((r) => r.answer_text).length} / {session.total_questions}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <span className="font-medium text-foreground capitalize">{session.status}</span></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link to="/interview/setup">
            <Button variant="outline" className="gap-2">
              <RotateCcw className="size-4" /> Retake Interview
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" className="gap-2">
              <LayoutDashboard className="size-4" /> Back to Dashboard
            </Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={() => { toast.info("Employer sharing coming soon."); }}>
            <Share2 className="size-4" /> Share with Employer
          </Button>
        </div>

      </main>
    </div>
  );
}
