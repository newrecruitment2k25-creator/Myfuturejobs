import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, FileText, Award, Brain, MapPin, Briefcase, TrendingUp, CheckCircle2, AlertCircle, ChevronRight, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";

export const Route = createFileRoute("/my-cv")({
  ssr: false,
  component: MyCVPage,
  head: () => ({
    meta: [
      { title: "My CV — PerksoPrax AI" },
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

function ScoreRing({ score }: { score: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#15803d" : score >= 60 ? "#d97706" : "#dc2626";
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" style={{ display: "block" }}>
      <circle cx={48} cy={48} r={r} fill="none" stroke="var(--line)" strokeWidth={8} />
      <circle cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 48 48)" style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={48} y={52} textAnchor="middle" fontSize={22} fontWeight={800} fill={color}>{score}</text>
    </svg>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function MyCVPage() {
  const { user } = useAuth();
  const { checked, loading: roleLoading } = useRoleGuard("job_seeker");
  const [analyses, setAnalyses] = useState<AnalysisRow[] | null>(null);
  const [latest, setLatest] = useState<AnalysisRow | null>(null);

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

  if (roleLoading || !checked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--base)" }}>
        <Loader2 className="size-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  const res = latest?.full_results
    ? (typeof latest.full_results === "string" ? JSON.parse(latest.full_results) : latest.full_results)
    : null;

  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "Jobseeker";
  const targetRole: string = res?.job_match?.target_role ?? res?.target_role ?? res?.current_role ?? "—";
  const skills: string[] = (res?.skills ?? res?.skills_analysis?.skills ?? []).slice(0, 10);
  const missingSkills: string[] = (res?.skills_analysis?.missing_skills ?? "").split(/[,;|\n]+/).map((s: string) => s.trim()).filter(Boolean).slice(0, 6);
  const salaryMin: number = res?.salary_range?.min ?? 0;
  const salaryMax: number = res?.salary_range?.max ?? 0;
  const location: string = res?.location ?? res?.personal_info?.location ?? "";
  const education: string = res?.education?.highest_level ?? res?.education_level ?? "";
  const priorityImprovements: string[] = res?.priority_improvements ?? [];
  const presentKeywords: string[] = res?.keywords?.present_keywords ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Jobseeker Profile</p>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.03em", marginTop: 2 }}>My CV</h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link to="/analyze" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: "var(--radius-xs)", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <Upload className="size-4" /> Analyse New CV
            </Link>
            <Link to="/resume-builder" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: "var(--radius-xs)", background: "rgba(33,31,96,0.07)", border: "1px solid var(--line)", color: "var(--brand)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <FileText className="size-4" /> Build Resume
            </Link>
          </div>
        </div>

        {analyses === null ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 className="size-6 animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : analyses.length === 0 ? (
          /* ── No CV yet ── */
          <div style={{ background: "var(--surface)", border: "2px dashed var(--line)", borderRadius: "var(--radius-md)", padding: "60px 24px", textAlign: "center" }}>
            <FileText style={{ width: 44, height: 44, color: "var(--line-strong)", margin: "0 auto 12px" }} />
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>No CV Analysed Yet</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 380, margin: "0 auto 20px" }}>
              Upload your CV to get an instant AI score, keyword analysis, and personalised job recommendations.
            </p>
            <Link to="/analyze" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: "var(--radius-sm)", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              <Upload className="size-4" /> Analyse My CV
            </Link>
          </div>
        ) : (
          <>
            {/* ── Profile Card ── */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "24px", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start", boxShadow: "var(--shadow-card)" }}>

              {/* Score ring */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <ScoreRing score={latest!.overall_score} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>CV Score</span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", margin: 0 }}>{displayName}</h2>
                    <p style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginTop: 2 }}>{targetRole !== "—" ? targetRole : latest!.industry}</p>
                  </div>
                  <Link to="/results" search={{ id: latest!.id }} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--brand)", background: "rgba(33,31,96,0.07)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", padding: "5px 12px", textDecoration: "none" }}>
                    Full Report <ChevronRight className="size-3.5" />
                  </Link>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 14 }}>
                  {location && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
                      <MapPin className="size-3.5" /> {location}
                    </span>
                  )}
                  {latest!.experience_level && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
                      <Briefcase className="size-3.5" /> {latest!.experience_level}
                    </span>
                  )}
                  {education && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
                      <Award className="size-3.5" /> {education}
                    </span>
                  )}
                  {salaryMin > 0 && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
                      <TrendingUp className="size-3.5" />
                      {salaryMin > 30000
                        ? `RM ${Math.round(salaryMin / 12).toLocaleString()} – RM ${Math.round(salaryMax / 12).toLocaleString()} / mo`
                        : `RM ${salaryMin.toLocaleString()} – RM ${salaryMax.toLocaleString()} / mo`}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Skills</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {skills.length > 0 ? skills.map(sk => (
                      <span key={sk} style={{ fontSize: 11, fontWeight: 600, color: "var(--brand)", background: "rgba(33,31,96,0.07)", borderRadius: 20, padding: "3px 10px" }}>{sk}</span>
                    )) : presentKeywords.slice(0, 8).map(kw => (
                      <span key={kw} style={{ fontSize: 11, fontWeight: 600, color: "var(--brand)", background: "rgba(33,31,96,0.07)", borderRadius: 20, padding: "3px 10px" }}>{kw}</span>
                    ))}
                    {skills.length === 0 && presentKeywords.length === 0 && (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2-col: Improvements + Skill Gaps ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

              {priorityImprovements.length > 0 && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "16px 18px" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle className="size-4" style={{ color: "#d97706" }} /> Priority Improvements
                  </p>
                  <ol style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {priorityImprovements.slice(0, 4).map((imp, i) => (
                      <li key={i} style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{imp}</li>
                    ))}
                  </ol>
                </div>
              )}

              {missingSkills.length > 0 && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "16px 18px" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <Brain className="size-4" style={{ color: "#dc2626" }} /> Skill Gaps to Close
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {missingSkills.map(sk => (
                      <span key={sk} style={{ fontSize: 11, fontWeight: 600, color: "#dc2626", background: "#fee2e2", borderRadius: 20, padding: "3px 10px" }}>{sk}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Analysis History ── */}
            {analyses.length > 1 && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "16px 18px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>Analysis History</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {analyses.map((a, idx) => {
                    const sc = a.overall_score;
                    const scColor = sc >= 80 ? "#15803d" : sc >= 60 ? "#d97706" : "#dc2626";
                    const scBg   = sc >= 80 ? "#dcfce7" : sc >= 60 ? "#fef3c7" : "#fee2e2";
                    return (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: scBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: scColor, flexShrink: 0 }}>{sc}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {a.industry} · {a.company_type}
                            {idx === 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: "var(--accent)", background: "rgba(243,108,33,0.1)", borderRadius: 4, padding: "1px 6px" }}>Latest</span>}
                          </p>
                          <p style={{ fontSize: 10, color: "var(--muted)" }}>{a.experience_level} · {formatDate(a.created_at)}</p>
                        </div>
                        <Link to="/results" search={{ id: a.id }} style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
                          View <ChevronRight className="size-3" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Quick actions ── */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "Build Resume", href: "/resume-builder", bg: "rgba(33,31,96,0.07)", color: "var(--brand)" },
                { label: "Skills Passport", href: "/skills-passport", bg: "rgba(33,31,96,0.07)", color: "var(--brand)" },
                { label: "Career Pathway", href: "/career-pathway", bg: "rgba(33,31,96,0.07)", color: "var(--brand)" },
                { label: "Browse Jobs", href: "/jobs", bg: "var(--accent)", color: "#fff" },
              ].map(({ label, href, bg, color }) => (
                <Link key={label} to={href as any} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: "var(--radius-xs)", background: bg, border: "1px solid var(--line)", color, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                  {label} <ChevronRight className="size-3" />
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
