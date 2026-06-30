import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Users, Shield, FileText, Settings, Database, Activity,
  Briefcase, MapPin, BarChart3, Loader2, RefreshCw,
  ChevronRight, CheckCircle, TrendingUp, TrendingDown, Minus,
  Brain, Calendar, BookOpen, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { getAdminStats, getAdminDailyTrend, type AdminStats, type DailyTrendRow } from "@/lib/ops-api";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminConsolePage,
  head: () => ({ meta: [{ title: "Admin Console - MYFutureJobs" }] }),
});

const NAV_LINKS = [
  { href: "/admin/users",             icon: Users,      label: "User Management",      desc: "View all users, manage roles and account status" },
  { href: "/admin/candidates",        icon: BarChart3,  label: "Candidate Management", desc: "360 candidate profiles, scores, applications, interviews" },
  { href: "/admin/employers",         icon: Briefcase,  label: "Employer Management",  desc: "Employers, vacancies, candidate activity" },
  { href: "/admin/placements",        icon: MapPin,     label: "Placement Tracking",   desc: "Placement records, salary, retention metrics" },
  { href: "/admin/audit-logs",        icon: FileText,   label: "Audit Logs",           desc: "Full system action log with filters" },
  { href: "/admin/system-monitoring", icon: Activity,   label: "System Monitoring",    desc: "Live table counts and module health" },
  { href: "/admin/rbac",              icon: Shield,     label: "RBAC",                 desc: "Role-based access control and permissions" },
  { href: "/admin/configuration",     icon: Settings,   label: "Configuration",        desc: "Matching weights, thresholds, feature flags" },
  { href: "/admin/taxonomy",          icon: Database,   label: "Taxonomy",             desc: "MASCO codes, skills, occupation categories" },
];

type ReportView = "daily" | "monthly" | "bimonthly";

