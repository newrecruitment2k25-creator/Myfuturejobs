import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, Mic, CheckCircle2, AlertCircle, Loader2, Video } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { createInterviewSession } from "@/lib/interview.functions";

export const Route = createFileRoute("/interview/setup")({
  component: InterviewSetupPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Interview Setup — PerksoPrax AI" },
      { name: "description", content: "Set up your AI video interview session." },
    ],
  }),
});

const INDUSTRIES = [
  "Technology & IT", "Finance & Banking", "Healthcare & Medical",
  "Manufacturing & Engineering", "Retail & E-Commerce",
  "Oil & Gas / Energy", "Education & Training", "Construction & Property",
  "Logistics & Supply Chain", "Hospitality & Tourism",
  "Media & Communications", "Government & Public Sector",
  "Professional Services", "FMCG / Consumer Goods", "Other",
];

const COMPANY_TYPES = ["MNC", "GLC", "SME", "Startup", "Government"];
const EXPERIENCE_LEVELS = ["Fresh Graduate", "Junior (1-3 years)", "Mid (3-7 years)", "Senior (7+ years)", "Executive"];
const INTERVIEW_TYPES = ["Behavioral", "Technical", "Competency", "Mixed"];
const QUESTION_COUNTS = [3, 5, 7, 10];
const VOICES = [
  { value: "nova", label: "Nova (Female, Professional)" },
  { value: "onyx", label: "Onyx (Male, Authoritative)" },
];

function InterviewSetupPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const createSession = useServerFn(createInterviewSession);

  const [roleTitle, setRoleTitle] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [industry, setIndustry] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [voice, setVoice] = useState<"nova" | "onyx">("nova");
  const [submitting, setSubmitting] = useState(false);

  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authLoading && !user) void navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setCameraOk(true);
        setMicOk(true);
        stream.getTracks().forEach((t) => t.stop());
      })
      .catch(() => {
        setCameraOk(false);
        setMicOk(false);
      });
  }, []);

  const canSubmit =
    roleTitle.trim() && companyType && industry && experienceLevel && interviewType && !submitting;

  const handleStart = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { session_id } = await createSession({
        data: {
          user_id: user!.id,
          role_title: roleTitle.trim(),
          company_type: companyType,
          industry,
          experience_level: experienceLevel,
          interview_type: interviewType,
          total_questions: totalQuestions,
        },
      });
      sessionStorage.setItem(`PerksoPrax AI:interview:voice:${session_id}`, voice);
      window.location.href = `/interview-room.html?session=${session_id}`;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create session. Please try again.");
      setSubmitting(false);
    }
  };

  if (!isMounted || authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <Loader2 className="size-6 animate-spin" style={{ color: '#F36C21' }} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--page-bg)' }}>
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <span className="section-eyebrow text-xs mb-2"><Video className="size-3.5" /> AI Interview</span>
          <h1 className="mt-2 text-3xl font-extrabold" style={{ color: '#211F60', letterSpacing: '-0.04em' }}>AI Video Interview</h1>
          <p className="mt-1 text-sm font-bold" style={{ color: 'var(--muted-color)' }}>Powered by PerksoPrax AI AI Engine · Configure and start your session below.</p>
        </div>

        {/* Device check */}
        <div className="mb-6 rounded-[20px] p-5" style={{ background: '#ffffff', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="mb-4 text-xs font-extrabold uppercase tracking-widest" style={{ color: '#211F60' }}>Device Check</h2>
          <div className="flex flex-wrap gap-4">
            <DeviceStatus icon={Camera} label="Camera" ok={cameraOk} />
            <DeviceStatus icon={Mic} label="Microphone" ok={micOk} />
          </div>
          {(cameraOk === false || micOk === false) && (
            <p className="mt-3 text-xs font-bold" style={{ color: '#d97706' }}>
              Camera/mic access was denied. You can still interview using text input. Use Chrome for best results.
            </p>
          )}
        </div>

        {/* Form */}
        <div className="rounded-[24px] p-6 space-y-6" style={{ background: '#ffffff', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-base font-extrabold" style={{ color: '#211F60', letterSpacing: '-0.02em' }}>Interview Configuration</h2>

          <div className="space-y-2">
            <label htmlFor="role" className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#211F60' }}>Role Title *</label>
            <input
              id="role"
              placeholder="e.g. Senior Software Engineer, Marketing Manager"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className="w-full h-11 px-4 rounded-full border text-sm font-bold outline-none transition-all"
              style={{ borderColor: 'var(--border-color)', background: 'var(--page-bg)', color: '#17152f' }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#211F60' }}>Company Type *</label>
              <Select value={companyType} onValueChange={setCompanyType}>
                <SelectTrigger className="h-11 rounded-full border font-bold text-sm" style={{ borderColor: 'var(--border-color)' }}><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#211F60' }}>Industry *</label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="h-11 rounded-full border font-bold text-sm" style={{ borderColor: 'var(--border-color)' }}><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#211F60' }}>Experience Level *</label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger className="h-11 rounded-full border font-bold text-sm" style={{ borderColor: 'var(--border-color)' }}><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#211F60' }}>Interview Type *</label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger className="h-11 rounded-full border font-bold text-sm" style={{ borderColor: 'var(--border-color)' }}><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#211F60' }}>Number of Questions</label>
              <Select value={String(totalQuestions)} onValueChange={(v) => setTotalQuestions(Number(v))}>
                <SelectTrigger className="h-11 rounded-full border font-bold text-sm" style={{ borderColor: 'var(--border-color)' }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUESTION_COUNTS.map((n) => <SelectItem key={n} value={String(n)}>{n} questions (~{n * 2} min)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#211F60' }}>AI Interviewer Voice</label>
              <Select value={voice} onValueChange={(v) => setVoice(v as "nova" | "onyx")}>
                <SelectTrigger className="h-11 rounded-full border font-bold text-sm" style={{ borderColor: 'var(--border-color)' }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOICES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2">
            <button
              className="btn-primary-custom w-full justify-center text-base py-3"
              disabled={!canSubmit}
              onClick={handleStart}
            >
              {submitting ? (
                <><Loader2 className="size-4 animate-spin" /> Setting up interview…</>
              ) : (
                <><Video className="size-4" /> Start Interview</>
              )}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs font-bold" style={{ color: 'var(--muted-color)' }}>
          Works best in Chrome. Speech recognition requires microphone permission.
        </p>
      </main>
    </div>
  );
}

function DeviceStatus({ icon: Icon, label, ok }: { icon: React.ElementType; label: string; ok: boolean | null }) {
  return (
    <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ border: '1px solid var(--border-color)', background: 'var(--page-bg)' }}>
      <Icon className="size-4" style={{ color: 'var(--muted-color)' }} />
      <span className="text-sm font-bold" style={{ color: '#17152f' }}>{label}</span>
      {ok === null && <Loader2 className="ml-1 size-3.5 animate-spin" style={{ color: 'var(--muted-color)' }} />}
      {ok === true && <CheckCircle2 className="ml-1 size-4" style={{ color: '#16a34a' }} />}
      {ok === false && <AlertCircle className="ml-1 size-4" style={{ color: '#d97706' }} />}
    </div>
  );
}
