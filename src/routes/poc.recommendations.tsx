import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Loader2, ChevronDown, TrendingUp, MapPin, Banknote, GraduationCap, Zap, AlertCircle, ArrowUpRight } from "lucide-react";
import { matchCandidateToJobs, listPocCandidates } from "@/lib/poc-matching.functions";

export const Route = createFileRoute("/poc/recommendations")({
  ssr: false,
  component: PocRecommendationsPage,
  head: () => ({
    meta: [
      { title: "AI Job Recommendations — PERKESO POC" },
      { name: "description", content: "AI-powered semantic job matching for PERKESO jobseekers." },
    ],
  }),
});

type Candidate = { id: string; preferred_occupation: string | null; nec_1d: string | null; education_level: string | null; preferred_state: string | null };
type Match = {
  vacancy_id: string;
  match_score: number;
  skill_match_score?: number;
  education_match_score?: number;
  salary_match_score?: number;
  location_match_score?: number;
  experience_match_score?: number;
  explanation: string;
  matched_skills?: string[];
  transferable_skills?: string[];
  skill_gaps?: string[];
  taxonomy_relationship?: string;
  vacancy: { id: string; job_title: string; occupation_name: string; salary: string | null; state: string | null; education_level: string | null; skills: string | null } | null;
};

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
}
function scoreBg(score: number) {
  if (score >= 80) return "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800";
  if (score >= 60) return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800";
  return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
}
function ScoreBar({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${scoreColor(value)}`}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${value >= 80 ? "bg-green-500" : value >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function MatchCard({ match, idx }: { match: Match; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const v = match.vacancy!;
  return (
    <div className={`rounded-xl border ${scoreBg(match.match_score)} transition-all`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xl font-extrabold ${match.match_score >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" : match.match_score >= 60 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"}`}>
              {match.match_score}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                <h3 className="font-semibold text-foreground text-sm">{v.job_title}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{v.occupation_name}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {v.salary && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Banknote className="size-3" />{v.salary}
                  </span>
                )}
                {v.state && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />{v.state}
                  </span>
                )}
                {v.education_level && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GraduationCap className="size-3" />{v.education_level.slice(0, 30)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {expanded ? "Less" : "Details"}
            <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Explanation */}
        <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{match.explanation}</p>

        {/* Score bars */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ScoreBar label="Skills" value={match.skill_match_score} />
          <ScoreBar label="Education" value={match.education_match_score} />
          <ScoreBar label="Salary" value={match.salary_match_score} />
          <ScoreBar label="Location" value={match.location_match_score} />
          <ScoreBar label="Experience" value={match.experience_match_score} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/60 px-5 py-4 space-y-4 bg-background/50 rounded-b-xl">
          {/* Matched skills */}
          {match.matched_skills && match.matched_skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Matched Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {match.matched_skills.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}
          {/* Transferable skills */}
          {match.transferable_skills && match.transferable_skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Transferable Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {match.transferable_skills.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}
          {/* Skill gaps */}
          {match.skill_gaps && match.skill_gaps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Skills to Develop</p>
              <div className="flex flex-wrap gap-1.5">
                {match.skill_gaps.map((s) => (
                  <span key={s} title="Skill gap — develop this to improve your match" className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium flex items-center gap-1">
                    <AlertCircle className="size-2.5" />{s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Taxonomy */}
          {match.taxonomy_relationship && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 leading-relaxed">
              <span className="font-semibold text-foreground">MASCO Taxonomy: </span>{match.taxonomy_relationship}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PocRecommendationsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [candidate, setCandidate] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    listPocCandidates()
      .then(({ candidates }) => setCandidates(candidates as Candidate[]))
      .catch(console.error)
      .finally(() => setLoadingList(false));
  }, []);

  const handleMatch = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    setMatches([]);
    try {
      const result = await matchCandidateToJobs({ data: { candidate_id: selectedId, limit } });
      setMatches((result.matches ?? []) as Match[]);
      setCandidate(result.candidate as Record<string, unknown>);
      if (result.error && (result.matches ?? []).length === 0) setError(result.error);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Matching failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Aggregate skill gaps
  const skillGapFreq = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const m of matches) {
      for (const g of m.skill_gaps ?? []) {
        freq[g] = (freq[g] ?? 0) + 1;
      }
    }
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [matches]);

  const selectedCandidate = candidates.find((c) => c.id === selectedId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">Jobseeker View</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">AI Job Recommendations</h1>
          <p className="mt-2 text-muted-foreground">Select a candidate to run semantic AI matching against 5,828 PERKESO vacancies.</p>
        </div>

        {/* Controls */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Select Candidate</label>
              {loadingList ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
                  <Loader2 className="size-4 animate-spin" /> Loading candidates…
                </div>
              ) : (
                <select
                  value={selectedId}
                  onChange={(e) => { setSelectedId(e.target.value); setMatches([]); setError(null); }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">— Choose a candidate ({candidates.length} total) —</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.preferred_occupation ?? c.nec_1d ?? "N/A"} ({c.preferred_state ?? "Any"})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Top N matches</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {[5, 10, 20].map((n) => <option key={n} value={n}>{n} results</option>)}
              </select>
            </div>
          </div>

          {selectedCandidate && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground grid grid-cols-2 sm:grid-cols-4 gap-2">
              <span><span className="font-medium text-foreground">ID:</span> {selectedCandidate.id}</span>
              <span><span className="font-medium text-foreground">Role:</span> {selectedCandidate.preferred_occupation ?? "N/A"}</span>
              <span><span className="font-medium text-foreground">Edu:</span> {selectedCandidate.education_level?.slice(0, 25) ?? "N/A"}</span>
              <span><span className="font-medium text-foreground">State:</span> {selectedCandidate.preferred_state ?? "Any"}</span>
            </div>
          )}

          <button
            onClick={handleMatch}
            disabled={!selectedId || loading}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <><Loader2 className="size-4 animate-spin" />Analysing…</> : <><Zap className="size-4" />Match to Jobs</>}
          </button>
          {loading && (
            <p className="mt-2 text-xs text-muted-foreground animate-pulse">
              AI is pre-filtering vacancies by education, salary, and location, then semantically scoring the top matches…
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        {matches.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Top {matches.length} Matches for {selectedId}
              </h2>
              <span className="text-xs text-muted-foreground">Sorted by AI match score</span>
            </div>

            <div className="space-y-4 mb-10">
              {matches.map((m, i) => (
                <MatchCard key={m.vacancy_id} match={m} idx={i} />
              ))}
            </div>

            {/* Skill Gap Analysis */}
            {skillGapFreq.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6 mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="size-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Skill Gap Analysis</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  These skills appear most frequently in your matched jobs but are missing from your profile. Developing them will unlock more opportunities.
                </p>
                <div className="space-y-2.5">
                  {skillGapFreq.map(([skill, freq]) => (
                    <div key={skill} className="flex items-center gap-3">
                      <span className="text-sm text-foreground min-w-0 flex-1 truncate">{skill}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="h-2 rounded-full bg-muted overflow-hidden w-24">
                          <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${(freq / matches.length) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-16 text-right">{freq}/{matches.length} jobs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Career Pathway */}
            {candidate && (
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowUpRight className="size-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Career Pathway</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Based on your MASCO occupation taxonomy and matched vacancies, here is a suggested career progression.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground">
                    {(candidate.previous_occupation as string) ?? "Current Role"}
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground shrink-0" />
                  <div className="rounded-lg bg-primary/10 border border-primary/30 px-4 py-2 text-sm font-medium text-primary">
                    {(candidate.preferred_occupation as string) ?? "Target Role"}
                  </div>
                  {matches[0]?.vacancy && (
                    <>
                      <ArrowUpRight className="size-4 text-muted-foreground shrink-0" />
                      <div className="rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300">
                        {matches[0].vacancy.job_title}
                      </div>
                    </>
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Bridging from <strong>{(candidate.nec_1d as string) ?? "your field"}</strong> — develop the skill gaps above to progress through the pathway.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
