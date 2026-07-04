import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Save, Brain, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/ai-rules")({
  ssr: false,
  component: AdminAiRulesPage,
  head: () => ({
    meta: [{ title: "AI Rules — Admin · MYFutureJobs" }],
  }),
});

type AIRules = {
  weightSemantic: number;
  weightSkillOverlap: number;
  weightTaxonomy: number;
  weightBehaviour: number;
  minMatchScore: number;
  maxResults: number;
  semanticWeight: number;
  lexicalWeight: number;
};

const DEFAULTS: AIRules = {
  weightSemantic: 40,
  weightSkillOverlap: 35,
  weightTaxonomy: 15,
  weightBehaviour: 10,
  minMatchScore: 30,
  maxResults: 20,
  semanticWeight: 0.6,
  lexicalWeight: 0.4,
};

const STORAGE_KEY = "praxo_ai_rules";

function loadRules(): AIRules {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

function saveRules(rules: AIRules) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rules)); } catch {}
}

function SliderRow({
  label, hint, value, min, max, step = 1,
  onChange,
}: {
  label: string; hint: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{hint}</span>
        </div>
        <span style={{ fontSize: 18, fontWeight: 800, color: "var(--brand)", minWidth: 48, textAlign: "right" }}>
          {step < 1 ? value.toFixed(2) : value}{label.includes("Score") || label.includes("Results") ? "" : "%"}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--brand)" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
        <span>{min}{label.includes("Score") || label.includes("Results") ? "" : "%"}</span>
        <span>{max}{label.includes("Score") || label.includes("Results") ? "" : "%"}</span>
      </div>
    </div>
  );
}

