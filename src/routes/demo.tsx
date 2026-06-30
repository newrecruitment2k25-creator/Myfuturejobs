import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Circle, ChevronRight, Play, Brain, Clock } from "lucide-react";

export const Route = createFileRoute("/demo")({
  ssr: false,
  component: DemoGuidePage,
  head: () => ({
    meta: [
      { title: "Demo Guide — Praxo AI · PERKESO POC" },
      { name: "description", content: "Guided walkthrough of the PERKESO POC live demonstration — all mandatory items covered." },
    ],
  }),
});

type Step = {
  id: number;
  title: string;
  caption: string;
  url: string;
  sampleInput?: string;
  kpi?: string;
  mandatory: boolean;
};

const DEMO_STEPS: Step[] = [
  {
    id: 1,
    title: "Parse a Vacancy / Resume",
    caption: "Upload Sample Vacancy A1.pdf or a resume. AI extracts job title, skills, salary, experience, and maps to MASCO taxonomy in real time. Note the response time chip (≤3s KPI).",
    url: "/document-intelligence",
    sampleInput: "Upload: Sample Vacancy A1.pdf",
    kpi: "KPI #5 ≤3s · Section 11: Resume & vacancy parsing",
    mandatory: true,
  },
  {
    id: 2,
    title: "Taxonomy Intelligence (MASCO / NEC / NOSS / MQA)",
    caption: "Type 'Software Engineer' or 'Registered Nurse'. System maps to MASCO code, MSIC industry, NEC education field, NOSS skill standard, and MQA qualification level with confidence scores.",
    url: "/taxonomy",
    sampleInput: "Try: Software Engineer · Registered Nurse · Civil Engineer",
    kpi: "KPI #4 100% MASCO coverage · Section 11: Taxonomy mapping",
    mandatory: true,
  },
  {
    id: 3,
    title: "Semantic Job Search (English + Bahasa Melayu)",
    caption: "Search 'jurutera perisian' — system returns software engineer roles proving multilingual semantic understanding. Then search 'programmer' — results match 'software developer' roles proving semantic not keyword matching.",
    url: "/jobs?search=jurutera%20perisian",
    sampleInput: "BM: jurutera perisian · EN: programmer · jururawat · pemandu lori",
    kpi: "KPI #3 Semantic not keyword · Section 11: Multilingual BM+EN",
    mandatory: true,
  },
  {
    id: 4,
    title: "AI Candidate Matching + Explainable Report + RAG Grounding",
    caption: "Enter any job vacancy ID. System returns ranked candidates with explainable match report: why matched, skill compatibility chips, gaps, salary/experience/taxonomy fit, semantic score bars. Scroll to 'Grounded from data' section to show RAG anti-hallucination.",
    url: "/poc/ai-matching",
    sampleInput: "Use any vacancy from the POC dataset",
    kpi: "KPI #6 ≥80% understand reason · Section 11: Explainable AI + RAG grounding",
    mandatory: true,
  },
  {
    id: 5,
    title: "Skill Gap Analysis + Career Pathway",
    caption: "From a matched candidate, click 'Skill Gap'. System shows matched skills (green), missing skills (amber), and recommended training. Career Pathway shows Junior→Senior→Lead progression with salary benchmarks.",
    url: "/career-pathway",
    sampleInput: "Any candidate-vacancy pair from matching step",
    kpi: "Section 11: Skill gap · Career pathway",
    mandatory: true,
  },
  {
    id: 6,
    title: "Labour Market + Salary Intelligence",
    caption: "Show real aggregates from 5,828 vacancies and 1,449 candidates: top occupations, hiring locations, in-demand skills, salary ranges by occupation, supply vs demand ratio.",
    url: "/labour-insights",
    sampleInput: "Live data — no input needed",
    kpi: "Section 11: Labour market intelligence · Salary intelligence",
    mandatory: true,
  },
  {
    id: 7,
    title: "Configurable AI Rules (Admin)",
    caption: "Show that matching weights are adjustable: Semantic Similarity, Skill Overlap, Taxonomy Alignment, Behaviour Signal. Demonstrate a weight change and show the visual distribution update. Reset to defaults before leaving.",
    url: "/admin/ai-rules",
    sampleInput: "Adjust weights, save, return to matching to show effect",
    kpi: "Section 11: Configurable AI rules",
    mandatory: true,
  },
];

