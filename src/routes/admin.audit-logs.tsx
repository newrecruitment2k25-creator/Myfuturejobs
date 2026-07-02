import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { FileText, ArrowLeft, Search, Shield, Loader2, RefreshCw, Database, Activity, Users, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { listAuditLogs, type AuditLog } from "@/lib/ops-api";
import { toast } from "sonner";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export const Route = createFileRoute("/admin/audit-logs")({
  ssr: false,
  component: AdminAuditLogsPage,
  head: () => ({ meta: [{ title: "Audit Logs - MYFutureJobs Admin" }] }),
});

function severityBadge(s: string) {
  if (s === "Critical") return "bg-destructive/10 text-destructive border-destructive/20";
  if (s === "Warning") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-secondary text-muted-foreground border-border";
}

function fmtTs(d: string) {
  return new Date(d).toLocaleString("en-MY", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const SEVERITY_FILTERS = ["All", "Info", "Warning", "Critical"];

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#10b981"];

function AdminAuditLogsPage() {
  const guardState = useOpsGuard(["admin"]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listAuditLogs({});
      const fetched = d.logs ?? [];
      setAllLogs(fetched);
    } catch (err: any) {
      toast.error("Failed to load audit logs: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (guardState.status === "authorized") fetchLogs();
  }, [guardState.status, fetchLogs]);

  // Derive unique modules from loaded data
  const moduleOptions = useMemo(() => {
    const mods = Array.from(new Set(allLogs.map(l => l.module).filter(Boolean))).sort();
    return ["All", ...mods];
  }, [allLogs]);

  // Client-side filtering
  const filteredLogs = useMemo(() => {
    return allLogs.filter(l => {
      if (severityFilter !== "All" && l.severity?.toLowerCase() !== severityFilter.toLowerCase()) return false;
      if (moduleFilter !== "All" && l.module?.toLowerCase() !== moduleFilter.toLowerCase()) return false;
      if (search && !l.actor_email?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allLogs, severityFilter, moduleFilter, search]);

  // ── Chart data derived from loaded logs ─────────────────────────────────
  const moduleChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    allLogs.forEach(l => { counts[l.module ?? "Unknown"] = (counts[l.module ?? "Unknown"] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([module, count]) => ({ module: module.replace(" Management", ""), count }));
  }, [allLogs]);

  const activityChartData = useMemo(() => {
    const buckets: Record<string, number> = {};
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      buckets[d.toLocaleDateString("en-MY", { month: "short", day: "numeric" })] = 0;
    }
    allLogs.forEach(l => {
      const key = new Date(l.created_at).toLocaleDateString("en-MY", { month: "short", day: "numeric" });
      if (key in buckets) buckets[key]++;
    });
    return Object.entries(buckets).map(([date, actions]) => ({ date, actions }));
  }, [allLogs]);

  const roleChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    allLogs.forEach(l => { const r = l.actor_role ?? "unknown"; counts[r] = (counts[r] ?? 0) + 1; });
    return Object.entries(counts).map(([role, value]) => ({ role, value }));
  }, [allLogs]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return allLogs.filter(l => new Date(l.created_at).toDateString() === today).length;
  }, [allLogs]);

  const mostActiveUser = useMemo(() => {
    const counts: Record<string, number> = {};
    allLogs.forEach(l => { if (l.actor_email) counts[l.actor_email] = (counts[l.actor_email] ?? 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0].split("@")[0] : "—";
  }, [allLogs]);

  const mostCommonAction = useMemo(() => {
    const counts: Record<string, number> = {};
    allLogs.forEach(l => { if (l.action) counts[l.action] = (counts[l.action] ?? 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : "—";
  }, [allLogs]);

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
                Admin · Audit
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>Audit Logs</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>All system actions recorded from admin operations.</p>
            </div>
            <button onClick={fetchLogs} disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Summary cards ───────────────────────────────────────────── */}
        {allLogs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Logs", value: allLogs.length, icon: FileText, color: "text-indigo-500" },
              { label: "Today", value: todayCount, icon: Zap, color: "text-emerald-500" },
              { label: "Most Active", value: mostActiveUser, icon: Users, color: "text-amber-500" },
              { label: "Top Action", value: mostCommonAction.slice(0, 18), icon: Activity, color: "text-violet-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`size-4 ${color}`} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-lg font-bold text-foreground truncate">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Charts ──────────────────────────────────────────────────── */}
        {allLogs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Bar: Actions by module */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground mb-4">Actions by Module</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={moduleChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="module" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {moduleChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line: Activity over last 7 days */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground mb-4">Activity Last 7 Days</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={activityChartData} margin={{ top: 0, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="actions" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie: Actions by role */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground mb-4">Actions by Role</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={roleChartData} dataKey="value" nameKey="role" cx="50%" cy="50%" outerRadius={65} label={({ role, percent }) => `${role} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {roleChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pl-9 h-9 text-sm" placeholder="Filter by actor email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_FILTERS.map(s => (
              <button key={s} onClick={() => setSeverityFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${severityFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >{s}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {moduleOptions.map(m => (
              <button key={m} onClick={() => setModuleFilter(m)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors capitalize ${moduleFilter === m ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >{m}</button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="size-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Logs ({filteredLogs.length}{filteredLogs.length < allLogs.length ? ` of ${allLogs.length}` : ""})</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-14 text-center">
              <Database className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">{allLogs.length === 0 ? "No audit logs yet" : "No logs match the current filters"}</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {allLogs.length === 0 ? "Logs are created when admin actions are performed." : "Try clearing the filters above."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map(l => (
                <div key={l.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${severityBadge(l.severity)}`}>
                    {l.severity}
                  </span>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-xs font-semibold text-foreground">{l.action}</p>
                    <p className="text-xs text-muted-foreground">{l.module} · {l.actor_email} ({l.actor_role})</p>
                    {(l.entity_type || l.entity_id) && (
                      <p className="text-xs text-muted-foreground">{l.entity_type}: {l.entity_id}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{fmtTs(l.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
