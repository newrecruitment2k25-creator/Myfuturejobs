import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Search, Globe2, MapPin, Share2, MessageCircle, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/analyze.functions";
import { CoverLetterDialog } from "@/components/cover-letter-dialog";
import { AiSuggestedFixes } from "@/components/ai-suggested-fixes";
import { JobRecommendations } from "@/components/job-recommendations";
import { supabase } from "@/integrations/supabase/client";
import { EmployabilityIntelligence } from "@/components/employability-intelligence";
import { SkillsPassport } from "@/components/skills-passport";
import { CareerPathway } from "@/components/career-pathway";
import { SalaryIntelligence } from "@/components/salary-intelligence";
import { TrainingRecommendations } from "@/components/training-recommendations";

export const Route = createFileRoute("/results")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : undefined }),
  component: ResultsPage,
  head: () => ({
    meta: [
      { title: "Your CV Analysis — MYFutureJobs" },
      { name: "description", content: "Your personalized CV analysis for Malaysia's job market." },
    ],
  }),
});

type Stored = {
  result: AnalysisResult;
  cv_text?: string;
  meta: { companyType: string; industry: string; experience: string; language: string };
};

function ratingColor(rating: string) {
  if (rating === "Strong") return "bg-[var(--success)] text-[var(--success-foreground)]";
  if (rating === "Needs Work") return "bg-[#F97316] text-white";
  return "bg-destructive text-destructive-foreground";
}

function scoreColor(score: number) {
  if (score >= 71) return "var(--success)";
  if (score >= 41) return "var(--warning)";
  return "var(--destructive)";
}

function benchmarkPercentile(score: number) {
  return Math.min(95, Math.max(5, Math.round(45 + (score - 68) * 1.67)));
}

function ResultsPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/results" });
  const analysisId = (search as any)?.id as string | undefined;
  const [data, setData] = useState<Stored | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);

  useEffect(() => {
    if (analysisId) {
      // Primary: load from Supabase
      (async () => {
        const { data: row, error } = await supabase
          .from("analyses")
          .select("*")
          .eq("id", analysisId)
          .single();
        if (error || !row) {
          // Supabase failed — fall back to sessionStorage
          const raw = sessionStorage.getItem("MYFutureJobs:lastResult");
          if (raw) { try { setData(JSON.parse(raw)); return; } catch { /**/ } }
          void navigate({ to: "/analyze" });
          return;
        }
        const result = row.full_results as unknown as AnalysisResult;
        setData({
          result,
          meta: {
            companyType: row.company_type,
            industry: row.industry,
            experience: row.experience_level,
            language: row.language_preference,
          },
        });
      })();
    } else {
      // Fallback: sessionStorage (no id param)
      const raw = sessionStorage.getItem("MYFutureJobs:lastResult");
      if (!raw) { void navigate({ to: "/analyze" }); return; }
      try { setData(JSON.parse(raw)); } catch { void navigate({ to: "/analyze" }); }
    }
  }, [analysisId, navigate]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading your analysis…
      </div>
    );
  }

  const { result, meta } = data;
  const shareText = encodeURIComponent(
    `Just got my CV analyzed for Malaysia's job market with MYFutureJobs 🇲🇾 — built for Malaysia, not translated for it.`,
  );
  const shareUrl = encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          {/* Score hero */}
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Overall CV Score
            </p>
            <ScoreCircle score={result.overall_score} />
            <p className="mt-3 text-sm font-medium text-[#F97316]">
              Better than {benchmarkPercentile(result.overall_score)}% of CVs analyzed in Malaysia
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Based on <span className="font-semibold text-foreground">{meta.companyType}</span> standards in Malaysia
            </p>
          </div>

          {/* Cards */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <AnalysisCard
              icon={<FileText className="size-5" />}
              title="CV Structure"
              score={result.structure.score}
              rating={result.structure.rating}
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                {result.structure.feedback.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span><span>{f}</span>
                  </li>
                ))}
              </ul>
            </AnalysisCard>

            <AnalysisCard
              icon={<Search className="size-5" />}
              title="Keyword Optimization"
              score={result.keywords.score}
              rating={result.keywords.rating}
            >
              <div className="space-y-3">
                {result.keywords.missing_keywords.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-destructive">Missing</p>
                    <div className="flex flex-wrap gap-2">
                      {result.keywords.missing_keywords.map((k) => (
                        <span key={k} className="rounded-full bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.keywords.present_keywords.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--success)]">Present</p>
                    <div className="flex flex-wrap gap-2">
                      {result.keywords.present_keywords.map((k) => (
                        <span key={k} className="rounded-full bg-[var(--success)]/15 px-3 py-1.5 text-sm font-medium text-[var(--success)]">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AnalysisCard>

            <AnalysisCard
              icon={<Globe2 className="size-5" />}
              title="BM / English Balance"
              score={result.language_balance.score}
              rating={result.language_balance.rating}
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                {result.language_balance.feedback.map((f, i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{f}</span></li>
                ))}
              </ul>
            </AnalysisCard>

            <AnalysisCard
              icon={<MapPin className="size-5" />}
              title="Malaysia Market Fit"
              score={result.malaysia_market_fit.score}
              rating={result.malaysia_market_fit.rating}
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                {result.malaysia_market_fit.feedback.map((f, i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{f}</span></li>
                ))}
              </ul>
            </AnalysisCard>
          </div>

          {/* Priority improvements */}
          <div className="mt-10 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h2 className="text-xl font-bold text-primary">Priority Improvements</h2>
            <p className="mt-1 text-sm text-muted-foreground">Specific, actionable — start with #1.</p>
            <ol className="mt-6 space-y-4">
              {result.priority_improvements.map((imp, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-sm leading-relaxed text-foreground">{imp}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Employability Intelligence */}
          <EmployabilityIntelligence result={result} meta={meta} />

          {/* Skills Passport */}
          <SkillsPassport result={result} meta={meta} />

          {/* Career Pathway & Skills Gap */}
          <CareerPathway result={result} meta={meta} />

          {/* Salary Intelligence */}
          <SalaryIntelligence result={result} meta={meta} />

          {/* Training & Upskilling Roadmap */}
          <TrainingRecommendations result={result} meta={meta} />

          {/* AI Suggested Fixes */}
          {data.cv_text && (
            <AiSuggestedFixes
              cvText={data.cv_text}
              priorityImprovements={result.priority_improvements}
              companyType={meta.companyType}
              industry={meta.industry}
            />
          )}

          {/* Job Recommendations */}
          <JobRecommendations
            keywords={
              result.keywords.present_keywords.length > 0
                ? result.keywords.present_keywords.slice(0, 3)
                : result.keywords.missing_keywords.slice(0, 3)
            }
            industry={meta.industry}
          />

          {/* CTA */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <Button variant="outline" size="xl" className="border-[var(--brand-red)] text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10" onClick={() => setCoverOpen(true)}>
              Generate AI Cover Letter
            </Button>
            <Button asChild size="xl">
              <Link to="/interview-preparation">Prepare for Interview</Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link to="/analyze">Analyze Another CV</Link>
            </Button>
          </div>

          {/* Share */}
          <div className="mt-10 rounded-2xl border border-border bg-secondary/40 p-6 text-center">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
              <Share2 className="size-4" /> Share MYFutureJobs with a friend who needs this
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <a
                href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A66C2] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110"
              >
                <Linkedin className="size-4" /> LinkedIn
              </a>
            </div>
          </div>
        </div>
      </main>

      <CoverLetterDialog
        open={coverOpen}
        onOpenChange={setCoverOpen}
        analysis={result}
        companyType={meta.companyType}
      />
    </div>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(clamped);
  return (
    <div className="relative mx-auto mt-4 size-44">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--secondary)" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * 326.7} 326.7`}
          style={{ transition: "stroke-dasharray 800ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-extrabold text-primary">{clamped}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function AnalysisCard({
  icon,
  title,
  score,
  rating,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  score: number;
  rating: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ratingColor(rating)}`}>
            {rating}
          </span>
          <span className="text-sm font-bold text-primary">{score}</span>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}