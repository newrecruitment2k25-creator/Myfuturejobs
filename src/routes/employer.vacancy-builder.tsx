import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft, ArrowRight, Sparkles, Save, Send, RotateCcw,
  Eye, RefreshCw, CheckCircle2, HelpCircle,
  Briefcase, Building2, MapPin, DollarSign, GraduationCap,
} from "lucide-react";
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
import { OfficerSidebar } from "@/components/officer-sidebar";
import { VacancyOptimizationReportView } from "@/components/vacancy-optimization-report";
import {
  analyzeVacancy, EXPERIENCE_LEVELS, EMPLOYMENT_TYPES,
  type VacancyInput, type VacancyOptimizationReport,
} from "@/lib/vacancy-optimization";
import { INDUSTRIES, EMPLOYER_TYPES } from "@/lib/masco-intelligence";

export const Route = createFileRoute("/employer/vacancy-builder")({
  ssr: false,
  component: VacancyBuilderPage,
  head: () => ({ meta: [{ title: "Vacancy Builder — PerksoPrax AI" }] }),
});

const EMPTY: VacancyInput = {
  jobTitle: "", industry: "", employerType: "", experienceLevel: "",
  employmentType: "", salaryMin: "", salaryMax: "", requiredSkills: "",
  preferredSkills: "", qualifications: "", responsibilities: "", benefits: "",
  location: "",
};

type ExtendedForm = VacancyInput & { offeredSalary: string; department: string; workModel: string };
const EMPTY_FORM: ExtendedForm = { ...EMPTY, offeredSalary: "", department: "", workModel: "" };

const STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Role Description" },
  { id: 3, label: "Skills & Requirements" },
  { id: 4, label: "Interview Settings" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</Label>;
}

