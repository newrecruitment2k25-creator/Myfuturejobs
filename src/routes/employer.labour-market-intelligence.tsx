import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  BarChart2, TrendingUp, Target, AlertTriangle, Users, DollarSign,
  Lightbulb, Globe, Shield, ChevronRight, ArrowRight, MapPin,
  CheckCircle, Activity, Briefcase, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateLabourMarketReport,
  getDemandLevelConfig,
  getShortageLevelConfig,
  getGrowthTrendConfig,
  getReadinessConfig,
  getFutureSkillConfig,
  getInsightConfig,
  type LabourMarketReport,
  type DemandLevel,
} from "@/lib/labour-market-intelligence";

export const Route = createFileRoute("/employer/labour-market-intelligence")({
  ssr: false,
  component: LabourMarketIntelligencePage,
  head: () => ({ meta: [{ title: "Labour Market Intelligence — MYFutureJobs" }] }),
});

// ─── Shared UI helpers ────────────────────────

function SectionCard({ icon, title, subtitle, children, accent = false }: {
  icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <section className={`rounded-2xl border bg-card p-6 shadow-sm ${accent ? "border-primary/20" : "border-border"}`}>
      <div className="flex items-start gap-3 mb-5">
        <span className="mt-0.5 text-primary">{icon}</span>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-secondary/40 px-4 py-3 text-center">
      <p className="text-2xl font-extrabold text-primary tabular-nums">{value}</p>
      <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function DemandBadge({ level }: { level: DemandLevel }) {
  const cfg = getDemandLevelConfig(level);
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {level}
    </span>
  );
}

function BarRow({ label, value, max, color = "bg-primary" }: { label: string; value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 text-xs text-foreground truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-secondary">
        <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{value}</span>
    </div>
  );
}

function CircularGauge({ value, label, sub, color }: { value: number; label: string; sub?: string; color: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, value) / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-24">
        <svg className="size-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} className="stroke-secondary" strokeWidth="7" fill="none" />
          <circle cx="40" cy="40" r={radius} className={color} strokeWidth="7" fill="none" strokeLinecap="round"
            style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: "stroke-dashoffset 0.7s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold tabular-nums">{value}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────

function LabourMarketIntelligencePage() {
  const report: LabourMarketReport = useMemo(() => generateLabourMarketReport(), []);
  const [activeTab, setActiveTab] = useState<"overview" | "demand" | "skills" | "workforce" | "outlook">("overview");

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "demand", label: "Demand Intelligence" },
    { id: "skills", label: "Skills & Shortages" },
    { id: "workforce", label: "Workforce Analytics" },
    { id: "outlook", label: "Outlook & Planning" },
  ];

  const readinessCfg = getReadinessConfig(report.workforceReadinessRating);
  const maxVacancy = Math.max(...report.occupationDemand.map(o => o.vacancyCount));
  const maxIndustry = Math.max(...report.industryDemand.map(i => i.vacancyCount));
  const maxSkill = Math.max(...report.skillDemand.map(s => s.vacancyFrequency));
  const maxShortage = Math.max(...report.skillShortages.map(s => s.vacancyDemand));

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:1100, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

        {/* Page header */}
        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #512ACC 0%, #6B4FD6 60%, #512ACC 100%)', boxShadow: '0 4px 20px rgba(81,42,204,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Module 11 · Workforce Intelligence Platform
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>Labour Market Intelligence</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4, maxWidth: 720 }}>
                National workforce analytics for employers, government agencies, and workforce development organisations.
                Aligned with MASCO, PERKESO, and Malaysian labour market frameworks.
              </p>
            </div>
            <Activity style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1">
              <span className="size-1.5 rounded-full bg-[var(--success)]" /> Live Platform Data
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1">
              MASCO-Aligned
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1">
              PERKESO Compatible
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1">
              MyDIGITAL Framework
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              Generated: {new Date(report.generatedAt).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-max rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            TAB: OVERVIEW
        ══════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-5">

            {/* Section 1: KPI tiles */}
            <SectionCard icon={<BarChart2 className="size-5" />} title="Labour Market Overview" subtitle="Executive summary of platform workforce intelligence" accent>
              <div className="grid gap-6 lg:grid-cols-[1fr_280px] items-start">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatTile label="Active Vacancies" value={report.totalVacancies.toLocaleString()} />
                  <StatTile label="Total Candidates" value={report.totalCandidates.toLocaleString()} />
                  <StatTile label="Avg Match Rate" value={`${report.avgMatchRate}%`} />
                  <StatTile label="Avg Employability" value={`${report.avgEmployabilityScore}/100`} />
                  <StatTile label="Readiness Index" value={report.workforceReadinessScore} sub={report.workforceReadinessRating} />
                </div>
                <div className="flex flex-wrap items-center justify-around gap-4 rounded-2xl border border-border bg-background p-5">
                  <CircularGauge value={report.avgMatchRate} label="Match Rate" color={report.avgMatchRate >= 70 ? "stroke-emerald-500" : report.avgMatchRate >= 50 ? "stroke-amber-500" : "stroke-destructive"} />
                  <CircularGauge value={report.workforceReadinessScore} label="Readiness" sub={report.workforceReadinessRating} color={report.workforceReadinessScore >= 70 ? "stroke-emerald-500" : report.workforceReadinessScore >= 50 ? "stroke-amber-500" : "stroke-destructive"} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mt-6">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">High Demand Occupations</p>
                  <ul className="space-y-2">
                    {report.highDemandOccupations.map((o, i) => (
                      <li key={o} className="flex items-center gap-3 text-sm text-foreground">
                        <span className="size-6 shrink-0 rounded-full bg-primary/10 text-primary text-center text-xs font-bold leading-6">{i + 1}</span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Emerging Occupations</p>
                  <ul className="space-y-2">
                    {report.emergingOccupationsTop.map((o, i) => (
                      <li key={o} className="flex items-center gap-3 text-sm text-foreground">
                        <span className="size-6 shrink-0 rounded-full bg-[#F97316]/10 text-[#F97316] text-center text-xs font-bold leading-6">{i + 1}</span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SectionCard>

            {/* Section 12: Executive Insights */}
            <SectionCard icon={<Lightbulb className="size-5" />} title="Executive Insights" subtitle="AI-synthesized intelligence based on platform workforce data">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.executiveInsights.map((ins, idx) => {
                  const cfg = getInsightConfig(ins.indicator);
                  return (
                    <div key={idx} className="rounded-xl border border-border bg-background p-4 relative overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.dot ?? "bg-primary"}`} />
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`size-2 rounded-full ${cfg.dot}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>{ins.category}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{ins.insight}</p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Workforce Readiness Index */}
            <SectionCard icon={<Activity className="size-5" />} title="Workforce Readiness Index" subtitle="Composite score of national workforce capability">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <CircularGauge
                  value={report.workforceReadinessScore}
                  label="Readiness Score"
                  sub={report.workforceReadinessRating}
                  color={report.workforceReadinessScore >= 70 ? "stroke-emerald-500" : report.workforceReadinessScore >= 50 ? "stroke-amber-500" : "stroke-destructive"}
                />
                <div className="flex-1 min-w-[200px] text-center sm:text-left">
                  <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold mb-3 ${readinessCfg.bg} ${readinessCfg.text}`}>
                    {report.workforceReadinessRating}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{report.workforceReadinessExplanation}</p>
                </div>
              </div>
            </SectionCard>

          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: DEMAND INTELLIGENCE
        ══════════════════════════════════════════ */}
        {activeTab === "demand" && (
          <div className="space-y-5">

            {/* Section 2: Occupation Demand */}
            <SectionCard icon={<Briefcase className="size-5" />} title="Occupation Demand Intelligence" subtitle="Top occupations by vacancy volume and growth trend">
              <div className="space-y-2.5">
                {report.occupationDemand.map((occ) => {
                  const trend = getGrowthTrendConfig(occ.growthTrend);
                  return (
                    <div key={occ.title} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                      <div className="flex-1 min-w-[180px]">
                        <p className="text-sm font-medium text-foreground">{occ.title}</p>
                        <p className="text-xs text-muted-foreground">{occ.family} · {occ.mascoCode}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <DemandBadge level={occ.demandLevel} />
                        <span className={`text-xs font-semibold ${trend.text}`}>{trend.label}</span>
                        <span className="text-xs font-bold text-primary tabular-nums ml-2">{occ.vacancyCount} vacancies</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Section 3: Industry Demand */}
            <SectionCard icon={<BarChart2 className="size-5" />} title="Industry Demand Intelligence" subtitle="Hiring activity and candidate supply by industry sector">
              <div className="space-y-3">
                {report.industryDemand.map((ind) => {
                  const cfg = getDemandLevelConfig(ind.demandStatus);
                  const gapColor = ind.supplyGap === "Shortage" ? "text-destructive" : ind.supplyGap === "Surplus" ? "text-[var(--success)]" : "text-primary";
                  return (
                    <div key={ind.industry} className="rounded-xl border border-border bg-background px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-foreground">{ind.industry}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${gapColor}`}>{ind.supplyGap}</span>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{ind.demandStatus}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-base font-bold text-primary tabular-nums">{ind.vacancyCount}</p>
                          <p className="text-xs text-muted-foreground">Vacancies</p>
                        </div>
                        <div className="text-center">
                          <p className="text-base font-bold text-foreground tabular-nums">{ind.candidateSupply}</p>
                          <p className="text-xs text-muted-foreground">Candidates</p>
                        </div>
                        <div className="text-center">
                          <p className="text-base font-bold text-[var(--success)] tabular-nums">{ind.matchRate}%</p>
                          <p className="text-xs text-muted-foreground">Match Rate</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Section 10: Regional Intelligence */}
            <SectionCard icon={<MapPin className="size-5" />} title="Regional Intelligence" subtitle="Vacancy volume, candidate supply, and hiring activity by state">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.regionalData.map((r) => {
                  const actColor = r.hiringActivity === "Very Active" ? "text-[var(--success)]" : r.hiringActivity === "Active" ? "text-primary" : "text-muted-foreground";
                  return (
                    <div key={r.region} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-foreground">{r.region}</p>
                        <span className={`text-xs font-bold ${actColor}`}>{r.hiringActivity}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-lg bg-secondary/40 px-2 py-1.5 text-center">
                          <p className="text-base font-bold text-primary tabular-nums">{r.vacancyVolume}</p>
                          <p className="text-xs text-muted-foreground">Vacancies</p>
                        </div>
                        <div className="rounded-lg bg-secondary/40 px-2 py-1.5 text-center">
                          <p className="text-base font-bold text-foreground tabular-nums">{r.candidateSupply}</p>
                          <p className="text-xs text-muted-foreground">Candidates</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Top Industries</p>
                        <p className="text-xs text-foreground">{r.topIndustries.slice(0, 2).join(" · ")}</p>
                      </div>
                      {r.skillShortages.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Key Shortages</p>
                          <div className="flex flex-wrap gap-1">
                            {r.skillShortages.slice(0, 2).map(s => (
                              <span key={s} className="rounded-full bg-destructive/8 border border-destructive/20 px-2 py-0.5 text-xs text-destructive">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Section 9: Occupation Mobility */}
            <SectionCard icon={<ArrowRight className="size-5" />} title="Occupation Mobility Intelligence" subtitle="Most common career transition pathways observed on the platform">
              <div className="grid gap-3 sm:grid-cols-2">
                {report.occupationMobility.map((mob) => {
                  const freqColor = mob.frequency === "Very Common" ? "text-[var(--success)]" : mob.frequency === "Common" ? "text-primary" : "text-muted-foreground";
                  return (
                    <div key={`${mob.from}-${mob.to}`} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{mob.from}</span>
                          <ArrowRight className="size-3 text-muted-foreground" />
                          <span className="text-xs font-semibold text-primary">{mob.to}</span>
                        </div>
                        <span className={`text-xs font-bold ${freqColor}`}>{mob.frequency}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{mob.commonPath[0]}</p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: SKILLS & SHORTAGES
        ══════════════════════════════════════════ */}
        {activeTab === "skills" && (
          <div className="space-y-5">

            {/* Section 4: Skills Demand */}
            <SectionCard icon={<Target className="size-5" />} title="Skills Demand Intelligence" subtitle="Most requested skills across all vacancies by frequency">
              <div className="space-y-2.5">
                {report.skillDemand.map((s) => {
                  const trend = getGrowthTrendConfig(s.demandTrend);
                  const availColor = s.candidateAvailability === "High" ? "text-[var(--success)]" : s.candidateAvailability === "Medium" ? "text-[#F97316]" : "text-destructive";
                  const catColor = s.category === "Hard" ? "bg-primary/8 border-primary/20 text-primary" : s.category === "Soft" ? "bg-[var(--success)]/8 border-[var(--success)]/20 text-[var(--success)]" : s.category === "Industry" ? "bg-[#F97316]/8 border-[#F97316]/20 text-[#F97316]" : "bg-purple-50 border-purple-200 text-purple-700";
                  return (
                    <div key={s.skill} className="rounded-xl border border-border bg-background px-4 py-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{s.skill}</span>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${catColor}`}>{s.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs ${availColor}`}>Supply: {s.candidateAvailability}</span>
                          <span className={`text-xs font-semibold ${trend.text}`}>{trend.label}</span>
                          <span className="text-xs font-bold text-primary tabular-nums">{s.vacancyFrequency}</span>
                        </div>
                      </div>
                      <BarRow label="" value={s.vacancyFrequency} max={maxSkill} color="bg-primary" />
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Section 5: Skills Shortages */}
            <SectionCard icon={<AlertTriangle className="size-5" />} title="Skills Shortage Intelligence" subtitle="Critical skills employers demand but candidates lack — national shortage analysis">
              <div className="space-y-2.5">
                {report.skillShortages.map((s) => {
                  const cfg = getShortageLevelConfig(s.shortageLevel);
                  const ratio = s.candidateSupply > 0 ? (s.vacancyDemand / s.candidateSupply).toFixed(1) : "∞";
                  return (
                    <div key={s.skill} className="rounded-xl border border-border bg-background px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.skill}</p>
                          <p className="text-xs text-muted-foreground">{s.industry}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.text}`}>{s.shortageLevel}</span>
                          <span className="text-xs text-muted-foreground">{ratio}× demand/supply</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">Demand {s.vacancyDemand}</span>
                        <div className="flex-1 h-2 rounded-full bg-secondary">
                          <div className={`h-2 rounded-full ${cfg.bar} transition-all duration-500`} style={{ width: `${Math.min(100, Math.round((s.vacancyDemand / maxShortage) * 100))}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">Supply {s.candidateSupply}</span>
                        <div className="flex-1 h-2 rounded-full bg-secondary">
                          <div className="h-2 rounded-full bg-[var(--success)] transition-all duration-500" style={{ width: `${Math.min(100, Math.round((s.candidateSupply / maxShortage) * 100))}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: WORKFORCE ANALYTICS
        ══════════════════════════════════════════ */}
        {activeTab === "workforce" && (
          <div className="space-y-5">

            {/* Section 6: Candidate Distribution */}
            <SectionCard icon={<Users className="size-5" />} title="Candidate Supply Intelligence" subtitle="Candidate distribution by industry, experience, education, and employability">
              <div className="grid gap-6 sm:grid-cols-2">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">By Industry</p>
                  <div className="space-y-2">
                    {report.candidateDistribution.byIndustry.map(row => (
                      <BarRow key={row.label} label={`${row.label}`} value={row.count} max={Math.max(...report.candidateDistribution.byIndustry.map(r => r.count))} />
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">By Experience Level</p>
                    <div className="space-y-2">
                      {report.candidateDistribution.byExperience.map(row => (
                        <div key={row.label} className="flex items-center gap-3">
                          <span className="w-36 shrink-0 text-xs text-foreground truncate">{row.label}</span>
                          <div className="flex-1 h-2 rounded-full bg-secondary">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${row.percentage}%` }} />
                          </div>
                          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{row.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">By Education Level</p>
                    <div className="space-y-2">
                      {report.candidateDistribution.byEducation.map(row => (
                        <div key={row.label} className="flex items-center gap-3">
                          <span className="w-36 shrink-0 text-xs text-foreground truncate">{row.label}</span>
                          <div className="flex-1 h-2 rounded-full bg-secondary">
                            <div className="h-2 rounded-full bg-[var(--success)]" style={{ width: `${row.percentage}%` }} />
                          </div>
                          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{row.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Employability Score Distribution</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {report.candidateDistribution.byEmployabilityBand.map(band => (
                      <div key={band.range} className="rounded-xl border border-border bg-background p-3 text-center">
                        <p className="text-xl font-extrabold text-primary tabular-nums">{band.percentage}%</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{band.label}</p>
                        <p className="text-xs text-muted-foreground">{band.count.toLocaleString()} candidates</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Section 7: Salary Dashboard */}
            <SectionCard icon={<DollarSign className="size-5" />} title="Salary Benchmark Dashboard" subtitle="Market salary ranges by occupation with competitiveness indicators">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Occupation</th>
                      <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entry</th>
                      <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mid</th>
                      <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senior</th>
                      <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Position</th>
                      <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.salaryBenchmarks.map((row, i) => {
                      const posColor = row.position === "Above Market" ? "text-[var(--success)]" : row.position === "Below Market" ? "text-destructive" : "text-primary";
                      return (
                        <tr key={row.occupation} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-secondary/20" : ""}`}>
                          <td className="p-3">
                            <p className="font-medium text-foreground">{row.occupation}</p>
                            <p className="text-xs text-muted-foreground">{row.family}</p>
                          </td>
                          <td className="p-3 text-center text-xs font-semibold text-foreground tabular-nums">{row.entry}</td>
                          <td className="p-3 text-center text-xs font-bold text-primary tabular-nums">{row.mid}</td>
                          <td className="p-3 text-center text-xs font-semibold text-foreground tabular-nums">{row.senior}</td>
                          <td className={`p-3 text-center text-xs font-bold tabular-nums ${posColor}`}>{row.position}</td>
                          <td className="p-3 text-xs text-muted-foreground">{row.trend}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: OUTLOOK & PLANNING
        ══════════════════════════════════════════ */}
        {activeTab === "outlook" && (
          <div className="space-y-5">

            {/* Section 8: Emerging Occupations */}
            <SectionCard icon={<TrendingUp className="size-5" />} title="Emerging Occupations" subtitle="New and growing occupation categories shaping Malaysia's future workforce">
              <div className="grid gap-4 sm:grid-cols-2">
                {report.emergingOccupations.map((occ) => {
                  const lvlCfg = getFutureSkillConfig(occ.growthIndicator);
                  return (
                    <div key={occ.title} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-foreground">{occ.title}</p>
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${lvlCfg.bg} ${lvlCfg.text}`}>
                          {occ.growthIndicator} Growth
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{occ.industry}</p>
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Required Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {occ.requiredSkills.slice(0, 4).map(s => (
                            <span key={s} className="rounded-full bg-primary/8 border border-primary/20 px-2 py-0.5 text-xs text-primary">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Career Pathway</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {occ.careerPathway.slice(0, 3).map((step, si) => (
                            <span key={step} className="flex items-center gap-1">
                              <span className="text-xs text-foreground">{step}</span>
                              {si < Math.min(occ.careerPathway.length, 3) - 1 && <ChevronRight className="size-3 text-muted-foreground" />}
                            </span>
                          ))}
                          {occ.careerPathway.length > 3 && <span className="text-xs text-muted-foreground">…</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Section 13: Future Skills */}
            <SectionCard icon={<BookOpen className="size-5" />} title="Future Skills Outlook" subtitle="Skills expected to increase in demand — 2025 to 2030 horizon">
              <div className="grid gap-3 sm:grid-cols-2">
                {report.futureSkills.map((fs) => {
                  const cfg = getFutureSkillConfig(fs.futureDemand);
                  return (
                    <div key={fs.skill} className="rounded-xl border border-border bg-background px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium text-foreground">{fs.skill}</p>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.text}`}>{fs.futureDemand} Demand</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-secondary mb-2">
                        <div className={`h-1.5 rounded-full ${cfg.bar} ${cfg.width} transition-all duration-500`} />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{fs.relevantIndustries.slice(0, 2).join(" · ")}</p>
                        <p className="text-xs text-muted-foreground">{fs.timeline}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Section 14: Workforce Planning */}
            <SectionCard icon={<Shield className="size-5" />} title="Workforce Planning Recommendations" subtitle="Evidence-based recommendations for employers and government stakeholders">
              <div className="space-y-3">
                {["Both", "Employer", "Government"].map(audience => {
                  const recs = report.workforcePlanningRecommendations.filter(r => r.audience === audience);
                  if (!recs.length) return null;
                  const aud = audience as "Employer" | "Government" | "Both";
                  const audColor = aud === "Government" ? "text-primary bg-primary/10 border-primary/20" : aud === "Both" ? "text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20" : "text-[#F97316] bg-[#F97316]/10 border-[#F97316]/20";
                  return (
                    <div key={audience}>
                      <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold mb-3 ${audColor}`}>
                        {aud === "Both" ? "For All Stakeholders" : `For ${audience}`}
                      </div>
                      <div className="space-y-2">
                        {recs.map(rec => {
                          const priColor = rec.priority === "High" ? "text-destructive" : rec.priority === "Medium" ? "text-[#F97316]" : "text-muted-foreground";
                          return (
                            <div key={rec.recommendation} className="rounded-xl border border-border bg-background p-4">
                              <div className="flex items-start gap-3">
                                <CheckCircle className="size-4 mt-0.5 shrink-0 text-primary" />
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold text-foreground">{rec.recommendation}</p>
                                    <span className={`text-xs font-bold ${priColor}`}>{rec.priority} Priority</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.rationale}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Data compatibility */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-5">
              <div className="flex items-start gap-3">
                <Globe className="size-5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">External Data Integration — Future Compatibility</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    This dashboard is architected to receive live data from national workforce datasets when available.
                    The following integrations are planned for future releases:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["PERKESO Labour Data", "DOSM Labour Statistics", "HRD Corp Training Data", "MYFutureJobs Vacancy Feed", "National Skills Taxonomy", "MASCO Classifications API"].map(src => (
                      <span key={src} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">{src}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Back to dashboard */}
        <div className="flex items-center justify-between pt-2">
          <Button asChild variant="outline">
            <Link to="/employer/dashboard"><ArrowRight className="mr-2 size-4 rotate-180" /> Back to Dashboard</Link>
          </Button>
          <p className="text-xs text-muted-foreground">MYFutureJobs Workforce Intelligence Platform · Module 11</p>
        </div>

      </main>
    </div>
  );
}
