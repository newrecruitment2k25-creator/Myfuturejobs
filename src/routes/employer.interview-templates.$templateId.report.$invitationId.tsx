import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, User, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getInvitationDetail } from "@/lib/interview-templates.functions";

export const Route = createFileRoute("/employer/interview-templates/$templateId/report/$invitationId")({
  ssr: false,
  component: CandidateReportPage,
  head: () => ({
    meta: [{ title: "Candidate Interview Report — PerksoPrax AI" }],
  }),
});

type ReportData = Awaited<ReturnType<typeof getInvitationDetail>>;

function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-600";
  if (s >= 60) return "text-amber-600";
  return "text-red-600";
}
function scoreBg(s: number) {
  if (s >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s >= 60) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}
function recBadge(rec: string) {
  const map: Record<string, string> = {
    strong_hire: "bg-emerald-100 text-emerald-700 border-emerald-200",
    hire: "bg-green-100 text-green-700 border-green-200",
    maybe: "bg-amber-100 text-amber-700 border-amber-200",
    no_hire: "bg-red-100 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = { strong_hire: "Strong Hire ✓✓", hire: "Hire ✓", maybe: "Maybe", no_hire: "No Hire" };
  return <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${map[rec] ?? ""}`}>{labels[rec] ?? rec}</span>;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

function CandidateReportPage() {
  const { templateId, invitationId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { void navigate({ to: "/employer/login" }); return; }
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "employer") { void navigate({ to: "/employer/login" }); return; }
      setCheckingRole(false);
    })();
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (checkingRole || !user) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getInvitationDetail({ data: { employer_id: user.id, invitation_id: invitationId } });
        setReport(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [checkingRole, user, invitationId]);

  if (authLoading || checkingRole || loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  if (error || !report) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--base)' }}>
        <main>
          <div className="text-center">
            <p className="text-destructive mb-4">{error ?? "Report not found."}</p>
            <Link to="/employer/interview-templates/$templateId" params={{ templateId }} className="text-sm text-primary hover:underline">← Back to Template</Link>
          </div>
        </main>
      </div>
    );
  }

  const { invitation, template, responses } = report;
  const summary = invitation.ai_summary as any;
  const proctoring = summary?.proctoring;

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px' }}>
        {/* Breadcrumb */}
        <Link to="/employer/interview-templates/$templateId" params={{ templateId }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Back to Template
        </Link>

        {/* Header card */}
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="size-5 text-muted-foreground" />
                <h1 className="text-lg font-semibold text-foreground font-mono">{(invitation as any).candidate_email}</h1>
              </div>
              <p className="text-muted-foreground text-sm">{template?.role_title}{template?.company_name ? ` · ${template.company_name}` : ""}</p>
              {invitation.completed_at && (
                <p className="text-xs text-muted-foreground mt-1">Completed {formatDate(invitation.completed_at)}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {invitation.overall_score !== null && (
                <div className="text-center">
                  <div className={`text-4xl font-black ${scoreColor(invitation.overall_score)}`}>{invitation.overall_score}</div>
                  <div className="text-xs text-muted-foreground">Overall Score</div>
                </div>
              )}
              {summary?.hiring_recommendation && recBadge(summary.hiring_recommendation)}
            </div>
          </div>
        </div>

        {/* AI Summary */}
        {summary?.summary && (
          <div className="rounded-xl border border-border bg-card p-5 mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">AI Assessment Summary</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{summary.summary}</p>
          </div>
        )}

        {/* Strengths + Weaknesses */}
        {(summary?.strengths?.length > 0 || summary?.weaknesses?.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {summary?.strengths?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-3">Strengths</h3>
                <ul className="space-y-1.5">
                  {summary.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-foreground flex gap-2"><span className="text-emerald-500 shrink-0">✓</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {summary?.weaknesses?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-3">Areas to Improve</h3>
                <ul className="space-y-1.5">
                  {summary.weaknesses.map((w: string, i: number) => (
                    <li key={i} className="text-sm text-foreground flex gap-2"><span className="text-amber-500 shrink-0">→</span>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Competency scores */}
        {summary?.competency_scores?.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Competency Breakdown</h2>
            <div className="space-y-3">
              {summary.competency_scores.map((c: { name: string; score: number; evidence: string }, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-36 shrink-0">
                    <div className="text-sm font-medium text-foreground">{c.name}</div>
                    <div className={`text-lg font-bold ${scoreColor(c.score)}`}>{c.score}/100</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-muted overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full transition-all ${c.score >= 80 ? "bg-emerald-500" : c.score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{c.evidence}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Q&A per question */}
        {responses.length > 0 && (
          <div className="space-y-4 mb-6">
            <h2 className="text-sm font-semibold text-foreground">Question-by-Question Analysis</h2>
            {responses.map((r) => {
              const q = (r as any).question;
              const fb = r.feedback as any;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="shrink-0 size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{r.question_number}</span>
                    <p className="text-sm font-medium text-foreground leading-relaxed">{q?.question_text ?? "—"}</p>
                  </div>
                  {r.answer_text && (
                    <div className="ml-10 rounded-lg bg-muted/40 border border-border p-3 mb-3">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Candidate's Answer</p>
                      <p className="text-sm text-foreground">{r.answer_text}</p>
                    </div>
                  )}
                  <div className="ml-10 flex flex-wrap items-center gap-3">
                    {r.score !== null && (
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${scoreBg(r.score)}`}>{r.score}/100</span>
                    )}
                    {fb?.strengths?.length > 0 && (
                      <span className="text-xs text-emerald-600">✓ {fb.strengths.slice(0, 2).join("  ·  ")}</span>
                    )}
                    {fb?.improvements?.length > 0 && (
                      <span className="text-xs text-amber-600">→ {fb.improvements.slice(0, 1).join(", ")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Proctoring */}
        {proctoring && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Shield className="size-4" /> Proctoring Data
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className={`text-2xl font-bold ${proctoring.tab_switches > 0 ? "text-red-500" : "text-emerald-500"}`}>{proctoring.tab_switches}</p>
                <p className="text-xs text-muted-foreground mt-1">Tab Switches</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${proctoring.fullscreen_exits > 0 ? "text-amber-500" : "text-emerald-500"}`}>{proctoring.fullscreen_exits}</p>
                <p className="text-xs text-muted-foreground mt-1">Fullscreen Exits</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${proctoring.face_absent_seconds > 10 ? "text-red-500" : "text-emerald-500"}`}>{proctoring.face_absent_seconds}s</p>
                <p className="text-xs text-muted-foreground mt-1">Face Absent</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
