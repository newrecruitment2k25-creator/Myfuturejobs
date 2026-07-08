import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { MapPin, Shield, Loader2, Database, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { listPlacements, createPlacement, listCandidates, listEmployers, type PlacementRow } from "@/lib/ops-api";
import { toast } from "sonner";
import { AdminPageHeader, AdminSectionCard, AdminStatTile } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin/placements")({
  ssr: false,
  component: AdminPlacementsPage,
  head: () => ({ meta: [{ title: "Placements - MYFutureJobs Admin" }] }),
});

function statusBadge(s: string) {
  if (s === "Active") return "bg-green-50 text-green-700 border-green-200";
  if (s === "Completed") return "bg-primary/10 text-primary border-primary/20";
  return "bg-secondary text-muted-foreground border-border";
}

function retentionBadge(r: string) {
  if (r === "Retained") return "bg-green-50 text-green-700 border-green-200";
  if (r === "At Risk") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function AdminPlacementsPage() {
  const guardState = useOpsGuard(["admin"]);
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [candidates, setCandidates] = useState<{ id: string; email: string }[]>([]);
  const [employers, setEmployers] = useState<{ id: string; email: string }[]>([]);
  const [formData, setFormData] = useState({ candidate_id: "", employer_id: "", role_title: "", salary: "", placement_date: "", industry: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchPlacements = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listPlacements();
      setPlacements(d.placements ?? []);
    } catch (err: any) {
      toast.error("Failed to load placements: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([listCandidates(), listEmployers()]);
      setCandidates((c.candidates ?? []).map(x => ({ id: x.id, email: x.email })));
      setEmployers((e.employers ?? []).map(x => ({ id: x.id, email: x.email })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (guardState.status === "authorized") { fetchPlacements(); fetchDropdowns(); }
  }, [guardState.status, fetchPlacements, fetchDropdowns]);

  const handleSubmitPlacement = async () => {
    if (!formData.candidate_id) { toast.error("Select a candidate"); return; }
    setSubmitting(true);
    try {
      const res = await createPlacement({
        candidate_id: formData.candidate_id,
        employer_id: formData.employer_id || undefined,
        role_title: formData.role_title || undefined,
        salary: formData.salary ? Number(formData.salary) : undefined,
        placement_date: formData.placement_date || undefined,
        industry: formData.industry || undefined,
      });
      setPlacements(prev => [{ ...res.placement, candidate_email: "—", employer_email: "—" }, ...prev]);
      setShowForm(false);
      setFormData({ candidate_id: "", employer_id: "", role_title: "", salary: "", placement_date: "", industry: "" });
      toast.success("Placement recorded");
    } catch (err: any) {
      toast.error("Failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

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

  const avgSalary = placements.length
    ? Math.round(placements.filter(p => p.salary).reduce((s, p) => s + (p.salary ?? 0), 0) / (placements.filter(p => p.salary).length || 1))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">

        <AdminPageHeader
          badge="Admin · Placements"
          title="Placement Tracking"
          subtitle="Track candidate placements, salary, and retention outcomes."
          backTo="/admin"
          backLabel="Back to Admin Console"
          onRefresh={fetchPlacements}
          refreshLoading={loading}
        >
          <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-gradient-to-r from-[#f36c21] to-[#ff8c42] text-white hover:opacity-90">
            <Plus className="size-4" /> Record Placement
          </Button>
        </AdminPageHeader>

        {showForm && (
          <AdminSectionCard icon={<Plus className="size-5 text-primary" />} title="Record New Placement" subtitle="Create a new placement record in the system">
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <select className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={formData.candidate_id} onChange={e => setFormData(p => ({ ...p, candidate_id: e.target.value }))}>
                <option value="">— Select Candidate —</option>
                {candidates.map(c => <option key={c.id} value={c.id}>{c.email}</option>)}
              </select>
              <select className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={formData.employer_id} onChange={e => setFormData(p => ({ ...p, employer_id: e.target.value }))}>
                <option value="">— Select Employer (optional) —</option>
                {employers.map(e => <option key={e.id} value={e.id}>{e.email}</option>)}
              </select>
              <Input placeholder="Role / Job Title" value={formData.role_title} onChange={e => setFormData(p => ({ ...p, role_title: e.target.value }))} />
              <Input type="number" placeholder="Salary (MYR)" value={formData.salary} onChange={e => setFormData(p => ({ ...p, salary: e.target.value }))} />
              <Input type="date" placeholder="Placement Date" value={formData.placement_date} onChange={e => setFormData(p => ({ ...p, placement_date: e.target.value }))} />
              <Input placeholder="Industry (optional)" value={formData.industry} onChange={e => setFormData(p => ({ ...p, industry: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmitPlacement} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </AdminSectionCard>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Placements", value: placements.length, color: "primary" as const },
            { label: "Retained", value: placements.filter(p => p.retention_status === "Retained").length, color: "success" as const },
            { label: "Avg Salary (MYR)", value: avgSalary ? avgSalary.toLocaleString() : "—", color: "warning" as const },
          ].map(({ label, value, color }) => (
            <AdminStatTile key={label} label={label} value={loading ? "…" : value} color={color} />
          ))}
        </div>

        <AdminSectionCard icon={<MapPin className="size-5 text-primary" />} title={`Placements (${placements.length})`} subtitle="Placement records and outcomes">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : placements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-10 text-center">
              <Database className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">No placements recorded</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">Placements will appear here once recorded.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {placements.map(p => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-semibold text-foreground">{p.role_title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.candidate_email} → {p.employer_email}</p>
                    <p className="text-xs text-muted-foreground">{p.industry ?? "—"} · {fmtDate(p.placement_date)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {p.salary && <span className="text-xs font-semibold text-foreground">MYR {p.salary.toLocaleString()}</span>}
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(p.status)}`}>{p.status}</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${retentionBadge(p.retention_status)}`}>{p.retention_status}</span>
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
