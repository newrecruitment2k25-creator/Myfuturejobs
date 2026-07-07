import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import {
  Upload, FileText, Loader2, CheckCircle2, ChevronRight,
  Brain, Zap, Clock, ArrowRight, X, AlertCircle,
} from "lucide-react";
import { extractPdfText } from "@/lib/pdf-extract";
import { classifyOccupation } from "@/lib/masco-intelligence";

export const Route = createFileRoute("/document-intelligence")({
  ssr: false,
  component: DocumentIntelligencePage,
  head: () => ({
    meta: [
      { title: "Document Intelligence — PerksoPrax AI · PERKESO" },
      { name: "description", content: "Parse resumes and vacancy documents — extract skills, occupation, salary, taxonomy mapping, then run AI matching." },
    ],
  }),
});

type Mode = "vacancy" | "resume";

type ParseResult = {
  title: string;
  occupation: string;
  mascoCode: string;
  mascoCategory: string;
  hardSkills: string[];
  softSkills: string[];
  salary: string | null;
  experience: string | null;
  education: string | null;
  rawText: string;
  confidence: number;
  elapsedMs: number;
  taxonomyRelationship: string;
  relatedOccupations: string[];
};

async function extractDocxText(file: File): Promise<string> {
  const text = await file.text();
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractPdfText(file);
  if (name.endsWith(".docx") || name.endsWith(".doc")) return extractDocxText(file);
  return file.text();
}

async function parseDocumentWithAI(text: string, mode: Mode): Promise<Omit<ParseResult, "elapsedMs" | "mascoCode" | "mascoCategory" | "taxonomyRelationship" | "relatedOccupations">> {
  const prompt = mode === "resume"
    ? `You are a Malaysian Caseworker Intelligence Platform system parsing a job-seeker resume. Extract structured data.
Resume text:
"""
${text.slice(0, 8000)}
"""
Return ONLY valid JSON (no markdown):
{
  "title": "job title or profession from resume",
  "occupation": "occupation category (e.g. Software Developer, Accountant)",
  "hardSkills": ["skill1", "skill2", ...],
  "softSkills": ["communication", ...],
  "salary": "expected salary or null",
  "experience": "X years or Fresh Graduate or null",
  "education": "highest qualification or null",
  "confidence": 0-100
}`
    : `You are a Malaysian Caseworker Intelligence Platform system parsing a vacancy/job description document. Extract structured data.
Document text:
"""
${text.slice(0, 8000)}
"""
Return ONLY valid JSON (no markdown):
{
  "title": "job title from vacancy",
  "occupation": "occupation category (e.g. Software Engineer, Nurse)",
  "hardSkills": ["skill1", "skill2", ...],
  "softSkills": ["teamwork", ...],
  "salary": "salary range or null",
  "experience": "required experience or null",
  "education": "required qualification or null",
  "confidence": 0-100
}`;

  try {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "chat", message: prompt, history: [] }),
    });
    const data = await res.json();
    const raw = (data.reply ?? "{}").replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(raw);
    return {
      title: parsed.title ?? "Unknown",
      occupation: parsed.occupation ?? "Unknown",
      hardSkills: Array.isArray(parsed.hardSkills) ? parsed.hardSkills.slice(0, 20) : [],
      softSkills: Array.isArray(parsed.softSkills) ? parsed.softSkills.slice(0, 10) : [],
      salary: parsed.salary ?? null,
      experience: parsed.experience ?? null,
      education: parsed.education ?? null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 75,
      rawText: text.slice(0, 500),
    };
  } catch {
    const lines = text.split("\n").filter(l => l.trim().length > 5);
    return {
      title: lines[0]?.trim().slice(0, 80) ?? "Parsed Document",
      occupation: "See raw text",
      hardSkills: [],
      softSkills: [],
      salary: null,
      experience: null,
      education: null,
      confidence: 40,
      rawText: text.slice(0, 500),
    };
  }
}

