import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Brain, CheckCircle2, ChevronRight, Search, ArrowRight } from "lucide-react";
import { classifyOccupation, type OccupationProfile } from "@/lib/masco-intelligence";

export const Route = createFileRoute("/taxonomy")({
  ssr: false,
  component: TaxonomyPage,
  head: () => ({
    meta: [
      { title: "Taxonomy Intelligence — Praxo AI · PERKESO" },
      { name: "description", content: "Map any occupation or job title to MASCO, MSIC, NEC, NOSS, and MQA Malaysian standards." },
    ],
  }),
});

const SAMPLE_TITLES = [
  "Software Engineer", "Data Analyst", "Registered Nurse",
  "Civil Engineer", "HR Executive", "Accounting Clerk",
  "Primary School Teacher", "Logistics Coordinator",
];

function ConfidenceBar({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: value >= 70 ? "var(--brand)" : "var(--accent)" }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: value >= 70 ? "var(--brand)" : "var(--accent)", borderRadius: 999, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function MappingCard({ standard, code, title, detail, confidence, available }: {
  standard: string; code: string; title: string; detail: string; confidence: number; available: boolean;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>{standard}</div>
          {available ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(21,128,61,0.08)", color: "#15803d", border: "1px solid rgba(21,128,61,0.2)", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
              <CheckCircle2 size={10} /> MAPPED ✓
            </div>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(234,179,8,0.08)", color: "#a16207", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
              Nearest match shown
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--brand)", fontFamily: "monospace" }}>{code}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Confidence {confidence}%</div>
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{detail}</div>
    </div>
  );
}

function TaxonomyPage() {
  const search = useSearch({ strict: false }) as { q?: string };
  const [query, setQuery] = useState(search?.q ?? "");
  const [profile, setProfile] = useState<OccupationProfile | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (search?.q) {
      const p = classifyOccupation(search.q);
      setProfile(p);
      setSubmitted(true);
    }
  }, [search?.q]);

  const handleLookup = (q: string) => {
    if (!q.trim()) return;
    const p = classifyOccupation(q.trim());
    setProfile(p);
    setSubmitted(true);
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "24px 28px", marginBottom: 20,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      {/* Header */}
      <div style={{ background: "var(--brand)", padding: "40px 24px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", borderRadius: 999, padding: "4px 14px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
            <Brain size={12} /> PERKESO · Taxonomy Intelligence
          </div>
          <h1 style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Taxonomy Intelligence
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", margin: 0, maxWidth: 580 }}>
            Map any job title or occupation to MASCO, MSIC, NEC, NOSS, and MQA Malaysian standards with confidence scoring and explainable AI.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {/* Search input */}
        <div style={cardStyle}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--line)", borderRadius: 10, padding: "0 16px", background: "#fafafa" }}>
              <Search size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLookup(query)}
                placeholder="Enter job title or occupation (e.g. Software Engineer, Nurse)"
                style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 15, padding: "13px 0", color: "var(--ink)" }}
              />
            </div>
            <button onClick={() => handleLookup(query)}
              style={{ background: "var(--brand)", color: "#fff", border: "none", borderRadius: 10, padding: "0 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Map
            </button>
          </div>

          {/* Sample titles */}
          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Try:</span>
            {SAMPLE_TITLES.map(t => (
              <button key={t} onClick={() => { setQuery(t); handleLookup(t); }}
                style={{ fontSize: 11, fontWeight: 600, color: "var(--brand)", background: "rgba(33,31,96,0.05)", border: "1px solid rgba(33,31,96,0.1)", borderRadius: 999, padding: "3px 10px", cursor: "pointer" }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {!submitted && (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
            <Brain size={40} style={{ marginBottom: 14, color: "var(--line)" }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Enter a job title to begin taxonomy mapping</div>
            <div style={{ fontSize: 13 }}>Maps to MASCO · MSIC · NEC · NOSS · MQA standards</div>
          </div>
        )}

        {submitted && profile && (
          <>
            {/* MASCO coverage badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(21,128,61,0.08)", color: "#15803d", border: "1px solid rgba(21,128,61,0.2)", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>
                <CheckCircle2 size={12} /> MASCO Mapped ✓ — {profile.mascoCode}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(33,31,96,0.07)", color: "var(--brand)", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>
                Confidence {profile.confidenceScore}%
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(243,108,33,0.07)", color: "var(--accent)", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>
                {profile.demandLevel} Demand
              </span>
            </div>

            {/* Standards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <MappingCard
                standard="MASCO — Malaysian Standard Classification of Occupations"
                code={profile.mascoCode}
                title={profile.mascoCategory}
                detail={`Occupation family: ${profile.jobFamily}. ${profile.labourMarketRelevance}`}
                confidence={profile.confidenceScore}
                available={!!profile.mascoCode}
              />
              <MappingCard
                standard="MSIC — Malaysian Standard Industrial Classification"
                code={profile.mascoCode.slice(0, 2) + "00"}
                title={profile.jobFamily}
                detail={`Industry sector derived from MASCO job family alignment. Semantic mapping — ${profile.employerTypeAlignment}.`}
                confidence={Math.max(50, profile.confidenceScore - 10)}
                available={true}
              />
              <MappingCard
                standard="NEC — Classification of Fields of Education"
                code={`NEC-${profile.mascoCode.slice(0, 2)}`}
                title={profile.preferredQualification}
                detail={`Preferred field of study for this occupation: ${profile.certifications.slice(0, 3).join(", ")}. Minimum: ${profile.minimumQualification}.`}
                confidence={Math.max(55, profile.confidenceScore - 5)}
                available={true}
              />
              <MappingCard
                standard="NOSS — National Occupational Skills Standards"
                code={`NOSS-${profile.mascoCode}`}
                title={`${profile.occupationTitle} — Level ${profile.experienceLevel === "Fresh Graduate" ? "2" : profile.experienceLevel === "Senior" ? "4" : "3"}`}
                detail={`Core competency skills: ${profile.hardSkills.slice(0, 4).join(", ")}. Experience: ${profile.experienceYears}.`}
                confidence={Math.max(50, profile.confidenceScore - 8)}
                available={true}
              />
              <MappingCard
                standard="MQA — Malaysian Qualifications Framework"
                code={`MQF-L${profile.experienceLevel === "Fresh Graduate" ? "6" : profile.experienceLevel === "Senior" ? "7" : "6"}`}
                title={profile.preferredQualification}
                detail={`Qualification level mapping for ${profile.occupationTitle}. ${profile.minimumQualification} minimum. Preferred: ${profile.preferredQualification}.`}
                confidence={Math.max(60, profile.confidenceScore - 5)}
                available={true}
              />
            </div>

            {/* Confidence chart */}
            <div style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>Mapping Confidence</div>
              <ConfidenceBar value={profile.confidenceScore} label="MASCO Alignment" />
              <ConfidenceBar value={Math.max(50, profile.confidenceScore - 5)} label="NEC / MQA Education Mapping" />
              <ConfidenceBar value={Math.max(50, profile.confidenceScore - 8)} label="NOSS Skill Standard" />
              <ConfidenceBar value={Math.max(50, profile.confidenceScore - 10)} label="MSIC Industry Classification" />
            </div>

            {/* Skills */}
            <div style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>Required Skills (from NOSS/MASCO)</div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Hard Skills</span>
                <div style={{ marginTop: 6 }}>
                  {profile.hardSkills.map(s => (
                    <span key={s} style={{ display: "inline-block", background: "rgba(33,31,96,0.07)", color: "var(--brand)", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600, margin: "2px 3px" }}>{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Soft Skills</span>
                <div style={{ marginTop: 6 }}>
                  {profile.softSkills.map(s => (
                    <span key={s} style={{ display: "inline-block", background: "rgba(243,108,33,0.08)", color: "var(--accent)", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600, margin: "2px 3px" }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Career progression */}
            <div style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>Career Progression (MASCO-aligned)</div>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                {profile.careerProgression.map((step, i) => (
                  <span key={step} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ background: i === 0 ? "var(--brand)" : i === profile.careerProgression.length - 1 ? "var(--accent)" : "var(--line)", color: i === 0 ? "#fff" : i === profile.careerProgression.length - 1 ? "#fff" : "var(--ink)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700 }}>{step}</span>
                    {i < profile.careerProgression.length - 1 && <ArrowRight size={12} style={{ color: "var(--muted)" }} />}
                  </span>
                ))}
              </div>
            </div>

            {/* Related occupations */}
            <div style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Related / Transferable Occupations</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {profile.relatedOccupations.map(occ => (
                  <button key={occ} onClick={() => { setQuery(occ); handleLookup(occ); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "var(--brand)", cursor: "pointer" }}>
                    {occ} <ChevronRight size={11} />
                  </button>
                ))}
              </div>
            </div>

            {/* Cross-links */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href={`/document-intelligence`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "var(--brand)", textDecoration: "none" }}>
                ← Document Intelligence
              </a>
              <a href={`/poc/ai-matching`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--brand)", color: "#fff", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Run AI Matching <ChevronRight size={13} />
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
