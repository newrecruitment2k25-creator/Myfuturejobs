import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Briefcase, Search, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { listEmployers, type EmployerRow } from "@/lib/ops-api";
import { toast } from "sonner";
import { AdminPageHeader, AdminSectionCard, AdminStatTile } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin/employers")({
  ssr: false,
  component: AdminEmployersPage,
  head: () => ({ meta: [{ title: "Employers - MYFutureJobs Admin" }] }),
});

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function AdminEmployersPage() {
  const guardState = useOpsGuard(["admin"]);
  const [employers, setEmployers] = useState<EmployerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchEmployers = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listEmployers();
      setEmployers(d.employers ?? []);
    } catch (err: any) {
      toast.error("Failed to load employers: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (guardState.status === "authorized") fetchEmployers();
  }, [guardState.status, fetchEmployers]);

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

  const filtered = employers.filter(e => {
    if (search && !e.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">

        <AdminPageHeader
          badge="Admin · Employers"
          title="Employer Management"
          subtitle="All registered employers with vacancy and activity data."
          backTo="/admin"
          backLabel="Back to Admin Console"
          onRefresh={fetchEmployers}
          refreshLoading={loading}
        />

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Employers", value: employers.length, color: "primary" as const },
            { label: "Total Jobs Posted", value: employers.reduce((s, e) => s + e.job_count, 0), color: "warning" as const },
            { label: "Total Applications", value: employers.reduce((s, e) => s + e.application_count, 0), color: "success" as const },
          ].map(({ label, value, color }) => (
            <AdminStatTile key={label} label={label} value={loading ? "…" : value} color={color} />
          ))}
        </div>

        <AdminSectionCard icon={<Briefcase className="size-5 text-primary" />} title={`Employers (${filtered.length})`} subtitle="Search and review employer accounts">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pl-9 h-9 text-sm" placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-10 text-center">
              <Briefcase className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">{employers.length === 0 ? "No employers yet" : "No matches"}</p>
              <p className="text-xs text-muted-foreground">{employers.length === 0 ? "Employers will appear once they register." : "Try clearing the search."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(e => (
                <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-semibold text-foreground truncate">{e.email}</p>
                    <p className="text-xs text-muted-foreground">Joined {fmtDate(e.joined)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground"><strong>{e.job_count}</strong> jobs</span>
                    <span className="text-xs text-muted-foreground"><strong>{e.application_count}</strong> applications</span>
                    <span className="text-xs text-muted-foreground"><strong>{e.interview_count}</strong> screenings</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSectionCard>

      </main>
    </div>
  );
}