export default function VacancyBuilderPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<ExtendedForm>(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [report, setReport] = useState<VacancyOptimizationReport | null>(null);
  const [pulseScore, setPulseScore] = useState(85);
  const [pulseFeedback, setPulseFeedback] = useState([
    { type: "good", text: "Strong technical stack alignment." },
    { type: "tip", text: "Suggest adding 'Remote Flexibility' to increase reach by 40%." },
  ]);
  const [publishing, setPublishing] = useState(false);

  const set = (k: keyof ExtendedForm) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const score = Math.min(100, Math.max(40, 60 + Object.values(form).filter(Boolean).length * 4));
    setPulseScore(score);
  }, [form]);

  const handleAnalyze = () => {
    if (!form.jobTitle.trim()) { toast.error("Enter a job title to continue."); return; }
    const result = analyzeVacancy(form);
    setReport(result);
    setPulseScore(Math.min(100, pulseScore + 10));
    setPulseFeedback([
      { type: "good", text: "MASCO occupation classification found." },
      { type: "tip", text: "Add salary range to improve candidate response by 28%." },
    ]);
    toast.success("AI analysis complete.");
  };

  const handleReset = () => { setForm(EMPTY_FORM); setReport(null); setStep(1); };

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

  const canProceed = () => {
    if (step === 1) return form.jobTitle && form.department && form.employmentType && form.workModel && form.location;
    if (step === 2) return form.responsibilities;
    if (step === 3) return form.requiredSkills;
    return true;
  };

  const nextStep = () => { if (canProceed() && step < 4) setStep(s => s + 1); };
  const prevStep = () => { if (step > 1) setStep(s => s - 1); };

  return (
    <OfficerSidebar>
      <div style={{ padding: "32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Vacancy Builder</h1>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted)", marginTop: 4 }}>Architect high-impact roles with AI-driven market intelligence.</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="outline" size="sm">
                <Save className="mr-2 size-4" /> Save Draft
              </Button>
              <Button variant="navy" size="sm">
                <Eye className="mr-2 size-4" /> Preview Mode
              </Button>
            </div>
          </div>

          {/* Stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 800,
                    background: step >= s.id ? "var(--accent)" : "var(--base-alt)",
                    color: step >= s.id ? "#fff" : "var(--muted)",
                    border: `2px solid ${step >= s.id ? "var(--accent)" : "var(--line)"}`,
                  }}>
                    {step > s.id ? <CheckCircle2 size={16} /> : s.id}
                  </div>
                  <span style={{ fontSize: "0.625rem", fontWeight: 600, color: step >= s.id ? "var(--ink)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, borderRadius: 1, background: step > s.id ? "var(--accent)" : "var(--line)" }} />
                )}
              </div>
            ))}
          </div>

          {/* Content grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }} className="vacancy-grid">
            {/* Left: form */}
            <div className="card" style={{ padding: 28 }}>
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--accent)" }}>1</span>
                    </div>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Step 1: Basic Information</h2>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="grid gap-2">
                      <FieldLabel>Job Title</FieldLabel>
                      <Input placeholder="e.g. Senior Fullstack Engineer" value={form.jobTitle} onChange={e => set("jobTitle")(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel>Department</FieldLabel>
                      <Select value={form.department} onValueChange={set("department")}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Engineering">Engineering</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel>Employment Type</FieldLabel>
                      <Select value={form.employmentType} onValueChange={set("employmentType")}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel>Work Model</FieldLabel>
                      <Select value={form.workModel} onValueChange={set("workModel")}>
                        <SelectTrigger><SelectValue placeholder="Select work model" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="On-site">On-site</SelectItem>
                          <SelectItem value="Hybrid">Hybrid</SelectItem>
                          <SelectItem value="Remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel>Location</FieldLabel>
                      <Input placeholder="e.g. Kuala Lumpur" value={form.location} onChange={e => set("location")(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel>Experience Level</FieldLabel>
                      <Select value={form.experienceLevel} onValueChange={set("experienceLevel")}>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                        <SelectContent>{EXPERIENCE_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel>Skills Extraction</FieldLabel>
                    <div style={{ border: "1px dashed var(--line)", borderRadius: 12, padding: 16, background: "var(--base-alt)" }}>
                      <Input placeholder="Start typing skills (e.g. React, Python, AWS)..." value={form.requiredSkills} onChange={e => set("requiredSkills")(e.target.value)} className="border-0 bg-transparent" />
                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        {["React.js", "Tailwind CSS", "System Design"].map((tag) => (
                          <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: "var(--accent)", color: "#fff", fontSize: "0.6875rem", fontWeight: 600 }}>
                            {tag} <span style={{ cursor: "pointer" }}>×</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <Button onClick={nextStep} disabled={!canProceed()}>
                      Next: Role Description <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Step 2: Role Description</h2>
                  <div className="grid gap-2">
                    <FieldLabel>Key Responsibilities</FieldLabel>
                    <Textarea rows={6} placeholder="Describe the main duties and responsibilities..." value={form.responsibilities} onChange={e => set("responsibilities")(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel>Benefits</FieldLabel>
                    <Input placeholder="e.g. EPF, SOCSO, medical, dental, training" value={form.benefits} onChange={e => set("benefits")(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel>Industry</FieldLabel>
                    <Select value={form.industry} onValueChange={set("industry")}>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <Button variant="outline" onClick={prevStep}>Back</Button>
                    <Button onClick={nextStep} disabled={!canProceed()}>
                      Next: Skills & Requirements <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Step 3: Skills & Requirements</h2>
                  <div className="grid gap-2">
                    <FieldLabel>Required Skills</FieldLabel>
                    <Textarea rows={4} placeholder="List required skills..." value={form.requiredSkills} onChange={e => set("requiredSkills")(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel>Preferred Skills</FieldLabel>
                    <Textarea rows={3} placeholder="Nice-to-have skills..." value={form.preferredSkills} onChange={e => set("preferredSkills")(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel>Qualifications</FieldLabel>
                    <Input placeholder="e.g. Degree in Accounting or related" value={form.qualifications} onChange={e => set("qualifications")(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="grid gap-2">
                      <FieldLabel>Salary Min (RM)</FieldLabel>
                      <Input placeholder="3500" value={form.salaryMin} onChange={e => set("salaryMin")(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel>Salary Max (RM)</FieldLabel>
                      <Input placeholder="6000" value={form.salaryMax} onChange={e => set("salaryMax")(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel>Offered Salary (RM / month)</FieldLabel>
                    <Input placeholder="4500" value={form.offeredSalary} onChange={e => set("offeredSalary")(e.target.value)} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <Button variant="outline" onClick={prevStep}>Back</Button>
                    <Button onClick={nextStep} disabled={!canProceed()}>
                      Next: Interview Settings <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Step 4: Interview Settings</h2>
                  <p style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>AI Interview questions will be generated based on the vacancy details.</p>
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", margin: 0 }}>AI Interview Question Generator</h3>
                      <Button variant="ghost" size="sm" onClick={handleAnalyze}>
                        <RefreshCw className="mr-2 size-4" /> Regenerate
                      </Button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className="rounded-lg border border-border bg-background p-4">
                        <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Behavioral</div>
                        <p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: 0, fontStyle: "italic" }}>"Describe a complex technical debt challenge you resolved under a tight deadline."</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-4">
                        <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Technical</div>
                        <p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: 0, fontStyle: "italic" }}>"Explain the core differences between CSR and SSR in the context of our current stack."</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <Button variant="outline" onClick={prevStep}>Back</Button>
                    <div style={{ display: "flex", gap: 10 }}>
                      <Button variant="outline" onClick={handleAnalyze}>
                        <Sparkles className="mr-2 size-4" /> Analyze
                      </Button>
                      <Button variant="navy" onClick={handlePublish} disabled={publishing}>
                        {publishing ? "Publishing…" : <><Send className="mr-2 size-4" /> Publish Vacancy</>}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {report && (
                <div id="opt-report" className="space-y-5 mt-4">
                  <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--ink)" }}>
                    Optimization Report: <span style={{ color: "var(--accent)" }}>{form.jobTitle}</span>
                  </h2>
                  <VacancyOptimizationReportView report={report} />
                </div>
              )}
            </div>

            {/* Right: AI panels */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="card" style={{ padding: 24, background: "#0f172a", color: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>AI Pulse Score</h3>
                  <span style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 8px", borderRadius: 4, background: "var(--accent)", color: "#0f172a" }}>Optimal</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                  <div style={{ position: "relative", width: 80, height: 80 }}>
                    <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray={`${pulseScore}, 100`} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: 800 }}>{pulseScore}%</div>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "#94a3b8", margin: 0, flex: 1 }}>
                    Your vacancy is stronger than 85% of similar roles in the market.
                  </p>
                </div>
                <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Critical Feedback</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pulseFeedback.map((fb, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: "0.75rem", color: "#e2e8f0" }}>
                      <span style={{ color: fb.type === "good" ? "var(--accent)" : "#f59e0b", flexShrink: 0 }}>
                        {fb.type === "good" ? <CheckCircle2 size={14} /> : <HelpCircle size={14} />}
                      </span>
                      {fb.text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px" }}>Market Insight</h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Estimated Salary Range</div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)", marginTop: 4 }}>RM {form.salaryMin || "3,500"} – {form.salaryMax || "6,000"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--base-alt)" }}>
                    <div style={{ width: "70%", height: "100%", borderRadius: 3, background: "linear-gradient(90deg, var(--accent) 0%, var(--accent-blue) 100%)" }} />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.625rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
                  <span>Entry</span>
                  <span>Competitive</span>
                  <span>Top 10%</span>
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Talent Scarcity Alert</div>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>
                    Candidates with '{form.requiredSkills.split(/[,\n]/)[0] || "System Design"}' skills are currently in high demand. Expect longer fulfillment cycles.
                  </p>
                </div>
                <div style={{ marginTop: 16, borderRadius: 12, overflow: "hidden", background: "#0f172a", height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Live Talent Map</div>
                    <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Visualization loading...</p>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, borderStyle: "dashed" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--base-alt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Briefcase size={24} style={{ color: "var(--muted)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mobile Candidate Preview</div>
                  <p style={{ fontSize: "0.75rem", color: "var(--subtle)", margin: "4px 0 0" }}>Finish step 1 to generate preview</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </OfficerSidebar>
  );
}
