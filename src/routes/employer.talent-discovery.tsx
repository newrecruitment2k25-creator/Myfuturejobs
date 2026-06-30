import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Search, Loader2, Sparkles, MapPin, GraduationCap, Briefcase, DollarSign, CheckCircle, XCircle, BookmarkPlus, ExternalLink, Activity, SlidersHorizontal, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getEngagementLevel, behaviourTooltip, type BehaviourData } from "@/lib/behaviour";

export const Route = createFileRoute("/employer/talent-discovery")({
  ssr: false,
  component: TalentDiscoveryPage,
  head: () => ({ meta: [{ title: "AI Talent Discovery - MYFutureJobs" }] }),
});

interface CandidateResult {
  source: "poc" | "registered";
  id: string;
  candidate_id?: string;
  email?: string;
  education_level: string | null;
  field_of_study: string | null;
  preferred_state: string | null;
  preferred_salary: string | null;
  previous_occupation: string | null;
  previous_years_experience: string | null;
  skills: string;
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  applications: number;
  interviews: number;
  offers: number;
  overall_score?: number | null;
  behaviour?: BehaviourData | null;
  grand_total?: number;
  sign_in_count?: number;
}

interface ParsedQuery {
  skills?: string[];
  state?: string;
  education_level?: string;
  experience?: string;
  min_salary?: number;
  max_salary?: number;
  job_title?: string;
}

const POPULAR_SEARCHES = [
  "Software Developer KL",
  "Accountant Johor",
  "Admin Selangor",
  "Data Analyst Penang",
  "Marketing Executive",
  "Fresh Grad IT",
];

