import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, Mail, Briefcase, GraduationCap, Star, FileText, MapPin, TrendingUp, CheckCircle, XCircle, Target, Award, AlignLeft, Zap, BarChart2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getEmployerCandidate, updateApplicationStatus, type AppStatus } from "@/lib/ops-api";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/employer/candidate/$candidateId")({
  ssr: false,
  component: CandidateProfilePage,
  head: () => ({
    meta: [{ title: "Candidate Profile — MYFutureJobs" }],
  }),
});

function CandidateProfilePage() {
  const { candidateId } = Route.useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [candidateName, setCandidateName] = useState<string>("");
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !candidateId) return;
    (async () => {
      setLoading(true);
      // Wait for session token before calling ops-api
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        setTimeout(() => setLoading(false), 1500);
        return;
      }
      try {
        const result = await getEmployerCandidate(candidateId);
        const data = result as any;
        setEmail(data?.email ?? "");
        setCandidateName(data?.name ?? "");
        setAnalysis(data?.analysis ?? null);
        setApplications(data?.applications ?? []);
        console.log("[ec-page] email:", data?.email, "analysisId:", data?.analysis?.id ?? "none", "apps:", data?.applications?.length ?? 0);
      } catch (e) {
        console.error("[ec-page] fetch error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, candidateId]);

  const res = analysis?.full_results
    ? (typeof analysis.full_results === "string" ? JSON.parse(analysis.full_results) : analysis.full_results)
    : null;

  // ── Extract all CV fields ──────────────────────────────────────────────────
  const skills: string[] = res?.skills_analysis?.current_skills
    ? res.skills_analysis.current_skills.split(/[,;|\n]+/).map((s: string) => s.trim()).filter(Boolean).slice(0, 16)
    : res?.skills
      ? (typeof res.skills === "string" ? res.skills.split(/[,;|\n]+/).map((s: string) => s.trim()).filter(Boolean) : res.skills).slice(0, 16)
      : [];

  const missingSkills: string[] = (() => {
    const raw = res?.skills_analysis?.missing_skills ?? res?.missing_skills ?? "";
    return typeof raw === "string"
      ? raw.split(/[,;|\n]+/).map((s: string) => s.trim()).filter(Boolean).slice(0, 8)
      : (Array.isArray(raw) ? raw.slice(0, 8) : []);
  })();

  const presentKeywords: string[] = res?.keywords?.present_keywords ?? [];
  const missingKeywords: string[] = res?.keywords?.missing_keywords ?? [];
  const priorityImprovements: string[] = res?.priority_improvements ?? [];

  const workExperience: any[] = (() => {
    const w = res?.work_experience ?? res?.experience ?? [];
    return Array.isArray(w) ? w.slice(0, 5) : [];
  })();

  const educationList: any[] = (() => {
    const e = res?.education?.entries ?? res?.education_history ?? [];
    return Array.isArray(e) ? e.slice(0, 3) : [];
  })();

  const salaryMin: number = res?.salary_range?.min ?? 0;
  const salaryMax: number = res?.salary_range?.max ?? 0;
  const salaryLabel = salaryMin > 0
    ? salaryMin > 30000
      ? `RM ${Math.round(salaryMin / 12).toLocaleString()} – RM ${Math.round(salaryMax / 12).toLocaleString()} / mo`
      : `RM ${salaryMin.toLocaleString()} – RM ${salaryMax.toLocaleString()} / mo`
    : null;

  const structureScore: number = res?.structure?.score ?? 0;
  const keywordsScore: number = res?.keywords?.score ?? 0;
  const marketFitScore: number = res?.malaysia_market_fit?.score ?? 0;
  const marketFitFeedback: string[] = res?.malaysia_market_fit?.feedback ?? [];
  const languageScore: number = res?.language_balance?.score ?? 0;
  const structureFeedback: string[] = res?.structure?.feedback ?? [];

  const nameFromCv = res?.personal_info?.full_name ?? res?.name ?? null;
  const displayName = candidateName || nameFromCv || email || null;
  const targetRole = res?.target_role ?? res?.job_match?.target_role ?? null;
  const summary = res?.professional_summary ?? res?.summary ?? null;
  const education = res?.education?.highest_level ?? res?.education_level ?? analysis?.experience_level ?? null;
  const location = res?.personal_info?.location ?? res?.location ?? null;
  const phone = res?.personal_info?.phone ?? null;

  const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
    applied:     { color: "#7c3aed", bg: "#ede9fe" },
    shortlisted: { color: "#1d4ed8", bg: "#dbeafe" },
    interview:   { color: "#0369a1", bg: "#e0f2fe" },
    offered:     { color: "#d97706", bg: "#fef3c7" },
    hired:       { color: "#15803d", bg: "#dcfce7" },
    rejected:    { color: "#dc2626", bg: "#fee2e2" },
    kiv:         { color: "#6b7280", bg: "#f3f4f6" },
  };

  const updateAppStatus = async (appId: string, newStatus: string) => {
    try {
      await updateApplicationStatus(appId, newStatus as AppStatus);
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      toast.success("Status updated");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update status");
    }
  };

  function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color }}>{score}</span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 999, background: color, width: `${score}%`, transition: "width 0.4s" }} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--base)" }}>
        <Loader2 className="size-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  const S = {
    card: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "16px 18px" } as React.CSSProperties,
    sectionTitle: { fontSize: 12, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)", padding: "24px 16px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>

        <Link to="/employer/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--brand)", textDecoration: "none", fontWeight: 600 }}>
          <ArrowLeft className="size-4" /> Back to Dashboard
        </Link>

        {/* ── Hero Card ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "24px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{(displayName ?? candidateId).charAt(0).toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", margin: 0 }}>{displayName ?? "Unknown Candidate"}</h1>
              {targetRole && <p style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, margin: "3px 0 0" }}>{targetRole}</p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 8 }}>
                {email && <span style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}><Mail className="size-3" />{email}</span>}
                {phone && <span style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}><FileText className="size-3" />{phone}</span>}
                {location && <span style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}><MapPin className="size-3" />{location}</span>}
              </div>
            </div>
            {analysis?.overall_score != null && (
              <div style={{ textAlign: "center", background: "rgba(33,31,96,0.07)", borderRadius: "var(--radius-sm)", padding: "12px 20px", flexShrink: 0 }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--brand)", lineHeight: 1 }}>{analysis.overall_score}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>CV Score</div>
              </div>
            )}
          </div>
          {summary && (
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 14, lineHeight: 1.7, borderTop: "1px solid var(--line)", paddingTop: 12 }}>{summary}</p>
          )}
        </div>

        {/* ── Quick Meta Pills ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
          {[
            analysis?.industry    && { icon: Briefcase,       label: "Industry",    val: analysis.industry },
            education             && { icon: GraduationCap,   label: "Education",   val: education },
            analysis?.experience_level && { icon: Star,       label: "Experience",  val: analysis.experience_level },
            analysis?.company_type && { icon: Award,          label: "Target Co.",  val: analysis.company_type },
            salaryLabel           && { icon: TrendingUp,      label: "Salary Range",val: salaryLabel },
          ].filter(Boolean).map((item: any) => (
            <div key={item.label} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
              <item.icon style={{ width: 15, height: 15, color: "var(--accent)", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{item.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{item.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main 2-col layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, alignItems: "start" }}>

          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Skills */}
            {skills.length > 0 && (
              <div style={S.card}>
                <p style={S.sectionTitle}><CheckCircle style={{ width: 14, height: 14, color: "#15803d" }} /> Skills</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {skills.map(sk => (
                    <span key={sk} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "rgba(33,31,96,0.07)", color: "var(--brand)" }}>{sk}</span>
                  ))}
                </div>
                {missingSkills.length > 0 && (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 12, marginBottom: 6 }}>Skill Gaps</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {missingSkills.map(sk => (
                        <span key={sk} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "#fee2e2", color: "#dc2626" }}>{sk}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Work Experience */}
            {workExperience.length > 0 && (
              <div style={S.card}>
                <p style={S.sectionTitle}><Briefcase style={{ width: 14, height: 14, color: "var(--accent)" }} /> Work Experience</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {workExperience.map((exp: any, i: number) => (
                    <div key={i} style={{ paddingLeft: 12, borderLeft: "2px solid var(--line)" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{exp.title ?? exp.position ?? exp.role ?? "Role"}</div>
                      <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{exp.company ?? exp.employer ?? ""}</div>
                      {(exp.duration ?? exp.period ?? exp.dates) && (
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{exp.duration ?? exp.period ?? exp.dates}</div>
                      )}
                      {(exp.description ?? exp.responsibilities) && (
                        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>
                          {typeof (exp.description ?? exp.responsibilities) === "string"
                            ? (exp.description ?? exp.responsibilities).slice(0, 200) + ((exp.description ?? exp.responsibilities).length > 200 ? "…" : "")
                            : Array.isArray(exp.responsibilities)
                              ? exp.responsibilities.slice(0, 3).join(" · ")
                              : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education detail */}
            {educationList.length > 0 && (
              <div style={S.card}>
                <p style={S.sectionTitle}><GraduationCap style={{ width: 14, height: 14, color: "var(--accent)" }} /> Education</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {educationList.map((ed: any, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 5 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{ed.qualification ?? ed.degree ?? ed.level ?? "Qualification"}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{ed.institution ?? ed.school ?? ""}{ed.year ? ` · ${ed.year}` : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {(presentKeywords.length > 0 || missingKeywords.length > 0) && (
              <div style={S.card}>
                <p style={S.sectionTitle}><Target style={{ width: 14, height: 14, color: "var(--accent)" }} /> Keywords</p>
                {presentKeywords.length > 0 && (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#15803d", marginBottom: 6 }}>Present</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                      {presentKeywords.slice(0, 10).map(k => (
                        <span key={k} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "#dcfce7", color: "#15803d", fontWeight: 600 }}>{k}</span>
                      ))}
                    </div>
                  </>
                )}
                {missingKeywords.length > 0 && (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#dc2626", marginBottom: 6 }}>Missing</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {missingKeywords.slice(0, 10).map(k => (
                        <span key={k} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "#fee2e2", color: "#dc2626", fontWeight: 600 }}>{k}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Malaysia Market Fit feedback */}
            {marketFitFeedback.length > 0 && (
              <div style={S.card}>
                <p style={S.sectionTitle}><MapPin style={{ width: 14, height: 14, color: "var(--accent)" }} /> Malaysia Market Fit</p>
                <ul style={{ paddingLeft: 16, margin: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                  {marketFitFeedback.slice(0, 4).map((f, i) => (
                    <li key={i} style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* No analysis fallback */}
            {!analysis && (
              <div style={{ ...S.card, textAlign: "center", padding: 32 }}>
                <FileText style={{ width: 32, height: 32, color: "var(--muted)", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 13, color: "var(--muted)" }}>No CV analysis on file for this candidate.</p>
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* CV Score breakdown */}
            {analysis?.overall_score != null && (
              <div style={S.card}>
                <p style={S.sectionTitle}><BarChart2 style={{ width: 14, height: 14, color: "var(--accent)" }} /> CV Score Breakdown</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ScoreBar label="Overall" score={analysis.overall_score} color="var(--brand)" />
                  {structureScore > 0 && <ScoreBar label="CV Structure" score={structureScore} color="#7c3aed" />}
                  {keywordsScore > 0 && <ScoreBar label="Keywords" score={keywordsScore} color="#0369a1" />}
                  {marketFitScore > 0 && <ScoreBar label="Malaysia Fit" score={marketFitScore} color="#15803d" />}
                  {languageScore > 0 && <ScoreBar label="Language" score={languageScore} color="#d97706" />}
                </div>
              </div>
            )}

            {/* Priority Improvements */}
            {priorityImprovements.length > 0 && (
              <div style={S.card}>
                <p style={S.sectionTitle}><Zap style={{ width: 14, height: 14, color: "#d97706" }} /> Priority Improvements</p>
                <ol style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {priorityImprovements.slice(0, 5).map((imp, i) => (
                    <li key={i} style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{imp}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Applications to this employer's jobs */}
            <div style={S.card}>
              <p style={S.sectionTitle}><AlignLeft style={{ width: 14, height: 14, color: "var(--accent)" }} /> Applications to Your Jobs</p>
              {applications.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>No applications yet.</p>
              ) : (
                <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", margin: 0, padding: 0 }}>
                  {applications.map((a) => {
                    const sc = STATUS_COLOR[a.status] ?? { color: "var(--brand)", bg: "rgba(33,31,96,0.08)" };
                    return (
                      <li key={a.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", borderRadius: "var(--radius-xs)", background: "var(--base)", border: "1px solid var(--line)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{a.job_title}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-xs)", background: sc.bg, color: sc.color, textTransform: "capitalize", whiteSpace: "nowrap" }}>{a.status}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(a.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <Select value={a.status} onValueChange={val => void updateAppStatus(a.id, val)}>
                          <SelectTrigger style={{ height: 28, fontSize: 11, width: "100%" }}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="shortlisted">Shortlisted</SelectItem>
                            <SelectItem value="interview">Screening</SelectItem>
                            <SelectItem value="offered">Offered</SelectItem>
                            <SelectItem value="hired">Hired</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="kiv">KIV</SelectItem>
                          </SelectContent>
                        </Select>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
