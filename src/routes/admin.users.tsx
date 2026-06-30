import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Users, ArrowLeft, Search, Shield, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { listProfiles, updateUserRole, type ProfileRow } from "@/lib/ops-api";

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  component: AdminUsersPage,
  head: () => ({ meta: [{ title: "User Administration - MYFutureJobs Admin" }] }),
});

const ROLE_OPTIONS = ["job_seeker", "employer", "admin"];

function roleBadge(role: string) {
  if (role === "admin") return "bg-destructive/10 text-destructive border-destructive/20";
  if (role === "employer") return "bg-primary/10 text-primary border-primary/20";
  return "bg-secondary text-muted-foreground border-border";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function UserRow({ p, onRoleChange }: { p: ProfileRow; onRoleChange: (id: string, role: string) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [localRole, setLocalRole] = useState(p.role);

  const handleChange = async (newRole: string) => {
    if (newRole === localRole) return;
    setSaving(true);
    setLocalRole(newRole);
    await onRoleChange(p.id, newRole);
    setSaving(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <div className="flex-1 min-w-[180px]">
        <p className="text-sm font-semibold text-foreground truncate">{p.email}</p>
        <p className="text-xs text-muted-foreground">
          Joined {fmtDate(p.created_at)}
          {p.last_login && ` · Last login ${fmtDate(p.last_login)}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {p.analysis_count} analyses · {p.interview_count} interviews · {p.app_count} applications
        </p>
      </div>
      <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadge(localRole)}`}>
        {localRole}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <Select value={localRole} onValueChange={handleChange} disabled={saving}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        {saving && <Loader2 className="size-4 animate-spin text-primary" />}
      </div>
    </div>
  );
}

function AdminUsersPage() {
  const guardState = useOpsGuard(["admin"]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listProfiles();
      setProfiles(d.profiles ?? []);
    } catch (err: any) {
      toast.error("Failed to load users: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (guardState.status === "authorized") fetchProfiles();
  }, [guardState.status, fetchProfiles]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success("Role updated");
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
    } catch (err: any) {
      toast.error("Role update failed: " + (err?.message ?? "Unknown error"));
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

  const filtered = profiles.filter(p => {
    if (search && !p.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== "All" && p.role !== roleFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-6">

        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Admin Console
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin - Users</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">User Administration</h1>
              <p className="mt-1 text-sm text-muted-foreground">Manage accounts, roles, and access. All changes are audit logged.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchProfiles} disabled={loading} className="gap-2">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {["admin", "employer", "job_seeker"].map(role => (
            <div key={role} className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-extrabold tabular-nums text-primary">
                {loading ? "…" : profiles.filter(p => p.role === role).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{role}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pl-9 h-9 text-sm" placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {["All", "admin", "employer", "job_seeker"].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  roleFilter === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >{r}</button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="size-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Users ({filtered.length})</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center">
              <Users className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{profiles.length === 0 ? "No users in database." : "No users match filter."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(p => (
                <UserRow key={p.id} p={p} onRoleChange={handleRoleChange} />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
