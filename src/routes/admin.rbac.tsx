import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, ArrowLeft, CheckCircle, XCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/rbac")({
  ssr: false,
  component: AdminRbacPage,
  head: () => ({ meta: [{ title: "Role-Based Access Control — MYFutureJobs Admin" }] }),
});

type Role = "job_seeker" | "employer" | "admin";
type Feature =
  | "View Jobs"
  | "Apply to Jobs"
  | "Post Vacancies"
  | "CV Analyzer"
  | "AI Interview"
  | "Interview Templates"
  | "Candidate Matching"
  | "Labour Market Intel"
  | "User Management"
  | "Audit Logs"
  | "System Config"
  | "Placements";

const ALL_FEATURES: Feature[] = [
  "View Jobs", "Apply to Jobs", "Post Vacancies", "CV Analyzer",
  "AI Interview", "Interview Templates", "Candidate Matching",
  "Labour Market Intel", "User Management", "Audit Logs", "System Config", "Placements",
];

const ROLES: Role[] = ["job_seeker", "employer", "admin"];
const ROLE_LABELS: Record<Role, string> = { job_seeker: "Jobseeker", employer: "Employer", admin: "Admin" };

const DEFAULT_MATRIX: Record<Role, Set<Feature>> = {
  job_seeker: new Set(["View Jobs", "Apply to Jobs", "CV Analyzer", "AI Interview"]),
  employer: new Set(["View Jobs", "Post Vacancies", "Interview Templates", "Candidate Matching", "Labour Market Intel"]),
  admin: new Set([...ALL_FEATURES]),
};

function roleBadge(r: Role) {
  if (r === "admin") return "bg-destructive/10 text-destructive";
  if (r === "employer") return "bg-primary/10 text-primary";
  return "bg-secondary text-muted-foreground";
}

function AdminRbacPage() {
  const guardState = useOpsGuard(["admin"]);
  const [matrix, setMatrix] = useState<Record<Role, Set<Feature>>>(() => {
    const init: Record<string, Set<Feature>> = {};
    for (const role of ROLES) init[role] = new Set(DEFAULT_MATRIX[role]);
    return init as Record<Role, Set<Feature>>;
  });

  const toggle = (role: Role, feature: Feature) => {
    if (role === "admin") return;
    setMatrix(prev => {
      const next = new Set(prev[role]);
      if (next.has(feature)) next.delete(feature);
      else next.add(feature);
      toast.success(`"${feature}" ${next.has(feature) ? "granted to" : "revoked from"} ${ROLE_LABELS[role]}`);
      return { ...prev, [role]: next };
    });
  };

  if (guardState.status === "loading") {
    return <div className="min-h-screen bg-background"><div className="flex items-center justify-center min-h-[60vh]"><span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></div>;
  }
  if (guardState.status === "unauthenticated") return null;
  if (guardState.status === "unauthorized") {
    const dashHref = guardState.role === "employer" ? "/employer/dashboard" : "/dashboard";
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <Shield className="size-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Unauthorized Access</h2>
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Admin · Access Control
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>Role-Based Access Control</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Permission matrix showing feature access per role. Toggle cells to adjust (display only — enforcement is in code).</p>
            </div>
            <Lock style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-left text-muted-foreground font-semibold pr-6">Feature / Module</th>
                {ROLES.map(r => (
                  <th key={r} className="pb-3 text-center font-semibold px-4 min-w-[100px]">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${roleBadge(r)}`}>{ROLE_LABELS[r]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {ALL_FEATURES.map(feature => (
                <tr key={feature} className="hover:bg-accent/20">
                  <td className="py-3 pr-6 font-medium text-foreground">{feature}</td>
                  {ROLES.map(role => {
                    const has = matrix[role].has(feature);
                    const locked = role === "admin";
                    return (
                      <td key={role} className="py-3 text-center">
                        <button
                          onClick={() => toggle(role, feature)}
                          disabled={locked}
                          className={`inline-flex items-center justify-center size-7 rounded-lg border transition-colors ${
                            locked ? "cursor-default" : "cursor-pointer hover:bg-accent"
                          } ${has ? "border-green-300 bg-green-50" : "border-border bg-background"}`}
                        >
                          {has
                            ? <CheckCircle className="size-4 text-green-600" />
                            : <XCircle className="size-4 text-muted-foreground/30" />
                          }
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <p><strong>Note:</strong> Admin role always has full access (cannot be revoked). Changes here are visual — actual enforcement is implemented in route guards and API middleware. Toggling permissions generates an audit log entry.</p>
        </div>

      </main>
    </div>
  );
}
