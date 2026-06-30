import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  User,
  FileText,
  Briefcase,
  Award,
  Search,
  MapPin,
  Copy,
  Share2,
  MessageCircle,
  Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { LinkedInAnalysis } from "@/lib/linkedin-analyze.functions";
import { JobRecommendations } from "@/components/job-recommendations";

export const Route = createFileRoute("/linkedin-review/results")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : undefined }),
  component: LinkedInResultsPage,
  head: () => ({
    meta: [
      { title: "Your LinkedIn Review — MYFutureJobs" },
      {
        name: "description",
        content: "Your personalized LinkedIn profile analysis for Malaysia's job market.",
      },
    ],
  }),
});

type Stored = {
  result: LinkedInAnalysis;
  meta: { experience: string; industry: string; goal: string };
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

function LinkedInResultsPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/linkedin-review/results" });
  const analysisId = (search as any)?.id as string | undefined;
  const [data, setData] = useState<Stored | null>(null);

  useEffect(() => {
    if (analysisId) {
      (async () => {
        const { data: row, error } = await supabase
          .from("analyses")
          .select("*")
          .eq("id", analysisId)
          .single();
        if (error || !row) {
          const raw = sessionStorage.getItem("MYFutureJobs:lastLinkedIn");
          if (raw) { try { setData(JSON.parse(raw)); return; } catch { /**/ } }
          void navigate({ to: "/linkedin-review" });
          return;
        }
        const result = row.full_results as unknown as LinkedInAnalysis;
        setData({
          result,
          meta: {
            experience: row.experience_level,
            industry: row.industry,
            goal: "Job Search",
          },
        });
      })();
    } else {
      const raw = sessionStorage.getItem("MYFutureJobs:lastLinkedIn");
      if (!raw) { void navigate({ to: "/linkedin-review" }); return; }
      try { setData(JSON.parse(raw)); } catch { void navigate({ to: "/linkedin-review" }); }
    }
  }, [analysisId, navigate]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading your review…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <LinkedInResultsView result={data.result} meta={data.meta} />
      </main>
    </div>
  );
}

export function LinkedInResultsView({ result, meta }: Stored) {
  const navigate = useNavigate();
  const shareText = encodeURIComponent(
    `Just got my LinkedIn profile reviewed for Malaysia's job market with MYFutureJobs 🇲🇾`,
  );
  const shareUrl = encodeURIComponent(
    typeof window !== "undefined" ? window.location.origin : "",
  );

  const copy = async (text: string, label = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Couldn't copy. Please copy manually.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          {/* Score hero */}
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Overall Profile Score
            </p>
            <ScoreCircle score={result.overall_score} />
            <p className="mt-2 text-sm text-muted-foreground">
              Reviewed for <span className="font-semibold text-foreground">{meta.goal}</span> ·{" "}
              {meta.industry} · {meta.experience}
            </p>
          </div>

          {/* Cards */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <AnalysisCard
              icon={<User className="size-5" />}
              title="Profile Photo & Headline"
              score={result.photo_headline.score}
              rating={result.photo_headline.rating}
            >
              <FeedbackList items={result.photo_headline.feedback} />
            </AnalysisCard>

            <AnalysisCard
              icon={<FileText className="size-5" />}
              title="About Section"
              score={result.about_section.score}
              rating={result.about_section.rating}
            >
              <FeedbackList items={result.about_section.feedback} />
            </AnalysisCard>

            <AnalysisCard
              icon={<Briefcase className="size-5" />}
              title="Experience Section"
              score={result.experience.score}
              rating={result.experience.rating}
            >
              <FeedbackList items={result.experience.feedback} />
            </AnalysisCard>

            <AnalysisCard
              icon={<Award className="size-5" />}
              title="Skills & Endorsements"
              score={result.skills.score}
              rating={result.skills.rating}
            >
              <KeywordsBlock
                missing={result.skills.missing_skills}
                present={result.skills.present_skills}
                missingLabel="Missing for Malaysian market"
                presentLabel="Present"
              />
            </AnalysisCard>

            <AnalysisCard
              icon={<Search className="size-5" />}
              title="Keywords & SEO"
              score={result.keywords.score}
              rating={result.keywords.rating}
            >
              <KeywordsBlock
                missing={result.keywords.missing_keywords}
                present={result.keywords.present_keywords}
                missingLabel="Missing"
                presentLabel="Present"
              />
            </AnalysisCard>

            <AnalysisCard
              icon={<MapPin className="size-5" />}
              title="Malaysia Market Fit"
              score={result.malaysia_market_fit.score}
              rating={result.malaysia_market_fit.rating}
            >
              <FeedbackList items={result.malaysia_market_fit.feedback} />
            </AnalysisCard>
          </div>

          {/* Priority improvements */}
          <div className="mt-10 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h2 className="text-xl font-bold text-primary">Priority Improvements</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Specific, actionable — start with #1.
            </p>
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

          {/* AI Fix Suggestions */}
          <div className="mt-10 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h2 className="text-xl font-bold" style={{ color: "#1B2B4B" }}>
              AI Fix Suggestions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ready-to-paste rewrites for your profile.
            </p>

            <RewriteBlock
              label="Rewritten Headline"
              text={result.rewritten_headline}
              onCopy={() => copy(result.rewritten_headline, "Headline copied")}
            />
            {(() => {
              const aboutText =
                result.rewritten_about || result.about_section.rewritten_version || "";
              if (!aboutText) return null;
              return (
                <RewriteBlock
                  label="Rewritten About Section"
                  text={aboutText}
                  onCopy={() => copy(aboutText, "About section copied")}
                />
              );
            })()}
          </div>

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
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <Button 
              variant="navy" 
              size="xl"
              onClick={() => {
                sessionStorage.removeItem("MYFutureJobs:lastLinkedIn");
                void navigate({ to: "/linkedin-review" });
              }}
            >
              Review Another Profile
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link to="/analyze">Analyze My CV Too</Link>
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
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          / 100
        </span>
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

function FeedbackList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm text-muted-foreground">
      {items.map((f, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-primary">•</span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

function KeywordsBlock({
  missing,
  present,
  missingLabel,
  presentLabel,
}: {
  missing: string[];
  present: string[];
  missingLabel: string;
  presentLabel: string;
}) {
  return (
    <div className="space-y-3">
      {missing.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-destructive">
            {missingLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {missing.map((k) => (
              <span
                key={k}
                className="rounded-full bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
      {present.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--success)]">
            {presentLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {present.map((k) => (
              <span
                key={k}
                className="rounded-full bg-[var(--success)]/15 px-3 py-1.5 text-sm font-medium text-[var(--success)]"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RewriteBlock({
  label,
  text,
  onCopy,
}: {
  label: string;
  text: string;
  onCopy: () => void;
}) {
  return (
    <div className="mt-5 rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: "#171717" }}
        >
          <Copy className="size-4" /> Copy
        </button>
      </div>
      <p
        className="mt-3 whitespace-pre-wrap rounded-lg border p-4 text-sm text-foreground"
        style={{ backgroundColor: "#F0FDF4", borderColor: "#16A34A" }}
      >
        {text}
      </p>
    </div>
  );
}