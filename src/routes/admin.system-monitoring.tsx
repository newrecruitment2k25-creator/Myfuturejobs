import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Activity, ArrowLeft, Shield, Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { getSystemStats } from "@/lib/ops-api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/system-monitoring")({
  ssr: false,
  component: SystemMonitoringPage,
  head: () => ({ meta: [{ title: "System Monitoring - MYFutureJobs Admin" }] }),
});

const USERS_SECTION = [
  { key: "profiles", label: "Total Users" },
  { key: "job_seekers", label: "Jobseekers" },
  { key: "employers", label: "Employers" },
  { key: "admins", label: "Admins" },
];

const CONTENT_SECTION = [
  { key: "jobs", label: "Jobs Posted" },
  { key: "poc_vacancies", label: "POC Vacancies" },
  { key: "poc_candidates", label: "POC Candidates" },
  { key: "applications", label: "Applications" },
];

const AI_SECTION = [
  { key: "analyses", label: "CV Analyses" },
  { key: "interview_sessions", label: "Interview Sessions" },
  { key: "interview_templates", label: "Interview Templates" },
  { key: "poc_match_results", label: "Match Results" },
];

const ACTIVITY_SECTION = [
  { key: "poc_activity_log", label: "POC Activity Logs" },
  { key: "admin_audit_logs", label: "Audit Logs" },
  { key: "placements", label: "Placements" },
  { key: "notifications", label: "Notifications" },
];

const MODULES = [
  { name: "AI Engine", desc: "Praxo AI Engine", status: "Operational" },
  { name: "Matching Engine", desc: "Candidate-vacancy scoring", status: "Operational" },
  { name: "Interview Engine", desc: "Simli WebRTC", status: "Operational" },
  { name: "TTS Engine", desc: "AI TTS", status: "Operational" },
  { name: "Database", desc: "Supabase", status: "Connected" },
  { name: "Hosting", desc: "Cloudflare Workers", status: "Active" },
];

function SystemMonitoringPage() {
  const guardState = useOpsGuard(["admin"]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    getSystemStats()
      .then(d => setCounts(d.counts ?? {}))
      .catch(err => toast.error("Failed to load system stats: " + (err?.message ?? "")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (guardState.status === "authorized") fetchStats();
  }, [guardState.status]);

  if (guardState.status === "loading") {
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

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-6">

        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Admin Console
        </Link>

        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #0A2647 0%, #144272 60%, #205295 100%)', boxShadow: '0 4px 20px rgba(10,38,71,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Admin · Monitoring
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>System Monitoring</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Live database counts and module health status.</p>
            </div>
            <button onClick={fetchStats} disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {[
              { title: "Users", items: USERS_SECTION },
              { title: "Content", items: CONTENT_SECTION },
              { title: "AI & Matching", items: AI_SECTION },
              { title: "Activity", items: ACTIVITY_SECTION },
            ].map(section => (
              <div key={section.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="size-5 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
                </div>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {section.items.map(({ key, label }) => {
                    const count = counts[key];
                    const missing = count === -1;
                    return (
                      <div key={key} className="rounded-xl border border-border bg-background p-4 text-center">
                        {missing ? (
                          <>
                            <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                              <AlertCircle className="size-3.5" />
                              <span className="text-xs font-semibold">N/A</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-2xl font-extrabold tabular-nums text-primary">{(count ?? 0).toLocaleString()}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="size-5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Module Health</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {MODULES.map(m => (
                  <div key={m.name} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle className="size-4" />
                      <span className="text-xs font-semibold">{m.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
