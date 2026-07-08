import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Settings, Save, Loader2, Shield, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { listConfig, updateConfig, type ConfigRow } from "@/lib/ops-api";
import { AdminPageHeader, AdminSectionCard, AdminEmptyState } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin/configuration")({
  ssr: false,
  component: AdminConfigPage,
  head: () => ({ meta: [{ title: "Configuration Management — MYFutureJobs Admin" }] }),
});

const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI Settings",
  matching: "Matching Engine",
  platform: "Platform Settings",
  general: "General",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ai: <Sparkles className="size-5" />,
  matching: <SlidersHorizontal className="size-5" />,
  platform: <Settings className="size-5" />,
  general: <Settings className="size-5" />,
};

const KEY_LABELS: Record<string, string> = {
  ai_model_primary: "Primary AI Model",
  ai_model_fast: "Fast AI Model",
  ai_max_tokens: "Max Tokens per Request",
  matching_skill_weight: "Skill Weight",
  matching_education_weight: "Education Weight",
  matching_salary_weight: "Salary Weight",
  matching_location_weight: "Location Weight",
  matching_experience_weight: "Experience Weight",
  matching_semantic_weight: "Semantic Search Weight",
  matching_lexical_weight: "Lexical Search Weight",
  matching_min_score: "Minimum Score Threshold",
  platform_maintenance_mode: "Maintenance Mode",
  platform_registration_enabled: "Registration Enabled",
  platform_max_cv_size_mb: "Max CV Size (MB)",
};

const KEY_DESCRIPTIONS: Record<string, string> = {
  ai_model_primary: "Default large model for reasoning tasks.",
  ai_model_fast: "Cheaper/faster model for high-volume tasks.",
  ai_max_tokens: "Hard cap on model output tokens.",
  matching_skill_weight: "How heavily skill overlap influences match score.",
  matching_education_weight: "Influence of education alignment on matching.",
  matching_salary_weight: "Weight for salary expectation alignment.",
  matching_location_weight: "Weight for location preference matching.",
  matching_experience_weight: "Weight for years of experience alignment.",
  matching_semantic_weight: "Weight for vector/embedding search results (0–1).",
  matching_lexical_weight: "Weight for keyword/ilike search results (0–1).",
  matching_min_score: "Minimum match score threshold (0–1).",
  platform_maintenance_mode: "Put the site into read-only maintenance mode.",
  platform_registration_enabled: "Allow new user registrations.",
  platform_max_cv_size_mb: "Maximum uploaded CV file size in megabytes.",
};

const DEFAULT_CONFIG: Record<string, { category: string; value: string | number | boolean; description: string }> = {
  ai_model_primary:        { category: "ai", value: "gpt-4o-mini", description: KEY_DESCRIPTIONS.ai_model_primary },
  ai_model_fast:           { category: "ai", value: "gpt-4o-mini", description: KEY_DESCRIPTIONS.ai_model_fast },
  ai_max_tokens:           { category: "ai", value: 2048, description: KEY_DESCRIPTIONS.ai_max_tokens },
  matching_skill_weight:   { category: "matching", value: 0.35, description: KEY_DESCRIPTIONS.matching_skill_weight },
  matching_education_weight: { category: "matching", value: 0.15, description: KEY_DESCRIPTIONS.matching_education_weight },
  matching_salary_weight: { category: "matching", value: 0.10, description: KEY_DESCRIPTIONS.matching_salary_weight },
  matching_location_weight: { category: "matching", value: 0.15, description: KEY_DESCRIPTIONS.matching_location_weight },
  matching_experience_weight: { category: "matching", value: 0.25, description: KEY_DESCRIPTIONS.matching_experience_weight },
  matching_semantic_weight: { category: "matching", value: 0.6, description: KEY_DESCRIPTIONS.matching_semantic_weight },
  matching_lexical_weight: { category: "matching", value: 0.4, description: KEY_DESCRIPTIONS.matching_lexical_weight },
  matching_min_score:      { category: "matching", value: 0.60, description: KEY_DESCRIPTIONS.matching_min_score },
  platform_maintenance_mode: { category: "platform", value: false, description: KEY_DESCRIPTIONS.platform_maintenance_mode },
  platform_registration_enabled: { category: "platform", value: true, description: KEY_DESCRIPTIONS.platform_registration_enabled },
  platform_max_cv_size_mb: { category: "platform", value: 10, description: KEY_DESCRIPTIONS.platform_max_cv_size_mb },
};

function parseValue(raw: string): string | number | boolean {
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return raw;
  }
}

