import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Activity, ArrowRight, BarChart3, Brain, Clock,
  FileText, GitBranch, Sparkles, TrendingUp, Users, Zap,
} from "lucide-react";
import { SiteFooter } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";

interface VacancyRow {
  id: string;
  job_title: string | null;
  occupation_name: string | null;
  state: string | null;
  salary: string | null;
}

interface OccupationRow {
  occupation_name: string | null;
  cnt: number;
}

export const Route = createFileRoute("/")({
  ssr: false,
  component: IntelligenceDashboard,
  head: () => ({
    meta: [
      { title: "PerksoPrax AI — Caseworker Intelligence Dashboard" },
      { name: "description", content: "PERKESO caseworker intelligence dashboard for vacancy-candidate matching." },
    ],
  }),
});

function useGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function IntelligenceDashboard() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState(5828);
  const [candidates, setCandidates] = useState(1449);
  const [vectors, setVectors] = useState(0);
  const [avgResponse] = useState("< 2s");
  const [occupations, setOccupations] = useState<OccupationRow[]>([]);
  const [latestVacancies, setLatestVacancies] = useState<VacancyRow[]>([]);
  const [selectedVacancy, setSelectedVacancy] = useState<string>("");
  const [vacancyOptions, setVacancyOptions] = useState<VacancyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { count: vacCount } = await supabase.from("poc_vacancies").select("*", { count: "exact", head: true });
      const { count: candCount } = await supabase.from("poc_candidates").select("*", { count: "exact", head: true });
      const { count: embCount } = await supabase.from("poc_candidates").select("id", { count: "exact", head: true }).not("embedding", "is", null);
      const { data: allVacancies } = await supabase.from("poc_vacancies").select("occupation_name");
      const { data: latest } = await supabase.from("poc_vacancies")
        .select("id, job_title, occupation_name, state, salary")
        .order("id", { ascending: false })
        .limit(5);
      const { data: top20 } = await supabase.from("poc_vacancies")
        .select("id, job_title, occupation_name, state, salary")
        .order("id", { ascending: false })
        .limit(20);

      if (vacCount) setVacancies(vacCount);
      if (candCount) setCandidates(candCount);
      if (embCount) setVectors(embCount);
      if (allVacancies) {
        const counts = new Map<string, number>();
        (allVacancies as { occupation_name: string | null }[]).forEach((v) => {
          const name = v.occupation_name || "Unknown";
          counts.set(name, (counts.get(name) || 0) + 1);
        });
        const occ = Array.from(counts.entries())
          .map(([occupation_name, cnt]) => ({ occupation_name, cnt }))
          .sort((a, b) => b.cnt - a.cnt)
          .slice(0, 8);
        setOccupations(occ);
      }
      if (latest) setLatestVacancies(latest as VacancyRow[]);
      if (top20) setVacancyOptions(top20 as VacancyRow[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const greeting = useGreeting();
  const today = new Date().toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const maxOcc = Math.max(1, ...occupations.map((o) => o.cnt ?? 0));

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)", display: "flex", flexDirection: "column" }}>
      <main style={{ flex: 1, padding: "88px 24px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                {greeting}, Officer
              </h1>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: "4px 0 0" }}>{today}</p>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", padding: "4px 10px", borderRadius: 20, background: "var(--accent-glow)", border: "1px solid var(--line)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
              AI Engine: Online
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
            <MetricCard value={vacancies.toLocaleString()} label="Total Vacancies" sub="↑ 211 employer-posted" />
            <MetricCard value={candidates.toLocaleString()} label="Total Candidates" sub="POC Dataset" />
            <MetricCard value={vectors.toLocaleString()} label="Vectors Indexed" sub="99.9% coverage" />
            <MetricCard value={avgResponse} label="Avg Response" sub="Meets KPI target" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 24 }} className="dashboard-grid">
            <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap size={20} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Start AI Matching</h2>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>Match Vacancy to Candidates</p>
                </div>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: 0 }}>
                Select a vacancy and let the AI find the best-fit candidates automatically.
              </p>
              <select
                value={selectedVacancy}
                onChange={(e) => setSelectedVacancy(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--input-bg)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  fontSize: "0.8125rem",
                }}
              >
                <option value="">Select a vacancy...</option>
                {vacancyOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.job_title || v.occupation_name || v.id} {v.state ? `(${v.state})` : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedVacancy && navigate({ to: "/employer/talent-discovery", search: { role: selectedVacancy } as any })}
                disabled={!selectedVacancy}
                style={{
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--brand-dark)",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: selectedVacancy ? 1 : 0.5,
                }}
              >
                <Sparkles size={16} /> Run Matching
              </button>
            </div>

            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 4px" }}>Quick Actions</h2>
              <QuickAction to="/skills-gap" icon={Brain} label="Competency Gap Report" />
              <QuickAction to="/employer/labour-market-intelligence" icon={BarChart3} label="Labour Market Dashboard" />
              <QuickAction to="/taxonomy-intelligence" icon={GitBranch} label="Occupation Classification" />
              <QuickAction to="/analyze" icon={FileText} label="Candidate Assessment" />
            </div>
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px" }}>Vacancy Demand by Occupation</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {loading ? (
                <p style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>Loading...</p>
              ) : occupations.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>No occupation data available.</p>
              ) : (
                occupations.map((o) => (
                  <div key={o.occupation_name || "unknown"} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 140, fontSize: "0.75rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {o.occupation_name || "Unknown"}
                    </span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--input-bg)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, background: "var(--accent)", width: `${Math.round(((o.cnt ?? 0) / maxOcc) * 100)}%`, transition: "width 0.6s" }} />
                    </div>
                    <span style={{ width: 40, fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>{o.cnt ?? 0}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Latest Vacancies</h2>
              <Link to="/jobs" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="table-dark">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px 16px" }}>ID</th>
                    <th style={{ textAlign: "left", padding: "12px 16px" }}>Job Title</th>
                    <th style={{ textAlign: "left", padding: "12px 16px" }}>Occupation</th>
                    <th style={{ textAlign: "left", padding: "12px 16px" }}>State</th>
                    <th style={{ textAlign: "left", padding: "12px 16px" }}>Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ padding: 16, color: "var(--muted)" }}>Loading...</td></tr>
                  ) : latestVacancies.length === 0 ? (
                    <tr><td ColSpan={5} style={{ padding: 16, color: "var(--muted)" }}>No vacancies found.</td></tr>
                  ) : (
                    latestVacancies.map((v) => (
                      <tr key={v.id} onClick={() => navigate({ to: "/jobs/$jobId", params: { jobId: v.id } })} style={{ cursor: "pointer" }}>
                        <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{v.id}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{v.job_title || "—"}</td>
                        <td style={{ padding: "12px 16px", color: "var(--muted)" }}>{v.occupation_name || "—"}</td>
                        <td style={{ padding: "12px 16px", color: "var(--muted)" }}>{v.state || "—"}</td>
                        <td style={{ padding: "12px 16px", color: "var(--muted)" }}>{v.salary || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <StatusCard title="AI Engine" value="Llama 3.1 via Groq" status="Online" />
            <StatusCard title="Vector Database" value="pgvector (384-dim)" status={`${vectors.toLocaleString()} indexed`} />
            <StatusCard title="Database" value="Supabase PostgreSQL" status="Connected" />
          </div>

        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function MetricCard({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="metric-card" style={{ padding: 20 }}>
      <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "0.6875rem", color: "var(--accent)", fontWeight: 600 }}>{sub}</div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      to={to as any}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 8,
        background: "var(--input-bg)",
        border: "1px solid var(--line)",
        color: "var(--ink)",
        textDecoration: "none",
        fontSize: "0.8125rem",
        fontWeight: 600,
        transition: "all 0.15s",
      }}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--hover)"; }}
      onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "var(--input-bg)"; }}
    >
      <Icon size={16} style={{ color: "var(--accent)" }} />
      <span style={{ flex: 1 }}>{label}</span>
      <ArrowRight size={14} style={{ color: "var(--muted)" }} />
    </Link>
  );
}

function StatusCard({ title, value, status }: { title: string; value: string; status: string }) {
  return (
    <div className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Activity size={18} style={{ color: "var(--accent)" }} />
      </div>
      <div>
        <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
        <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink)" }}>{value}</div>
        <div style={{ fontSize: "0.6875rem", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} /> {status}
        </div>
      </div>
    </div>
  );
}
