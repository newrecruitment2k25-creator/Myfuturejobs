import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Brain, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { OccupationReport } from "@/components/occupation-report";
import { classifyOccupation, INDUSTRIES, EMPLOYER_TYPES, type OccupationProfile } from "@/lib/masco-intelligence";

export const Route = createFileRoute("/employer/occupation-intelligence")({
  ssr: false,
  component: OccupationIntelligencePage,
  head: () => ({ meta: [{ title: "Occupation Intelligence — MYFutureJobs" }] }),
});

const EXAMPLES = [
  "Finance Executive", "Software Engineer", "HR Manager",
  "Data Analyst", "Operations Manager", "Government Officer",
];

function OccupationIntelligencePage() {
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [employerType, setEmployerType] = useState("");
  const [profile, setProfile] = useState<OccupationProfile | null>(null);
  const [analysedTitle, setAnalysedTitle] = useState("");

  const handleAnalyse = () => {
    const title = jobTitle.trim();
    if (!title) return;
    const result = classifyOccupation(title, industry, employerType);
    setProfile(result);
    setAnalysedTitle(title);
    // Cache in sessionStorage
    try {
      sessionStorage.setItem(
        "MYFutureJobs:occupationIntelligence",
        JSON.stringify({ title, industry, employerType, profile: result, ts: Date.now() })
      );
    } catch {
      // ignore quota errors
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

        {/* Back */}
        <Link to="/employer/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Dashboard
        </Link>

        {/* Page header */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Module 9</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary">Occupation Intelligence</h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Map any job title to its MASCO-aligned occupation category, required skills, qualifications, salary benchmarks, and career pathways based on Malaysian labour taxonomy.
              </p>
            </div>
            <div className="hidden sm:flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Brain className="size-7 text-primary" />
            </div>
          </div>
        </div>

        {/* Search form */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-4">Analyse Occupation</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3 grid gap-2">
              <Label htmlFor="job_title">Job Title or Occupation</Label>
              <Input
                id="job_title"
                placeholder="e.g. Finance Executive, Software Developer, HR Manager"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyse()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry (optional)</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger id="industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp_type">Employer Type (optional)</Label>
              <Select value={employerType} onValueChange={setEmployerType}>
                <SelectTrigger id="emp_type"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="navy"
                className="w-full"
                onClick={handleAnalyse}
                disabled={!jobTitle.trim()}
              >
                <Search className="mr-2 size-4" /> Analyse Occupation
              </Button>
            </div>
          </div>

          {/* Example chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground mt-1">Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => { setJobTitle(ex); }}
                className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {profile && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                Occupation Profile: <span className="text-primary">{analysedTitle}</span>
              </h2>
              <button
                onClick={() => setProfile(null)}
                className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </button>
            </div>
            <OccupationReport profile={profile} jobTitle={analysedTitle} />
          </div>
        )}

        {/* Empty state */}
        {!profile && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
            <Brain className="mx-auto size-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Enter a Job Title to Begin</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              The occupation intelligence engine will classify the role using Malaysian MASCO taxonomy,
              map required skills, qualifications, salary benchmarks, and career pathways.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