function isToggle(key: string): boolean {
  const v = key.toLowerCase();
  return v.includes("mode") || v.includes("enabled");
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function AdminConfigPage() {
  const guardState = useOpsGuard(["admin"]);
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string | number | boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listConfig();
      const rows = d.configs ?? [];
      setConfigs(rows);
      const vals: Record<string, string | number | boolean> = {};
      rows.forEach(c => { vals[c.key] = parseValue(c.value); });
      setEditValues(vals);
    } catch (err: any) {
      toast.error("Failed to load config: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (guardState.status === "authorized") fetchConfigs();
  }, [guardState.status, fetchConfigs]);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await updateConfig(key, editValues[key]);
      toast.success(`"${KEY_LABELS[key] ?? key}" saved`);
      setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: JSON.stringify(editValues[key]), updated_at: new Date().toISOString() } : c));
    } catch (err: any) {
      toast.error("Save failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setSaving(null);
    }
  };

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      const existingKeys = new Set(configs.map(c => c.key));
      const missing = Object.entries(DEFAULT_CONFIG).filter(([key]) => !existingKeys.has(key));
      if (missing.length === 0) {
        toast.info("All default configuration values are already present.");
        return;
      }
      for (const [key, cfg] of missing) {
        await updateConfig(key, cfg.value);
      }
      toast.success(`Seeded ${missing.length} default configuration values.`);
      fetchConfigs();
    } catch (err: any) {
      toast.error("Failed to seed defaults: " + (err?.message ?? "Unknown error"));
    } finally {
      setSeeding(false);
    }
  };

  if (guardState.status === "loading") {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }
  if (guardState.status === "unauthenticated") return null;
  if (guardState.status === "unauthorized") {
    const dashHref = guardState.role === "employer" ? "/employer/dashboard" : "/dashboard";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <Shield className="size-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Unauthorized Access</h2>
          <p className="text-sm text-muted-foreground mb-6">You do not have permission to access this area.</p>
          <Button asChild variant="outline"><Link to={dashHref}>Go to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const grouped = configs.reduce<Record<string, ConfigRow[]>>((acc, c) => {
    const cat = c.category || "general";
    if (cat === "interview") return acc;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  const allCategories = Array.from(new Set([...Object.keys(grouped), ...Object.values(DEFAULT_CONFIG).map(c => c.category)])).sort();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

        <AdminPageHeader
          badge="Admin · Configuration"
          title="Configuration Management"
          subtitle="AI models, matching weights, and platform toggles. All changes are audit-logged and persist to system_config."
          backTo="/admin"
          backLabel="Back to Admin Console"
          onRefresh={fetchConfigs}
          refreshLoading={loading}
        />

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
        ) : configs.length === 0 ? (
          <AdminEmptyState
            icon={<Settings className="size-10" />}
            title="No configuration found"
            description="Configuration items will appear once added to the system_config table. You can seed the default set below to enable scoring and platform controls."
            action={
              <Button onClick={seedDefaults} disabled={seeding}>
                {seeding ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
                Seed Default Configuration
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding}>
                {seeding ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Sparkles className="mr-1.5 size-3.5" />}
                Seed Missing Defaults
              </Button>
            </div>

            <div className="grid gap-5">
              {allCategories.map(category => {
                const items = grouped[category] ?? [];
                if (items.length === 0) return null;
                return (
                  <AdminSectionCard
                    key={category}
                    icon={CATEGORY_ICONS[category] ?? <Settings className="size-5" />}
                    title={CATEGORY_LABELS[category] ?? category}
                    subtitle={`${items.length} configurable value${items.length !== 1 ? "s" : ""}`}
                  >
                    <div className="space-y-3">
                      {items.map(item => {
                        const val = editValues[item.key];
                        const origVal = parseValue(item.value);
                        const isDirty = JSON.stringify(val) !== JSON.stringify(origVal);
                        const toggle = isToggle(item.key);

                        return (
                          <div key={item.key} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
                            <div className="flex-1 min-w-[220px]">
                              <p className="text-sm font-semibold text-foreground">{KEY_LABELS[item.key] ?? item.key}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description ?? KEY_DESCRIPTIONS[item.key] ?? item.key}</p>
                              {item.updated_at && (
                                <p className="text-[10px] text-muted-foreground/60 mt-1">Last updated: {fmtDate(item.updated_at)}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {toggle ? (
                                <button
                                  onClick={() => setEditValues(prev => ({ ...prev, [item.key]: val === "true" || val === true ? false : true }))}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val === "true" || val === true ? "bg-primary" : "bg-muted"}`}
                                >
                                  <span className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${val === "true" || val === true ? "translate-x-6" : "translate-x-1"}`} />
                                </button>
                              ) : typeof val === "number" || (val !== "" && !isNaN(Number(val))) ? (
                                <Input
                                  type="number"
                                  step={item.key.includes("weight") || item.key.includes("score") ? 0.05 : 1}
                                  className="w-28 h-9 text-sm text-right"
                                  value={val as number}
                                  onChange={e => setEditValues(prev => ({ ...prev, [item.key]: e.target.value === "" ? "" : Number(e.target.value) }))}
                                />
                              ) : (
                                <Input
                                  className="w-48 h-9 text-sm"
                                  value={String(val ?? "")}
                                  onChange={e => setEditValues(prev => ({ ...prev, [item.key]: e.target.value }))}
                                />
                              )}
                              <Button
                                variant={isDirty ? "default" : "outline"}
                                size="sm"
                                disabled={!isDirty || saving === item.key}
                                onClick={() => handleSave(item.key)}
                                className="gap-1 h-8 px-3"
                              >
                                {saving === item.key ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                                Save
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AdminSectionCard>
                );
              })}
            </div>
          </>
        )}

      </main>
    </div>
  );
}
