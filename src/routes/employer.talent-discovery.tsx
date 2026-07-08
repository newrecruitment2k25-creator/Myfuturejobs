import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Search, Loader2, Sparkles, MapPin, GraduationCap, Briefcase, DollarSign, CheckCircle, XCircle, BookmarkPlus, ExternalLink, Activity, SlidersHorizontal, Star, FileText, User, Wrench } from "lucide-react";
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
        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #512ACC 0%, #6B4FD6 60%, #512ACC 100%)', boxShadow: '0 4px 20px rgba(81,42,204,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, position: 'relative' }}>
            <Sparkles style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.3)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Employer · Talent Discovery
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>AI Talent Discovery</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Describe your ideal candidate in natural language — our AI searches 1,449+ candidate profiles and ranks the best matches.</p>
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
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    <strong className="text-primary">{total}</strong> candidate{total !== 1 ? "s" : ""} found
                  </p>
                  <p className="text-xs text-muted-foreground">for &ldquo;{searchedQuery}&rdquo; {engFilter !== "all" && <span className="ml-1">· filtered by {engFilter.replace("_", " ")}</span>}</p>
                </div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-3 text-muted-foreground" />
                  <select
                    value={engFilter}
                    onChange={e => setEngFilter(e.target.value as EngagementFilter)}
                    className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="all">All Engagement</option>
                    <option value="highly_active">Highly Active</option>
                    <option value="active">Active</option>
                    <option value="moderate">Moderate</option>
                    <option value="low">Low Activity</option>
                  </select>
                  <select
                    value={sortMode}
                    onChange={e => setSortMode(e.target.value as SortMode)}
                    className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="score">Best Match</option>
                    <option value="engagement">Most Engaged</option>
                  </select>
                </div>
              </div>
              {parsed && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Parsed:</span>
                  {parsed.skills && parsed.skills.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-2 py-0.5 text-xs text-foreground">
                      <Wrench className="size-3" /> {parsed.skills.join(", ")}
                    </span>
                  )}
                  {parsed.state && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-2 py-0.5 text-xs text-foreground">
                      <MapPin className="size-3" /> {parsed.state}
                    </span>
                  )}
                  {parsed.education_level && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-2 py-0.5 text-xs text-foreground">
                      <GraduationCap className="size-3" /> {parsed.education_level}
                    </span>
                  )}
                  {parsed.experience && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-2 py-0.5 text-xs text-foreground">
                      <Briefcase className="size-3" /> {parsed.experience}
                    </span>
                  )}
                  {parsed.job_title && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-2 py-0.5 text-xs text-foreground">
                      <User className="size-3" /> {parsed.job_title}
                    </span>
                  )}
                  {!parsed.skills?.length && !parsed.state && !parsed.education_level && !parsed.experience && !parsed.job_title && (
                    <span className="text-xs text-muted-foreground">Any</span>
                  )}
                </div>
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
                {displayedResults.map((c, i) => {
                  const eng = getEngagementLevel(c.behaviour);
                  const name = c.source === "poc" ? (c.candidate_id ?? `Candidate #${i + 1}`) : (c.email ?? `User #${i + 1}`);
                  const initial = name.replace(/^[^a-zA-Z]*/, "").charAt(0).toUpperCase() || "C";
                  return (
                    <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
                      <div className="flex flex-col sm:flex-row gap-5">
                        {/* Score ring */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div className={`relative flex items-center justify-center rounded-full border-4 size-20 ${scoreColor(c.score)}`}
                            style={{ background: c.score >= 80 ? "#f0fdf4" : c.score >= 60 ? "#fffbeb" : "#fef2f2" }}
                          >
                            <span className="text-lg font-extrabold">{c.score}%</span>
                            <span className={`absolute -bottom-1 size-3 rounded-full ${scoreEmoji(c.score)} border-2 border-card`} />
                          </div>
                          <span
                            title={behaviourTooltip(c.behaviour)}
                            style={{ background: eng.bg, color: eng.color, border: `1px solid ${eng.color}33` }}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full cursor-help"
                          >
                            <Activity className="size-3" />{eng.label}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                {initial}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">{name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {c.education_level && <>{c.education_level}</>}
                                  {c.field_of_study && <> in {c.field_of_study}</>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleSave(c.id)}
                                className={`p-2 rounded-lg border transition-colors ${saved.has(c.id) ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-primary"}`}
                                title={saved.has(c.id) ? "Unsave" : "Save Candidate"}
                              >
                                {saved.has(c.id) ? <Star className="size-4 fill-primary" /> : <BookmarkPlus className="size-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3 text-xs text-muted-foreground">
                            {c.preferred_state && (
                              <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {c.preferred_state}</span>
                            )}
                            {c.preferred_salary && (
                              <span className="inline-flex items-center gap-1"><DollarSign className="size-3" /> {c.preferred_salary}</span>
                            )}
                            {c.previous_occupation && (
                              <span className="inline-flex items-center gap-1"><Briefcase className="size-3" /> {c.previous_occupation} · {c.previous_years_experience ?? "N/A"} yrs</span>
                            )}
                            {c.education_level && (
                              <span className="inline-flex items-center gap-1"><GraduationCap className="size-3" /> {c.education_level}</span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {c.matched_skills.slice(0, 4).map(s => (
                              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                                <CheckCircle className="size-3" /> {s}
                              </span>
                            ))}
                            {c.missing_skills.slice(0, 3).map(s => (
                              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-700">
                                <XCircle className="size-3" /> {s}
                              </span>
                            ))}
                            {c.skills && c.skills.split(/[,;|]/).slice(0, 5).map(s => s.trim()).filter(s => s && !c.matched_skills.includes(s.toLowerCase())).map(s => (
                              <span key={s} className="rounded-full bg-secondary border border-border px-2 py-0.5 text-xs text-muted-foreground">{s}</span>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span title="Applications submitted" className="inline-flex items-center gap-1"><FileText className="size-3" /> <strong>{c.applications}</strong> apps</span>
                              <span className="inline-flex items-center gap-1"><User className="size-3" /> <strong>{c.interviews}</strong> interviews</span>
                              {c.sign_in_count ? <span className="inline-flex items-center gap-1"><Activity className="size-3" /> <strong>{c.sign_in_count}</strong> sign-ins</span> : null}
                              {c.offers > 0 && <span className="inline-flex items-center gap-1">🎯 <strong>{c.offers}</strong> offers</span>}
                              {c.overall_score && <span className="text-foreground/80">CV Score: <strong>{c.overall_score}</strong></span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {c.source === "registered" && c.id && (
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" asChild>
                                  <Link to="/employer/candidate/$candidateId" params={{ candidateId: c.id }}>
                                    <ExternalLink className="size-3" /> Profile
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!searching && !hasSearched && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="size-8 text-primary/60" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Find your next hire with AI</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5">Describe the role, skills, location, and experience you need. Our AI searches candidate profiles and ranks the best matches.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {POPULAR_SEARCHES.slice(0, 3).map(tag => (
                <button
                  key={tag}
                  onClick={() => { setQuery(tag); handleSearch(tag); }}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