interface BehaviourStats {
  highlyActive: number; active: number; moderate: number; low: number;
  total: number; withInterviews: number; avgApps: number;
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
      if (convRate > 20) lines.push(`Interview conversion rate is healthy at ${convRate}% (applications → interviews).`);
      else lines.push(`Interview conversion rate is ${convRate}% — employers may need better candidate matching.`);
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
      lines.push(`Today so far: ${todayRow.analyses} CV analyses, ${todayRow.applications} applications, ${todayRow.interviews} interviews.`);
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
        setBhvStats({ highlyActive: ha, active: act, moderate: mod, low: lo, total: rows.length, withInterviews: wi, avgApps: avg });
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
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--base)" }}><Loader2 className="size-8 animate-spin" style={{ color: "var(--accent)" }} /></div>;
  }
  if (guardState.status === "unauthenticated") return null;
  if (guardState.status === "unauthorized") {
    const dashHref = guardState.role === "employer" ? "/employer/dashboard" : "/dashboard";
    return (
      <div style={{ minHeight: "100vh", background: "var(--base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 16px" }}>
          <Shield style={{ width: 48, height: 48, color: "var(--muted)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>Unauthorized Access</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0 20px" }}>You do not have permission to access this area.</p>
          <Button asChild variant="outline"><Link to={dashHref}>Go to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const S = {
    card: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "16px 18px" } as React.CSSProperties,
    heading: { fontSize: 11, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Page header ── */}
        <div style={{ ...S.card, borderRadius: "var(--radius-md)", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Governance Console</p>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", margin: "2px 0 0", letterSpacing: "-0.03em" }}>Admin Dashboard</h1>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                Logged in as <strong>{guardState.email}</strong>
                {lastRefreshed && <> · Last refreshed {lastRefreshed.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</>}
              </p>
            </div>
            <button onClick={fetchAll} disabled={statsLoading || trendLoading}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: "var(--radius-xs)", border: "1px solid var(--line)", background: "var(--base)", color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <RefreshCw style={{ width: 14, height: 14 }} className={(statsLoading || trendLoading) ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* ── AI Summary ── */}
        <div style={{ ...S.card, background: "linear-gradient(135deg, #211F60 0%, #3730a3 100%)", border: "none" }}>
          <p style={{ ...S.heading, color: "rgba(255,255,255,0.7)" }}><Brain style={{ width: 14, height: 14 }} /> AI System Summary</p>
          {aiLines.length === 0 || (aiLines.length === 1 && aiLines[0].includes("Gathering")) ? (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Gathering system data…</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {aiLines.map((line, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", marginTop: 1 }}>{i + 1}</span>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.6, margin: 0 }}>{line}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Report view toggle ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginRight: 4 }}>View:</span>
          {(["daily", "monthly", "bimonthly"] as ReportView[]).map(v => (
            <button key={v} onClick={() => setReportView(v)}
              style={{ padding: "5px 14px", borderRadius: "var(--radius-xs)", border: "1px solid var(--line)", background: reportView === v ? "var(--brand)" : "var(--surface)", color: reportView === v ? "#fff" : "var(--muted)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {v === "daily" ? "Daily Snapshot" : v === "monthly" ? "Monthly Report" : "Bi-Monthly (Leadership)"}
            </button>
          ))}
        </div>

        {/* ── DAILY VIEW ── */}
        {reportView === "daily" && (
          <>
            {/* Today's numbers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {[
                { label: "CV Analyses Today",    val: today.analyses,     prev: yest.analyses,     color: "#6366f1" },
                { label: "Applications Today",   val: today.applications, prev: yest.applications, color: "#0369a1" },
                { label: "Interviews Today",     val: today.interviews,   prev: yest.interviews,   color: "#d97706" },
                { label: "Placements Today",     val: today.placements,   prev: yest.placements,   color: "#15803d" },
              ].map(({ label, val, prev, color }) => (
                <div key={label} style={{ ...S.card, display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>{label}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{val}</span>
                    <TrendBadge pct={trendPct(val, prev)} />
                  </div>
                  <p style={{ fontSize: 10, color: "var(--muted)" }}>vs {prev} yesterday</p>
                </div>
              ))}
            </div>

            {/* 30-day sparklines */}
            {spark30.length > 0 && (
              <div style={S.card}>
                <p style={S.heading}><Activity style={{ width: 14, height: 14, color: "var(--accent)" }} /> Last 30 Days Activity</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {[
                    { label: "CV Analyses",   data: spark30.map(d => d.analyses),     color: "#6366f1" },
                    { label: "Applications",  data: spark30.map(d => d.applications), color: "#0369a1" },
                    { label: "Interviews",    data: spark30.map(d => d.interviews),   color: "#d97706" },
                    { label: "Placements",    data: spark30.map(d => d.placements),   color: "#15803d" },
                  ].map(({ label, data, color }) => {
                    const total = data.reduce((a, b) => a + b, 0);
                    const avg   = data.length > 0 ? (total / data.length).toFixed(1) : "0";
                    return (
                      <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>{total} total · {avg}/day avg</span>
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <Sparkline data={data} color={color} height={44} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 9, color: "var(--muted)" }}>30 days ago</span>
                          <span style={{ fontSize: 9, color: "var(--muted)" }}>today</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {trendLoading && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Loading trend data…</p>}
              </div>
            )}

            {/* Platform KPIs */}
            <div style={S.card}>
              <p style={S.heading}><Star style={{ width: 14, height: 14, color: "var(--accent)" }} /> Platform Totals</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                {[
                  { label: "Total Candidates",    val: stats?.total_candidates ?? 0 },
                  { label: "Registered Seekers",  val: stats?.job_seekers ?? 0 },
                  { label: "PERKESO Candidates",  val: stats?.poc_candidates ?? 0 },
                  { label: "Employers",           val: stats?.employers ?? 0 },
                  { label: "Jobs Posted",         val: stats?.jobs ?? 0 },
                  { label: "Applications",        val: stats?.applications ?? 0 },
                  { label: "Interviews",          val: stats?.interviews ?? 0 },
                  { label: "CV Analyses",         val: stats?.analyses ?? 0 },
                  { label: "Placements",          val: stats?.placements ?? 0 },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: "var(--base)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", padding: "10px 12px", textAlign: "center" }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: "var(--brand)" }}>{statsLoading ? "…" : val.toLocaleString()}</p>
                    <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── MONTHLY VIEW ── */}
        {reportView === "monthly" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={S.card}>
              <p style={S.heading}><Calendar style={{ width: 14, height: 14, color: "var(--accent)" }} /> Monthly Activity — Last 60 Days</p>
              {months.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--muted)" }}>No data yet.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  {[
                    { label: "CV Analyses",  key: "analyses",     color: "#6366f1" },
                    { label: "Applications", key: "applications", color: "#0369a1" },
                    { label: "Interviews",   key: "interviews",   color: "#d97706" },
                    { label: "Placements",   key: "placements",   color: "#15803d" },
                  ].map(({ label, key, color }) => (
                    <div key={key}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>{label}</p>
                      <MonthlyBarChart months={months.map(m => ({ label: m.label, total: (m as any)[key] as number }))} field={key} color={color} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Month-over-month table */}
            {months.length >= 2 && (
              <div style={S.card}>
                <p style={S.heading}><BookOpen style={{ width: 14, height: 14, color: "var(--accent)" }} /> Month-over-Month Summary</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--line)" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>Month</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>Analyses</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>Applications</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>Interviews</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>Placements</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>Conv. Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((m, i) => {
                        const prev = months[i - 1];
                        const convRate = m.applications > 0 ? `${Math.round((m.interviews / m.applications) * 100)}%` : "—";
                        return (
                          <tr key={m.label} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: "7px 8px", fontWeight: 600, color: "var(--ink)" }}>{m.label}</td>
                            <td style={{ textAlign: "right", padding: "7px 8px" }}>
                              {m.analyses} {prev && <TrendBadge pct={trendPct(m.analyses, prev.analyses)} />}
                            </td>
                            <td style={{ textAlign: "right", padding: "7px 8px" }}>
                              {m.applications} {prev && <TrendBadge pct={trendPct(m.applications, prev.applications)} />}
                            </td>
                            <td style={{ textAlign: "right", padding: "7px 8px" }}>
                              {m.interviews} {prev && <TrendBadge pct={trendPct(m.interviews, prev.interviews)} />}
                            </td>
                            <td style={{ textAlign: "right", padding: "7px 8px" }}>{m.placements}</td>
                            <td style={{ textAlign: "right", padding: "7px 8px", fontWeight: 700, color: "var(--brand)" }}>{convRate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BI-MONTHLY / LEADERSHIP VIEW ── */}
        {reportView === "bimonthly" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Leadership summary header */}
            <div style={{ ...S.card, background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", border: "none" }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                MYFutureJobs · Senior Leadership Report · Generated {new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "6px 0 10px" }}>Bi-Monthly Performance Overview</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { label: "Total Candidates", val: (stats?.total_candidates ?? 0).toLocaleString(), icon: "👥" },
                  { label: "Employers Served", val: (stats?.employers ?? 0).toLocaleString(),         icon: "🏢" },
                  { label: "Job Placements",   val: (stats?.placements ?? 0).toLocaleString(),        icon: "✅" },
                  { label: "CV Analyses",      val: (stats?.analyses ?? 0).toLocaleString(),          icon: "📄" },
                ].map(({ label, val, icon }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 22 }}>{icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 4 }}>{statsLoading ? "…" : val}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Narrative for leadership */}
            <div style={S.card}>
              <p style={S.heading}><Brain style={{ width: 14, height: 14, color: "var(--accent)" }} /> Executive Summary</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {aiLines.map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "var(--base)", borderRadius: "var(--radius-xs)", borderLeft: "3px solid var(--accent)" }}>
                    <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>{line}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Funnel chart */}
            <div style={S.card}>
              <p style={S.heading}><TrendingUp style={{ width: 14, height: 14, color: "var(--accent)" }} /> Candidate Journey Funnel</p>
              {(() => {
                const total = stats?.total_candidates ?? 0;
                const analysed = Math.min(stats?.analyses ?? 0, total);
                const applied  = Math.min(stats?.applications ?? 0, analysed);
                const interviewed = Math.min(stats?.interviews ?? 0, applied);
                const placed   = Math.min(stats?.placements ?? 0, interviewed);
                const steps = [
                  { label: "Registered",  val: total,       color: "#6366f1" },
                  { label: "Analysed CV", val: analysed,    color: "#0369a1" },
                  { label: "Applied",     val: applied,     color: "#d97706" },
                  { label: "Interviewed", val: interviewed, color: "#15803d" },
                  { label: "Placed",      val: placed,      color: "#dc2626" },
                ];
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {steps.map((s, i) => {
                      const pct = total > 0 ? Math.round((s.val / total) * 100) : 0;
                      const conv = i > 0 && steps[i - 1].val > 0 ? `${Math.round((s.val / steps[i - 1].val) * 100)}% of prev` : "";
                      return (
                        <div key={s.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{s.label}</span>
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>{s.val.toLocaleString()} ({pct}%) {conv && `· ${conv}`}</span>
                          </div>
                          <div style={{ height: 12, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 999, background: s.color, width: `${pct}%`, transition: "width 0.5s" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Monthly bar chart for leadership */}
            {months.length > 0 && (
              <div style={S.card}>
                <p style={S.heading}><BarChart3 style={{ width: 14, height: 14, color: "var(--accent)" }} /> Applications vs Interviews — Monthly</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                  {months.map((m, i) => {
                    const maxVal = Math.max(...months.map(x => x.applications), 1);
                    const appH   = Math.max(3, Math.round((m.applications / maxVal) * 88));
                    const intH   = Math.max(3, Math.round((m.interviews / maxVal) * 88));
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", justifyContent: "center" }}>
                          <div style={{ flex: 1, height: appH, background: "#0369a1", borderRadius: "2px 2px 0 0", opacity: 0.8 }} title={`Apps: ${m.applications}`} />
                          <div style={{ flex: 1, height: intH, background: "#d97706", borderRadius: "2px 2px 0 0", opacity: 0.8 }} title={`Interviews: ${m.interviews}`} />
                        </div>
                        <span style={{ fontSize: 9, color: "var(--muted)" }}>{m.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#0369a1", display: "inline-block", borderRadius: 2 }} /> Applications</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#d97706", display: "inline-block", borderRadius: 2 }} /> Interviews</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Candidate Engagement (always visible) ── */}
        <div style={S.card}>
          <p style={S.heading}><Activity style={{ width: 14, height: 14, color: "var(--accent)" }} /> Candidate Engagement Breakdown</p>
          {bhvLoading ? (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Loading…</p>
          ) : bhvStats ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Highly Active",  emoji: "🔥", count: bhvStats.highlyActive, color: "#10B981", desc: ">80 applications or >3 interviews" },
                { label: "Active",         emoji: "✅", count: bhvStats.active,       color: "#6366F1", desc: "31–80 applications" },
                { label: "Moderate",       emoji: "⚡", count: bhvStats.moderate,     color: "#F59E0B", desc: "11–30 applications" },
                { label: "Low Activity",   emoji: "💤", count: bhvStats.low,          color: "#94A3B8", desc: "≤10 applications" },
              ].map(({ label, emoji, count, color, desc }) => {
                const pct = bhvStats.total > 0 ? Math.round((count / bhvStats.total) * 100) : 0;
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>{emoji} {label}</span>
                        <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 6 }}>{desc}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{count.toLocaleString()} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 999, background: color, width: `${pct}%`, transition: "width 0.6s" }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, paddingTop: 12, borderTop: "1px solid var(--line)", marginTop: 4 }}>
                {[
                  { label: "Avg Apps / Candidate", val: bhvStats.avgApps },
                  { label: "Attended Interviews",   val: bhvStats.withInterviews.toLocaleString() },
                  { label: "Behaviour Records",     val: bhvStats.total.toLocaleString() },
                ].map(({ label, val }) => (
                  <div key={label} style={{ textAlign: "center", background: "var(--base)", borderRadius: "var(--radius-xs)", padding: "10px 6px", border: "1px solid var(--line)" }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "var(--brand)" }}>{val}</p>
                    <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>No behaviour data available.</p>
          )}
        </div>

        {/* ── Admin Modules ── */}
        <div style={S.card}>
          <p style={S.heading}><Settings style={{ width: 14, height: 14, color: "var(--accent)" }} /> Admin Modules</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {NAV_LINKS.map(({ href, icon: Icon, label, desc }) => (
              <Link key={href} to={href} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "var(--base)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", textDecoration: "none", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--line)")}>
                <Icon style={{ width: 16, height: 16, color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>{desc}</p>
                </div>
                <ChevronRight style={{ width: 14, height: 14, color: "var(--muted)", flexShrink: 0, marginTop: 2 }} />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Governance ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { label: "Role-Based Access", val: "Active",  ok: true },
            { label: "Audit Logging",     val: "Enabled", ok: true },
            { label: "PDPA Compliance",   val: "Active",  ok: true },
          ].map(({ label, val, ok }) => (
            <div key={label} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle style={{ width: 16, height: 16, color: ok ? "#15803d" : "#dc2626", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, color: "var(--muted)" }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: ok ? "#15803d" : "#dc2626" }}>{val}</p>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
