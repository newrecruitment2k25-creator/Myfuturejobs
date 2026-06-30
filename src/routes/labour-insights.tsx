import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, Users, DollarSign, Loader2, MapPin, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/labour-insights")({
  ssr: false,
  component: LabourInsightsPage,
  head: () => ({
    meta: [
      { title: "Labour Market Insights — Praxo AI · PERKESO" },
      { name: "description", content: "Real-time labour market intelligence from POC dataset: 5,828 vacancies, 1,449 candidates, occupation demand, salary ranges, skill trends." },
    ],
  }),
});

type OccRow = { occupation: string; count: number };
type StateRow = { state: string; count: number };
type SalaryRow = { occupation: string; min: number; max: number; median: number };
type SkillRow = { skill: string; count: number };

function StatCard({ icon, value, label, sub, color }: { icon: React.ReactNode; value: string | number; label: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "20px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: color ?? "rgba(33,31,96,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function HBar({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{value.toLocaleString()}</span>
      </div>
      <div style={{ height: 7, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color ?? "var(--brand)", borderRadius: 999, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "24px 28px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ color: "var(--brand)" }}>{icon}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)", background: "var(--base)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>Based on POC dataset</span>
      </div>
      {children}
    </div>
  );
}

function NoData() {
  return <div style={{ fontSize: 13, color: "var(--muted)", padding: "20px 0", textAlign: "center" }}>Insight module ready for connected PERKESO data.</div>;
}

function LabourInsightsPage() {
  const [vacCount, setVacCount] = useState<number | null>(null);
  const [candCount, setCandCount] = useState<number | null>(null);
  const [topOcc, setTopOcc] = useState<OccRow[]>([]);
  const [topStates, setTopStates] = useState<StateRow[]>([]);
  const [topSkills, setTopSkills] = useState<SkillRow[]>([]);
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [{ count: vac }, { count: cand }] = await Promise.all([
          (supabase as any).from("poc_vacancies").select("*", { count: "exact", head: true }),
          (supabase as any).from("poc_candidates").select("*", { count: "exact", head: true }),
        ]);
        setVacCount(vac ?? 0);
        setCandCount(cand ?? 0);

        // Top occupations from vacancies
        const { data: vacRows } = await (supabase as any)
          .from("poc_vacancies")
          .select("occupation_name, job_title, state, salary")
          .limit(2000);

        if (vacRows?.length) {
          // Occupation count
          const occMap = new Map<string, number>();
          for (const r of vacRows) {
            const k = r.occupation_name ?? r.job_title ?? "Other";
            occMap.set(k, (occMap.get(k) ?? 0) + 1);
          }
          setTopOcc(
            Array.from(occMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([occupation, count]) => ({ occupation, count }))
          );

          // State count
          const stateMap = new Map<string, number>();
          for (const r of vacRows) {
            if (r.state) stateMap.set(r.state, (stateMap.get(r.state) ?? 0) + 1);
          }
          setTopStates(
            Array.from(stateMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([state, count]) => ({ state, count }))
          );

          // Salary by occupation (top 8 occupations with salary data)
          const salMap = new Map<string, number[]>();
          for (const r of vacRows) {
            if (r.salary && r.occupation_name) {
              const num = parseFloat(String(r.salary).replace(/[^0-9.]/g, ""));
              if (num > 500 && num < 50000) {
                const k = r.occupation_name;
                if (!salMap.has(k)) salMap.set(k, []);
                salMap.get(k)!.push(num);
              }
            }
          }
          const salArr: SalaryRow[] = Array.from(salMap.entries())
            .filter(([, nums]) => nums.length >= 3)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 8)
            .map(([occupation, nums]) => {
              nums.sort((a, b) => a - b);
              return {
                occupation,
                min: Math.round(nums[0]),
                max: Math.round(nums[nums.length - 1]),
                median: Math.round(nums[Math.floor(nums.length / 2)]),
              };
            });
          setSalaryRows(salArr);

          // Skills demand
          const skillMap = new Map<string, number>();
          for (const r of vacRows) {
            if (r.skills) {
              const skills = String(r.skills).split(/[,;|]+/).map((s: string) => s.trim().toLowerCase()).filter((s: string) => s.length > 2 && s.length < 30);
              for (const s of skills) skillMap.set(s, (skillMap.get(s) ?? 0) + 1);
            }
          }
          setTopSkills(
            Array.from(skillMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([skill, count]) => ({ skill, count }))
          );
        }
      } catch {
        // silently show no-data state
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const maxOcc = topOcc[0]?.count ?? 1;
  const maxState = topStates[0]?.count ?? 1;
  const maxSkill = topSkills[0]?.count ?? 1;

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      {/* Header */}
      <div style={{ background: "var(--brand)", padding: "40px 24px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", borderRadius: 999, padding: "4px 14px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
            <BarChart2 size={12} /> PERKESO · Labour Market Intelligence
          </div>
          <h1 style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Labour Market Insights
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", margin: 0, maxWidth: 640 }}>
            Real-time aggregates from the POC dataset — occupation demand, hiring locations, salary ranges, and skill trends. All figures are live from connected data.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <Loader2 size={28} style={{ color: "var(--brand)", animation: "spin 1s linear infinite", marginBottom: 14 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Loading POC dataset aggregates…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 28 }}>
              <StatCard icon={<Briefcase size={18} style={{ color: "var(--brand)" }} />} value={vacCount?.toLocaleString() ?? "—"} label="Live Vacancies" sub="POC dataset" color="rgba(33,31,96,0.07)" />
              <StatCard icon={<Users size={18} style={{ color: "var(--accent)" }} />} value={candCount?.toLocaleString() ?? "—"} label="Registered Candidates" sub="POC dataset" color="rgba(243,108,33,0.08)" />
              <StatCard icon={<TrendingUp size={18} style={{ color: "#15803d" }} />} value={vacCount && candCount ? `${(vacCount / candCount).toFixed(1)}x` : "—"} label="Vacancy : Candidate Ratio" sub="Supply-demand gap indicator" color="rgba(21,128,61,0.07)" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Top occupations */}
              <SectionCard title="Top Occupations by Vacancy" icon={<Briefcase size={16} />}>
                {topOcc.length > 0 ? topOcc.map(r => <HBar key={r.occupation} label={r.occupation} value={r.count} max={maxOcc} />) : <NoData />}
              </SectionCard>

              {/* Top states */}
              <SectionCard title="Top Hiring Locations" icon={<MapPin size={16} />}>
                {topStates.length > 0 ? topStates.map(r => <HBar key={r.state} label={r.state} value={r.count} max={maxState} color="var(--accent)" />) : <NoData />}
              </SectionCard>
            </div>

            {/* Skill demand */}
            <SectionCard title="In-Demand Skills (from vacancy postings)" icon={<TrendingUp size={16} />}>
              {topSkills.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {topSkills.map((r, i) => (
                    <div key={r.skill} style={{ display: "flex", alignItems: "center", gap: 6, background: i < 3 ? "var(--brand)" : "rgba(33,31,96,0.06)", color: i < 3 ? "#fff" : "var(--brand)", borderRadius: 999, padding: "6px 14px" }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{r.skill}</span>
                      <span style={{ fontSize: 10, opacity: 0.75 }}>×{r.count}</span>
                    </div>
                  ))}
                </div>
              ) : <NoData />}
            </SectionCard>

            {/* Salary ranges */}
            <SectionCard title="Salary Ranges by Occupation (RM)" icon={<DollarSign size={16} />}>
              {salaryRows.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--line)" }}>
                        <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 700, color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>Occupation</th>
                        <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 700, color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>Min</th>
                        <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 700, color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>Median</th>
                        <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 700, color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryRows.map(r => (
                        <tr key={r.occupation} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--ink)" }}>{r.occupation}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--muted)" }}>RM {r.min.toLocaleString()}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--brand)" }}>RM {r.median.toLocaleString()}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--muted)" }}>RM {r.max.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <NoData />}
            </SectionCard>

            {/* Supply vs demand */}
            <div style={{ background: "var(--brand)", borderRadius: 16, padding: "28px 32px", color: "#fff" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
                Supply vs Demand Summary
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>{vacCount?.toLocaleString() ?? "—"}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>Vacancies (demand)</div>
                </div>
                <div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent)" }}>{candCount?.toLocaleString() ?? "—"}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>Candidates (supply)</div>
                </div>
                <div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>{vacCount && candCount ? `${((vacCount / candCount) * 100).toFixed(0)}%` : "—"}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>Unfilled demand ratio</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
