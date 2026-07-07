import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft, CheckCircle, AlertCircle, TrendingUp, ClipboardList, ChevronDown, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import type { InterviewSummary } from "@/lib/interview.functions";

export const Route = createFileRoute("/employer/interviews/$sessionId/report")({
  ssr: false,
  component: InterviewReportPage,
  head: () => ({
    meta: [{ title: "Interview Report — PerksoPrax AI" }],
  }),
});

const recColors: Record<string, { label: string; cls: string }> = {
  strong_hire: { label: "Strong Hire", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  hire: { label: "Hire", cls: "bg-blue-100 text-blue-800 border-blue-300" },
  maybe: { label: "Maybe", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  no_hire: { label: "No Hire", cls: "bg-red-100 text-red-800 border-red-300" },
};

function scoreColor(s: number) {
  if (s >= 70) return "#10b981";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}

type SessionRow = {
  id: string; role_title: string; company_type: string | null; industry: string | null;
  interview_type: string; experience_level: string | null; overall_score: number | null;
  ai_summary: InterviewSummary | null; status: string; created_at: string; total_questions: number;
};
type ResponseRow = {
  id: string; question_number: number; question_text: string; answer_text: string | null;
  score: number | null; feedback: { strengths: string[]; improvements: string[]; competencies_demonstrated: string[] } | null;
};

function InterviewReportPage() {
  const { sessionId } = useParams({ from: "/employer/interviews/$sessionId/report" });
  const { user, loading: authLoading } = useAuth();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const { data: s } = await supabase.from("interview_sessions").select("*").eq("id", sessionId).single();
      const { data: r } = await supabase.from("interview_responses").select("*").eq("session_id", sessionId).order("question_number", { ascending: true });
      setSession(s as SessionRow);
      setResponses((r ?? []) as ResponseRow[]);
      setLoading(false);
    })();
  }, [sessionId]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--base)' }}>
        <div style={{ textAlign:'center' }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>Report Not Found</h2>
          <p style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>This interview session does not exist or you do not have access.</p>
          <Link to="/employer/dashboard" style={{ fontSize:13, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const summary = session.ai_summary;
  const score = session.overall_score ?? 0;
  const rec = summary?.hiring_recommendation ? recColors[summary.hiring_recommendation] : null;
  const answeredCount = responses.filter((r) => r.answer_text).length;

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

        <Link to="/employer/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Dashboard
        </Link>

        {/* Report header */}
        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #0A2647 0%, #144272 60%, #205295 100%)', boxShadow: '0 4px 20px rgba(10,38,71,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                AI Assessment Report — Employer View
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>{session.role_title}</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                {session.company_type} · {session.industry} · {session.interview_type} Interview · {session.experience_level}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                {new Date(session.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            {rec && (
              <span style={{ display: 'inline-flex', borderRadius: 999, border: '1px solid', padding: '8px 20px', fontSize: 13, fontWeight: 700, ...{ color: rec.cls.includes('text-') ? undefined : undefined } }} className={rec.cls}>
                {rec.label}
              </span>
            )}
          </div>
        </div>

        {/* Executive summary */}
        {summary?.summary && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="size-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Executive Summary</h2>
            </div>
            <p className="text-sm leading-relaxed text-foreground">{summary.summary}</p>
          </div>
        )}

        {/* Score + stats */}
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Overall Score</p>
            <p className="text-5xl font-extrabold tabular-nums" style={{ color: scoreColor(score) }}>{score}</p>
            <p className="text-xs text-muted-foreground mt-1">out of 100</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Questions Answered</p>
            <p className="text-5xl font-extrabold tabular-nums text-foreground">{answeredCount}</p>
            <p className="text-xs text-muted-foreground mt-1">of {session.total_questions}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg. Answer Score</p>
            <p className="text-5xl font-extrabold tabular-nums text-foreground">
              {responses.filter((r) => r.score !== null).length > 0
                ? Math.round(responses.filter((r) => r.score !== null).reduce((a, r) => a + (r.score ?? 0), 0) / responses.filter((r) => r.score !== null).length)
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">per question</p>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        {summary && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="size-5 text-emerald-500" />
                <h2 className="text-base font-semibold text-foreground">Candidate Strengths</h2>
              </div>
              <ul className="space-y-2">
                {summary.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 rounded-full bg-emerald-500 shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="size-5 text-amber-500" />
                <h2 className="text-base font-semibold text-foreground">Areas of Concern</h2>
              </div>
              <ul className="space-y-2">
                {summary.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 rounded-full bg-amber-500 shrink-0" />{w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Competency framework */}
        {summary?.competency_scores && summary.competency_scores.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="size-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Competency Framework</h2>
            </div>
            <div className="space-y-4">
              {summary.competency_scores.map((c, i) => (
                <div key={i} className="pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex justify-between mb-1.5">
                    <span className="font-medium text-foreground text-sm">{c.name}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor(c.score) }}>{c.score}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${c.score}%`, backgroundColor: scoreColor(c.score) }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{c.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Q&A transcript */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Full Interview Transcript</h2>
          </div>
          <div className="divide-y divide-border">
            {responses.map((r) => {
              const open = expanded === r.id;
              const sc = r.score ?? 0;
              return (
                <div key={r.id}>
                  <button
                    onClick={() => setExpanded(open ? null : r.id)}
                    className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Q{r.question_number}</p>
                      <p className="text-sm text-foreground truncate">{r.question_text}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.score !== null && (
                        <span className="rounded-full border px-2 py-0.5 text-xs font-semibold"
                          style={{ color: scoreColor(sc), borderColor: scoreColor(sc) + "40", backgroundColor: scoreColor(sc) + "15" }}>
                          {sc}
                        </span>
                      )}
                      <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {open && (
                    <div className="px-6 pb-5 space-y-3">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Candidate's Answer</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{r.answer_text ?? "(No answer provided)"}</p>
                      </div>
                      {r.feedback && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {r.feedback.strengths?.length > 0 && (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                              <p className="text-xs font-medium text-emerald-700 mb-1">Strengths</p>
                              {r.feedback.strengths.map((s, i) => <p key={i} className="text-xs text-emerald-800">· {s}</p>)}
                            </div>
                          )}
                          {r.feedback.improvements?.length > 0 && (
                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                              <p className="text-xs font-medium text-amber-700 mb-1">Improvements</p>
                              {r.feedback.improvements.map((s, i) => <p key={i} className="text-xs text-amber-800">· {s}</p>)}
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

        {/* Candidate comparison placeholder */}
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Compare with other candidates →{" "}
            <Link to="/employer/dashboard" className="text-primary hover:underline font-medium">
              View all candidates for this role
            </Link>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-end pb-4">
          <Button asChild variant="outline">
            <Link to="/employer/dashboard">Back to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/interview/setup">New Interview</Link>
          </Button>
        </div>

      </main>
    </div>
  );
}
