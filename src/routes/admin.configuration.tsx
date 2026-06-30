import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Settings, ArrowLeft, Save, Loader2, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { listConfig, updateConfig, type ConfigRow } from "@/lib/ops-api";

export const Route = createFileRoute("/admin/configuration")({
  ssr: false,
  component: AdminConfigPage,
  head: () => ({ meta: [{ title: "Configuration Management — MYFutureJobs Admin" }] }),
});

const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI Settings",
  matching: "Matching Engine",
  interview: "Interview Settings",
  platform: "Platform Settings",
  general: "General",
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
  matching_min_score: "Minimum Score Threshold",
  interview_max_questions: "Max Questions",
  interview_default_questions: "Default Questions",
  interview_time_limit: "Time Limit (minutes)",
  platform_maintenance_mode: "Maintenance Mode",
  platform_registration_enabled: "Registration Enabled",
  platform_max_cv_size_mb: "Max CV Size (MB)",
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

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listConfig();
      setConfigs(d.configs ?? []);
      const vals: Record<string, string | number | boolean> = {};
      (d.configs ?? []).forEach(c => { vals[c.key] = parseValue(c.value); });
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

  if (guardState.status === "loading") {
    return <div className="min-h-screen bg-background"><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="size-8 animate-spin text-primary" /></div></div>;
  }
  if (guardState.status === "unauthenticated") return null;
  if (guardState.status === "unauthorized") {
    const dashHref = guardState.role === "employer" ? "/employer/dashboard" : "/dashboard";
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 py-24 text-center">
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
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-6">

        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Admin Console
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Console · Configuration</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">Configuration Management</h1>
              <p className="text-sm text-muted-foreground mt-0.5">AI models, matching weights, interview settings, and platform toggles. All changes are audit-logged.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchConfigs} disabled={loading} className="gap-2">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
        ) : configs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <Settings className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No configuration found</p>
            <p className="text-xs text-muted-foreground">Configuration items will appear once added to the system_config table.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[category] ?? category}</h2>
              </div>
              {items.map(item => {
                const val = editValues[item.key];
                const origVal = parseValue(item.value);
                const isDirty = val !== origVal;
                const toggle = isToggle(item.key);

                return (
                  <div key={item.key} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm font-medium text-foreground">{KEY_LABELS[item.key] ?? item.key}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description ?? item.key}</p>
                      {item.updated_at && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5">Last updated: {fmtDate(item.updated_at)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {toggle ? (
                        <button
                          onClick={() => setEditValues(prev => ({ ...prev, [item.key]: val === "true" || val === true ? false : true }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val === "true" || val === true ? "bg-primary" : "bg-secondary border border-border"}`}
                        >
                          <span className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${val === "true" || val === true ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      ) : typeof val === "number" || !isNaN(Number(val)) ? (
                        <Input
                          type="number"
                          className="w-24 h-9 text-sm text-right"
                          value={val as number}
                          onChange={e => setEditValues(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                        />
                      ) : (
                        <Input
                          className="w-48 h-9 text-sm"
                          value={String(val ?? "")}
                          onChange={e => setEditValues(prev => ({ ...prev, [item.key]: e.target.value }))}
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isDirty || saving === item.key}
                        onClick={() => handleSave(item.key)}
                        className="gap-1 h-8 px-2"
                      >
                        {saving === item.key ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                        Save
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

      </main>
    </div>
  );
}
