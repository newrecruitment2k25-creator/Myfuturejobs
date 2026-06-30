import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2, ChevronDown, MapPin, Banknote, GraduationCap, Zap, AlertCircle,
  Activity, Star,
} from "lucide-react";
import { getEngagementLevel, behaviourTooltip } from "@/lib/behaviour";
import { matchJobToCandidates, listPocVacancies } from "@/lib/poc-matching.functions";

export const Route = createFileRoute("/poc/employer-matching")({
  ssr: false,
  component: PocEmployerMatchingPage,
  head: () => ({
    meta: [
      { title: "Find Candidates — PERKESO POC" },
      { name: "description", content: "AI-powered candidate ranking for PERKESO employers." },
    ],
  }),
});

type Vacancy = { id: string; job_title: string; occupation_name: string | null; state: string | null; salary: string | null };
type CandidateMatch = {
  candidate_id: string;
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
  candidate: {
    id: string;
    preferred_occupation: string | null;
    previous_occupation: string | null;
    education_level: string | null;
    nec_1d: string | null;
    skills: string | null;
    preferred_state: string | null;
    preferred_salary: string | null;
    previous_years_experience: unknown;
  } | null;
  behaviour: {
    interview_count: number;
    job_offer_count: number;
    submitted_application_count: number;
    sign_in_count: number;
    grand_total: number;
  } | null;
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

function CandidateCard({ match, idx }: { match: CandidateMatch; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const c = match.candidate!;
  const eng = getEngagementLevel(match.behaviour);
  const tip = behaviourTooltip(match.behaviour);

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
                <h3 className="font-semibold text-foreground text-sm">{c.id}</h3>
                <span
                  title={tip}
                  style={{ background: eng.bg, color: eng.color, border: `1px solid ${eng.color}22` }}
                  className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-help"
                >
                  <Activity className="size-3" />{eng.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{c.preferred_occupation ?? c.previous_occupation ?? "N/A"}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {c.education_level && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GraduationCap className="size-3" />{c.education_level.slice(0, 28)}
                  </span>
                )}
                {c.preferred_state && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />{c.preferred_state}
                  </span>
                )}
                {c.preferred_salary && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Banknote className="size-3" />{c.preferred_salary}
                  </span>
                )}
                {c.previous_years_experience != null && (
                  <span className="text-xs text-muted-foreground">{String(c.previous_years_experience)} yrs exp</span>
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

        <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{match.explanation}</p>

        {/* Score bars */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ScoreBar label="Skills" value={match.skill_match_score} />
          <ScoreBar label="Education" value={match.education_match_score} />
          <ScoreBar label="Salary" value={match.salary_match_score} />
          <ScoreBar label="Location" value={match.location_match_score} />
          <ScoreBar label="Experience" value={match.experience_match_score} />
        </div>

        {/* Behaviour summary */}
        {match.behaviour && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              📊 <strong>{match.behaviour.submitted_application_count ?? 0}</strong> applications · <strong>{match.behaviour.interview_count ?? 0}</strong> interviews · <strong>{match.behaviour.sign_in_count ?? 0}</strong> sign-ins
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Applications", value: match.behaviour.submitted_application_count },
                { label: "Interviews",   value: match.behaviour.interview_count },
                { label: "Offers",       value: match.behaviour.job_offer_count },
                { label: "Sign-ins",     value: match.behaviour.sign_in_count },
              ].map(({ label, value }) => (
                <div key={label} className="text-center rounded-lg bg-muted/50 py-2 px-1">
                  <p className="text-base font-bold text-foreground">{value ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border/60 px-5 py-4 space-y-4 bg-background/50 rounded-b-xl">
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
          {match.skill_gaps && match.skill_gaps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Skill Gaps</p>
              <div className="flex flex-wrap gap-1.5">
                {match.skill_gaps.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium flex items-center gap-1">
                    <AlertCircle className="size-2.5" />{s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {match.taxonomy_relationship && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 leading-relaxed">
              <span className="font-semibold text-foreground">MASCO Taxonomy: </span>{match.taxonomy_relationship}
            </div>
          )}
          {c.skills && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Full Skills Profile</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.skills}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PocEmployerMatchingPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [vacancy, setVacancy] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    listPocVacancies()
      .then(({ vacancies }) => setVacancies(vacancies as Vacancy[]))
      .catch(console.error)
      .finally(() => setLoadingList(false));
  }, []);

  const handleMatch = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    setMatches([]);
    try {
      const result = await matchJobToCandidates({ data: { vacancy_id: selectedId, limit } });
      setMatches((result.matches ?? []) as CandidateMatch[]);
      setVacancy(result.vacancy as Record<string, unknown>);
      if (result.error && (result.matches ?? []).length === 0) setError(result.error);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Matching failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedVacancy = vacancies.find((v) => v.id === selectedId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">Employer View</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Find Best-Fit Candidates</h1>
          <p className="mt-2 text-muted-foreground">Select a vacancy — AI ranks the most qualified candidates from 1,449 PERKESO jobseekers by skills, education, and engagement.</p>
        </div>

        {/* Controls */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Select Vacancy</label>
              {loadingList ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
                  <Loader2 className="size-4 animate-spin" /> Loading vacancies…
                </div>
              ) : (
                <select
                  value={selectedId}
                  onChange={(e) => { setSelectedId(e.target.value); setMatches([]); setError(null); }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">— Choose a vacancy ({vacancies.length} total) —</option>
                  {vacancies.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.id} — {v.job_title} ({v.state ?? "Any"}) {v.salary ? `| ${v.salary}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Top N candidates</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {[5, 10, 20].map((n) => <option key={n} value={n}>{n} results</option>)}
              </select>
            </div>
          </div>

          {selectedVacancy && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground grid grid-cols-2 sm:grid-cols-4 gap-2">
              <span><span className="font-medium text-foreground">ID:</span> {selectedVacancy.id}</span>
              <span><span className="font-medium text-foreground">Title:</span> {selectedVacancy.job_title}</span>
              <span><span className="font-medium text-foreground">State:</span> {selectedVacancy.state ?? "Any"}</span>
              <span><span className="font-medium text-foreground">Salary:</span> {selectedVacancy.salary ?? "N/A"}</span>
            </div>
          )}

          <button
            onClick={handleMatch}
            disabled={!selectedId || loading}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <><Loader2 className="size-4 animate-spin" />Analysing…</> : <><Zap className="size-4" />Find Candidates</>}
          </button>
          {loading && (
            <p className="mt-2 text-xs text-muted-foreground animate-pulse">
              AI is pre-filtering candidates by education, salary, and location, then ranking the best fits with explanations…
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        {matches.length > 0 && vacancy && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Top {matches.length} Candidates for {vacancy.job_title as string}
              </h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="size-3" /> Ranked by AI match score
              </div>
            </div>
            <div className="space-y-4">
              {matches.map((m, i) => (
                <CandidateCard key={m.candidate_id} match={m} idx={i} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
