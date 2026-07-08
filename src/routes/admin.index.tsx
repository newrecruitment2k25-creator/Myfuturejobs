import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Users, Shield, FileText, Settings, Database, Activity,
  Briefcase, MapPin, BarChart3, Loader2, RefreshCw,
  ChevronRight, CheckCircle, TrendingUp, TrendingDown, Minus,
  Brain, Calendar, BookOpen, Star, LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { getAdminStats, getAdminDailyTrend, type AdminStats, type DailyTrendRow } from "@/lib/ops-api";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader, AdminSectionCard, AdminStatTile } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminConsolePage,
  head: () => ({ meta: [{ title: "Admin Console - MYFutureJobs" }] }),
});

const NAV_LINKS = [
  { href: "/admin/users",             icon: Users,      label: "User Accounts",        desc: "View all users, manage roles and account status" },
  { href: "/admin/candidates",        icon: BarChart3,  label: "Candidate 360°",       desc: "360 candidate profiles, scores, applications, screenings" },
  { href: "/admin/employers",         icon: Briefcase,  label: "Employer Directory",   desc: "Employers, job postings, candidate activity" },
  { href: "/admin/placements",        icon: MapPin,     label: "Placements & Outcomes", desc: "Placement records, salary, retention metrics" },
  { href: "/admin/audit-logs",        icon: FileText,   label: "Audit Logs",           desc: "Full system action log with filters" },
  { href: "/admin/system-monitoring", icon: Activity,   label: "System Monitoring",    desc: "Live table counts and module health" },
  { href: "/admin/rbac",              icon: Shield,     label: "Roles & Permissions",  desc: "Role-based access control and permissions" },
  { href: "/admin/configuration",     icon: Settings,   label: "Configuration",        desc: "Matching weights, thresholds, feature flags" },
  { href: "/admin/taxonomy",          icon: Database,   label: "Taxonomy",             desc: "MASCO codes, skills, occupation categories" },
];

type ReportView = "daily" | "monthly" | "bimonthly";

interface BehaviourStats {
  highlyActive: number; active: number; moderate: number; low: number;
  total: number; withScreenings: number; avgApps: number;
}

// ── Sparkline chart ───────────────────────────────────────────────────────────
function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 1);
  const w = 4; const gap = 2;
  const total = data.length * (w + gap) - gap;
  return (
    <svg width={total} height={height} style={{ display: "block", overflow: "visible" }}>
      {data.map((v, i) => {
        const barH = Math.max(2, Math.round((v / max) * (height - 4)));
        return (
          <rect key={i} x={i * (w + gap)} y={height - barH} width={w} height={barH}
            rx={1} fill={color} opacity={v === 0 ? 0.2 : 0.85} />
        );
      })}
    </svg>
  );
}

// ── Trend badge ───────────────────────────────────────────────────────────────
function TrendBadge({ pct }: { pct: number }) {
  if (pct > 5) return <span style={{ fontSize: 10, fontWeight: 700, color: "#15803d", background: "#dcfce7", borderRadius: 4, padding: "1px 5px", display: "inline-flex", alignItems: "center", gap: 2 }}><TrendingUp style={{ width: 10, height: 10 }} />+{pct}%</span>;
  if (pct < -5) return <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fee2e2", borderRadius: 4, padding: "1px 5px", display: "inline-flex", alignItems: "center", gap: 2 }}><TrendingDown style={{ width: 10, height: 10 }} />{pct}%</span>;
  return <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", borderRadius: 4, padding: "1px 5px", display: "inline-flex", alignItems: "center", gap: 2 }}><Minus style={{ width: 10, height: 10 }} />flat</span>;
}

