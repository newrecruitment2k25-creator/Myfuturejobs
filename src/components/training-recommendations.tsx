import { useState, useEffect } from "react";
import { GraduationCap, Award, TrendingUp, BookOpen, ExternalLink, Loader2, AlertCircle, RefreshCw, MapPin, DollarSign, Clock, Star, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type { AnalysisResult } from "@/lib/analyze.functions";
import { searchTrainingResources, type TrainingOutput } from "@/lib/training.functions";
import { useServerFn } from "@tanstack/react-start";

type Meta = { companyType: string; industry: string; experience: string; language: string };

interface TrainingRecommendationsProps {
  result: AnalysisResult;
  meta: Meta;
}

const PLATFORM_COLORS: Record<string, string> = {
  "Coursera": "bg-blue-100 text-blue-800 border-blue-200",
  "Udemy": "bg-purple-100 text-purple-800 border-purple-200",
  "LinkedIn Learning": "bg-sky-100 text-sky-800 border-sky-200",
  "Google": "bg-green-100 text-green-800 border-green-200",
  "edX": "bg-red-100 text-red-800 border-red-200",
  "FutureLearn": "bg-pink-100 text-pink-800 border-pink-200",
  "HRD Corp": "bg-amber-100 text-amber-800 border-amber-200",
  "e-Latih": "bg-teal-100 text-teal-800 border-teal-200",
};

function platformBadgeCls(platform: string): string {
  for (const [key, cls] of Object.entries(PLATFORM_COLORS)) {
    if (platform.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return "bg-secondary text-foreground border-border";
}

function isFree(price: string): boolean {
  const p = price.toLowerCase();
  return p.startsWith("free") || p.includes("free (") || p === "free";
}

function CourseCard({ course }: { course: TrainingOutput["recommendations"][0]["courses"][0] }) {
  const free = isFree(course.price);
  return (
    <div className="rounded-xl border border-border bg-background p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground leading-snug">{course.name}</p>
          <span className={`mt-1 inline-block border rounded-full px-2 py-0.5 text-[10px] font-semibold ${platformBadgeCls(course.platform)}`}>
            {course.platform}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${free ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            {free ? "Free" : "Paid"}
          </span>
          {course.hrd_claimable && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              HRD Corp ?
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{course.relevance}</p>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="size-3" />{course.duration}</span>
        <span className="flex items-center gap-1"><DollarSign className="size-3" />{course.price}</span>
        {course.malaysian_note && (
          <span className="flex items-center gap-1 text-teal-600"><MapPin className="size-3" />{course.malaysian_note}</span>
        )}
      </div>
      <a
        href={course.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex items-center gap-1.5 self-start rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Open Course <ExternalLink className="size-3" />
      </a>
    </div>
  );
}

function SkillSection({ rec }: { rec: TrainingOutput["recommendations"][0] }) {
  const [open, setOpen] = useState(true);
  const freeCount = rec.courses.filter((c) => isFree(c.price)).length;
  const hrdCount = rec.courses.filter((c) => c.hrd_claimable).length;
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <BookOpen className="size-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground text-sm">{rec.skill_gap}</span>
          <div className="flex gap-1.5">
            {freeCount > 0 && (
              <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                {freeCount} Free
              </span>
            )}
            {hrdCount > 0 && (
              <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold">
                HRD Corp
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-5 pb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rec.courses.map((course, i) => <CourseCard key={i} course={course} />)}
        </div>
      )}
    </div>
  );
}

export function TrainingRecommendations({ result, meta }: TrainingRecommendationsProps) {
  const searchTraining = useServerFn(searchTrainingResources);
  const [data, setData] = useState<TrainingOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const missing = result.keywords.missing_keywords;
    if (missing.length === 0) {
      setError("No skill gaps found — your profile is already well-aligned with the target role.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const out = await searchTraining({
        data: {
          missingSkills: missing,
          currentSkills: (result.keywords as any).matched_keywords ?? [],
          targetRole: `${meta.companyType} – ${meta.industry}`,
          industry: meta.industry,
          employerType: meta.companyType,
          experienceLevel: meta.experience,
        },
      });
      setData(out);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const totalFree = data?.recommendations.flatMap((r) => r.courses).filter((c) => isFree(c.price)).length ?? 0;
  const totalHrd = data?.recommendations.flatMap((r) => r.courses).filter((c) => c.hrd_claimable).length ?? 0;

  return (
    <div className="mt-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <GraduationCap className="size-5" /> Training &amp; Upskilling Roadmap
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered course recommendations from real platforms based on your skill gaps.
          </p>
        </div>
        {data && !isLoading && (
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
        )}
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center gap-4 shadow-sm">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="font-medium text-foreground">AI is finding the best courses for your skill gaps…</p>
          <p className="text-sm text-muted-foreground">Searching Coursera, Udemy, LinkedIn Learning, HRD Corp &amp; more</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-start gap-3">
          <AlertCircle className="size-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-foreground mb-2">Could not load recommendations</p>
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="size-4" /> Try Again
            </button>
          </div>
        </div>
      )}

      {data && !isLoading && !error && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" /> {totalFree} Free Courses
            </div>
            {totalHrd > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-700">
                <Award className="size-4" /> {totalHrd} HRD Corp Claimable
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground">
              <Clock className="size-4 text-muted-foreground" /> {data.total_estimated_duration}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground">
              <DollarSign className="size-4 text-muted-foreground" /> {data.estimated_cost}
            </div>
          </div>

          {data.learning_path.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <TrendingUp className="size-4 text-primary" /> Suggested Learning Path
              </h3>
              <ol className="space-y-2">
                {data.learning_path.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step.replace(/^\d+\.\s*/, "")}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <BookOpen className="size-4 text-primary" /> Courses by Skill Gap
            </h3>
            {data.recommendations.map((rec, i) => (
              <SkillSection key={i} rec={rec} />
            ))}
          </div>

          {data.google_certificates.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <Star className="size-4 text-green-600" /> Google Career Certificates
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.google_certificates.map((cert, i) => (
                  <div key={i} className="rounded-xl border border-green-200 bg-green-50/50 p-4 flex flex-col gap-2">
                    <p className="font-semibold text-sm text-foreground">{cert.name}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="size-3" />{cert.duration}</span>
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold"><DollarSign className="size-3" />{cert.price}</span>
                    </div>
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 self-start rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                    >
                      View Certificate <ExternalLink className="size-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.malaysian_training.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
              <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <MapPin className="size-4 text-amber-600" /> Malaysian Government &amp; HRD Corp Training
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.malaysian_training.map((t, i) => (
                  <div key={i} className="rounded-xl border border-amber-200 bg-background p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground">{t.name}</p>
                      <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-bold shrink-0">
                        {t.platform}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.note}</p>
                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <DollarSign className="size-3" />{t.price}
                    </div>
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
                    >
                      Visit Programme <ExternalLink className="size-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pb-2">
            Course links are search URLs — they always work even if course pages change. All links open in a new tab.
          </p>
        </>
      )}
    </div>
  );
}
