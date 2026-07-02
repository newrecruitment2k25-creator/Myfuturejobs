import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Upload, CheckCircle2, Loader2, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyzeCv } from "@/lib/analyze.functions";
import { AnalysisLoader } from "@/components/analysis-loader";

export const Route = createFileRoute("/analyze")({
  ssr: false,
  component: AnalyzePage,
  head: () => ({
    meta: [
      { title: "Analyze Your CV — MYFutureJobs" },
      { name: "description", content: "Upload your CV and get instant AI feedback tailored to Malaysia's job market." },
    ],
  }),
});

const COMPANY_TYPES = [
  "Local Malaysian Company (SME/Private)",
  "GLC (Petronas, Maybank, TNB, etc.)",
  "MNC in Malaysia (Shell, IBM, Deloitte, etc.)",
  "Government / Civil Service",
  "Startup",
];
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
const LANGUAGES = ["English", "Bahasa Malaysia", "Bilingual (Both)"];

function AnalyzePage() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeCv);
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState<string>("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [companyType, setCompanyType] = useState("");
  const [industry, setIndustry] = useState("");
  const [experience, setExperience] = useState("");
  const [language, setLanguage] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const handleFile = useCallback(async (f: File) => {
    setExtractError(null);
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    const isDocx = f.name.toLowerCase().endsWith(".docx") || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isTxt = f.name.toLowerCase().endsWith(".txt") || f.type === "text/plain";
    if (!isPdf && !isDocx && !isTxt) {
      setExtractError("Only PDF, DOCX, or TXT files are supported.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setExtractError("File too large. Max 5MB.");
      return;
    }
    setFile(f);
    setExtracting(true);
    try {
      let text = "";
      if (isPdf) {
        const { extractPdfText } = await import("@/lib/pdf-extract");
        text = await extractPdfText(f);
        if (!text || text.trim().length < 50) {
          setExtractError("Your PDF appears to be image-based. Please upload a text-based PDF for best results.");
          setCvText("");
          return;
        }
      } else if (isDocx) {
        const mammoth = await import("mammoth");
        const arrayBuffer = await f.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
        if (!text || text.trim().length < 50) {
          setExtractError("Your DOCX appears to be empty or image-based. Please upload a text-based document.");
          setCvText("");
          return;
        }
      } else if (isTxt) {
        text = await f.text();
        if (!text || text.trim().length < 50) {
          setExtractError("Your TXT file appears to be empty.");
          setCvText("");
          return;
        }
      }
      setCvText(text);
    } catch (e) {
      console.error(e);
      setExtractError("We couldn't read your file. Please make sure it's not password protected or corrupted.");
      setCvText("");
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

  const canSubmit = cvText && companyType && industry && experience && language && !submitting && !extracting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { result, analysis_id } = await analyze({
        data: {
          cv_text: cvText,
          company_type: companyType,
          industry,
          experience_level: experience,
          language_preference: language,
        },
      });
      sessionStorage.setItem(
        "MYFutureJobs:lastResult",
        JSON.stringify({ result, cv_text: cvText, meta: { companyType, industry, experience, language } }),
      );
      void navigate({ to: "/results", search: analysis_id ? { id: analysis_id } : {} });
    } catch (e: any) {
      console.error(e);
      const msg = typeof e?.message === "string" ? e.message : "";
      let friendly = "Analysis failed. Please check your connection and try again.";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        friendly = "Network error. Please check your internet connection and try again.";
      } else if (msg.includes("429")) {
        friendly = "We're handling lots of CVs right now. Please try again in a minute.";
      } else if (msg.includes("not found") || msg.includes("404") || msg.includes("500")) {
        friendly = "Our analysis service is temporarily unavailable. Please try again shortly.";
      } else if (msg) {
        friendly = msg;
      }
      toast.error(friendly, { duration: 6000 });
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--line)' }}>
              AI Tools · CV Analysis
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', margin: 0 }}>
              Analyze Your CV
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>
              Step 1 — Upload your CV · Step 2 — Tell us your target
            </p>
          </div>

          {/* Upload */}
          <div className="mt-8">
            <Label className="text-base font-semibold">Step 1 of 2 — Upload</Label>
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
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
              {extracting ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p>Reading your document…</p>
                </div>
              ) : file && cvText ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="size-10 text-[var(--success)]" />
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB · text extracted
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground underline">
                    Click to replace
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="size-10 text-primary" />
                  <p className="text-base font-medium text-foreground">
                    Drag your CV here or click to upload
                  </p>
                  <p className="text-sm">PDF, DOCX, or TXT · max 5MB</p>
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

          {/* Form */}
          <div className="mt-10 space-y-5">
            <Label className="text-base font-semibold">Step 2 of 2 — Your Details</Label>

            <Field label="I am applying to:">
              <Select value={companyType} onValueChange={setCompanyType}>
                <SelectTrigger><SelectValue placeholder="Select target employer" /></SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Your Industry:">
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Your Experience Level:">
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Preferred CV Language:">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-10">
            {submitting ? (
              <AnalysisLoader />
            ) : (
              <Button
                variant="navy"
                size="xl"
                className="w-full"
                disabled={!canSubmit}
                onClick={onSubmit}
              >
                <FileText className="mr-2" /> Analyze My CV Now
              </Button>
            )}
            {!canSubmit && !submitting && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Upload a CV and fill in all four details to continue.
              </p>
            )}
          </div>
        </div>
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