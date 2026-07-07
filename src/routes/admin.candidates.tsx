import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart3, ArrowLeft, Search, Shield, Loader2, RefreshCw, Users, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOpsGuard } from "@/lib/use-ops-guard";
import { listCandidates, type UnifiedCandidateRow } from "@/lib/ops-api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/candidates")({
  ssr: false,
  component: AdminCandidatesPage,
  head: () => ({ meta: [{ title: "Candidates - PerksoPrax AI Admin" }] }),
});

function sourceBadge(source: "registered" | "poc") {
  return source === "registered"
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-blue-50 text-blue-700 border-blue-200";
}

function sourceLabel(source: "registered" | "poc") {
  return source === "registered" ? "Registered" : "PERKESO";
}

function scoreBadge(score: number | null) {
  if (score === null) return "bg-secondary text-muted-foreground border-border";
  if (score >= 70) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

type SourceFilter = "all" | "registered" | "poc";

function AdminCandidatesPage() {
  const guardState = useOpsGuard(["admin"]);
  const [candidates, setCandidates] = useState<UnifiedCandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [pocPage, setPocPage] = useState(0);
  const [pocTotal, setPocTotal] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState<UnifiedCandidateRow | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCandidates = useCallback(async (page = 0, src: SourceFilter = sourceFilter, q = debouncedSearch) => {
    setLoading(true);
    try {
      const d = await listCandidates({ search: q || undefined, source: src, poc_page: page });
      setCandidates(d.candidates ?? []);
      setPocTotal(d.poc_total ?? 0);
      setRegisteredCount(d.registered_count ?? 0);
      setTotal(d.total ?? 0);
    } catch (err: any) {
      toast.error("Failed to load candidates: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, debouncedSearch]);

  useEffect(() => {
    if (guardState.status === "authorized") fetchCandidates(pocPage, sourceFilter, debouncedSearch);
  }, [guardState.status, pocPage, sourceFilter, debouncedSearch]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPocPage(0);
    }, 400);
  };

  const handleSourceChange = (src: SourceFilter) => {
    setSourceFilter(src);
    setPocPage(0);
  };

  const pocPageCount = Math.ceil(pocTotal / 50);

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

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-6">

        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Admin Console
        </Link>

        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #0A2647 0%, #144272 60%, #205295 100%)', boxShadow: '0 4px 20px rgba(10,38,71,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Admin · Candidates
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>Candidate Management</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                {loading ? "Loading…" : `${total.toLocaleString()} total candidates`}
                {!loading && <span style={{ marginLeft: 8, fontSize: 12 }}>({registeredCount} registered · {pocTotal.toLocaleString()} PERKESO)</span>}
              </p>
            </div>
            <button onClick={() => fetchCandidates(pocPage, sourceFilter, debouncedSearch)} disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: total, color: '#205295' },
            { label: "Registered", value: registeredCount, color: '#15803d' },
            { label: "PERKESO", value: pocTotal, color: '#f36c21' },
            { label: "This Page", value: candidates.length, color: '#6d28d9' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ borderRadius: 14, padding: '16px 12px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 2px 8px rgba(10,38,71,0.04)' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1 }}>{loading ? "…" : value.toLocaleString()}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pl-9 pr-8 h-9 text-sm" placeholder="Search skills, location, education, ID…" value={search} onChange={e => handleSearchChange(e.target.value)} />
            {search && (
              <button onClick={() => handleSearchChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
            {(["all", "registered", "poc"] as SourceFilter[]).map(s => (
              <button key={s} onClick={() => handleSourceChange(s)}
                className={`px-3 py-1.5 capitalize transition-colors ${sourceFilter === s ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}>
                {s === "poc" ? "PERKESO" : s === "registered" ? "Registered" : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 2px 12px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
            <BarChart3 style={{ width: 16, height: 16, color: '#205295' }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              {loading ? "Loading…" : `Showing ${candidates.length} of ${total.toLocaleString()} candidates`}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : candidates.length === 0 ? (
            <div className="py-14 text-center">
              <Users className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">No candidates found</p>
              <p className="text-xs text-muted-foreground">Try clearing the search or changing the filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {candidates.map(c => (
                <div key={`${c.source}-${c.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors">
                  {/* Source badge */}
                  <span className={`shrink-0 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${sourceBadge(c.source)}`}>
                    {sourceLabel(c.source)}
                  </span>
                  {/* Main info */}
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {c.source === "poc" ? (c.candidate_id ?? c.id) : c.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.preferred_occupation ?? c.field_of_study ?? "—"}
                      {c.preferred_state && <> · {c.preferred_state}</>}
                      {c.education_level && <> · {c.education_level}</>}
                    </p>
                  </div>
                  {/* Salary */}
                  {c.preferred_salary && (
                    <span className="text-xs text-muted-foreground shrink-0">{c.preferred_salary}</span>
                  )}
                  {/* Score badge for registered */}
                  {c.source === "registered" && (
                    <span className={`shrink-0 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${scoreBadge(c.overall_score)}`}>
                      {c.overall_score !== null ? `CV ${c.overall_score}` : "No CV"}
                    </span>
                  )}
                  {/* Engagement */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <span>{c.applications} apps</span>
                    <span>{c.interviews} interviews</span>
                    {c.offers > 0 && <span className="text-green-600 font-semibold">{c.offers} offers</span>}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.source === "registered" ? (
                      <a href={`/admin/candidates/${c.id}`}
                        className="inline-flex items-center rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors">
                        View
                      </a>
                    ) : (
                      <button onClick={() => setSelectedCandidate(c)}
                        className="inline-flex items-center rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors">
                        View
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination for POC candidates */}
        {pocTotal > 50 && sourceFilter !== "registered" && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              PERKESO page {pocPage + 1} of {pocPageCount} ({pocTotal.toLocaleString()} total)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={pocPage === 0 || loading} onClick={() => setPocPage(p => p - 1)} className="gap-1">
                <ChevronLeft className="size-3.5" /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={pocPage >= pocPageCount - 1 || loading} onClick={() => setPocPage(p => p + 1)} className="gap-1">
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

      </main>

      {/* PERKESO Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedCandidate(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 mb-2">PERKESO Candidate</span>
                <h2 className="text-lg font-bold text-foreground">{selectedCandidate.candidate_id ?? selectedCandidate.id}</h2>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {[
                { label: "Education", value: selectedCandidate.education_level },
                { label: "Field", value: selectedCandidate.field_of_study },
                { label: "Location", value: selectedCandidate.preferred_state },
                { label: "Salary", value: selectedCandidate.preferred_salary },
                { label: "Preferred Role", value: selectedCandidate.preferred_occupation },
                { label: "Previous Role", value: selectedCandidate.previous_occupation },
                { label: "Experience", value: selectedCandidate.previous_years_experience },
              ].map(({ label, value }) => value ? (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold text-foreground">{value}</p>
                </div>
              ) : null)}
            </div>
            {selectedCandidate.skills && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCandidate.skills.split(/[,;|]/).map(s => s.trim()).filter(Boolean).map(s => (
                    <span key={s} className="rounded-full bg-secondary border border-border px-2 py-0.5 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Applications", value: selectedCandidate.applications },
                { label: "Interviews", value: selectedCandidate.interviews },
                { label: "Offers", value: selectedCandidate.offers },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-border bg-background p-3 text-center">
                  <p className="text-xl font-extrabold tabular-nums text-primary">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
