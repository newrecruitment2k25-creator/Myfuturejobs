import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import {
  User, GraduationCap, Briefcase, Wrench, Languages, Users,
  Sparkles, Download, Eye, EyeOff, Plus, Trash2, Loader2,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle, BarChart2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/resume-builder")({
  ssr: false,
  component: ResumeBuilderPage,
  head: () => ({ meta: [{ title: "AI Resume Builder — MYFutureJobs" }] }),
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonalInfo {
  name: string; email: string; phone: string; location: string;
  linkedin: string; icNumber: string; expectedSalary: string;
}
interface EducationEntry {
  id: string; institution: string; degree: string; field: string;
  startYear: string; endYear: string; grade: string;
}
interface ExperienceEntry {
  id: string; company: string; title: string;
  startDate: string; endDate: string; current: boolean; responsibilities: string;
}
interface LanguageEntry { id: string; name: string; level: string; }
interface ReferenceEntry { id: string; name: string; title: string; company: string; phone: string; email: string; }

interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string[];
  languages: LanguageEntry[];
  references: ReferenceEntry[];
}

// ── Defaults ─────────────────────────────────────────────────────────────────

function newId() { return Math.random().toString(36).slice(2, 9); }

const DEFAULT: ResumeData = {
  personalInfo: { name: "", email: "", phone: "", location: "", linkedin: "", icNumber: "", expectedSalary: "" },
  summary: "",
  education: [{ id: newId(), institution: "", degree: "", field: "", startYear: "", endYear: "", grade: "" }],
  experience: [{ id: newId(), company: "", title: "", startDate: "", endDate: "", current: false, responsibilities: "" }],
  skills: [],
  languages: [
    { id: newId(), name: "English", level: "Proficient" },
    { id: newId(), name: "Bahasa Malaysia", level: "Native" },
  ],
  references: [],
};

const LANG_LEVELS = ["Native", "Proficient", "Intermediate", "Basic"];
const DEGREE_OPTIONS = ["Bachelor's", "Master's", "PhD", "Diploma", "Certificate", "STPM", "SPM", "Others"];
const PRESET_LANGS = ["English", "Bahasa Malaysia", "Mandarin", "Tamil", "Cantonese", "Arabic", "Japanese"];

// ── AI helpers ─────────────────────────────────────────────────────────────

