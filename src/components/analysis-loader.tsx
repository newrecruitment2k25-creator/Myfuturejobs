import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const DEFAULT_STEPS = [
  { label: "Reading your CV...", end: 20 },
  { label: "Analyzing for Malaysian job market...", end: 50 },
  { label: "Checking keywords and language...", end: 75 },
  { label: "Generating your personalized report...", end: 100 },
];

const DEFAULT_TIPS = [
  "GLC applications prefer formal BM or English",
  "MNCs look for global mindset keywords",
  "Fresh grads should highlight CGPA if above 3.0",
  "Government CVs need specific format requirements",
  "ATS systems scan for exact keyword matches",
];

const LINKEDIN_STEPS = [
  { label: "Reading your profile...", end: 20 },
  { label: "Analyzing for Malaysian market...", end: 50 },
  { label: "Checking your headline and skills...", end: 75 },
  { label: "Generating your profile report...", end: 100 },
];

const LINKEDIN_TIPS = [
  "A strong headline gets 3x more profile views",
  "LinkedIn profiles with photos get 21x more views",
  "Recruiters search by skills — list at least 10",
  "Your About section should tell your story, not just list job titles",
  "Malaysian recruiters check LinkedIn before every screening",
  "Recommendations from colleagues boost credibility significantly",
  "A custom LinkedIn URL looks more professional",
  "MNCs in Malaysia search for English keywords",
];

export function AnalysisLoader({ variant = "cv" }: { variant?: "cv" | "linkedin" }) {
  const STEPS = variant === "linkedin" ? LINKEDIN_STEPS : DEFAULT_STEPS;
  const TIPS = variant === "linkedin" ? LINKEDIN_TIPS : DEFAULT_TIPS;
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const total = 25000; // ~25s estimated
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      // ease toward 95% but never reach 100 until parent unmounts
      const pct = Math.min(95, (elapsed / total) * 100);
      setProgress(pct);
    }, 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(id);
  }, [TIPS.length]);

  const activeStep = STEPS.findIndex((s) => progress < s.end);

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <ul className="space-y-3">
        {STEPS.map((step, i) => {
          const done = progress >= step.end;
          const active = i === activeStep;
          return (
            <li
              key={step.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${
                active ? "bg-primary/5" : ""
              } ${done || active ? "opacity-100" : "opacity-50"}`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                  done
                    ? "bg-[var(--success)] text-[var(--success-foreground)]"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? (
                  <Check className="size-4" />
                ) : active ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="text-xs font-semibold">{i + 1}</span>
                )}
              </span>
              <span
                className={`text-sm font-medium ${
                  active ? "text-primary" : "text-foreground"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <Progress value={progress} className="h-2" />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Usually takes 20–30 seconds
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-secondary/40 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tip
        </p>
        <p
          key={tipIndex}
          className="mt-1 animate-[fade-in_0.4s_ease-out] text-sm text-foreground"
        >
          {TIPS[tipIndex]}
        </p>
      </div>
    </div>
  );
}