function scoreColor(score: number) {
  if (score >= 80) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function scoreEmoji(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

type EngagementFilter = "all" | "highly_active" | "active" | "moderate" | "low";
type SortMode = "score" | "engagement";

function TalentDiscoveryPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [total, setTotal] = useState(0);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [engFilter, setEngFilter] = useState<EngagementFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("score");
  const [inviteTarget, setInviteTarget] = useState<CandidateResult | null>(null);
  const [inviteSent, setInviteSent] = useState<Set<string>>(new Set());

  const [saved, setSaved] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem("talent_saved");
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem("talent_saved", JSON.stringify([...saved]));
  }, [saved]);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery ?? query;
    if (!q || q.length < 3) { toast.error("Please enter at least 3 characters"); return; }

    setSearching(true);
    setHasSearched(true);
    setSearchedQuery(q);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please log in to search candidates"); setSearching(false); return; }

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "talent_search", query: q }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Search failed"); setSearching(false); return; }

      const raw: CandidateResult[] = data.candidates ?? [];
    const enriched = raw.map(c => ({
      ...c,
      behaviour: c.behaviour ?? {
        submitted_application_count: c.applications,
        interview_count: c.interviews,
        job_offer_count: c.offers,
        sign_in_count: c.sign_in_count ?? 0,
        grand_total: c.grand_total ?? (c.applications + c.interviews + c.offers + (c.sign_in_count ?? 0)),
      },
    }));
    setResults(enriched);
      setTotal(data.total ?? 0);
      setParsed(data.parsed ?? null);
    } catch (err: any) {
      toast.error("Search failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setSearching(false);
    }
  };

  const displayedResults = useMemo(() => {
    let out = [...results];
    if (engFilter !== "all") {
      out = out.filter(c => getEngagementLevel(c.behaviour).key === engFilter);
    }
    if (sortMode === "engagement") {
      out.sort((a, b) => {
        const ga = a.behaviour?.grand_total ?? (a.applications + a.interviews);
        const gb = b.behaviour?.grand_total ?? (b.applications + b.interviews);
        return gb - ga;
      });
    }
    return out;
  }, [results, engFilter, sortMode]);

  const toggleSave = (id: string) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info("Candidate removed from saved"); }
      else { next.add(id); toast.success("Candidate saved"); }
      return next;
    });
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <Sparkles className="size-6 text-primary mt-0.5 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-primary">AI Talent Discovery</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Describe your ideal candidate in natural language — our AI searches 1,449+ candidate profiles and ranks the best matches.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9 h-11 text-sm"
                placeholder='e.g. "Next.js developer full time in Klang"'
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={() => handleSearch()} disabled={searching} className="gap-2 h-11 px-5">
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Find Candidates
            </Button>
          </div>

          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map(tag => (
                <button
                  key={tag}
                  onClick={() => { setQuery(tag); handleSearch(tag); }}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading state */}
        {searching && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Loader2 className="size-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">AI is searching candidates...</p>
            <p className="text-xs text-muted-foreground mt-1">Parsing your query and matching against the database</p>
          </div>
        )}

        {/* Results */}
        {!searching && hasSearched && (
          <>
            {/* Summary + filter bar */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Found <strong>{total}</strong> candidate{total !== 1 ? "s" : ""} matching &ldquo;{searchedQuery}&rdquo;
                  {engFilter !== "all" && <span className="ml-2 text-xs font-normal text-muted-foreground">(filtered: {engFilter.replace("_", " ")})</span>}
                </p>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-3 text-muted-foreground" />
                  <select
                    value={engFilter}
                    onChange={e => setEngFilter(e.target.value as EngagementFilter)}
                    className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground"
                  >
                    <option value="all">All Engagement</option>
                    <option value="highly_active">🔥 Highly Active</option>
                    <option value="active">✅ Active</option>
                    <option value="moderate">⚡ Moderate</option>
                    <option value="low">💤 Low Activity</option>
                  </select>
                  <select
                    value={sortMode}
                    onChange={e => setSortMode(e.target.value as SortMode)}
                    className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground"
                  >
                    <option value="score">Sort: Best Match</option>
                    <option value="engagement">Sort: Most Engaged</option>
                  </select>
                </div>
              </div>
              {parsed && (
                <p className="text-xs text-muted-foreground">
                  Parsed: {parsed.skills && parsed.skills.length > 0 && <span>Skills: {parsed.skills.join(", ")} | </span>}
                  {parsed.state && <span>Location: {parsed.state} | </span>}
                  {parsed.education_level && <span>Education: {parsed.education_level} | </span>}
                  {parsed.experience && <span>Experience: {parsed.experience} | </span>}
                  {parsed.job_title && <span>Role: {parsed.job_title} | </span>}
                  {!parsed.skills?.length && !parsed.state && !parsed.education_level && "Any"}
                </p>
              )}
            </div>

            {/* Candidate cards */}
            {displayedResults.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <Search className="size-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground mb-1">{results.length === 0 ? "No matching candidates found" : "No candidates match this engagement filter"}</p>
                <p className="text-xs text-muted-foreground">{results.length === 0 ? "Try broadening your search criteria or using different keywords." : "Try changing the engagement filter above."}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedResults.map((c, i) => (
                  <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${scoreColor(c.score)}`}>
                          <span className={`size-2 rounded-full ${scoreEmoji(c.score)}`} />
                          {c.score}% Match
                        </div>
                        {(() => { const eng = getEngagementLevel(c.behaviour); return (
                          <span
                            title={behaviourTooltip(c.behaviour)}
                            style={{ background: eng.bg, color: eng.color, border: `1px solid ${eng.color}33` }}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full cursor-help"
                          >
                            <Activity className="size-3" />{eng.label}
                          </span>
                        ); })()}
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {c.source === "poc" ? (c.candidate_id ?? `Candidate #${i + 1}`) : (c.email ?? `User #${i + 1}`)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.education_level && <>{c.education_level}</>}
                            {c.field_of_study && <> in {c.field_of_study}</>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleSave(c.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${saved.has(c.id) ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-primary"}`}
                          title={saved.has(c.id) ? "Unsave" : "Save Candidate"}
                        >
                          <BookmarkPlus className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Details row */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3 text-xs text-muted-foreground">
                      {c.preferred_state && (
                        <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {c.preferred_state}</span>
                      )}
                      {c.preferred_salary && (
                        <span className="inline-flex items-center gap-1"><DollarSign className="size-3" /> {c.preferred_salary}</span>
                      )}
                      {c.previous_occupation && (
                        <span className="inline-flex items-center gap-1"><Briefcase className="size-3" /> {c.previous_occupation} ({c.previous_years_experience ?? "N/A"})</span>
                      )}
                      {c.education_level && (
                        <span className="inline-flex items-center gap-1"><GraduationCap className="size-3" /> {c.education_level}</span>
                      )}
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {c.matched_skills.map(s => (
                        <span key={s} className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle className="size-3" /> {s}
                        </span>
                      ))}
                      {c.missing_skills.map(s => (
                        <span key={s} className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-700">
                          <XCircle className="size-3" /> {s}
                        </span>
                      ))}
                      {c.skills && c.skills.split(/[,;|]/).slice(0, 5).map(s => s.trim()).filter(s => s && !c.matched_skills.includes(s.toLowerCase())).map(s => (
                        <span key={s} className="rounded-full bg-secondary border border-border px-2 py-0.5 text-xs text-muted-foreground">{s}</span>
                      ))}
                    </div>

                    {/* Metrics + Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span title="Applications submitted">📊 <strong>{c.applications}</strong> apps · <strong>{c.interviews}</strong> interviews{c.sign_in_count ? ` · ${c.sign_in_count} sign-ins` : ""}</span>
                        {c.offers > 0 && <span>🎯 <strong>{c.offers}</strong> offers</span>}
                        {c.overall_score && <span>CV Score: <strong>{c.overall_score}</strong></span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {c.source === "registered" && c.id && (
                          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" asChild>
                            <Link to="/employer/candidate/$candidateId" params={{ candidateId: c.id }}>
                              <ExternalLink className="size-3" /> View Profile
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant={inviteSent.has(c.id) ? "outline" : "default"}
                          size="sm"
                          className="gap-1.5 h-7 text-xs"
                          onClick={() => setInviteTarget(c)}
                          disabled={inviteSent.has(c.id)}
                        >
                          <Sparkles className="size-3" /> {inviteSent.has(c.id) ? "Invited ✓" : "Invite to Interview"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Invite to Interview Modal ── */}
        {inviteTarget && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={() => setInviteTarget(null)}
          >
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 24, maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Invite to Interview</h3>
                <button onClick={() => setInviteTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X className="size-4" /></button>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                Send an AI interview invitation to <strong style={{ color: "var(--ink)" }}>
                  {inviteTarget.source === "poc" ? (inviteTarget.candidate_id ?? `Candidate`) : (inviteTarget.email ?? `Candidate`)}
                </strong>.
              </p>
              <div style={{ background: "var(--base)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--muted)" }}>
                <p style={{ margin: 0 }}>The candidate will receive an invitation link to complete a structured AI video interview. You can create and manage templates in <strong>Interview Templates</strong>.</p>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setInviteTarget(null)} style={{ padding: "8px 16px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "none", cursor: "pointer", fontSize: 13, color: "var(--muted)" }}>Cancel</button>
                <Link
                  to="/employer/interview-templates"
                  onClick={() => { setInviteSent(prev => new Set(prev).add(inviteTarget.id)); setInviteTarget(null); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--brand)", color: "#fff", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                >
                  <Send className="size-3.5" /> Go to Interview Templates
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!searching && !hasSearched && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Sparkles className="size-10 text-primary/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">Describe your ideal candidate above</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Our AI will search 1,449+ candidate profiles from the PERKESO database and registered jobseekers, then rank them by relevance.</p>
          </div>
        )}

      </main>
    </div>
  );
}
