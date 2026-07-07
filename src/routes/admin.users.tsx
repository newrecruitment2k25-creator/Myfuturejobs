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
  head: () => ({ meta: [{ title: "User Administration - PerksoPrax AI Admin" }] }),
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

        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #0A2647 0%, #144272 60%, #205295 100%)', boxShadow: '0 4px 20px rgba(10,38,71,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Admin · Users
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>User Administration</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Manage accounts, roles, and access. All changes are audit logged.</p>
            </div>
            <button onClick={fetchProfiles} disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { role: "admin", color: '#dc2626' },
            { role: "employer", color: '#f36c21' },
            { role: "job_seeker", color: '#205295' },
          ].map(({ role, color }) => (
            <div key={role} style={{ borderRadius: 14, padding: '16px 12px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 2px 8px rgba(10,38,71,0.04)' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1 }}>
                {loading ? "…" : profiles.filter(p => p.role === role).length}
              </p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>{role}</p>
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

        <div style={{ borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 2px 12px rgba(10,38,71,0.04)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Users style={{ width: 18, height: 18, color: '#205295' }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Users ({filtered.length})</h2>
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
