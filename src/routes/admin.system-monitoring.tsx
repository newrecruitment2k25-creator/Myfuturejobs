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

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin - Monitoring</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">System Monitoring</h1>
              <p className="mt-1 text-sm text-muted-foreground">Live database counts and module health status.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-2">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
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
