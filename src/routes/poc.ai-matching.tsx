import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Brain, Briefcase, Users, Search, Sparkles, Loader2, ArrowRight,
  CheckCircle2, XCircle, Target, MapPin, GraduationCap, DollarSign,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/poc/ai-matching")({
  ssr: false,
  component: PocAiMatchingPage,
  head: () => ({
    meta: [
      { title: "AI Matching Demo  Praxo AI" },
      { name: "description", content: "Semantic candidate matching, skill gap analysis, and explainable AI recommendation demo for PERKESO." },
    ],
  }),
});

type Vacancy = {
  id: string;
  job_title: string | null;
  occupation_name: string | null;
  state: string | null;
  city: string | null;
  salary: string | null;
  skills: string | null;
};

type Candidate = {
  id: string;
  preferred_name: string | null;
  previous_occupation: string | null;
  skills: string | null;
  preferred_state: string | null;
  preferred_salary: string | null;
  semanticScore: number;
};

type SkillGap = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  recommendedTraining: string[];
  summary: string;
  nextSteps: string[];
};

type Explanation = {
  summary: string;
  strengths: string[];
  gaps: string[];
  skillGap: { matchedSkills: string[]; missingSkills: string[]; recommendedTraining: string[] };
  salaryFit: string;
  locationFit: string;
  experienceFit: string;
  recommendation: string;
  confidence: number;
};

type MatchReport = {
  ok: boolean;
  candidate?: any;
  vacancy?: any;
  semanticScore: number | null;
  matchScore: number;
  skillGap: SkillGap;
  explanation: Explanation;
  error?: string;
};

/*  Tiny design-system helpers  */
const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: "1.25rem",
};

const sectionLabel: React.CSSProperties = {
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--accent-blue)",
  marginBottom: "0.625rem",
};

function ScorePill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ ...card, padding: "1rem", textAlign: "center" as const, borderTop: `3px solid ${color}` }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function SkillTag({ label, variant }: { label: string; variant: "match" | "miss" | "transfer" | "train" }) {
  const styles = {
    match:    { background: "rgba(13,124,102,0.08)", color: "#0d7c66", border: "1px solid rgba(13,124,102,0.2)" },
    miss:     { background: "rgba(185,28,28,0.07)",  color: "#b91c1c", border: "1px solid rgba(185,28,28,0.18)" },
    transfer: { background: "rgba(32,82,149,0.08)",  color: "#205295", border: "1px solid rgba(32,82,149,0.2)" },
    train:    { background: "rgba(180,120,14,0.08)", color: "#b47c0e", border: "1px solid rgba(180,120,14,0.2)" },
  }[variant];
  return (
    <span style={{ ...styles, borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, padding: "3px 10px", display: "inline-block" }}>
      {label}
    </span>
  );
}

function PocAiMatchingPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [vacancyLoading, setVacancyLoading] = useState(true);
  const [vacancyError, setVacancyError] = useState<string | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [vacancySearch, setVacancySearch] = useState("");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [candidateWarning, setCandidateWarning] = useState<string | null>(null);

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [report, setReport] = useState<MatchReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setVacancyLoading(true);
        const { data, error } = await supabase
          .from("poc_vacancies")
          .select("id, job_title, occupation_name, state, city, salary, skills")
          .order("id", { ascending: true })
          .limit(50);
        if (cancelled) return;
        if (error) throw error;
        setVacancies((data as Vacancy[]) ?? []);
      } catch (e: any) {
        setVacancyError(e?.message ?? "Failed to load vacancies");
      } finally {
        setVacancyLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredVacancies = useMemo(() => {
    if (!vacancySearch.trim()) return vacancies;
    const q = vacancySearch.toLowerCase();
    return vacancies.filter((v) =>
      (v.job_title ?? "").toLowerCase().includes(q) ||
      (v.occupation_name ?? "").toLowerCase().includes(q) ||
      (v.state ?? "").toLowerCase().includes(q)
    );
  }, [vacancies, vacancySearch]);

  async function findMatchingCandidates() {
    if (!selectedVacancy) return;
    setCandidateLoading(true);
    setCandidateError(null);
    setCandidateWarning(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setReport(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "match_candidates_for_vacancy", vacancy_id: selectedVacancy.id, limit: 10 }),
      });
      const data = await res.json();
      if (!data.ok) { setCandidateError(data.error ?? "Matching failed"); return; }
      setCandidates(data.candidates ?? []);
      if (data.warning) setCandidateWarning(data.warning);
    } catch (e: any) {
      setCandidateError(e?.message ?? "Network error");
    } finally {
      setCandidateLoading(false);
    }
  }

  async function generateReport(candidate: Candidate) {
    if (!selectedVacancy) return;
    setSelectedCandidate(candidate);
    setReportLoading(true);
    setReportError(null);
    setReport(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "candidate_match_report", candidate_id: candidate.id, vacancy_id: selectedVacancy.id }),
      });
      const data = await res.json();
      if (!data.ok) { setReportError(data.error ?? "Report failed"); return; }
      setReport(data as MatchReport);
    } catch (e: any) {
      setReportError(e?.message ?? "Network error");
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--base-alt)" }}>
      {/*  Page header  */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--line)", padding: "1.5rem 2rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-blue)", background: "rgba(32,82,149,0.08)", borderRadius: 6, padding: "3px 10px" }}>PERKESO POC</span>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Semantic AI Demonstration</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.25rem,3vw,1.75rem)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.025em", margin: 0 }}>
            AI Candidate Matching
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--muted)", marginTop: 6, maxWidth: 640, lineHeight: 1.6 }}>
            Select a vacancy  run semantic matching  pick a candidate  generate an explainable AI match report.
          </p>
          {/* Status chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {[
              { Icon: Briefcase, label: "5,828 Vacancies" },
              { Icon: Users,     label: "1,449 Candidates" },
              { Icon: Search,    label: "Vector Search Active" },
              { Icon: Brain,     label: "Semantic AI Enabled" },
            ].map(({ Icon, label }) => (
              <div key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(32,82,149,0.07)", border: "1px solid rgba(32,82,149,0.15)", borderRadius: 6, padding: "4px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--accent-blue)" }}>
                <Icon size={13} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/*  3-column layout  */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "1.5rem 2rem", display: "grid", gridTemplateColumns: "280px 240px 1fr", gap: "1.25rem", alignItems: "start" }}>

        {/*  Col 1: Vacancy selector  */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={card}>
            <div style={sectionLabel}>1. Select Vacancy</div>
            {vacancyLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: "0.875rem" }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading
              </div>
            ) : vacancyError ? (
              <div style={{ color: "#b91c1c", fontSize: "0.875rem", display: "flex", gap: 6 }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {vacancyError}
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Search vacancies"
                  value={vacancySearch}
                  onChange={e => setVacancySearch(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", fontSize: "0.8125rem", outline: "none", marginBottom: "0.625rem", color: "var(--ink)", background: "#fff", boxSizing: "border-box" }}
                />
                <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {filteredVacancies.length === 0 && <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>No vacancies found.</p>}
                  {filteredVacancies.map(v => (
                    <button key={v.id}
                      onClick={() => { setSelectedVacancy(v); setCandidates([]); setSelectedCandidate(null); setReport(null); setCandidateError(null); setCandidateWarning(null); }}
                      style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: selectedVacancy?.id === v.id ? "2px solid var(--accent-blue)" : "1px solid var(--line)", background: selectedVacancy?.id === v.id ? "rgba(32,82,149,0.05)" : "#fff", cursor: "pointer", transition: "all 0.1s" }}
                    >
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>{v.job_title || v.occupation_name || "Untitled"}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{v.state}{v.city ? `, ${v.city}` : ""}{v.salary ? `  ${v.salary}` : ""}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Find button */}
          <div style={card}>
            <div style={sectionLabel}>2. Run Matching</div>
            <button
              onClick={findMatchingCandidates}
              disabled={!selectedVacancy || candidateLoading}
              style={{ width: "100%", background: selectedVacancy && !candidateLoading ? "var(--accent-blue)" : "var(--line)", color: selectedVacancy && !candidateLoading ? "#fff" : "var(--muted)", border: "none", borderRadius: 8, padding: "10px 0", fontSize: "0.875rem", fontWeight: 700, cursor: selectedVacancy && !candidateLoading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.15s" }}
            >
              {candidateLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
              Find Candidates
            </button>
            {candidateError && (
              <div style={{ marginTop: 10, color: "#b91c1c", fontSize: "0.8125rem", display: "flex", gap: 6 }}>
                <XCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {candidateError}
              </div>
            )}
            {candidateWarning && (
              <div style={{ marginTop: 10, color: "#b47c0e", fontSize: "0.8125rem", display: "flex", gap: 6 }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> Semantic matching not available for this vacancy yet. Try another.
              </div>
            )}
          </div>
        </div>

        {/*  Col 2: Candidate list  */}
        <div style={card}>
          <div style={sectionLabel}>3. Candidates</div>
          {candidates.length === 0 && !candidateLoading && (
            <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Run matching to see candidates.</p>
          )}
          {candidateLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: "0.875rem" }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Matching
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {candidates.map(c => {
              const pct = Math.round((c.semanticScore ?? 0) * 100);
              const isSelected = selectedCandidate?.id === c.id;
              return (
                <div key={c.id} style={{ border: isSelected ? "2px solid var(--accent-blue)" : "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: isSelected ? "rgba(32,82,149,0.04)" : "#fff" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink)" }}>{c.preferred_name || c.previous_occupation || `Candidate ${c.id.slice(0, 6)}`}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{c.previous_occupation || ""}</div>
                    </div>
                    <span style={{ flexShrink: 0, background: pct >= 70 ? "rgba(13,124,102,0.1)" : "rgba(32,82,149,0.08)", color: pct >= 70 ? "#0d7c66" : "var(--accent-blue)", borderRadius: 6, fontSize: "0.75rem", fontWeight: 800, padding: "2px 8px" }}>{pct}%</span>
                  </div>
                  {c.skills && <div style={{ fontSize: "0.6875rem", color: "var(--muted)", marginBottom: 6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{c.skills}</div>}
                  {/* Score bar */}
                  <div style={{ height: 4, background: "var(--line)", borderRadius: 2, marginBottom: 8 }}>
                    <div style={{ height: 4, width: `${pct}%`, background: pct >= 70 ? "#0d7c66" : "var(--accent-blue)", borderRadius: 2, transition: "width 0.4s ease" }} />
                  </div>
                  <button
                    onClick={() => generateReport(c)}
                    disabled={reportLoading}
                    style={{ width: "100%", background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 0", fontSize: "0.75rem", fontWeight: 600, color: "var(--accent-blue)", cursor: reportLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                  >
                    {reportLoading && isSelected ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={11} />}
                    Generate Report
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/*  Col 3: AI Match Report  */}
        <div style={card}>
          <div style={sectionLabel}>4. AI Match Report</div>

          {!report && !reportLoading && !reportError && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 220, textAlign: "center", color: "var(--muted)" }}>
              <Target size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: "0.875rem" }}>Select a candidate and generate a report.</p>
            </div>
          )}

          {reportLoading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 220, textAlign: "center", color: "var(--muted)" }}>
              <Loader2 size={28} style={{ marginBottom: 12, animation: "spin 1s linear infinite", color: "var(--accent-blue)" }} />
              <p style={{ fontSize: "0.875rem" }}>Generating AI match report</p>
            </div>
          )}

          {reportError && (
            <div style={{ color: "#b91c1c", fontSize: "0.875rem", display: "flex", gap: 8 }}>
              <XCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {reportError}
            </div>
          )}

          {report && report.ok && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Score row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem" }}>
                <ScorePill label="Match Score"        value={`${report.matchScore}`}                                                                 color="var(--accent-blue)" />
                <ScorePill label="Semantic Similarity" value={report.semanticScore != null ? `${Math.round(report.semanticScore * 100)}%` : ""} color="#205295" />
                <ScorePill label="Skill Match"        value={`${report.skillGap.score}%`}                                                            color="#0d7c66" />
              </div>

              {/* Summary */}
              <div style={{ background: "rgba(32,82,149,0.04)", border: "1px solid rgba(32,82,149,0.12)", borderLeft: "3px solid var(--accent-blue)", borderRadius: 8, padding: "0.875rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-blue)" }}>
                  <Brain size={13} /> Summary
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>{report.explanation.summary}</p>
              </div>

              {/* Fit row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem" }}>
                {[
                  { Icon: DollarSign,   label: "Salary Fit",     value: report.explanation.salaryFit },
                  { Icon: MapPin,       label: "Location Fit",   value: report.explanation.locationFit },
                  { Icon: GraduationCap,label: "Experience Fit", value: report.explanation.experienceFit },
                ].map(({ Icon, label, value }) => (
                  <div key={label} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                      <Icon size={12} style={{ color: "var(--accent-blue)" }} /> {label}
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--muted)", textTransform: "capitalize" }}>{value || "Unknown"}</div>
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              <div style={{ background: "rgba(32,82,149,0.05)", border: "1px solid rgba(32,82,149,0.18)", borderRadius: 8, padding: "0.875rem 1rem" }}>
                <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-blue)", marginBottom: 6 }}>Recommendation</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ background: "var(--accent-blue)", color: "#fff", borderRadius: 6, fontSize: "0.8125rem", fontWeight: 700, padding: "4px 12px", textTransform: "capitalize" }}>
                    {report.explanation.recommendation.replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Confidence: <strong style={{ color: "var(--ink)" }}>{report.explanation.confidence}%</strong></span>
                </div>
              </div>

              {/* Strengths + Gaps */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "0.875rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 700, color: "#0d7c66", marginBottom: 8 }}>
                    <CheckCircle2 size={12} /> Strengths
                  </div>
                  {report.explanation.strengths.length === 0 ? <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>None listed.</p> : (
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                      {report.explanation.strengths.map((s, i) => (
                        <li key={i} style={{ fontSize: "0.8125rem", color: "var(--muted)", display: "flex", gap: 6 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#0d7c66", flexShrink: 0, marginTop: 5 }} />{s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "0.875rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 700, color: "#b91c1c", marginBottom: 8 }}>
                    <XCircle size={12} /> Gaps
                  </div>
                  {report.explanation.gaps.length === 0 ? <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>None listed.</p> : (
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                      {report.explanation.gaps.map((g, i) => (
                        <li key={i} style={{ fontSize: "0.8125rem", color: "var(--muted)", display: "flex", gap: 6 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#b91c1c", flexShrink: 0, marginTop: 5 }} />{g}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Skill tags */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {report.skillGap.matchedSkills.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Matched Skills</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {report.skillGap.matchedSkills.map((s, i) => <SkillTag key={i} label={s} variant="match" />)}
                    </div>
                  </div>
                )}
                {report.skillGap.missingSkills.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Missing Skills</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {report.skillGap.missingSkills.map((s, i) => <SkillTag key={i} label={s} variant="miss" />)}
                    </div>
                  </div>
                )}
                {report.skillGap.transferableSkills.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Transferable Skills</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {report.skillGap.transferableSkills.map((s, i) => <SkillTag key={i} label={s} variant="transfer" />)}
                    </div>
                  </div>
                )}
                {report.skillGap.recommendedTraining.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Recommended Training</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {report.skillGap.recommendedTraining.map((s, i) => <SkillTag key={i} label={s} variant="train" />)}
                    </div>
                  </div>
                )}
                {report.skillGap.nextSteps.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "0.875rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Next Steps</div>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                      {report.skillGap.nextSteps.map((step, i) => (
                        <li key={i} style={{ fontSize: "0.8125rem", color: "var(--muted)", display: "flex", gap: 8 }}>
                          <ArrowRight size={13} style={{ color: "var(--accent-blue)", flexShrink: 0, marginTop: 2 }} />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