function SkillChip({ label, type }: { label: string; type: "hard" | "soft" | "gap" }) {
  const colors: Record<string, string> = {
    hard: "background:rgba(33,31,96,0.07);color:var(--brand)",
    soft: "background:rgba(243,108,33,0.08);color:var(--accent)",
    gap: "background:rgba(234,179,8,0.10);color:#a16207",
  };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, margin: "2px 3px",
      ...(type === "hard" ? { background: "rgba(33,31,96,0.07)", color: "var(--brand)" }
        : type === "soft" ? { background: "rgba(243,108,33,0.08)", color: "var(--accent)" }
        : { background: "rgba(234,179,8,0.10)", color: "#a16207" }),
    }}>
      {label}
    </span>
  );
}

function DocumentIntelligencePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("vacancy");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    setLoading(true);
    const t0 = performance.now();
    try {
      const text = await extractTextFromFile(f);
      if (!text || text.length < 30) throw new Error("Could not extract text from this file. Please try a different format.");
      const parsed = await parseDocumentWithAI(text, mode);
      const taxonomy = classifyOccupation(parsed.occupation);
      const elapsed = Math.round(performance.now() - t0);
      setResult({
        ...parsed,
        mascoCode: taxonomy.mascoCode,
        mascoCategory: taxonomy.mascoCategory,
        taxonomyRelationship: `${taxonomy.mascoCategory} (MASCO ${taxonomy.mascoCode}) — ${taxonomy.labourMarketRelevance}`,
        relatedOccupations: taxonomy.relatedOccupations.slice(0, 5),
        elapsedMs: elapsed,
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to parse document. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleRunMatch = async () => {
    if (!result) return;
    setMatchLoading(true);
    try {
      if (mode === "vacancy") {
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "semantic_search", query: result.title + " " + result.hardSkills.slice(0, 5).join(" "), type: "candidates", limit: 10 }),
        });
        const data = await res.json();
        void navigate({ to: "/poc/ai-matching", search: { prefill: result.title } as any });
      } else {
        void navigate({ to: "/jobs", search: { search: result.occupation } as any });
      }
    } catch {
      void navigate({ to: mode === "vacancy" ? "/poc/ai-matching" : "/jobs" });
    } finally {
      setMatchLoading(false);
    }
  };

  const sampleVacancies = [
    { name: "Sample Vacancy A1.pdf", label: "Sample Vacancy A1" },
    { name: "Sample Vacancy B1.docx", label: "Sample Vacancy B1" },
  ];

  const sectionStyle: React.CSSProperties = {
    background: "#fff", borderRadius: 16, border: "1px solid var(--line)",
    padding: "24px 28px", marginBottom: 20,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      {/* Header */}
      <div style={{ background: "var(--brand)", padding: "40px 24px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", borderRadius: 999, padding: "4px 14px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
            <Brain size={12} /> PERKESO · Document Intelligence
          </div>
          <h1 style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Document Intelligence
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", margin: 0, maxWidth: 580 }}>
            Parse vacancy documents and resumes — AI extracts skills, occupation, salary, maps to MASCO taxonomy, then runs semantic matching.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {(["vacancy", "resume"] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setResult(null); setError(null); setFile(null); }}
              style={{
                padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 700, transition: "all 0.15s",
                background: mode === m ? "var(--brand)" : "#fff",
                color: mode === m ? "#fff" : "var(--ink)",
                boxShadow: mode === m ? "0 4px 14px rgba(33,31,96,0.18)" : "0 1px 4px rgba(0,0,0,0.06)",
                outline: mode === m ? "none" : "1px solid var(--line)",
              }}>
              {m === "vacancy" ? "📄 Parse a Vacancy" : "👤 Parse a Resume"}
            </button>
          ))}
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(243,108,33,0.08)", color: "var(--accent)", border: "1px solid rgba(243,108,33,0.2)", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>
            🎥 Video/OCR — Coming Soon
          </span>
        </div>

        {/* Upload zone */}
        <div style={sectionStyle}>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            style={{
              border: "2px dashed var(--line)", borderRadius: 14, padding: "44px 24px",
              textAlign: "center", cursor: "pointer", transition: "all 0.15s",
              background: file ? "rgba(33,31,96,0.02)" : "transparent",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--brand)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--line)")}
          >
            <input ref={inputRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <Upload size={32} style={{ color: "var(--muted)", marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
              {file ? file.name : "Drop document here or click to upload"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Accepts PDF, DOCX, TXT · Max 10 MB
            </div>
          </div>

          {/* Sample buttons */}
          {mode === "vacancy" && (
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Use sample:</span>
              {sampleVacancies.map(s => (
                <span key={s.name} style={{ fontSize: 12, color: "var(--muted)", background: "var(--base)", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 12px" }}>
                  {s.label} (upload manually)
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ ...sectionStyle, textAlign: "center", padding: "40px 24px" }}>
            <Loader2 size={28} style={{ color: "var(--brand)", animation: "spin 1s linear infinite", marginBottom: 14 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Parsing document…</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Extracting skills, occupation, salary · Running taxonomy mapping</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ ...sectionStyle, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AlertCircle size={18} style={{ color: "#dc2626", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#dc2626" }}>Parse Error</div>
              <div style={{ fontSize: 13, color: "#7f1d1d", marginTop: 4 }}>{error}</div>
            </div>
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}><X size={16} /></button>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <>
            {/* Performance chip */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: result.elapsedMs <= 3000 ? "rgba(21,128,61,0.08)" : "rgba(234,179,8,0.1)", color: result.elapsedMs <= 3000 ? "#15803d" : "#a16207", border: `1px solid ${result.elapsedMs <= 3000 ? "rgba(21,128,61,0.2)" : "rgba(234,179,8,0.3)"}`, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                <Clock size={11} /> Responded in {result.elapsedMs} ms {result.elapsedMs <= 3000 ? "✓ KPI met" : ""}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(33,31,96,0.06)", color: "var(--brand)", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                <CheckCircle2 size={11} /> Confidence {result.confidence}%
              </span>
            </div>

            {/* Extraction result */}
            <div style={sectionStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 14 }}>
                Extraction Result
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 3 }}>{mode === "resume" ? "CANDIDATE TITLE" : "JOB TITLE"}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>{result.title}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 3 }}>OCCUPATION</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--brand)" }}>{result.occupation}</div>
                </div>
                {result.salary && (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 3 }}>SALARY</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{result.salary}</div>
                  </div>
                )}
                {result.experience && (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 3 }}>EXPERIENCE</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{result.experience}</div>
                  </div>
                )}
                {result.education && (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 3 }}>EDUCATION</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{result.education}</div>
                  </div>
                )}
              </div>

              {/* Skills */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Hard Skills</div>
                <div>{result.hardSkills.length > 0 ? result.hardSkills.map(s => <SkillChip key={s} label={s} type="hard" />) : <span style={{ fontSize: 12, color: "var(--muted)" }}>None identified</span>}</div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Soft Skills</div>
                <div>{result.softSkills.length > 0 ? result.softSkills.map(s => <SkillChip key={s} label={s} type="soft" />) : <span style={{ fontSize: 12, color: "var(--muted)" }}>None identified</span>}</div>
              </div>

              {/* Taxonomy */}
              <div style={{ background: "rgba(33,31,96,0.04)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>MASCO Taxonomy Mapping</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--brand)" }}>
                      {result.mascoCode ? `✓ MASCO ${result.mascoCode} — ${result.mascoCategory}` : "No MASCO match"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{result.taxonomyRelationship}</div>
                  </div>
                  <a href={`/taxonomy?q=${encodeURIComponent(result.occupation)}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
                    View full taxonomy <ChevronRight size={12} />
                  </a>
                </div>
                {result.relatedOccupations.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Related occupations: </span>
                    {result.relatedOccupations.map(o => (
                      <span key={o} style={{ fontSize: 11, color: "var(--brand)", marginRight: 8 }}>{o}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={handleRunMatch} disabled={matchLoading}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {matchLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={16} />}
                {mode === "vacancy" ? "Find Matching Candidates" : "Find Matching Jobs"}
                <ArrowRight size={14} />
              </button>
              <button onClick={() => { setResult(null); setFile(null); setError(null); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 10, padding: "13px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Parse Another Document
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