async function aiCall(body: Record<string, unknown>) {
  const res = await fetch("/api/resume-builder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
  return res.json();
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon, title, children, defaultOpen = true }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-primary">{icon}</span>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

function AiBtn({ loading, onClick, label = "AI Assist" }: { loading: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
      {loading ? "Thinking…" : label}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type ResumeTemplate = "classic" | "modern" | "ats";

const TEMPLATES: { id: ResumeTemplate; label: string; desc: string; best: string; accent: string }[] = [
  { id: "classic", label: "Classic",       desc: "Single column · Serif headings · Traditional",  best: "Government & GLC roles",   accent: "#211F60" },
  { id: "modern",  label: "Modern",        desc: "Two-column · Coloured sidebar · Bold skills",    best: "MNC & Tech roles",         accent: "#F36C21" },
  { id: "ats",     label: "ATS Optimised", desc: "No graphics · Clean headers · Keyword-rich",   best: "Online applications",      accent: "#10B981" },
];

type WizardStep = 1 | 2 | 3 | 4;

const STEP_META: Record<WizardStep, { title: string; subtitle: string }> = {
  1: { title: "About You", subtitle: "Start with your contact details and a strong professional summary." },
  2: { title: "Background", subtitle: "Add your education and work history." },
  3: { title: "Skillset", subtitle: "List your skills, languages, and optional references." },
  4: { title: "Polish & Export", subtitle: "Choose a template, run an ATS check, then preview or download." },
};

function ResumeBuilderPage() {
  const [data, setData] = useState<ResumeData>(DEFAULT);
  const [view, setView] = useState<"form" | "preview">("form");
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>("ats");
  const [skillInput, setSkillInput] = useState("");
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [atsResult, setAtsResult] = useState<{ score: number; grade: string; strengths: string[]; improvements: string[]; keywords_missing: string[] } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const setLoading = (key: string, v: boolean) => setAiLoading((p) => ({ ...p, [key]: v }));

  // ── Field updaters ──────────────────────────────────────────────────────────

  const setPersonal = (k: keyof PersonalInfo, v: string) =>
    setData((p) => ({ ...p, personalInfo: { ...p.personalInfo, [k]: v } }));

  const setEdu = (id: string, k: keyof EducationEntry, v: string) =>
    setData((p) => ({ ...p, education: p.education.map((e) => e.id === id ? { ...e, [k]: v } : e) }));

  const addEdu = () => setData((p) => ({ ...p, education: [...p.education, { id: newId(), institution: "", degree: "", field: "", startYear: "", endYear: "", grade: "" }] }));
  const removeEdu = (id: string) => setData((p) => ({ ...p, education: p.education.filter((e) => e.id !== id) }));

  const setExp = (id: string, k: keyof ExperienceEntry, v: any) =>
    setData((p) => ({ ...p, experience: p.experience.map((e) => e.id === id ? { ...e, [k]: v } : e) }));

  const addExp = () => setData((p) => ({ ...p, experience: [...p.experience, { id: newId(), company: "", title: "", startDate: "", endDate: "", current: false, responsibilities: "" }] }));
  const removeExp = (id: string) => setData((p) => ({ ...p, experience: p.experience.filter((e) => e.id !== id) }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || data.skills.includes(s)) return;
    setData((p) => ({ ...p, skills: [...p.skills, s] }));
    setSkillInput("");
  };
  const removeSkill = (s: string) => setData((p) => ({ ...p, skills: p.skills.filter((x) => x !== s) }));

  const setLang = (id: string, k: keyof LanguageEntry, v: string) =>
    setData((p) => ({ ...p, languages: p.languages.map((l) => l.id === id ? { ...l, [k]: v } : l) }));
  const addLang = () => setData((p) => ({ ...p, languages: [...p.languages, { id: newId(), name: "", level: "Intermediate" }] }));
  const removeLang = (id: string) => setData((p) => ({ ...p, languages: p.languages.filter((l) => l.id !== id) }));

  const setRef = (id: string, k: keyof ReferenceEntry, v: string) =>
    setData((p) => ({ ...p, references: p.references.map((r) => r.id === id ? { ...r, [k]: v } : r) }));
  const addRef = () => setData((p) => ({ ...p, references: [...p.references, { id: newId(), name: "", title: "", company: "", phone: "", email: "" }] }));
  const removeRef = (id: string) => setData((p) => ({ ...p, references: p.references.filter((r) => r.id !== id) }));

  // ── AI actions ──────────────────────────────────────────────────────────────

  const aiSummary = useCallback(async () => {
    setLoading("summary", true);
    try {
      const { result } = await aiCall({ action: "write_summary", name: data.personalInfo.name, experiences: data.experience, skills: data.skills, targetRole: data.experience[0]?.title });
      setData((p) => ({ ...p, summary: result }));
      toast.success("Summary written by AI");
    } catch (e: any) { toast.error(e.message); } finally { setLoading("summary", false); }
  }, [data]);

  const aiBullets = useCallback(async (expId: string) => {
    const exp = data.experience.find((e) => e.id === expId);
    if (!exp) return;
    setLoading(`bullets_${expId}`, true);
    try {
      const { result } = await aiCall({ action: "improve_bullets", title: exp.title, company: exp.company, responsibilities: exp.responsibilities });
      setExp(expId, "responsibilities", result);
      toast.success("Bullet points improved");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(`bullets_${expId}`, false); }
  }, [data]);

  const aiSkills = useCallback(async () => {
    setLoading("skills", true);
    try {
      const { skills } = await aiCall({ action: "suggest_skills", title: data.experience[0]?.title, experiences: data.experience, existingSkills: data.skills });
      const newSkills = (skills as string[]).filter((s) => !data.skills.includes(s));
      setData((p) => ({ ...p, skills: [...p.skills, ...newSkills] }));
      toast.success(`Added ${newSkills.length} suggested skills`);
    } catch (e: any) { toast.error(e.message); } finally { setLoading("skills", false); }
  }, [data]);

  const runAtsScore = useCallback(async () => {
    setLoading("ats", true);
    try {
      const result = await aiCall({ action: "ats_score", resumeData: data });
      setAtsResult(result);
    } catch (e: any) { toast.error(e.message); } finally { setLoading("ats", false); }
  }, [data]);

  // ── PDF download ────────────────────────────────────────────────────────────

  const downloadPdf = useCallback(async () => {
    if (!previewRef.current) return;
    const el = previewRef.current;
    // Use browser print dialog focused on the preview element
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${data.personalInfo.name || "Resume"}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#111;background:#fff;padding:24px 32px;max-width:800px;margin:0 auto}
      h1{font-size:20pt;font-weight:700;color:#202020;margin-bottom:2px}
      .contact{font-size:9pt;color:#555;margin-bottom:10px}
      .contact span{margin-right:12px}
      h2{font-size:11pt;font-weight:700;color:#202020;border-bottom:1.5px solid #202020;margin:12px 0 6px;padding-bottom:2px;text-transform:uppercase;letter-spacing:.04em}
      .summary{font-size:10pt;line-height:1.5;color:#333;margin-bottom:4px}
      .entry{margin-bottom:8px}
      .entry-header{display:flex;justify-content:space-between;align-items:baseline}
      .entry-title{font-weight:600;font-size:10.5pt}
      .entry-sub{color:#555;font-size:9.5pt}
      .entry-date{color:#777;font-size:9pt;white-space:nowrap}
      .bullets{margin-top:3px;padding-left:16px}
      .bullets li{font-size:9.5pt;line-height:1.45;color:#333;margin-bottom:1px}
      .skills-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
      .skill-tag{background:#f0f2ff;border:1px solid #c7d0ff;border-radius:4px;padding:2px 8px;font-size:9pt;color:#2a3080}
      .lang-row{display:flex;justify-content:space-between;font-size:9.5pt;padding:2px 0}
      .ref-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .ref-entry{font-size:9.5pt;line-height:1.4}
      @media print{body{padding:12px 18px}@page{margin:1.2cm}}
    </style></head><body>${el.innerHTML}</body></html>`;
    const win = window.open("", "_blank");
    if (!win) { toast.error("Please allow popups to download PDF"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }, [data, previewRef]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

        {/* Header */}
        <div style={{ borderRadius: 16, padding: '24px 28px', background: 'linear-gradient(135deg, #512ACC 0%, #6B4FD6 60%, #512ACC 100%)', boxShadow: '0 4px 20px rgba(81,42,204,0.15)', position: 'relative', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                AI Tools · Resume Journey
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>AI Resume Builder</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Build a professional, ATS-optimised Malaysian resume in 4 steps.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setView(view === "form" ? "preview" : "form")} className="gap-2 bg-white/10 border-white/10 text-white hover:bg-white/20 hover:text-white">
                {view === "form" ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                {view === "form" ? "Preview Resume" : "Back to Form"}
              </Button>
              <Button size="sm" onClick={downloadPdf} className="gap-2 bg-white text-[#512ACC] hover:bg-white/90">
                <Download className="size-4" /> Download PDF
              </Button>
            </div>
          </div>
        </div>

        {view === "form" && (
          <>
            {/* ── Stepper ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 22, padding: '16px 20px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--line)', overflowX: 'auto' }}>
              {([1, 2, 3, 4] as WizardStep[]).map((s, idx, arr) => {
                const current = step === s;
                const done = step > s;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 150 }}>
                    <button onClick={() => setStep(s)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, transition: 'all 0.2s', border: `2px solid ${current ? '#512ACC' : done ? '#31C47A' : 'var(--line)'}`, background: current ? '#512ACC' : done ? '#dcfce7' : 'var(--surface)', color: current ? '#fff' : done ? '#15803d' : 'var(--muted)' }}>
                        {done && !current ? '✓' : s}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: current ? 'var(--ink)' : done ? 'var(--ink)' : 'var(--muted)' }}>Step {s}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: current ? '#512ACC' : 'var(--muted)', marginTop: 1 }}>{STEP_META[s].title}</div>
                      </div>
                    </button>
                    {idx < arr.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: done ? '#31C47A' : 'var(--line)', margin: '0 10px', minWidth: 18 }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Step Title ── */}
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{STEP_META[step].title}</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{STEP_META[step].subtitle}</p>
            </div>

            <div className="space-y-4">

              {step === 1 && (
                <>
                  {/* Personal Info */}
                  <Section icon={<User className="size-4" />} title="Personal Information">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {([["name","Full Name *"],["email","Email *"],["phone","Phone *"],["location","Location (City, State) *"],["linkedin","LinkedIn URL"],["icNumber","IC Number (Optional)"],["expectedSalary","Expected Salary (RM)"]] as [keyof PersonalInfo, string][])
                        .map(([k, label]) => (
                          <div key={k}>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                            <Input value={data.personalInfo[k]} onChange={(e) => setPersonal(k, e.target.value)} placeholder={label.replace(" *","").replace(" (Optional)","").replace(" (RM)","").replace(" (City, State)","")} className="h-9 text-sm" />
                          </div>
                        ))}
                    </div>
                  </Section>

                  {/* Summary */}
                  <Section icon={<FileText className="size-4" />} title="Professional Summary">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Summary</label>
                      <AiBtn loading={!!aiLoading.summary} onClick={aiSummary} label="Write My Summary" />
                    </div>
                    <textarea
                      value={data.summary}
                      onChange={(e) => setData((p) => ({ ...p, summary: e.target.value }))}
                      rows={4}
                      placeholder="A results-driven professional with X years of experience in…"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </Section>
                </>
              )}

              {step === 2 && (
                <>
                  {/* Education */}
              <Section icon={<GraduationCap className="size-4" />} title="Education">
                {data.education.map((edu, idx) => (
                  <div key={edu.id} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Education #{idx + 1}</span>
                      {data.education.length > 1 && (
                        <button onClick={() => removeEdu(edu.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Institution</label>
                        <Input value={edu.institution} onChange={(e) => setEdu(edu.id, "institution", e.target.value)} placeholder="Universiti Malaya" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Degree / Qualification</label>
                        <select value={edu.degree} onChange={(e) => setEdu(edu.id, "degree", e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value="">Select…</option>
                          {DEGREE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Field of Study</label>
                        <Input value={edu.field} onChange={(e) => setEdu(edu.id, "field", e.target.value)} placeholder="Computer Science" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Start Year</label>
                        <Input value={edu.startYear} onChange={(e) => setEdu(edu.id, "startYear", e.target.value)} placeholder="2018" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">End Year</label>
                        <Input value={edu.endYear} onChange={(e) => setEdu(edu.id, "endYear", e.target.value)} placeholder="2022" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Grade / CGPA</label>
                        <Input value={edu.grade} onChange={(e) => setEdu(edu.id, "grade", e.target.value)} placeholder="3.72 / First Class" className="h-9 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addEdu} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                  <Plus className="size-3.5" /> Add Education
                </button>
              </Section>

              {/* Experience */}
              <Section icon={<Briefcase className="size-4" />} title="Work Experience">
                {data.experience.map((exp, idx) => (
                  <div key={exp.id} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Experience #{idx + 1}</span>
                      {data.experience.length > 1 && (
                        <button onClick={() => removeExp(exp.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Company</label>
                        <Input value={exp.company} onChange={(e) => setExp(exp.id, "company", e.target.value)} placeholder="Maybank" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Job Title</label>
                        <Input value={exp.title} onChange={(e) => setExp(exp.id, "title", e.target.value)} placeholder="Software Engineer" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
                        <Input value={exp.startDate} onChange={(e) => setExp(exp.id, "startDate", e.target.value)} placeholder="Jan 2022" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
                        <div className="flex items-center gap-2">
                          <Input value={exp.endDate} onChange={(e) => setExp(exp.id, "endDate", e.target.value)} placeholder="Dec 2023" disabled={exp.current} className="h-9 text-sm flex-1" />
                          <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                            <input type="checkbox" checked={exp.current} onChange={(e) => { setExp(exp.id, "current", e.target.checked); if (e.target.checked) setExp(exp.id, "endDate", "Present"); }} className="rounded" />
                            Current
                          </label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Responsibilities & Achievements</label>
                        <AiBtn loading={!!aiLoading[`bullets_${exp.id}`]} onClick={() => aiBullets(exp.id)} label="Improve Bullets" />
                      </div>
                      <textarea
                        value={exp.responsibilities}
                        onChange={(e) => setExp(exp.id, "responsibilities", e.target.value)}
                        rows={4}
                        placeholder={"• Led development of…\n• Increased revenue by…\n• Managed a team of…"}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono"
                      />
                    </div>
                  </div>
                ))}
                <button onClick={addExp} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                  <Plus className="size-3.5" /> Add Experience
                </button>
              </Section>
                </>
              )}

              {step === 3 && (
                <>
              {/* Skills */}
              <Section icon={<Wrench className="size-4" />} title="Skills">
                <div className="flex items-center gap-2 mb-2">
                  <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} placeholder="Type a skill and press Enter…" className="h-9 text-sm flex-1" />
                  <Button variant="outline" size="sm" onClick={addSkill}>Add</Button>
                  <AiBtn loading={!!aiLoading.skills} onClick={aiSkills} label="Suggest Skills" />
                </div>
                {data.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.skills.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                        {s}
                        <button onClick={() => removeSkill(s)} className="ml-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="size-2.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
                {data.skills.length === 0 && <p className="text-xs text-muted-foreground">No skills added yet. Type above or click "Suggest Skills".</p>}
              </Section>

              {/* Languages */}
              <Section icon={<Languages className="size-4" />} title="Languages">
                <div className="space-y-2">
                  {data.languages.map((lang) => (
                    <div key={lang.id} className="flex items-center gap-2">
                      <select value={lang.name} onChange={(e) => setLang(lang.id, "name", e.target.value)} className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="">Select language…</option>
                        {PRESET_LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
                        <option value={lang.name && !PRESET_LANGS.includes(lang.name) ? lang.name : "Other"}>Other</option>
                      </select>
                      {lang.name && !PRESET_LANGS.includes(lang.name) && (
                        <Input value={lang.name} onChange={(e) => setLang(lang.id, "name", e.target.value)} placeholder="Language name" className="flex-1 h-9 text-sm" />
                      )}
                      <select value={lang.level} onChange={(e) => setLang(lang.id, "level", e.target.value)} className="w-36 h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                        {LANG_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <button onClick={() => removeLang(lang.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 className="size-3.5" /></button>
                    </div>
                  ))}
                  <button onClick={addLang} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1">
                    <Plus className="size-3.5" /> Add Language
                  </button>
                </div>
              </Section>

              {/* References */}
              <Section icon={<Users className="size-4" />} title="References (Optional)" defaultOpen={false}>
                {data.references.map((ref, idx) => (
                  <div key={ref.id} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Reference #{idx + 1}</span>
                      <button onClick={() => removeRef(ref.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {([["name","Full Name"],["title","Job Title"],["company","Company"],["phone","Phone"],["email","Email"]] as [keyof ReferenceEntry, string][])
                        .map(([k, label]) => (
                          <div key={k}>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                            <Input value={ref[k]} onChange={(e) => setRef(ref.id, k, e.target.value)} placeholder={label} className="h-9 text-sm" />
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
                {data.references.length === 0 && (
                  <p className="text-xs text-muted-foreground">No references added. You can leave this blank and add "References available upon request" as a note.</p>
                )}
                <button onClick={addRef} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                  <Plus className="size-3.5" /> Add Reference
                </button>
              </Section>
                </>
              )}

              {step === 4 && (
                <>
              {/* Template selector */}
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <p className="text-sm font-semibold text-foreground mb-3">Choose Your Preferred Template</p>
                <div className="grid grid-cols-3 gap-3">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplate(t.id)}
                      className="relative rounded-xl border-2 p-3 text-left transition-all hover:shadow-md"
                      style={{ borderColor: selectedTemplate === t.id ? t.accent : 'var(--line)', background: selectedTemplate === t.id ? `${t.accent}08` : 'var(--base)' }}
                    >
                      {selectedTemplate === t.id && (
                        <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full text-white text-xs font-bold" style={{ background: t.accent }}>✓</span>
                      )}
                      {/* Mini preview bars */}
                      <div className="mb-2 space-y-1">
                        <div className="h-1.5 w-3/4 rounded-full" style={{ background: t.accent, opacity: 0.7 }} />
                        <div className="h-1 w-full rounded-full bg-muted" />
                        <div className="h-1 w-5/6 rounded-full bg-muted" />
                        <div className="h-1 w-2/3 rounded-full bg-muted" />
                        {t.id === "modern" && <div className="h-1 w-1/2 rounded-full" style={{ background: t.accent, opacity: 0.4 }} />}
                      </div>
                      <p className="text-xs font-bold" style={{ color: t.accent }}>{t.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t.desc}</p>
                      <p className="text-[10px] font-medium mt-1" style={{ color: t.accent, opacity: 0.8 }}>Best for: {t.best}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ATS Score result */}
              {atsResult && (
                <div className={`rounded-xl border p-4 ${atsResult.score >= 80 ? "border-green-200 bg-green-50" : atsResult.score >= 60 ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-center">
                      <p className={`text-3xl font-extrabold ${atsResult.score >= 80 ? "text-green-700" : atsResult.score >= 60 ? "text-amber-700" : "text-red-700"}`}>{atsResult.score}</p>
                      <p className="text-xs text-muted-foreground">ATS Score</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${atsResult.score >= 80 ? "text-green-700" : atsResult.score >= 60 ? "text-amber-700" : "text-red-700"}`}>{atsResult.grade}</p>
                      <p className="text-xs text-muted-foreground">Grade</p>
                    </div>
                    <div className="flex-1 grid sm:grid-cols-3 gap-3 min-w-0">
                      {atsResult.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-1">✓ Strengths</p>
                          <ul className="space-y-0.5">{atsResult.strengths.map((s, i) => <li key={i} className="text-xs text-green-800">{s}</li>)}</ul>
                        </div>
                      )}
                      {atsResult.improvements.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Improve</p>
                          <ul className="space-y-0.5">{atsResult.improvements.map((s, i) => <li key={i} className="text-xs text-amber-800">{s}</li>)}</ul>
                        </div>
                      )}
                      {atsResult.keywords_missing.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-700 mb-1">+ Add Keywords</p>
                          <div className="flex flex-wrap gap-1">{atsResult.keywords_missing.map((k, i) => <span key={i} className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">{k}</span>)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Generate / Preview CTA */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={runAtsScore} disabled={aiLoading.ats} className="gap-2">
                  {aiLoading.ats ? <Loader2 className="size-4 animate-spin" /> : <BarChart2 className="size-4" />}
                  Check ATS Score
                </Button>
                <Button onClick={() => setView("preview")} className="gap-2">
                  <Eye className="size-4" /> Preview Resume
                </Button>
              </div>
                </>
              )}

            </div>

            {/* ── Step Navigation ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
              <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1) as WizardStep)} disabled={step === 1} className="gap-2">
                <ChevronLeft className="size-4" /> Back
              </Button>
              {step < 4 ? (
                <Button onClick={() => setStep((s) => Math.min(4, s + 1) as WizardStep)} className="gap-2">
                  Next <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button onClick={() => setView("preview")} className="gap-2">
                  <Eye className="size-4" /> Preview Resume
                </Button>
              )}
            </div>

          </>)}

          {/* ── RIGHT / Full: Preview ─────────────────────────────────────── */}
          {view === "preview" && (
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{TEMPLATES.find(t => t.id === selectedTemplate)?.label ?? 'ATS Optimised'} template · {TEMPLATES.find(t => t.id === selectedTemplate)?.desc}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setView("form")} className="gap-2">
                    <EyeOff className="size-4" /> Edit Form
                  </Button>
                  <Button size="sm" onClick={downloadPdf} className="gap-2">
                    <Download className="size-4" /> Download PDF
                  </Button>
                </div>
              </div>

              {/* ATS Resume Preview */}
              <div ref={previewRef} className="bg-white text-[#111] rounded-2xl border border-border shadow-sm p-8 max-w-3xl mx-auto font-['Segoe_UI',Arial,sans-serif] text-[11pt] leading-relaxed">
                {/* Header */}
                <h1 className="text-[22pt] font-bold mb-0.5" style={{ color: TEMPLATES.find(t => t.id === selectedTemplate)?.accent ?? '#202020', fontFamily: selectedTemplate === 'classic' ? 'Georgia,serif' : 'inherit' }}>{data.personalInfo.name || "Your Name"}</h1>
                <div className="text-[9pt] text-[#555] flex flex-wrap gap-x-4 gap-y-0.5 mb-3 border-b border-[#ddd] pb-3">
                  {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
                  {data.personalInfo.phone && <span>{data.personalInfo.phone}</span>}
                  {data.personalInfo.location && <span>{data.personalInfo.location}</span>}
                  {data.personalInfo.linkedin && <span>{data.personalInfo.linkedin}</span>}
                  {data.personalInfo.expectedSalary && <span>Expected: RM {data.personalInfo.expectedSalary}</span>}
                </div>

                {/* Summary */}
                {data.summary && (
                  <>
                    <h2 className="text-[10pt] font-bold text-[#202020] uppercase tracking-wider border-b border-[#202020] pb-0.5 mb-2">Professional Summary</h2>
                    <p className="text-[10pt] text-[#333] mb-4 leading-relaxed">{data.summary}</p>
                  </>
                )}

                {/* Experience */}
                {data.experience.some((e) => e.company || e.title) && (
                  <>
                    <h2 className="text-[10pt] font-bold text-[#202020] uppercase tracking-wider border-b border-[#202020] pb-0.5 mb-2">Work Experience</h2>
                    <div className="mb-4 space-y-3">
                      {data.experience.filter((e) => e.company || e.title).map((exp) => (
                        <div key={exp.id}>
                          <div className="flex items-baseline justify-between">
                            <span className="font-semibold text-[10.5pt]">{exp.title || "Job Title"}</span>
                            <span className="text-[9pt] text-[#777]">{exp.startDate}{exp.startDate && (exp.endDate || exp.current) ? " – " : ""}{exp.current ? "Present" : exp.endDate}</span>
                          </div>
                          <p className="text-[9.5pt] text-[#555]">{exp.company}</p>
                          {exp.responsibilities && (
                            <ul className="mt-1 pl-4 space-y-0.5">
                              {exp.responsibilities.split("\n").filter((l) => l.trim()).map((line, i) => (
                                <li key={i} className="text-[9.5pt] text-[#333] list-disc">{line.replace(/^[•\-]\s*/, "")}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Education */}
                {data.education.some((e) => e.institution) && (
                  <>
                    <h2 className="text-[10pt] font-bold text-[#202020] uppercase tracking-wider border-b border-[#202020] pb-0.5 mb-2">Education</h2>
                    <div className="mb-4 space-y-2">
                      {data.education.filter((e) => e.institution).map((edu) => (
                        <div key={edu.id}>
                          <div className="flex items-baseline justify-between">
                            <span className="font-semibold text-[10.5pt]">{edu.institution}</span>
                            <span className="text-[9pt] text-[#777]">{edu.startYear}{edu.startYear && edu.endYear ? " – " : ""}{edu.endYear}</span>
                          </div>
                          <p className="text-[9.5pt] text-[#555]">{[edu.degree, edu.field].filter(Boolean).join(", ")}{edu.grade ? ` · ${edu.grade}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Skills */}
                {data.skills.length > 0 && (
                  <>
                    <h2 className="text-[10pt] font-bold text-[#202020] uppercase tracking-wider border-b border-[#202020] pb-0.5 mb-2">Skills</h2>
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {data.skills.map((s) => (
                        <span key={s} className="rounded border border-[#c7d0ff] bg-[#f0f2ff] px-2 py-0.5 text-[9pt] text-[#2a3080]">{s}</span>
                      ))}
                    </div>
                  </>
                )}

                {/* Languages */}
                {data.languages.some((l) => l.name) && (
                  <>
                    <h2 className="text-[10pt] font-bold text-[#202020] uppercase tracking-wider border-b border-[#202020] pb-0.5 mb-2">Languages</h2>
                    <div className="mb-4 grid grid-cols-3 gap-x-4 gap-y-1">
                      {data.languages.filter((l) => l.name).map((lang) => (
                        <div key={lang.id} className="flex justify-between text-[9.5pt]">
                          <span className="text-[#333]">{lang.name}</span>
                          <span className="text-[#777]">{lang.level}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* References */}
                {data.references.length > 0 ? (
                  <>
                    <h2 className="text-[10pt] font-bold text-[#202020] uppercase tracking-wider border-b border-[#202020] pb-0.5 mb-2">References</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {data.references.map((ref) => (
                        <div key={ref.id} className="text-[9.5pt] leading-snug">
                          <p className="font-semibold text-[#202020]">{ref.name}</p>
                          <p className="text-[#555]">{ref.title}{ref.company ? `, ${ref.company}` : ""}</p>
                          {ref.phone && <p className="text-[#777]">{ref.phone}</p>}
                          {ref.email && <p className="text-[#777]">{ref.email}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[9pt] text-[#999] italic">References available upon request.</p>
                )}
              </div>
            </div>
          )}

      </main>
    </div>
  );
}