const SEMANTIC_PAIRS = [
  { a: "programmer", b: "software developer", c: "software engineer" },
  { a: "doctor", b: "medical officer", c: "physician" },
  { a: "driver", b: "chauffeur", c: "pemandu" },
  { a: "jurutera perisian", b: "software engineer", c: "programmer" },
  { a: "jururawat", b: "nurse", c: "registered nurse" },
  { a: "kerani akaun", b: "account clerk", c: "accounts assistant" },
];

function DemoGuidePage() {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (id: number) => setChecked(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const pct = Math.round((checked.size / DEMO_STEPS.length) * 100);

  const cardStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "24px 28px", marginBottom: 20,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      {/* Header */}
      <div style={{ background: "var(--brand)", padding: "40px 24px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", borderRadius: 999, padding: "4px 14px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
            <Play size={12} /> PERKESO POC · Guided Demo
          </div>
          <h1 style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Guided Demo Mode
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", margin: "0 0 20px", maxWidth: 580 }}>
            Walk the evaluator through every mandatory Section 11 item. Tick each step as you complete it.
          </p>
          {/* Progress */}
          <div style={{ maxWidth: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Demo progress</span>
              <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{checked.size}/{DEMO_STEPS.length} steps</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 999, transition: "width 0.4s" }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {/* Steps */}
        {DEMO_STEPS.map(step => {
          const done = checked.has(step.id);
          return (
            <div key={step.id} style={{ ...cardStyle, opacity: done ? 0.75 : 1, borderColor: done ? "rgba(21,128,61,0.3)" : "var(--line)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <button onClick={() => toggle(step.id)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, marginTop: 2, padding: 0 }}>
                  {done
                    ? <CheckCircle2 size={22} style={{ color: "#15803d" }} />
                    : <Circle size={22} style={{ color: "var(--line)" }} />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", minWidth: 22 }}>#{step.id}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: done ? "#15803d" : "var(--ink)" }}>{step.title}</span>
                    {step.mandatory && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "rgba(243,108,33,0.08)", border: "1px solid rgba(243,108,33,0.2)", borderRadius: 999, padding: "1px 8px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Mandatory
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 10px" }}>{step.caption}</p>
                  {step.sampleInput && (
                    <div style={{ fontSize: 11, color: "var(--brand)", background: "rgba(33,31,96,0.04)", borderRadius: 8, padding: "6px 12px", marginBottom: 10, fontWeight: 600 }}>
                      Sample input: {step.sampleInput}
                    </div>
                  )}
                  {step.kpi && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--muted)", background: "var(--base)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px", marginBottom: 10 }}>
                      <Clock size={9} /> {step.kpi}
                    </div>
                  )}
                  <div>
                    <Link to={step.url as any} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: done ? "#f0fdf4" : "var(--brand)", color: done ? "#15803d" : "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                      {done ? "Revisit" : "Open"} <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Semantic proof panel */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Brain size={16} style={{ color: "var(--brand)" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Semantic-not-Keyword Proof (KPI #3)</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.65 }}>
            These synonym pairs prove the system uses semantic AI — a keyword engine would return zero results for the cross-matches below.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SEMANTIC_PAIRS.map((pair, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "rgba(33,31,96,0.03)", borderRadius: 10, padding: "10px 14px" }}>
                {[pair.a, pair.b, pair.c].map((term, j) => (
                  <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <a href={`/jobs?search=${encodeURIComponent(term)}`} style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", background: "rgba(33,31,96,0.07)", borderRadius: 999, padding: "3px 12px", textDecoration: "none" }}>
                      {term}
                    </a>
                    {j < 2 && <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>≈</span>}
                  </span>
                ))}
                <a href={`/jobs?search=${encodeURIComponent(pair.a)}`} style={{ marginLeft: "auto", fontSize: 11, color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
                  Test →
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Runbook link */}
        <div style={{ background: "rgba(33,31,96,0.04)", borderRadius: 14, padding: "18px 24px", border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 14 }}>
          <Brain size={20} style={{ color: "var(--brand)", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Full Demo Runbook</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>See DEMO_RUNBOOK_PERKESO.md in the project root for the complete Section 11 checklist, KPI table, and environment setup notes.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
