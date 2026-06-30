import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Brain, Briefcase, Users, Search, Sparkles, Loader2, ArrowRight,
  CheckCircle2, AlertCircle, XCircle, Target, MapPin, GraduationCap, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/poc/ai-matching")({
  ssr: false,
  component: PocAiMatchingPage,
  head: () => ({
    meta: [
      { title: "PERKESO AI Matching Demo — MYFutureJobs" },
      { name: "description", content: "Semantic candidate matching, skill gap analysis, and explainable AI recommendation demo." },
    ],
  }),
});

type Vacancy = {
  id: string;
  job_title: string | null;
  occupation_name: string | null;
  state: string | null;
  city: string | null;
  salary: string | null;
  skills: string | null;
};

type Candidate = {
  id: string;
  preferred_name: string | null;
  previous_occupation: string | null;
  skills: string | null;
  preferred_state: string | null;
  preferred_salary: string | null;
  semanticScore: number;
};

type SkillGap = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  recommendedTraining: string[];
  summary: string;
  nextSteps: string[];
};

type Explanation = {
  summary: string;
  strengths: string[];
  gaps: string[];
  skillGap: {
    matchedSkills: string[];
    missingSkills: string[];
    recommendedTraining: string[];
  };
  salaryFit: string;
  locationFit: string;
  experienceFit: string;
  recommendation: string;
  confidence: number;
};

type MatchReport = {
  ok: boolean;
  candidate?: any;
  vacancy?: any;
  semanticScore: number | null;
  matchScore: number;
  skillGap: SkillGap;
  explanation: Explanation;
  error?: string;
};

function StatusChip({ icon: Icon, label, value, active }: { icon: any; label: string; value: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground"}`}>
      <Icon className="size-3.5" />
      <span>{label}: {value}</span>
    </div>
  );
}

function SectionCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <h2 className="text-base font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function PocAiMatchingPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [vacancyLoading, setVacancyLoading] = useState(true);
  const [vacancyError, setVacancyError] = useState<string | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [vacancySearch, setVacancySearch] = useState("");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [candidateWarning, setCandidateWarning] = useState<string | null>(null);

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [report, setReport] = useState<MatchReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Load first 50 vacancies
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setVacancyLoading(true);
        const { data, error } = await supabase
          .from("poc_vacancies")
          .select("id, job_title, occupation_name, state, city, salary, skills")
          .order("id", { ascending: true })
          .limit(50);
        if (cancelled) return;
        if (error) throw error;
        setVacancies((data as Vacancy[]) ?? []);
      } catch (e: any) {
        setVacancyError(e?.message ?? "Failed to load vacancies");
      } finally {
        setVacancyLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredVacancies = useMemo(() => {
    if (!vacancySearch.trim()) return vacancies;
    const q = vacancySearch.toLowerCase();
    return vacancies.filter((v) =>
      (v.job_title ?? "").toLowerCase().includes(q) ||
      (v.occupation_name ?? "").toLowerCase().includes(q) ||
      (v.state ?? "").toLowerCase().includes(q) ||
      (v.city ?? "").toLowerCase().includes(q)
    );
  }, [vacancies, vacancySearch]);

  async function findMatchingCandidates() {
    if (!selectedVacancy) return;
    setCandidateLoading(true);
    setCandidateError(null);
    setCandidateWarning(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setReport(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "match_candidates_for_vacancy",
          vacancy_id: selectedVacancy.id,
          limit: 10,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setCandidateError(data.error ?? "Matching failed");
        return;
      }
      setCandidates(data.candidates ?? []);
      if (data.warning) setCandidateWarning(data.warning);
    } catch (e: any) {
      setCandidateError(e?.message ?? "Network error");
    } finally {
      setCandidateLoading(false);
    }
  }

  async function generateReport(candidate: Candidate) {
    if (!selectedVacancy) return;
    setSelectedCandidate(candidate);
    setReportLoading(true);
    setReportError(null);
    setReport(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "candidate_match_report",
          candidate_id: candidate.id,
          vacancy_id: selectedVacancy.id,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setReportError(data.error ?? "Report failed");
        return;
      }
      setReport(data as MatchReport);
    } catch (e: any) {
      setReportError(e?.message ?? "Network error");
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              PERKESO POC
            </span>
            <span className="text-xs text-muted-foreground">Proof of Concept</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            PERKESO AI Matching Demo
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            <span className="font-semibold text-foreground">POC Demo View.</span> This page demonstrates the same semantic AI matching, skill gap analysis, and explainable AI recommendation used inside the Jobs and Employer modules.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <StatusChip icon={Briefcase} label="Vacancy embeddings" value="5,828" active />
            <StatusChip icon={Users} label="Candidate embeddings" value="1,449" active />
            <StatusChip icon={Search} label="Vector search" value="Active" active />
            <StatusChip icon={Brain} label="AI Engine" value="Enabled" active />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column — vacancy + candidates */}
          <div className="lg:col-span-1 space-y-6">
            {/* Vacancy selector */}
            <SectionCard title="1. Select Vacancy">
              {vacancyLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading vacancies...
                </div>
              ) : vacancyError ? (
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="size-4 mt-0.5" />
                  <span>{vacancyError}</span>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Search vacancies..."
                    value={vacancySearch}
                    onChange={(e) => setVacancySearch(e.target.value)}
                    className="mb-3"
                  />
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {filteredVacancies.length === 0 && (
                      <p className="text-sm text-muted-foreground">No vacancies found.</p>
                    )}
                    {filteredVacancies.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setSelectedVacancy(v);
                          setCandidates([]);
                          setSelectedCandidate(null);
                          setReport(null);
                          setCandidateError(null);
                          setCandidateWarning(null);
                        }}
                        className={`w-full text-left rounded-lg border p-3 transition-all ${
                          selectedVacancy?.id === v.id
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">{v.job_title || v.occupation_name || "Untitled Vacancy"}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {v.state}{v.city ? `, ${v.city}` : ""} {v.salary ? `· ${v.salary}` : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {selectedVacancy && (
                <div className="mt-4 rounded-lg border border-border bg-secondary/50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selected</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{selectedVacancy.job_title || selectedVacancy.occupation_name || "Untitled"}</p>
                  {selectedVacancy.skills && (
                    <p className="text-xs text-muted-foreground mt-1">Skills: {selectedVacancy.skills}</p>
                  )}
                </div>
              )}
            </SectionCard>

            {/* Find candidates */}
            <SectionCard title="2. Find Matching Candidates">
              <Button
                onClick={findMatchingCandidates}
                disabled={!selectedVacancy || candidateLoading}
                className="w-full"
              >
                {candidateLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
                Find Matching Candidates
              </Button>

              {candidateError && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-600">
                  <XCircle className="size-4 mt-0.5" />
                  <span>{candidateError}</span>
                </div>
              )}
              {candidateWarning && (
                <div className="mt-3 flex items-start gap-2 text-sm text-amber-600">
                  <AlertCircle className="size-4 mt-0.5" />
                  <span>Semantic candidate matching is not available for this vacancy yet. Please try another vacancy or run embedding sync.</span>
                </div>
              )}
            </SectionCard>

            {/* Candidate list */}
            <SectionCard title="3. Matching Candidates">
              {candidates.length === 0 && !candidateLoading && !candidateError && (
                <p className="text-sm text-muted-foreground">Select a vacancy and click find to see candidates.</p>
              )}
              <div className="space-y-3">
                {candidates.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-lg border p-3 transition-all ${
                      selectedCandidate?.id === c.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.preferred_name || c.previous_occupation || `Candidate ${c.id}`}</p>
                        <p className="text-xs text-muted-foreground">{c.previous_occupation || "—"}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round((c.semanticScore ?? 0) * 100)}%
                      </Badge>
                    </div>
                    {c.skills && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.skills}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.preferred_state} {c.preferred_salary ? `· ${c.preferred_salary}` : ""}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => generateReport(c)}
                      disabled={reportLoading}
                    >
                      {reportLoading && selectedCandidate?.id === c.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <ArrowRight className="size-3 mr-1" />}
                      Generate Match Report
                    </Button>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Right column — report */}
          <div className="lg:col-span-2 space-y-6">
            <SectionCard title="4. AI Match Report" className="h-full">
              {!report && !reportLoading && !reportError && (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Target className="size-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Select a candidate and generate a report to see the AI explanation.</p>
                </div>
              )}

              {reportLoading && (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Loader2 className="size-8 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Generating AI match report...</p>
                </div>
              )}

              {reportError && (
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <XCircle className="size-4 mt-0.5" />
                  <span>{reportError}</span>
                </div>
              )}

              {report && report.ok && (
                <div className="space-y-6">
                  {/* Scores */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border bg-secondary/50 p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{report.matchScore}</p>
                      <p className="text-xs text-muted-foreground">Match Score</p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/50 p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{report.semanticScore != null ? `${Math.round(report.semanticScore * 100)}%` : "—"}</p>
                      <p className="text-xs text-muted-foreground">Semantic Similarity</p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/50 p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{report.skillGap.score}%</p>
                      <p className="text-xs text-muted-foreground">Skill Match</p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Brain className="size-4 text-primary" /> Summary
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{report.explanation.summary}</p>
                  </div>

                  {/* Fit */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FitCard icon={DollarSign} label="Salary Fit" value={report.explanation.salaryFit} />
                    <FitCard icon={MapPin} label="Location Fit" value={report.explanation.locationFit} />
                    <FitCard icon={GraduationCap} label="Experience Fit" value={report.explanation.experienceFit} />
                  </div>

                  {/* Recommendation */}
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Recommendation</p>
                    <div className="flex items-center gap-2">
                      <Badge className="capitalize">{report.explanation.recommendation.replace(/_/g, " ")}</Badge>
                      <span className="text-sm text-muted-foreground">Confidence: {report.explanation.confidence}%</span>
                    </div>
                  </div>

                  {/* Strengths & Gaps */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <ListCard icon={CheckCircle2} title="Strengths" items={report.explanation.strengths} empty="No specific strengths listed." color="text-green-600" />
                    <ListCard icon={XCircle} title="Gaps" items={report.explanation.gaps} empty="No specific gaps listed." color="text-red-500" />
                  </div>

                  {/* Skills */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <TagList title="Matched Skills" items={report.skillGap.matchedSkills} empty="No direct skill matches." variant="success" />
                    <TagList title="Missing Skills" items={report.skillGap.missingSkills} empty="No missing skills identified." variant="danger" />
                  </div>

                  <TagList title="Transferable Skills" items={report.skillGap.transferableSkills} empty="No transferable skills identified." variant="neutral" />
                  <TagList title="Recommended Training" items={report.skillGap.recommendedTraining} empty="No training recommendations." variant="primary" />

                  {report.skillGap.nextSteps.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Next Steps</h3>
                      <ul className="space-y-1.5">
                        {report.skillGap.nextSteps.map((step, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <ArrowRight className="size-3.5 mt-0.5 text-primary shrink-0" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </main>
    </div>
  );
}

function FitCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <p className="text-sm text-muted-foreground capitalize">{value || "Unknown"}</p>
    </div>
  );
}

function ListCard({ icon: Icon, title, items, empty, color }: { icon: any; title: string; items: string[]; empty: string; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Icon className={`size-4 ${color}`} />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${color.replace("text-", "bg-")}`} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TagList({ title, items, empty, variant }: { title: string; items: string[]; empty: string; variant: "success" | "danger" | "neutral" | "primary" }) {
  const styles = {
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    neutral: "bg-secondary text-secondary-foreground",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[variant]}`}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