function AdminAiRulesPage() {
  const [rules, setRules] = useState<AIRules>(() => loadRules());
  const [saved, setSaved] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Load semantic/lexical weights from system_config via API
  const loadConfigWeights = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch("/api/ops", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: "list_config" }),
      });
      if (res.ok) {
        const data = await res.json();
        const configs = data.configs ?? [];
        for (const c of configs) {
          if (c.key === "matching_semantic_weight") {
            const v = parseFloat(c.value);
            if (!isNaN(v)) setRules(r => ({ ...r, semanticWeight: v }));
          }
          if (c.key === "matching_lexical_weight") {
            const v = parseFloat(c.value);
            if (!isNaN(v)) setRules(r => ({ ...r, lexicalWeight: v }));
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load system_config weights:", e);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => { void loadConfigWeights(); }, [loadConfigWeights]);

  const totalWeight = rules.weightSemantic + rules.weightSkillOverlap + rules.weightTaxonomy + rules.weightBehaviour;

  const set = (key: keyof AIRules) => (v: number) => setRules(r => ({ ...r, [key]: v }));

  const handleSave = async () => {
    saveRules(rules);
    // Also save semantic/lexical weights to system_config
    setSavingConfig(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      await Promise.all([
        fetch("/api/ops", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ action: "update_config", key: "matching_semantic_weight", value: rules.semanticWeight }),
        }),
        fetch("/api/ops", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ action: "update_config", key: "matching_lexical_weight", value: rules.lexicalWeight }),
        }),
      ]);
    } catch (e) {
      console.warn("Failed to save system_config weights:", e);
    } finally {
      setSavingConfig(false);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setRules({ ...DEFAULTS });
    saveRules(DEFAULTS);
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "28px 32px", marginBottom: 20,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      <div style={{ background: "linear-gradient(135deg, #0A2647 0%, #144272 60%, #205295 100%)", padding: "40px 24px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", right: 80, bottom: -70, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 8, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.08)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
            Admin · Configurable AI Rules
          </div>
          <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", margin: "0 0 8px" }}>
            Configurable AI Matching Rules
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>
            Adjust scoring weights and thresholds for the MYFutureJobs matching engine. Changes apply to ranking display immediately.
          </p>
          <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            <Info size={11} /> Configurable AI matching rules (demo) — stored locally, passed into matching requests where supported.
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>

        {/* Weight warning */}
        {totalWeight !== 100 && (
          <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 12, padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#a16207", fontWeight: 600 }}>
              ⚠ Weights sum to {totalWeight}% (should be 100%). Adjust below or reset to defaults.
            </span>
          </div>
        )}

        {/* Scoring weights */}
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Scoring Weights <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", textTransform: "none", letterSpacing: 0 }}>(total should equal 100%)</span>
          </div>
          <SliderRow label="Semantic Similarity" hint="Vector embedding cosine similarity" value={rules.weightSemantic} min={0} max={100} onChange={set("weightSemantic")} />
          <SliderRow label="Skill Overlap" hint="Matched hard/soft skills %" value={rules.weightSkillOverlap} min={0} max={100} onChange={set("weightSkillOverlap")} />
          <SliderRow label="Taxonomy Alignment" hint="MASCO occupation category match" value={rules.weightTaxonomy} min={0} max={100} onChange={set("weightTaxonomy")} />
          <SliderRow label="Behaviour Signal" hint="Engagement from activity/behaviour data" value={rules.weightBehaviour} min={0} max={100} onChange={set("weightBehaviour")} />

          {/* Visual weight bar */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Weight distribution</div>
            <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${rules.weightSemantic}%`, background: "var(--brand)", transition: "width 0.3s" }} title={`Semantic ${rules.weightSemantic}%`} />
              <div style={{ width: `${rules.weightSkillOverlap}%`, background: "var(--accent)", transition: "width 0.3s" }} title={`Skills ${rules.weightSkillOverlap}%`} />
              <div style={{ width: `${rules.weightTaxonomy}%`, background: "#8b5cf6", transition: "width 0.3s" }} title={`Taxonomy ${rules.weightTaxonomy}%`} />
              <div style={{ width: `${rules.weightBehaviour}%`, background: "#06b6d4", transition: "width 0.3s" }} title={`Behaviour ${rules.weightBehaviour}%`} />
              <div style={{ flex: 1, background: "var(--line)" }} />
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
              {[
                { label: "Semantic", color: "var(--brand)", v: rules.weightSemantic },
                { label: "Skills", color: "var(--accent)", v: rules.weightSkillOverlap },
                { label: "Taxonomy", color: "#8b5cf6", v: rules.weightTaxonomy },
                { label: "Behaviour", color: "#06b6d4", v: rules.weightBehaviour },
              ].map(({ label, color, v }) => (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
                  {label}: {v}%
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Thresholds */}
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Matching Thresholds
          </div>
          <SliderRow label="Min Match Score" hint="Candidates below this score are excluded" value={rules.minMatchScore} min={0} max={100} onChange={set("minMatchScore")} />
          <SliderRow label="Max Results" hint="Maximum candidates returned per query" value={rules.maxResults} min={5} max={100} step={5} onChange={set("maxResults")} />
        </div>

        {/* Hybrid Search Weights (system_config) */}
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Hybrid Search Weights <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", textTransform: "none", letterSpacing: 0 }}>(stored in system_config, affects live search)</span>
          </div>
          {loadingConfig ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>
              <Loader2 size={16} className="animate-spin" /> Loading from system_config…
            </div>
          ) : (
            <>
              <SliderRow label="Semantic Weight" hint="Vector embedding similarity weight (0.0–1.0)" value={rules.semanticWeight} min={0} max={1} step={0.05} onChange={set("semanticWeight")} />
              <SliderRow label="Lexical Weight" hint="Keyword/full-text match weight (0.0–1.0)" value={rules.lexicalWeight} min={0} max={1} step={0.05} onChange={set("lexicalWeight")} />
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                Final score = (semantic × {rules.semanticWeight} + lexical × {rules.lexicalWeight}) ÷ {(rules.semanticWeight + rules.lexicalWeight).toFixed(2)}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: saved ? "#15803d" : "var(--brand)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}>
            <Save size={15} />
            {saved ? "Saved ✓" : savingConfig ? "Saving…" : "Save Rules"}
          </button>
          <button onClick={handleReset}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            <RotateCcw size={14} />
            Reset to Defaults
          </button>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 28, background: "rgba(33,31,96,0.03)", borderRadius: 14, padding: "18px 22px", border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>How weights affect matching</div>
          <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 5 }}>
            <li style={{ fontSize: 12, color: "var(--muted)" }}><strong>Semantic Similarity</strong> — AI embedding cosine score measures deep meaning match, not keyword overlap.</li>
            <li style={{ fontSize: 12, color: "var(--muted)" }}><strong>Skill Overlap</strong> — percentage of required skills the candidate demonstrates.</li>
            <li style={{ fontSize: 12, color: "var(--muted)" }}><strong>Taxonomy Alignment</strong> — MASCO occupation category agreement between candidate and vacancy.</li>
            <li style={{ fontSize: 12, color: "var(--muted)" }}><strong>Behaviour Signal</strong> — engagement score from activity log (applications submitted, interviews attended).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
