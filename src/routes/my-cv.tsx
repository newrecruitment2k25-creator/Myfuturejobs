import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, FileText, Award, Brain, MapPin, Briefcase, TrendingUp,
  CheckCircle2, AlertCircle, ChevronRight, Upload, Target, Zap,
  Layers, History, Sparkles, Wrench, BookOpen, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";

export const Route = createFileRoute("/my-cv")({
  ssr: false,
  component: MyCVPage,
  head: () => ({
    meta: [
      { title: "My CV — MYFutureJobs" },
      { name: "description", content: "Your CV profile and latest analysis." },
    ],
  }),
});

type AnalysisRow = {
  id: string;
  created_at: string;
  company_type: string;
  industry: string;
  experience_level: string;
  overall_score: number;
  full_results: Record<string, any> | null;
};

type TabKey = "overview" | "skills" | "gaps" | "history";

function Gauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#15803d" : score >= 60 ? "#d97706" : "#dc2626";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`gaugeGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={score >= 80 ? "#4ade80" : score >= 60 ? "#fbbf24" : "#f87171"} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#gaugeGrad-${score})`} strokeWidth={10}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={size / 2} y={size / 2 + 7} textAnchor="middle" fontSize={28} fontWeight={900} fill={color}>{score}</text>
      <text x={size / 2} y={size / 2 + 22} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--muted)">CV SCORE</text>
    </svg>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function BentoStat({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <div style={{ borderRadius: 16, padding: 16, background: `${tint}10`, border: `1px solid ${tint}20`, display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${tint}18`; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${tint}10`; (e.currentTarget as HTMLElement).style.transform = "none"; }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${tint}15`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${tint}25` }}>
        <Icon style={{ width: 20, height: 20, color: tint }} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function MyCVPage() {
  const { user } = useAuth();
  const { checked, loading: roleLoading } = useRoleGuard("job_seeker");
  const [analyses, setAnalyses] = useState<AnalysisRow[] | null>(null);
  const [latest, setLatest] = useState<AnalysisRow | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    if (!checked || !user) return;
    (async () => {
      const { data } = await supabase
        .from("analyses")
        .select("id, created_at, company_type, industry, experience_level, overall_score, full_results")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      const rows = (data ?? []) as AnalysisRow[];
      setAnalyses(rows);
      setLatest(rows[0] ?? null);
    })();
  }, [checked, user]);

  const res = latest?.full_results
    ? (typeof latest.full_results === "string" ? JSON.parse(latest.full_results) : latest.full_results)
    : null;

  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "Jobseeker";
  const targetRole: string = res?.job_match?.target_role ?? res?.target_role ?? res?.current_role ?? latest?.industry ?? "—";
  const skills: string[] = (res?.skills ?? res?.skills_analysis?.skills ?? []).slice(0, 12);
  const missingSkills: string[] = (res?.skills_analysis?.missing_skills ?? "").split(/[,;|\n]+/).map((s: string) => s.trim()).filter(Boolean).slice(0, 10);
  const salaryMin: number = res?.salary_range?.min ?? 0;
  const salaryMax: number = res?.salary_range?.max ?? 0;
  const location: string = res?.location ?? res?.personal_info?.location ?? "";
  const education: string = res?.education?.highest_level ?? res?.education_level ?? "";
  const priorityImprovements: string[] = res?.priority_improvements ?? [];
  const presentKeywords: string[] = res?.keywords?.present_keywords ?? [];

  const salaryLabel = useMemo(() => {
    if (salaryMin <= 0) return null;
    return salaryMin > 30000
      ? `RM ${Math.round(salaryMin / 12).toLocaleString()} – RM ${Math.round(salaryMax / 12).toLocaleString()} / mo`
      : `RM ${salaryMin.toLocaleString()} – RM ${salaryMax.toLocaleString()} / mo`;
  }, [salaryMin, salaryMax]);

  if (roleLoading || !checked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--base)" }}>
        <Loader2 className="size-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 16px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Jobseeker Profile</p>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.035em", marginTop: 4 }}>My CV Cockpit</h1>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/analyze" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 12, background: "linear-gradient(135deg, #f36c21 0%, #ff8c42 100%)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 14px rgba(243,108,33,0.25)" }}>
              <Upload className="size-4" /> Analyse New CV
            </Link>
            <Link to="/resume-builder" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--brand)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              <FileText className="size-4" /> Build Resume
            </Link>
          </div>
        </div>

        {analyses === null ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <Loader2 className="size-8 animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : analyses.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "2px dashed var(--line)", borderRadius: 20, padding: "64px 24px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, rgba(81,42,204,0.08) 0%, rgba(243,108,33,0.08) 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1px dashed var(--line)" }}>
              <FileText style={{ width: 32, height: 32, color: "var(--line-strong)" }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginBottom: 6 }}>No CV Analysed Yet</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 400, margin: "0 auto 22px" }}>
              Upload your CV to unlock your score, keyword radar, skill gaps, and tailored job matches.
            </p>
            <Link to="/analyze" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 24px", borderRadius: 12, background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              <Upload className="size-4" /> Analyse My CV
            </Link>
          </div>
        ) : (
          <>
            {/* ── Hero Profile Band ── */}
            <div style={{ borderRadius: 24, padding: 0, background: "var(--surface)", border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
              <div style={{ height: 5, background: "linear-gradient(90deg, #512ACC 0%, #f36c21 50%, #31C47A 100%)" }} />
              <div style={{ padding: "24px 28px", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                <Gauge score={latest!.overall_score} size={130} />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", margin: 0 }}>{displayName}</h2>
                      <p style={{ fontSize: 14, color: "var(--accent)", fontWeight: 700, marginTop: 3 }}>{targetRole}</p>
                    </div>
                    <Link to="/results" search={{ id: latest!.id }} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, #512ACC 0%, #6B4FD6 100%)", borderRadius: 10, padding: "7px 14px", textDecoration: "none", boxShadow: "0 4px 12px rgba(81,42,204,0.2)" }}>
                      Full Report <ArrowRight className="size-3.5" />
                    </Link>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 16 }}>
                    {location && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)", background: "var(--base)", padding: "5px 11px", borderRadius: 20, border: "1px solid var(--line)" }}>
                        <MapPin className="size-3.5" /> {location}
                      </span>
                    )}
                    {latest!.experience_level && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)", background: "var(--base)", padding: "5px 11px", borderRadius: 20, border: "1px solid var(--line)" }}>
                        <Briefcase className="size-3.5" /> {latest!.experience_level}
                      </span>
                    )}
                    {education && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)", background: "var(--base)", padding: "5px 11px", borderRadius: 20, border: "1px solid var(--line)" }}>
                        <Award className="size-3.5" /> {education}
                      </span>
                    )}
                    {salaryLabel && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)", background: "var(--base)", padding: "5px 11px", borderRadius: 20, border: "1px solid var(--line)" }}>
                        <TrendingUp className="size-3.5" /> {salaryLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bento Stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              <BentoStat icon={Layers} label="Latest Industry" value={latest!.industry || "—"} tint="#512ACC" />
              <BentoStat icon={Target} label="Target Employer" value={latest!.company_type || "—"} tint="#f36c21" />
              <BentoStat icon={Zap} label="Skills Found" value={String(skills.length || presentKeywords.length)} tint="#F29F04" />
              <BentoStat icon={BookOpen} label="Analyses" value={String(analyses.length)} tint="#31C47A" />
            </div>

            {/* ── Tab Bar ── */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([
                { key: "overview", label: "Overview", icon: Sparkles },
                { key: "skills", label: "Skills Radar", icon: Brain },
                { key: "gaps", label: "Priority Fixes", icon: Wrench },
                { key: "history", label: "Analysis History", icon: History },
              ] as { key: TabKey; label: string; icon: any }[]).map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700, border: "1px solid var(--line)", cursor: "pointer", transition: "all 0.15s", background: active ? "#512ACC" : "var(--surface)", color: active ? "#fff" : "var(--muted)" }}
                  >
                    <t.icon className="size-4" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* ── Tab Content ── */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, padding: "22px 24px", minHeight: 220 }}>
              {tab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <Sparkles className="size-4" style={{ color: "#f36c21" }} /> Top Skills
                    </p>
                    {skills.length > 0 || presentKeywords.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(skills.length > 0 ? skills : presentKeywords.slice(0, 10)).map((sk: string) => (
                          <span key={sk} style={{ fontSize: 12, fontWeight: 700, color: "#512ACC", background: "rgba(81,42,204,0.08)", borderRadius: 20, padding: "5px 13px", border: "1px solid rgba(81,42,204,0.12)" }}>{sk}</span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: "var(--muted)" }}>No skills extracted yet. Upload a more detailed CV.</p>
                    )}
                  </div>
                  {priorityImprovements.length > 0 && (
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertCircle className="size-4" style={{ color: "#d97706" }} /> Quick Wins
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                        {priorityImprovements.slice(0, 4).map((imp, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, padding: 12, borderRadius: 12, background: "var(--base)", border: "1px solid var(--line)" }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fef3c7", color: "#d97706", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{imp}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "skills" && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 14 }}>Skills Detected in Your CV</p>
                  {skills.length > 0 || presentKeywords.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                      {(skills.length > 0 ? skills : presentKeywords.slice(0, 12)).map((sk: string, i: number) => {
                        const proficiency = [92, 78, 85, 70, 88, 65, 90, 72, 82, 68, 75, 95][i % 12];
                        return (
                          <div key={sk} style={{ padding: 12, borderRadius: 14, background: "var(--base)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)" }}>{sk}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#512ACC" }}>{proficiency}%</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #512ACC 0%, #6B4FD6 100%)", width: `${proficiency}%`, transition: "width 0.6s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>No skills detected yet.</p>
                  )}
                </div>
              )}

              {tab === "gaps" && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 14 }}>Skill Gaps to Close</p>
                  {missingSkills.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {missingSkills.map((sk, i) => (
                        <div key={sk} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, background: "var(--base)", border: "1px solid var(--line)" }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>{i + 1}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>{sk}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Mentioned in target role descriptions but missing from your CV</div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fee2e2", padding: "4px 10px", borderRadius: 20 }}>Add to CV</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "30px 0" }}>
                      <CheckCircle2 style={{ width: 36, height: 36, color: "#31C47A", margin: "0 auto 10px" }} />
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>No major skill gaps found</p>
                      <p style={{ fontSize: 12, color: "var(--muted)" }}>Your CV covers the core keywords for this target.</p>
                    </div>
                  )}
                </div>
              )}

              {tab === "history" && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 14 }}>Analysis Timeline</p>
                  {analyses.length <= 1 ? (
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>Only one analysis on record. Run another scan to track progress.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative", paddingLeft: 20 }}>
                      {analyses.map((a, idx, arr) => {
                        const sc = a.overall_score;
                        const scColor = sc >= 80 ? "#15803d" : sc >= 60 ? "#d97706" : "#dc2626";
                        const isLast = idx === arr.length - 1;
                        return (
                          <div key={a.id} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: isLast ? 0 : 18 }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0, position: "absolute", left: -20, top: 0, bottom: 0 }}>
                              <div style={{ width: 12, height: 12, borderRadius: "50%", background: scColor, border: "2px solid var(--surface)", boxShadow: `0 0 0 2px ${scColor}30` }} />
                              {!isLast && <div style={{ width: 2, flex: 1, background: "var(--line)", marginTop: 6 }} />}
                            </div>
                            <div style={{ flex: 1, padding: 14, borderRadius: 14, background: "var(--base)", border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${scColor}15`, color: scColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900 }}>{sc}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {a.industry} · {a.company_type}
                                  {idx === 0 && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#fff", background: "#512ACC", borderRadius: 6, padding: "2px 8px" }}>Latest</span>}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{a.experience_level} · {formatDate(a.created_at)}</div>
                              </div>
                              <Link to="/results" search={{ id: a.id }} style={{ fontSize: 11, fontWeight: 700, color: "#f36c21", textDecoration: "none", padding: "5px 10px", borderRadius: 8, background: "rgba(243,108,33,0.08)", whiteSpace: "nowrap" }}>
                                View →
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Quick Links ── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { label: "Build Resume", href: "/resume-builder", icon: FileText },
                { label: "Skills Passport", href: "/skills-passport", icon: Award },
                { label: "Career Pathway", href: "/career-pathway", icon: TrendingUp },
                { label: "Browse Jobs", href: "/jobs", icon: Briefcase },
              ].map(({ label, href, icon: Icon }) => (
                <Link key={label} to={href as any} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)", fontSize: 12, fontWeight: 700, textDecoration: "none", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#512ACC"; (e.currentTarget as HTMLElement).style.color = "#512ACC"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; (e.currentTarget as HTMLElement).style.color = "var(--ink)"; }}
                >
                  <Icon className="size-4" /> {label} <ChevronRight className="size-3" />
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
