import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Upload, CheckCircle2, Loader2, Linkedin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyzeLinkedIn, type LinkedInAnalysis } from "@/lib/linkedin-analyze.functions";
import { AnalysisLoader } from "@/components/analysis-loader";
import { LinkedInResultsView } from "./linkedin-review.results";

export const Route = createFileRoute("/linkedin-review")({
  ssr: false,
  component: LinkedInReviewPage,
  head: () => ({
    meta: [
      { title: "LinkedIn Profile Reviewer — MYFutureJobs" },
      {
        name: "description",
        content:
          "AI LinkedIn profile feedback built for Malaysian professionals and fresh graduates.",
      },
      { property: "og:title", content: "LinkedIn Profile Reviewer — MYFutureJobs" },
      {
        property: "og:description",
        content:
          "Upload your LinkedIn PDF and get instant AI feedback tailored to Malaysia's job market.",
      },
    ],
  }),
});

const INDUSTRIES = [
  "Technology & IT",
  "Finance & Banking",
  "Marketing & Communications",
  "Engineering",
  "Healthcare",
  "Education",
  "Operations & Logistics",
  "Others",
];
const EXPERIENCE = [
  "Fresh Graduate (0-1 year)",
  "Junior (1-3 years)",
  "Mid Level (3-6 years)",
  "Senior (6+ years)",
];
const GOALS = ["Job hunting", "Personal brand", "Networking", "Business development"];

const STEPS = [
  "Go to your LinkedIn profile",
  "Click the More button below your name",
  "Select Save to PDF",
  "Upload that PDF below",
];

function LinkedInReviewPage() {
  const analyze = useServerFn(analyzeLinkedIn);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [profileText, setProfileText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [experience, setExperience] = useState("");
  const [industry, setIndustry] = useState("");
  const [goal, setGoal] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [result, setResult] = useState<LinkedInAnalysis | null>(null);
  const [resultMeta, setResultMeta] = useState<{ experience: string; industry: string; goal: string } | null>(null);
  const [parseError, setParseError] = useState(false);

  const handleFile = useCallback(async (f: File) => {
    setExtractError(null);
    if (f.type !== "application/pdf") {
      setExtractError("Only PDF files are supported.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setExtractError("File too large. Max 5MB.");
      return;
    }
    setFile(f);
    setExtracting(true);
    try {
      const { extractPdfText } = await import("@/lib/pdf-extract");
      const text = await extractPdfText(f);
      if (!text || text.trim().length < 50) {
        setExtractError(
          "Your PDF appears to be image-based. Please export a fresh LinkedIn PDF and try again.",
        );
        setProfileText("");
      } else {
        setProfileText(text);
      }
    } catch (e) {
      console.error(e);
      setExtractError("We couldn't read your PDF. Please make sure it's not password protected.");
      setProfileText("");
    } finally {
      setExtracting(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const canSubmit = profileText && experience && industry && goal && !submitting && !extracting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setTimedOut(false);
    setParseError(false);
    setResult(null);
    setSubmitting(true);
    try {
      const { result, analysis_id } = await analyze({
        data: {
          profile_text: profileText,
          experience_level: experience,
          industry,
          goal,
        },
      });
      console.log("LinkedIn AI response received successfully:", result);
      if (!result || typeof result !== "object" || typeof result.overall_score !== "number") {
        setParseError(true);
        setSubmitting(false);
        return;
      }
      try {
        sessionStorage.setItem(
          "MYFutureJobs:lastLinkedIn",
          JSON.stringify({ result, meta: { experience, industry, goal } }),
        );
      } catch {
        // ignore storage failures
      }
      if (analysis_id) {
        void navigate({ to: "/linkedin-review/results", search: { id: analysis_id } });
        return;
      }
      setResultMeta({ experience, industry, goal });
      setResult(result);
      setSubmitting(false);
    } catch (e: any) {
      console.error(e);
      const msg = typeof e?.message === "string" ? e.message : "";
      if (msg.includes("TIMEOUT")) {
        setTimedOut(true);
        setSubmitting(false);
        return;
      }
      let friendly = "Analysis failed. Please check your connection and try again.";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        friendly = "Network error. Please check your internet connection and try again.";
      } else if (msg.includes("429")) {
        friendly = "We're handling lots of profiles right now. Please try again in a minute.";
      } else if (msg) {
        friendly = msg;
      }
      toast.error(friendly, { duration: 6000 });
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (result && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [result]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        {result && resultMeta ? (
          <LinkedInResultsView result={result} meta={resultMeta} />
        ) : (
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            LinkedIn Profile Reviewer
          </h1>
          <p className="mt-2 text-muted-foreground">
            AI feedback built for Malaysian professionals and fresh graduates
          </p>

          {/* How to export */}
          <div className="mt-8 rounded-2xl border border-border bg-secondary/30 p-6">
            <p className="text-sm font-semibold text-foreground">
              How to export your LinkedIn PDF
            </p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-sm text-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Upload */}
          <div className="mt-8">
            <Label className="text-base font-semibold">Upload your LinkedIn Profile PDF</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`mt-3 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-secondary/20 hover:bg-secondary/40"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
              {extracting ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p>Reading your PDF…</p>
                </div>
              ) : file && profileText ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="size-10 text-[var(--success)]" />
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB · text extracted
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground underline">Click to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="size-10 text-primary" />
                  <p className="text-base font-medium text-foreground">
                    Drag your LinkedIn PDF here or click to upload
                  </p>
                  <p className="text-sm">PDF only, max 5MB</p>
                </div>
              )}
            </div>
            {extractError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{extractError}</span>
              </div>
            )}
          </div>

          {/* Target details */}
          <div className="mt-10 space-y-5">
            <Label className="text-base font-semibold">Your Target Details</Label>

            <Field label="Experience level:">
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger>
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Industry:">
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Goal:">
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger>
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  {GOALS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-10">
            {submitting ? (
              <AnalysisLoader variant="linkedin" />
            ) : parseError ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
                <p className="flex items-center justify-center gap-2 text-sm font-semibold text-destructive">
                  <AlertCircle className="size-4" /> Could not display results. Please try again.
                </p>
                <Button
                  variant="navy"
                  size="xl"
                  className="mt-4 w-full"
                  onClick={onSubmit}
                >
                  Try Again
                </Button>
              </div>
            ) : timedOut ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
                <p className="flex items-center justify-center gap-2 text-sm font-semibold text-destructive">
                  <AlertCircle className="size-4" /> Analysis failed. Please try again.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your uploaded PDF is still here — no need to re-upload.
                </p>
                <Button
                  variant="navy"
                  size="xl"
                  className="mt-4 w-full"
                  onClick={onSubmit}
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <Button
                variant="navy"
                size="xl"
                className="w-full"
                disabled={!canSubmit}
                onClick={onSubmit}
              >
                <Linkedin className="mr-2" /> Review My LinkedIn Profile
              </Button>
            )}
            {!canSubmit && !submitting && !timedOut && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Upload your LinkedIn PDF and fill in all three details to continue.
              </p>
            )}
          </div>
        </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}