import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Save, Brain, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-shell";

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
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-1.5">
        <div>
          <span className="text-sm font-bold text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground ml-2">{hint}</span>
        </div>
        <span className="text-lg font-extrabold text-primary min-w-[48px] text-right">
          {step < 1 ? value.toFixed(2) : value}{label.includes("Score") || label.includes("Results") ? "" : "%"}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
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

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6">

        <AdminPageHeader
          badge="Admin · Configurable AI Rules"
          title="Configurable AI Matching Rules"
          subtitle="Adjust scoring weights and thresholds for the MYFutureJobs matching engine. Changes apply to ranking display immediately."
          backTo="/admin"
          backLabel="Back to Admin Console"
        />

        {totalWeight !== 100 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Weights sum to {totalWeight}% (should be 100%). Adjust below or reset to defaults.
          </div>
        )}

        <AdminSectionCard icon={<Brain className="size-5 text-primary" />} title="Scoring Weights" subtitle="Total should equal 100%">
          <SliderRow label="Semantic Similarity" hint="Vector embedding cosine similarity" value={rules.weightSemantic} min={0} max={100} onChange={set("weightSemantic")} />
          <SliderRow label="Skill Overlap" hint="Matched hard/soft skills %" value={rules.weightSkillOverlap} min={0} max={100} onChange={set("weightSkillOverlap")} />
          <SliderRow label="Taxonomy Alignment" hint="MASCO occupation category match" value={rules.weightTaxonomy} min={0} max={100} onChange={set("weightTaxonomy")} />
          <SliderRow label="Behaviour Signal" hint="Engagement from activity/behaviour data" value={rules.weightBehaviour} min={0} max={100} onChange={set("weightBehaviour")} />

          <div className="mt-4">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Weight distribution</p>
            <div className="flex h-2.5 rounded-full overflow-hidden">
              <div className="bg-primary transition-all duration-300" style={{ width: `${rules.weightSemantic}%` }} />
              <div className="bg-orange-500 transition-all duration-300" style={{ width: `${rules.weightSkillOverlap}%` }} />
              <div className="bg-violet-500 transition-all duration-300" style={{ width: `${rules.weightTaxonomy}%` }} />
              <div className="bg-cyan-500 transition-all duration-300" style={{ width: `${rules.weightBehaviour}%` }} />
              <div className="flex-1 bg-secondary" />
            </div>
            <div className="flex flex-wrap gap-3.5 mt-2">
              {[
                { label: "Semantic", color: "bg-primary", v: rules.weightSemantic },
                { label: "Skills", color: "bg-orange-500", v: rules.weightSkillOverlap },
                { label: "Taxonomy", color: "bg-violet-500", v: rules.weightTaxonomy },
                { label: "Behaviour", color: "bg-cyan-500", v: rules.weightBehaviour },
              ].map(({ label, color, v }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`inline-block size-2 rounded-sm ${color}`} />
                  {label}: {v}%
                </span>
              ))}
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard icon={<Info className="size-5 text-primary" />} title="Matching Thresholds" subtitle="Cut-off and pagination limits">
          <SliderRow label="Min Match Score" hint="Candidates below this score are excluded" value={rules.minMatchScore} min={0} max={100} onChange={set("minMatchScore")} />
          <SliderRow label="Max Results" hint="Maximum candidates returned per query" value={rules.maxResults} min={5} max={100} step={5} onChange={set("maxResults")} />
        </AdminSectionCard>

        <AdminSectionCard icon={<Save className="size-5 text-primary" />} title="Hybrid Search Weights" subtitle="Stored in system_config and affects live search">
          {loadingConfig ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
              <Loader2 className="size-4 animate-spin" /> Loading from system_config…
            </div>
          ) : (
            <>
              <SliderRow label="Semantic Weight" hint="Vector embedding similarity weight (0.0–1.0)" value={rules.semanticWeight} min={0} max={1} step={0.05} onChange={set("semanticWeight")} />
              <SliderRow label="Lexical Weight" hint="Keyword/full-text match weight (0.0–1.0)" value={rules.lexicalWeight} min={0} max={1} step={0.05} onChange={set("lexicalWeight")} />
              <p className="text-[11px] text-muted-foreground mt-1">
                Final score = (semantic × {rules.semanticWeight} + lexical × {rules.lexicalWeight}) ÷ {(rules.semanticWeight + rules.lexicalWeight).toFixed(2)}
              </p>
            </>
          )}
        </AdminSectionCard>

        <div className="flex gap-3">
          <Button onClick={handleSave} className={`gap-2 transition-colors ${saved ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
            <Save className="size-4" />
            {saved ? "Saved ✓" : savingConfig ? "Saving…" : "Save Rules"}
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="size-4" /> Reset to Defaults
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/20 p-5 shadow-sm">
          <p className="text-xs font-bold text-foreground mb-2">How weights affect matching</p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            <li><strong>Semantic Similarity</strong> — AI embedding cosine score measures deep meaning match, not keyword overlap.</li>
            <li><strong>Skill Overlap</strong> — percentage of required skills the candidate demonstrates.</li>
            <li><strong>Taxonomy Alignment</strong> — MASCO occupation category agreement between candidate and vacancy.</li>
            <li><strong>Behaviour Signal</strong> — engagement score from activity log (applications submitted, interviews attended).</li>
          </ul>
        </div>

      </main>
    </div>
  );
}