// ── Grouped bar chart (monthly) ───────────────────────────────────────────────
function MonthlyBarChart({ months, field, color }: { months: { label: string; total: number }[]; field: string; color: string }) {
  const max = Math.max(...months.map(m => m.total), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
      {months.map((m, i) => {
        const h = Math.max(3, Math.round((m.total / max) * 72));
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600 }}>{m.total > 0 ? m.total : ""}</span>
            <div style={{ width: "100%", height: h, background: color, borderRadius: "3px 3px 0 0", opacity: 0.85 }} />
            <span style={{ fontSize: 9, color: "var(--muted)" }}>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── AI narrative builder ──────────────────────────────────────────────────────
function buildAISummary(stats: AdminStats | null, trend: DailyTrendRow[], bhv: BehaviourStats | null): string[] {
  if (!stats && trend.length === 0) return ["Gathering system data…"];
  const lines: string[] = [];

  // Platform scale
  const totalUsers = (stats?.job_seekers ?? 0) + (stats?.poc_candidates ?? 0);
  lines.push(`Platform has ${totalUsers.toLocaleString()} active candidates (${stats?.job_seekers ?? 0} registered + ${stats?.poc_candidates ?? 0} PERKESO) and ${stats?.employers ?? 0} employers with ${stats?.jobs ?? 0} job postings.`);

  // CV analysis adoption
  if (stats && stats.analyses > 0 && stats.job_seekers > 0) {
    const adoptionPct = Math.round((stats.analyses / stats.job_seekers) * 100);
    if (adoptionPct > 80) lines.push(`CV analysis adoption is strong at ~${adoptionPct}% of registered jobseekers.`);
    else if (adoptionPct > 40) lines.push(`CV analysis adoption is moderate (~${adoptionPct}%) — consider prompting more users to analyse their CVs.`);
    else lines.push(`CV analysis adoption is low (~${adoptionPct}%) — users are registering but not analysing their CVs.`);
  }

  // Application funnel
  if (stats && stats.applications > 0) {
    const appPerCandidate = totalUsers > 0 ? (stats.applications / totalUsers).toFixed(1) : "0";
    lines.push(`Application funnel: ${stats.applications.toLocaleString()} total applications — ${appPerCandidate} per candidate on average.`);
    if (stats.interviews > 0) {
      const convRate = Math.round((stats.interviews / stats.applications) * 100);
      if (convRate > 20) lines.push(`Screening conversion rate is healthy at ${convRate}% (applications → screenings).`);
      else lines.push(`Screening conversion rate is ${convRate}% — employers may need better candidate matching.`);
    }
  }

  // Trend last 7 days vs prior 7
  if (trend.length >= 14) {
    const last7  = trend.slice(-7).reduce((s, d) => s + d.analyses + d.applications, 0);
    const prior7 = trend.slice(-14, -7).reduce((s, d) => s + d.analyses + d.applications, 0);
    if (prior7 > 0) {
      const delta = Math.round(((last7 - prior7) / prior7) * 100);
      if (delta > 10) lines.push(`System activity is up ${delta}% this week vs last week — growth momentum is positive.`);
      else if (delta < -10) lines.push(`Activity dropped ${Math.abs(delta)}% this week vs last week — may warrant investigation.`);
      else lines.push(`Activity this week is stable (${delta > 0 ? "+" : ""}${delta}% vs last week).`);
    }
    const todayRow = trend[trend.length - 1];
    if (todayRow) {
      lines.push(`Today so far: ${todayRow.analyses} CV analyses, ${todayRow.applications} applications, ${todayRow.interviews} screenings.`);
    }
  }

  // Engagement
  if (bhv && bhv.total > 0) {
    const activePct = Math.round(((bhv.highlyActive + bhv.active) / bhv.total) * 100);
    const lowPct    = Math.round((bhv.low / bhv.total) * 100);
    if (activePct > 50) lines.push(`User engagement is strong — ${activePct}% of candidates are active or highly active.`);
    else lines.push(`${lowPct}% of candidates show low activity — re-engagement campaign could be beneficial.`);
  }

  return lines;
}

// ── Aggregate trend by month ─────────────────────────────────────────────────
function groupByMonth(trend: DailyTrendRow[]) {
  const map: Record<string, { label: string; analyses: number; applications: number; interviews: number; placements: number }> = {};
  trend.forEach(d => {
    const key = d.date.slice(0, 7);
    const label = new Date(d.date + "T00:00:00").toLocaleDateString("en-MY", { month: "short", year: "2-digit" });
    if (!map[key]) map[key] = { label, analyses: 0, applications: 0, interviews: 0, placements: 0 };
    map[key].analyses     += d.analyses;
    map[key].applications += d.applications;
    map[key].interviews   += d.interviews;
    map[key].placements   += d.placements;
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

// ── Compute today & yesterday totals ─────────────────────────────────────────
function todayYesterday(trend: DailyTrendRow[]) {
  const today = trend[trend.length - 1] ?? { analyses: 0, applications: 0, interviews: 0, placements: 0 };
  const yest  = trend[trend.length - 2] ?? { analyses: 0, applications: 0, interviews: 0, placements: 0 };
  return { today, yest };
}

// ── Main component ────────────────────────────────────────────────────────────
function AdminConsolePage() {
  const guardState = useOpsGuard(["admin"]);
  const [stats, setStats]         = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [trend, setTrend]         = useState<DailyTrendRow[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [bhvStats, setBhvStats]   = useState<BehaviourStats | null>(null);
  const [bhvLoading, setBhvLoading] = useState(true);
  const [reportView, setReportView] = useState<ReportView>("daily");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchAll = async () => {
    setStatsLoading(true);
    setTrendLoading(true);
    setBhvLoading(true);

    // Stats
    getAdminStats()
      .then(d => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));

    // 60-day trend
    getAdminDailyTrend(60)
      .then(d => setTrend(d.trend ?? []))
      .catch(() => setTrend([]))
      .finally(() => setTrendLoading(false));

    // Behaviour
    try {
      const { data } = await (supabase as any)
        .from("poc_behaviour")
        .select("submitted_application_count,interview_count")
        .limit(2000);
      if (data?.length > 0) {
        const rows = data as Array<{ submitted_application_count: number; interview_count: number }>;
        const ha   = rows.filter(b => b.submitted_application_count > 80 || b.interview_count > 3).length;
        const act  = rows.filter(b => b.submitted_application_count > 30 && b.submitted_application_count <= 80 && b.interview_count <= 3).length;
        const mod  = rows.filter(b => b.submitted_application_count > 10 && b.submitted_application_count <= 30).length;
        const lo   = rows.filter(b => (b.submitted_application_count ?? 0) <= 10).length;
        const wi   = rows.filter(b => b.interview_count > 0).length;
        const avg  = Math.round(rows.reduce((s, b) => s + (b.submitted_application_count ?? 0), 0) / rows.length);
        setBhvStats({ highlyActive: ha, active: act, moderate: mod, low: lo, total: rows.length, withScreenings: wi, avgApps: avg });
      }
    } catch {} finally { setBhvLoading(false); }

    setLastRefreshed(new Date());
  };

  useEffect(() => {
    if (guardState.status === "authorized") fetchAll();
  }, [guardState.status]);

  const months     = useMemo(() => groupByMonth(trend), [trend]);
  const { today, yest } = useMemo(() => todayYesterday(trend), [trend]);
  const aiLines    = useMemo(() => buildAISummary(stats, trend, bhvStats), [stats, trend, bhvStats]);

  const trendPct = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100);

  // Last 30 days for sparklines
  const spark30 = useMemo(() => trend.slice(-30), [trend]);

  if (guardState.status === "loading") {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }
  if (guardState.status === "unauthenticated") return null;
  if (guardState.status === "unauthorized") {
    const dashHref = guardState.role === "employer" ? "/employer/dashboard" : "/dashboard";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
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
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        <AdminPageHeader
          badge="Governance Console"
          title="Admin Dashboard"
          subtitle={`Logged in as ${guardState.email ?? "admin"}${lastRefreshed ? ` · Last refreshed ${lastRefreshed.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
          onRefresh={fetchAll}
          refreshLoading={statsLoading || trendLoading}
        />

        {/* ── AI Summary ── */}
        <AdminSectionCard icon={<Brain className="size-5 text-primary" />} title="AI System Summary" subtitle="Machine-generated intelligence from platform activity" accent>
          {aiLines.length === 0 || (aiLines.length === 1 && aiLines[0].includes("Gathering")) ? (
            <p className="text-sm text-muted-foreground">Gathering system data…</p>
          ) : (
            <ol className="space-y-3">
              {aiLines.map((line, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                  <p className="text-sm text-foreground leading-relaxed">{line}</p>
                </li>
              ))}
            </ol>
          )}
        </AdminSectionCard>

        {/* ── Report view toggle ── */}
        <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm">
          {(["daily", "monthly", "bimonthly"] as ReportView[]).map(v => (
            <button
              key={v}
              onClick={() => setReportView(v)}
              className={`flex-1 min-w-max rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                reportView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "daily" ? "Daily Snapshot" : v === "monthly" ? "Monthly Report" : "Bi-Monthly (Leadership)"}
            </button>
          ))}
        </div>

        {/* ── DAILY VIEW ── */}
        {reportView === "daily" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "CV Analyses Today", val: today.analyses, prev: yest.analyses, color: "primary" as const },
                { label: "Applications Today", val: today.applications, prev: yest.applications, color: "success" as const },
                { label: "Screenings Today", val: today.interviews, prev: yest.interviews, color: "warning" as const },
                { label: "Placements Today", val: today.placements, prev: yest.placements, color: "destructive" as const },
              ].map(({ label, val, prev, color }) => (
                <AdminSectionCard key={label} title={label} subtitle={`vs ${prev} yesterday`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-extrabold text-foreground">{val}</span>
                    <TrendBadge pct={trendPct(val, prev)} />
                  </div>
                </AdminSectionCard>
              ))}
            </div>

            {spark30.length > 0 && (
              <AdminSectionCard icon={<Activity className="size-5 text-primary" />} title="Last 30 Days Activity" subtitle="Trend lines for core platform metrics">
                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    { label: "CV Analyses", data: spark30.map(d => d.analyses), color: "#6366f1" },
                    { label: "Applications", data: spark30.map(d => d.applications), color: "#0369a1" },
                    { label: "Screenings", data: spark30.map(d => d.interviews), color: "#d97706" },
                    { label: "Placements", data: spark30.map(d => d.placements), color: "#15803d" },
                  ].map(({ label, data, color }) => {
                    const total = data.reduce((a, b) => a + b, 0);
                    const avg = data.length > 0 ? (total / data.length).toFixed(1) : "0";
                    return (
                      <div key={label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{label}</span>
                          <span className="text-[10px] text-muted-foreground">{total} total · {avg}/day avg</span>
                        </div>
                        <div className="overflow-x-auto">
                          <Sparkline data={data} color={color} height={44} />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>30 days ago</span>
                          <span>today</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {trendLoading && <p className="text-xs text-muted-foreground mt-4">Loading trend data…</p>}
              </AdminSectionCard>
            )}

            <AdminSectionCard icon={<Star className="size-5 text-primary" />} title="Platform Totals" subtitle="Aggregate counts across all modules">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: "Total Candidates", val: stats?.total_candidates ?? 0 },
                  { label: "Registered Seekers", val: stats?.job_seekers ?? 0 },
                  { label: "PERKESO Candidates", val: stats?.poc_candidates ?? 0 },
                  { label: "Employers", val: stats?.employers ?? 0 },
                  { label: "Jobs Posted", val: stats?.jobs ?? 0 },
                  { label: "Applications", val: stats?.applications ?? 0 },
                  { label: "Screenings", val: stats?.interviews ?? 0 },
                  { label: "CV Analyses", val: stats?.analyses ?? 0 },
                  { label: "Placements", val: stats?.placements ?? 0 },
                ].map(({ label, val }) => (
                  <AdminStatTile key={label} label={label} value={statsLoading ? "…" : val.toLocaleString()} />
                ))}
              </div>
            </AdminSectionCard>
          </>
        )}

        {/* ── MONTHLY VIEW ── */}
        {reportView === "monthly" && (
          <div className="space-y-5">
            <AdminSectionCard icon={<Calendar className="size-5 text-primary" />} title="Monthly Activity" subtitle="Last 60 days aggregated by month">
              {months.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    { label: "Resume Scores", key: "analyses" as const, color: "#31C47A" },
                    { label: "Applications", key: "applications" as const, color: "#0369a1" },
                    { label: "Screenings", key: "interviews" as const, color: "#d97706" },
                    { label: "Placements", key: "placements" as const, color: "#15803d" },
                  ].map(({ label, key, color }) => (
                    <div key={key}>
                      <p className="text-xs font-semibold text-foreground mb-3">{label}</p>
                      <MonthlyBarChart months={months.map(m => ({ label: m.label, total: (m as any)[key] as number }))} field={key} color={color} />
                    </div>
                  ))}
                </div>
              )}
            </AdminSectionCard>

            {months.length >= 2 && (
              <AdminSectionCard icon={<BookOpen className="size-5 text-primary" />} title="Month-over-Month Summary" subtitle="Growth trends by calendar month">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analyses</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Applications</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Screenings</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placements</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conv. Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((m, i) => {
                        const prev = months[i - 1];
                        const convRate = m.applications > 0 ? `${Math.round((m.interviews / m.applications) * 100)}%` : "—";
                        return (
                          <tr key={m.label} className="border-b border-border last:border-0">
                            <td className="p-3 font-semibold text-foreground">{m.label}</td>
                            <td className="p-3 text-right text-xs">{m.analyses} {prev && <TrendBadge pct={trendPct(m.analyses, prev.analyses)} />}</td>
                            <td className="p-3 text-right text-xs">{m.applications} {prev && <TrendBadge pct={trendPct(m.applications, prev.applications)} />}</td>
                            <td className="p-3 text-right text-xs">{m.interviews} {prev && <TrendBadge pct={trendPct(m.interviews, prev.interviews)} />}</td>
                            <td className="p-3 text-right text-xs">{m.placements}</td>
                            <td className="p-3 text-right text-xs font-bold text-primary">{convRate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </AdminSectionCard>
            )}
          </div>
        )}

        {/* ── BI-MONTHLY / LEADERSHIP VIEW ── */}
        {reportView === "bimonthly" && (
          <div className="space-y-5">
            <div className="rounded-2xl relative overflow-hidden bg-gradient-to-br from-[#512ACC] via-[#6B4FD6] to-[#512ACC] p-6 shadow-lg">
              <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/5" />
              <div className="relative">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Senior Leadership Report · Generated {new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <h2 className="text-xl font-extrabold text-white mt-2 mb-4">Bi-Monthly Performance Overview</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Total Candidates", val: (stats?.total_candidates ?? 0).toLocaleString(), icon: <Users className="size-5" /> },
                    { label: "Employers Served", val: (stats?.employers ?? 0).toLocaleString(), icon: <Briefcase className="size-5" /> },
                    { label: "Job Placements", val: (stats?.placements ?? 0).toLocaleString(), icon: <CheckCircle className="size-5" /> },
                    { label: "Resume Scores", val: (stats?.analyses ?? 0).toLocaleString(), icon: <FileText className="size-5" /> },
                  ].map(({ label, val, icon }) => (
                    <div key={label} className="rounded-xl bg-white/10 border border-white/10 p-4 text-center">
                      <div className="text-white/70 flex justify-center mb-2">{icon}</div>
                      <div className="text-2xl font-extrabold text-white">{statsLoading ? "…" : val}</div>
                      <div className="text-[10px] text-white/50 mt-1 font-medium">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <AdminSectionCard icon={<Brain className="size-5 text-primary" />} title="Executive Summary" subtitle="AI-generated leadership narrative">
              <div className="space-y-3">
                {aiLines.map((line, i) => (
                  <div key={i} className="rounded-xl border-l-4 border-primary bg-secondary/30 p-4">
                    <p className="text-sm text-foreground leading-relaxed">{line}</p>
                  </div>
                ))}
              </div>
            </AdminSectionCard>

            <AdminSectionCard icon={<TrendingUp className="size-5 text-primary" />} title="Candidate Journey Funnel" subtitle="Conversion from registration to placement">
              {(() => {
                const total = stats?.total_candidates ?? 0;
                const analysed = Math.min(stats?.analyses ?? 0, total);
                const applied = Math.min(stats?.applications ?? 0, analysed);
                const interviewed = Math.min(stats?.interviews ?? 0, applied);
                const placed = Math.min(stats?.placements ?? 0, interviewed);
                const steps = [
                  { label: "Registered", val: total, color: "bg-indigo-500" },
                  { label: "Resume Scored", val: analysed, color: "bg-emerald-500" },
                  { label: "Applied", val: applied, color: "bg-amber-500" },
                  { label: "Screened", val: interviewed, color: "bg-green-600" },
                  { label: "Placed", val: placed, color: "bg-red-500" },
                ];
                return (
                  <div className="space-y-3">
                    {steps.map((s, i) => {
                      const pct = total > 0 ? Math.round((s.val / total) * 100) : 0;
                      const conv = i > 0 && steps[i - 1].val > 0 ? `${Math.round((s.val / steps[i - 1].val) * 100)}% of prev` : "";
                      return (
                        <div key={s.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold text-foreground">{s.label}</span>
                            <span className="text-muted-foreground">{s.val.toLocaleString()} ({pct}%) {conv && `· ${conv}`}</span>
                          </div>
                          <div className="h-3 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full ${s.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </AdminSectionCard>

            {months.length > 0 && (
              <AdminSectionCard icon={<BarChart3 className="size-5 text-primary" />} title="Applications vs Screenings — Monthly" subtitle="Comparative monthly bar chart">
                <div className="flex items-end gap-2 h-28">
                  {months.map((m, i) => {
                    const maxVal = Math.max(...months.map(x => x.applications), 1);
                    const appH = Math.max(3, Math.round((m.applications / maxVal) * 100));
                    const intH = Math.max(3, Math.round((m.interviews / maxVal) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full flex gap-0.5 items-end justify-center h-24">
                          <div className="flex-1 rounded-t bg-sky-600 opacity-80" style={{ height: appH }} title={`Apps: ${m.applications}`} />
                          <div className="flex-1 rounded-t bg-amber-500 opacity-80" style={{ height: intH }} title={`Screenings: ${m.interviews}`} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{m.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-sky-600" /> Applications</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-amber-500" /> Screenings</span>
                </div>
              </AdminSectionCard>
            )}
          </div>
        )}

        {/* ── Candidate Engagement ── */}
        <AdminSectionCard icon={<Activity className="size-5 text-primary" />} title="Candidate Engagement Breakdown" subtitle="Activity segments based on applications and screenings">
          {bhvLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : bhvStats ? (
            <div className="space-y-5">
              {[
                { label: "Highly Active", icon: <span>🔥</span>, count: bhvStats.highlyActive, color: "bg-emerald-500", desc: ">80 applications or >3 screenings" },
                { label: "Active", icon: <span>✅</span>, count: bhvStats.active, color: "bg-indigo-500", desc: "31–80 applications" },
                { label: "Moderate", icon: <span>⚡</span>, count: bhvStats.moderate, color: "bg-amber-500", desc: "11–30 applications" },
                { label: "Low Activity", icon: <span>💤</span>, count: bhvStats.low, color: "bg-slate-400", desc: "≤10 applications" },
              ].map(({ label, icon, count, color, desc }) => {
                const pct = bhvStats.total > 0 ? Math.round((count / bhvStats.total) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        {icon} {label}
                        <span className="text-[10px] font-normal text-muted-foreground">{desc}</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">{count.toLocaleString()} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all duration-600`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                <AdminStatTile label="Avg Apps / Candidate" value={bhvStats.avgApps} />
                <AdminStatTile label="Attended Screenings" value={bhvStats.withScreenings.toLocaleString()} />
                <AdminStatTile label="Behaviour Records" value={bhvStats.total.toLocaleString()} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No behaviour data available.</p>
          )}
        </AdminSectionCard>

        {/* ── Admin Modules ── */}
        <AdminSectionCard icon={<LayoutDashboard className="size-5 text-primary" />} title="Platform Modules" subtitle="Quick navigation to all governance areas">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NAV_LINKS.map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={href}
                to={href}
                className="group flex items-start gap-3 rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary mt-1" />
              </Link>
            ))}
          </div>
        </AdminSectionCard>

        {/* ── Governance ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Role-Based Access", val: "Active", ok: true },
            { label: "Audit Logging", val: "Enabled", ok: true },
            { label: "PDPA Compliance", val: "Active", ok: true },
          ].map(({ label, val, ok }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm">
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${ok ? "bg-emerald-100" : "bg-red-100"}`}>
                <CheckCircle className={`size-4 ${ok ? "text-emerald-600" : "text-red-600"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className={`text-sm font-bold ${ok ? "text-emerald-600" : "text-red-600"}`}>{val}</p>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
