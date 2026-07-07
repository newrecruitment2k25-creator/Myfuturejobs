import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft, Shield, Loader2, FileText, Briefcase,
  Video, BarChart3, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { getCandidate, type CandidateDetail } from "@/lib/ops-api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/candidates/$candidateId")({
  ssr: false,
  component: CandidateDetailPage,
  head: () => ({ meta: [{ title: "Candidate Profile - PerksoPrax AI Admin" }] }),
});

type Tab = "overview" | "analyses" | "applications" | "interviews";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function CandidateDetailPage() {
  const { candidateId } = Route.useParams();
  const guardState = useOpsGuard(["admin"]);
  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (guardState.status === "authorized") {
      getCandidate(candidateId)
        .then(d => setDetail(d))
        .catch(err => toast.error("Failed to load candidate: " + (err?.message ?? "Unknown")))
        .finally(() => setLoading(false));
    }
  }, [guardState.status, candidateId]);

  if (guardState.status === "loading" || (guardState.status === "authorized" && loading)) {
    return <div className="min-h-screen bg-background"><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="size-8 animate-spin text-primary" /></div></div>;
  }
  if (guardState.status === "unauthenticated") return null;
  if (guardState.status === "unauthorized") {
    const dashHref = guardState.role === "employer" ? "/employer/dashboard" : "/dashboard";
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <Shield className="size-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Unauthorized Access</h2>
          <p className="text-sm text-muted-foreground mb-6">You do not have permission to access this area.</p>
          <Button asChild variant="outline"><Link to={dashHref}>Go to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof FileText; count?: number }[] = [
    { id: "overview",     label: "Overview",     icon: User },
    { id: "analyses",     label: "CV Analyses",  icon: BarChart3,  count: detail?.analyses.length },
    { id: "applications", label: "Applications", icon: Briefcase,  count: detail?.applications.length },
    { id: "interviews",   label: "Interviews",   icon: Video,      count: detail?.interviewSessions.length },
  ];

  const latestAnalysis = detail?.analyses?.[0] ?? null;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-6">

        <Link to="/admin/candidates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Candidates
        </Link>

        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #0A2647 0%, #144272 60%, #205295 100%)', boxShadow: '0 4px 20px rgba(10,38,71,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16, position: 'relative' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.4)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Candidate 360 Profile
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail?.email ?? candidateId}</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                {detail?.profile?.role ?? "job_seeker"} ·
                Joined {detail?.profile?.created_at ? fmtDate(detail.profile.created_at) : "—"}
              </p>
            </div>
            {latestAnalysis && (
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', margin: 0 }}>{latestAnalysis.overall_score}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Employability Score</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="size-4" />
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Latest Analysis</h3>
              {latestAnalysis ? (
                <>
                  <p className="text-xs text-muted-foreground">Industry: <strong>{latestAnalysis.industry}</strong></p>
                  <p className="text-xs text-muted-foreground">Experience: <strong>{latestAnalysis.experience_level}</strong></p>
                  <p className="text-xs text-muted-foreground">Score: <strong className="text-primary">{latestAnalysis.overall_score}/100</strong></p>
                  <p className="text-xs text-muted-foreground">Date: {fmtDate(latestAnalysis.created_at)}</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No CV analysis completed yet.</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Activity Summary</h3>
              <p className="text-xs text-muted-foreground">CV Analyses: <strong>{detail?.analyses.length ?? 0}</strong></p>
              <p className="text-xs text-muted-foreground">Applications: <strong>{detail?.applications.length ?? 0}</strong></p>
              <p className="text-xs text-muted-foreground">Interviews: <strong>{detail?.interviewSessions.length ?? 0}</strong></p>
            </div>
          </div>
        )}

        {tab === "analyses" && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            {!detail?.analyses.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No CV analyses found.</p>
            ) : detail.analyses.map(a => (
              <div key={a.id} className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{a.industry} · {a.experience_level}</p>
                <p className="text-xs text-muted-foreground">Score: <strong className="text-primary">{a.overall_score}/100</strong> · {fmtDateTime(a.created_at)}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "applications" && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            {!detail?.applications.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No applications found.</p>
            ) : detail.applications.map(a => (
              <div key={a.id} className="rounded-xl border border-border bg-background px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Job: {a.job_id ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</p>
                </div>
                <span className="inline-flex rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{a.status}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "interviews" && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            {!detail?.interviewSessions.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No interview sessions found.</p>
            ) : detail.interviewSessions.map(s => (
              <div key={s.id} className="rounded-xl border border-border bg-background px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.role_title}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(s.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-primary">{s.overall_score !== null ? `${s.overall_score}/100` : "—"}</p>
                  <p className="text-xs text-muted-foreground">{s.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
