import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Brain, Loader2, ArrowRight, CheckCircle2, XCircle,
  GitBranch, Sparkles, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/skill-gap")({
  ssr: false,
  component: SkillGapPage,
  head: () => ({
    meta: [
      { title: "Skill Gap Analysis — MYFutureJobs" },
      { name: "description", content: "Compare candidate skills to a target vacancy and identify missing skills, transferable competencies, and recommended training." },
    ],
  }),
});

type Candidate = { id: string; preferred_name: string | null; previous_occupation: string | null; skills: string | null };
type Vacancy   = { id: string; job_title: string | null; occupation_name: string | null; skills: string | null };
type SkillGap  = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  recommendedTraining: string[];
  summary: string;
  nextSteps: string[];
};

function Tag({ label, variant }: { label: string; variant: "match" | "miss" | "transfer" | "train" }) {
  const s = {
    match:    { background: "rgba(49,196,122,0.09)",  color: "#31C47A", border: "1px solid rgba(49,196,122,0.22)" },
    miss:     { background: "rgba(185,28,28,0.07)",   color: "#b91c1c", border: "1px solid rgba(185,28,28,0.18)" },
    transfer: { background: "rgba(81,42,204,0.08)",   color: "#512ACC", border: "1px solid rgba(81,42,204,0.2)" },
    train:    { background: "rgba(180,120,14,0.08)",  color: "#b47c0e", border: "1px solid rgba(180,120,14,0.2)" },
  }[variant];
  return <span style={{ ...s, borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, padding: "3px 10px" }}>{label}</span>;
}

function SkillGapPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [vacancies,  setVacancies]  = useState<Vacancy[]>([]);
  const [loaded,     setLoaded]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [selectedC,  setSelectedC]  = useState<Candidate | null>(null);
  const [selectedV,  setSelectedV]  = useState<Vacancy | null>(null);
  const [result,     setResult]     = useState<SkillGap | null>(null);
  const [running,    setRunning]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [noPocLink,  setNoPocLink]  = useState(false);

  async function loadData() {
    setLoading(true);
    const { data: vacs } = await supabase.from("poc_vacancies").select("id,job_title,occupation_name,skills").limit(30);
    setVacancies((vacs as Vacancy[]) ?? []);

    let cands: Candidate[] = [];
    if (user) {
      try {
        const { data: prof } = await supabase.from("profiles").select("poc_candidate_id").eq("id", user.id).maybeSingle();
        const pocId = (prof as any)?.poc_candidate_id;
        if (pocId) {
          const { data: cand } = await supabase.from("poc_candidates").select("id,preferred_name,previous_occupation,skills").eq("candidate_id", pocId).maybeSingle();
          if (cand) cands = [cand as Candidate];
          else setNoPocLink(true);
        } else {
          setNoPocLink(true);
        }
      } catch (e) {
        console.warn("Skill gap candidate load failed:", e);
      }
    } else {
      setNoPocLink(true);
    }
    setCandidates(cands);
    setLoaded(true);
    setLoading(false);
  }

  async function runAnalysis() {
    if (!selectedC || !selectedV) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze_skill_gap", candidate_id: selectedC.id, vacancy_id: selectedV.id }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Analysis failed"); return; }
      setResult(data.skillGap as SkillGap);
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setRunning(false);
    }
  }

  const card: React.CSSProperties = { background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--base-alt)" }}>
      {/* Page header */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--line)", padding: "1.5rem 2rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#31C47A", background: "rgba(49,196,122,0.08)", borderRadius: 6, padding: "3px 10px" }}>Intelligence</span>
            <Link to="/poc/ai-matching" style={{ fontSize: "0.75rem", color: "var(--muted)", textDecoration: "none" }}>← AI Matching</Link>
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.25rem,3vw,1.75rem)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.025em", margin: 0 }}>
            Skill Gap Analysis
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--muted)", marginTop: 6, maxWidth: 560, lineHeight: 1.6 }}>
            Select a candidate and a target vacancy to identify matched skills, missing competencies, and recommended training.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Load data */}
        {!loaded && (
          <div style={card}>
            <button
              onClick={loadData}
              disabled={loading}
              style={{ background: "#31C47A", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: "0.875rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Brain size={14} />}
              Load Candidates & Vacancies
            </button>
          </div>
        )}

        {loaded && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            {/* Candidate picker */}
            <div style={card}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#31C47A", marginBottom: "0.75rem" }}>1. Select Candidate</div>
              {noPocLink ? (
                <div style={{ padding: "12px", background: "rgba(185,28,28,0.05)", border: "1px solid rgba(185,28,28,0.15)", borderRadius: 8, fontSize: "0.8125rem", color: "#b91c1c", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={14} />
                  No PERKESO candidate linked to your account. Contact admin to link your profile.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                  {candidates.map(c => (
                    <button key={c.id} onClick={() => setSelectedC(c)}
                      style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: selectedC?.id === c.id ? "2px solid #31C47A" : "1px solid var(--line)", background: selectedC?.id === c.id ? "rgba(49,196,122,0.05)" : "#fff", cursor: "pointer" }}
                    >
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink)" }}>{c.preferred_name || c.previous_occupation || `Candidate ${c.id.slice(0,8)}`}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{c.previous_occupation || "—"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vacancy picker */}
            <div style={card}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#31C47A", marginBottom: "0.75rem" }}>2. Select Target Vacancy</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                {vacancies.map(v => (
                  <button key={v.id} onClick={() => setSelectedV(v)}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: selectedV?.id === v.id ? "2px solid #31C47A" : "1px solid var(--line)", background: selectedV?.id === v.id ? "rgba(49,196,122,0.05)" : "#fff", cursor: "pointer" }}
                  >
                    <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink)" }}>{v.job_title || v.occupation_name || "Untitled"}</div>
                    {v.skills && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{v.skills.slice(0,60)}…</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Run button */}
        {loaded && (
          <div style={card}>
            <button
              onClick={runAnalysis}
              disabled={!selectedC || !selectedV || running}
              style={{ background: selectedC && selectedV && !running ? "#31C47A" : "var(--line)", color: selectedC && selectedV && !running ? "#fff" : "var(--muted)", border: "none", borderRadius: 8, padding: "10px 28px", fontSize: "0.875rem", fontWeight: 700, cursor: selectedC && selectedV && !running ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {running ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
              Run Skill Gap Analysis
            </button>
            {error && (
              <div style={{ marginTop: 10, color: "#b91c1c", fontSize: "0.875rem", display: "flex", gap: 6 }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Score */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
              <div style={{ ...card, textAlign: "center", borderTop: "3px solid #31C47A" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 800, color: "#31C47A" }}>{result.score}%</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>Skill Match Score</div>
              </div>
              <div style={{ ...card, textAlign: "center", borderTop: "3px solid #512ACC" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 800, color: "#512ACC" }}>{result.matchedSkills.length}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>Matched Skills</div>
              </div>
              <div style={{ ...card, textAlign: "center", borderTop: "3px solid #b91c1c" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 800, color: "#b91c1c" }}>{result.missingSkills.length}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>Missing Skills</div>
              </div>
            </div>

            {/* Summary */}
            {result.summary && (
              <div style={{ ...card, borderLeft: "3px solid #31C47A" }}>
                <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#31C47A", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Brain size={12} /> Summary
                </div>
                <p style={{ fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>{result.summary}</p>
              </div>
            )}

            {/* Skill tags grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 700, color: "#31C47A", marginBottom: 10 }}><CheckCircle2 size={12} /> Matched Skills</div>
                {result.matchedSkills.length === 0 ? <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>None identified.</p> : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{result.matchedSkills.map((s, i) => <Tag key={i} label={s} variant="match" />)}</div>
                )}
              </div>
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 700, color: "#b91c1c", marginBottom: 10 }}><XCircle size={12} /> Missing Skills</div>
                {result.missingSkills.length === 0 ? <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>None identified.</p> : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{result.missingSkills.map((s, i) => <Tag key={i} label={s} variant="miss" />)}</div>
                )}
              </div>
            </div>

            {result.transferableSkills.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><GitBranch size={12} style={{ color: "#512ACC" }} /> Transferable Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{result.transferableSkills.map((s, i) => <Tag key={i} label={s} variant="transfer" />)}</div>
              </div>
            )}

            {result.recommendedTraining.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Recommended Training</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{result.recommendedTraining.map((s, i) => <Tag key={i} label={s} variant="train" />)}</div>
              </div>
            )}

            {result.nextSteps.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Next Steps</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.nextSteps.map((step, i) => (
                    <li key={i} style={{ fontSize: "0.875rem", color: "var(--muted)", display: "flex", gap: 8 }}>
                      <ArrowRight size={13} style={{ color: "#31C47A", flexShrink: 0, marginTop: 2 }} />{step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
