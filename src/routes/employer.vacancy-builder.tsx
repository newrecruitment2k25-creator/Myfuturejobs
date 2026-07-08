import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Sparkles, Save, Send, RotateCcw, Briefcase, MapPin, GraduationCap, Wrench, HeartHandshake, Coins, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { VacancyOptimizationReportView } from "@/components/vacancy-optimization-report";
import {
  analyzeVacancy, EXPERIENCE_LEVELS, EMPLOYMENT_TYPES,
  type VacancyInput, type VacancyOptimizationReport,
} from "@/lib/vacancy-optimization";
import { INDUSTRIES, EMPLOYER_TYPES } from "@/lib/masco-intelligence";

export const Route = createFileRoute("/employer/vacancy-builder")({
  ssr: false,
  component: VacancyBuilderPage,
  head: () => ({ meta: [{ title: "AI Vacancy Builder — MYFutureJobs" }] }),
});

const EMPTY: VacancyInput = {
  jobTitle: "", industry: "", employerType: "", experienceLevel: "",
  employmentType: "", salaryMin: "", salaryMax: "", requiredSkills: "",
  preferredSkills: "", qualifications: "", responsibilities: "", benefits: "",
  location: "",
};

type ExtendedForm = VacancyInput & { offeredSalary: string };
const EMPTY_FORM: ExtendedForm = { ...EMPTY, offeredSalary: "" };

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</Label>;
}

function SectionCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="mt-0.5 text-primary">{icon}</div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function VacancyBuilderPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<ExtendedForm>(EMPTY_FORM);
  const [report, setReport] = useState<VacancyOptimizationReport | null>(null);
  const [publishing, setPublishing] = useState(false);

  const set = (k: keyof ExtendedForm) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleAnalyze = () => {
    if (!form.jobTitle.trim()) { toast.error("Enter a job title to continue."); return; }
    const result = analyzeVacancy(form);
    setReport(result);
    setTimeout(() => document.getElementById("opt-report")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleReset = () => { setForm(EMPTY_FORM); setReport(null); };

  const handlePublish = async () => {
    if (!user) { void navigate({ to: "/employer/login" }); return; }
    if (!form.jobTitle || !form.industry || !form.employerType || !form.location) {
      toast.error("Fill in job title, industry, employer type and location before publishing."); return;
    }
    setPublishing(true);
    const desc = report?.improvedDescription || form.responsibilities || form.jobTitle;
    const reqs = report?.improvedRequirements || [form.qualifications, form.requiredSkills].filter(Boolean).join("\n");
    const { error } = await supabase.from("jobs").insert({
      employer_id: user.id,
      job_title: form.jobTitle,
      company_name: user.email?.split("@")[1]?.split(".")[0] ?? "Your Company",
      employer_type: form.employerType,
      industry: form.industry,
      location: form.location,
      description: desc,
      requirements: reqs,
      status: "open",
    });
    setPublishing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Vacancy published successfully!");
    void navigate({ to: "/employer/dashboard" });
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

        <Link to="/employer/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #512ACC 0%, #6B4FD6 60%, #512ACC 100%)', boxShadow: '0 4px 20px rgba(81,42,204,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Module 10
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>AI Vacancy Builder</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4, maxWidth: 540 }}>
                Create high-quality, MASCO-aligned vacancies with AI optimization. Analyze vacancy quality, improve candidate attraction, and publish when ready.
              </p>
            </div>
            <Sparkles style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
          </div>
        </div>

        {/* Form — grouped into cards */}
        <div className="space-y-5">
          <SectionCard icon={<Briefcase className="size-5 text-primary" />} title="Job Basics" subtitle="Core details that identify the role.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 grid gap-2">
                <FieldLabel htmlFor="jt">Job Title</FieldLabel>
                <Input id="jt" placeholder="e.g. Finance Executive, Senior Software Engineer" value={form.jobTitle} onChange={e => set("jobTitle")(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="ind">Industry</FieldLabel>
                <Select value={form.industry} onValueChange={set("industry")}>
                  <SelectTrigger id="ind"><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="et">Employer Type</FieldLabel>
                <Select value={form.employerType} onValueChange={set("employerType")}>
                  <SelectTrigger id="et"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{EMPLOYER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 grid gap-2">
                <FieldLabel htmlFor="loc">Location</FieldLabel>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input id="loc" className="pl-9" placeholder="e.g. Kuala Lumpur, Petaling Jaya, Remote" value={form.location} onChange={e => set("location")(e.target.value)} />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={<Coins className="size-5 text-primary" />} title="Role Details" subtitle="Experience, employment type, and compensation.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <FieldLabel htmlFor="el">Experience Level</FieldLabel>
                <Select value={form.experienceLevel} onValueChange={set("experienceLevel")}>
                  <SelectTrigger id="el"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>{EXPERIENCE_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="emt">Employment Type</FieldLabel>
                <Select value={form.employmentType} onValueChange={set("employmentType")}>
                  <SelectTrigger id="emt"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="smin">Salary Min (RM)</FieldLabel>
                <Input id="smin" placeholder="e.g. 3500" value={form.salaryMin} onChange={e => set("salaryMin")(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="smax">Salary Max (RM)</FieldLabel>
                <Input id="smax" placeholder="e.g. 6000" value={form.salaryMax} onChange={e => set("salaryMax")(e.target.value)} />
              </div>
              <div className="sm:col-span-2 grid gap-2">
                <FieldLabel htmlFor="osal">Offered Salary (RM / month)</FieldLabel>
                <Input id="osal" placeholder="e.g. 4500 — the actual salary offered to the candidate" value={form.offeredSalary} onChange={e => set("offeredSalary")(e.target.value)} />
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={<Wrench className="size-5 text-primary" />} title="Requirements & Skills" subtitle="What the candidate must bring and what would be a bonus.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 grid gap-2">
                <FieldLabel htmlFor="resp">Key Responsibilities</FieldLabel>
                <Textarea id="resp" rows={4} placeholder="Describe the main duties and responsibilities of the role…" value={form.responsibilities} onChange={e => set("responsibilities")(e.target.value)} />
              </div>
              <div className="sm:col-span-2 grid gap-2">
                <FieldLabel htmlFor="rsk">Required Skills</FieldLabel>
                <Textarea id="rsk" rows={3} placeholder="List required skills, separated by commas or new lines (e.g. Financial reporting, Excel, Budgeting)" value={form.requiredSkills} onChange={e => set("requiredSkills")(e.target.value)} />
              </div>
              <div className="sm:col-span-2 grid gap-2">
                <FieldLabel htmlFor="psk">Preferred Skills</FieldLabel>
                <Textarea id="psk" rows={2} placeholder="Nice-to-have skills (e.g. ACCA, SAP, Power BI)" value={form.preferredSkills} onChange={e => set("preferredSkills")(e.target.value)} />
              </div>
              <div className="sm:col-span-2 grid gap-2">
                <FieldLabel htmlFor="qual">Qualifications</FieldLabel>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input id="qual" className="pl-9" placeholder="e.g. Degree in Accounting, Finance or related field" value={form.qualifications} onChange={e => set("qualifications")(e.target.value)} />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={<HeartHandshake className="size-5 text-primary" />} title="Benefits" subtitle="Perks and incentives that make the offer attractive.">
            <div className="grid gap-2">
              <FieldLabel htmlFor="ben">Benefits</FieldLabel>
              <Input id="ben" placeholder="e.g. EPF, SOCSO, medical, dental, 14 days annual leave, training" value={form.benefits} onChange={e => set("benefits")(e.target.value)} />
            </div>
          </SectionCard>

          {/* Actions */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Ready to optimize?</p>
              <p className="text-xs text-muted-foreground mt-0.5">AI will review your vacancy for MASCO alignment and candidate appeal.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 size-4" /> Reset
              </Button>
              <Button variant="outline" onClick={() => void navigate({ to: "/employer/dashboard" })}>
                Cancel
              </Button>
              <Button variant="navy" onClick={handleAnalyze} disabled={!form.jobTitle.trim()}>
                <Sparkles className="mr-2 size-4" /> Analyze & Optimize
              </Button>
              {report && (
                <Button onClick={handlePublish} disabled={publishing}>
                  {publishing
                    ? <><span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" /> Publishing…</>
                    : <><Send className="mr-2 size-4" /> Publish Vacancy</>
                  }
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Report */}
        {report && (
          <div id="opt-report" className="space-y-5">
            <h2 className="text-lg font-semibold text-foreground">
              Optimization Report: <span className="text-primary">{form.jobTitle}</span>
            </h2>
            <VacancyOptimizationReportView report={report} />
            {/* Final publish CTA */}
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Ready to publish this vacancy?</p>
                <p className="text-xs text-muted-foreground mt-0.5">The improved version will be saved to your dashboard.</p>
              </div>
              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <Link to="/employer/dashboard">View Dashboard</Link>
                </Button>
                <Button variant="navy" onClick={handlePublish} disabled={publishing}>
                  {publishing ? "Publishing…" : <><Send className="mr-2 size-4" /> Publish Vacancy</>}
                </Button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
