import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Briefcase, ArrowLeft, Search, Shield, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { listEmployers, type EmployerRow } from "@/lib/ops-api";
import { toast } from "sonner";

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
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-6">

        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Admin Console
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin - Employers</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">Employer Management</h1>
              <p className="mt-1 text-sm text-muted-foreground">All registered employers with vacancy and activity data.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchEmployers} disabled={loading} className="gap-2">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Employers", value: employers.length },
            { label: "Total Jobs Posted", value: employers.reduce((s, e) => s + e.job_count, 0) },
            { label: "Total Applications", value: employers.reduce((s, e) => s + e.application_count, 0) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-extrabold tabular-nums text-primary">{loading ? "…" : value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-9 h-9 text-sm" placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="size-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Employers ({filtered.length})</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center">
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
                    <span className="text-xs text-muted-foreground"><strong>{e.interview_count}</strong> interviews</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
