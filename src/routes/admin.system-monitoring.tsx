import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Activity, Shield, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { getSystemStats } from "@/lib/ops-api";
import { toast } from "sonner";
import { AdminPageHeader, AdminSectionCard, AdminStatTile } from "@/components/admin/admin-shell";

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
  { key: "poc_match_results", label: "Match Results" },
];

const ACTIVITY_SECTION = [
  { key: "poc_activity_log", label: "POC Activity Logs" },
  { key: "admin_audit_logs", label: "Audit Logs" },
  { key: "placements", label: "Placements" },
  { key: "notifications", label: "Notifications" },
];

const MODULES = [
  { name: "AI Engine", desc: "MYFutureJobs Engine", status: "Operational" },
  { name: "Matching Engine", desc: "Candidate-vacancy scoring", status: "Operational" },
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
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

        <AdminPageHeader
          badge="Admin · Monitoring"
          title="System Monitoring"
          subtitle="Live database counts and module health status."
          backTo="/admin"
          backLabel="Back to Admin Console"
          onRefresh={fetchStats}
          refreshLoading={loading}
        />

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
              <AdminSectionCard key={section.title} icon={<Activity className="size-5 text-primary" />} title={section.title}>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {section.items.map(({ key, label }) => {
                    const count = counts[key];
                    const missing = count === -1;
                    return (
                      <AdminStatTile
                        key={key}
                        label={label}
                        value={missing ? "N/A" : (count ?? 0).toLocaleString()}
                        color={missing ? "warning" : "primary"}
                      />
                    );
                  })}
                </div>
              </AdminSectionCard>
            ))}

            <AdminSectionCard icon={<CheckCircle className="size-5 text-primary" />} title="Module Health" subtitle="External service and subsystem status">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {MODULES.map(m => (
                  <div key={m.name} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle className="size-4" />
                      <span className="text-xs font-semibold">{m.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </AdminSectionCard>
          </>
        )}

      </main>
    </div>
  );
}
