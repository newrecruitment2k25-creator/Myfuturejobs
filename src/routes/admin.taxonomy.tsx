import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Database, ArrowLeft, Plus, Search, RefreshCw, Loader2, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { listTaxonomy, createTaxonomy, toggleTaxonomy, type TaxonomyRow } from "@/lib/ops-api";

export const Route = createFileRoute("/admin/taxonomy")({
  ssr: false,
  component: AdminTaxonomyPage,
  head: () => ({ meta: [{ title: "Taxonomy Management — MYFutureJobs Admin" }] }),
});

function AdminTaxonomyPage() {
  const guardState = useOpsGuard(["admin"]);
  const [entries, setEntries] = useState<TaxonomyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newLevel, setNewLevel] = useState(1);
  const [newDesc, setNewDesc] = useState("");
  const [newSkills, setNewSkills] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listTaxonomy();
      setEntries(d.taxonomy ?? []);
    } catch (err: any) {
      toast.error("Failed to load taxonomy: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (guardState.status === "authorized") fetchData();
  }, [guardState.status, fetchData]);

  const handleAdd = async () => {
    if (!newCode || !newTitle) { toast.error("Code and Title are required"); return; }
    setAdding(true);
    try {
      const skills = newSkills ? newSkills.split(",").map(s => s.trim()).filter(Boolean) : [];
      const res = await createTaxonomy({ code: newCode, title: newTitle, level: newLevel, description: newDesc || undefined, skills });
      setEntries(prev => [res.entry, ...prev]);
      setShowAdd(false);
      setNewCode(""); setNewTitle(""); setNewLevel(1); setNewDesc(""); setNewSkills("");
      toast.success("Occupation added");
    } catch (err: any) {
      toast.error("Failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (entry: TaxonomyRow) => {
    try {
      await toggleTaxonomy(entry.id, !entry.is_active);
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_active: !e.is_active } : e));
      toast.success(`${entry.title} ${entry.is_active ? "deactivated" : "activated"}`);
    } catch (err: any) {
      toast.error("Toggle failed: " + (err?.message ?? "Unknown error"));
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

  const filtered = entries.filter(t => {
    const q = search.toLowerCase();
    if (q && !t.title.toLowerCase().includes(q) && !t.code.toLowerCase().includes(q)) return false;
    return true;
  });

  const activeCount = entries.filter(e => e.is_active).length;
  const totalSkills = entries.reduce((s, e) => s + (Array.isArray(e.skills) ? e.skills.length : 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-6">

        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Admin Console
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Console · Taxonomy</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">Taxonomy Management</h1>
              <p className="text-sm text-muted-foreground mt-0.5">MASCO occupation codes, skills taxonomy. All changes are audit-logged.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-2">
                <Plus className="size-4" /> Add Occupation
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Occupations", value: entries.length },
            { label: "Active", value: activeCount },
            { label: "Inactive", value: entries.length - activeCount },
            { label: "Total Skills", value: totalSkills },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-extrabold tabular-nums text-primary">{loading ? "…" : value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {showAdd && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">Add New Occupation</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Code (e.g., MASCO-101)" value={newCode} onChange={e => setNewCode(e.target.value)} />
              <Input placeholder="Title (e.g., Software Developer)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <select className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={newLevel} onChange={e => setNewLevel(Number(e.target.value))}>
                <option value={1}>Level 1</option>
                <option value={2}>Level 2</option>
                <option value={3}>Level 3</option>
                <option value={4}>Level 4</option>
              </select>
              <Input placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            </div>
            <Input placeholder="Skills (comma-separated, e.g., Java, Python, SQL)" value={newSkills} onChange={e => setNewSkills(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={adding} className="gap-2">
                {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-9 h-9 text-sm" placeholder="Search by code or title…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Database className="size-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Occupations ({filtered.length})</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center">
              <Database className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">{entries.length === 0 ? "No taxonomy data yet" : "No matches"}</p>
              <p className="text-xs text-muted-foreground">{entries.length === 0 ? "Taxonomy data will appear once MASCO codes are imported." : "Try clearing the search."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(entry => (
                <div key={entry.id} className={`flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 ${!entry.is_active ? "opacity-50" : ""}`}>
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-bold text-primary">{entry.code}</span>
                      <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Level {entry.level} · {Array.isArray(entry.skills) ? entry.skills.length : 0} skills
                      {entry.description && ` · ${entry.description}`}
                    </p>
                    {Array.isArray(entry.skills) && entry.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {entry.skills.slice(0, 6).map((s: string) => (
                          <span key={s} className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700">{s}</span>
                        ))}
                        {entry.skills.length > 6 && <span className="text-xs text-muted-foreground">+{entry.skills.length - 6} more</span>}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(entry)}
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors cursor-pointer ${entry.is_active ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-secondary text-muted-foreground border-border hover:bg-accent"}`}
                  >
                    {entry.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
