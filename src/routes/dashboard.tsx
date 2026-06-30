import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronDown, FileText, Loader2, Video, Clock, CheckCircle2, Circle, Mail, Building2, CalendarClock, Briefcase, MapPin, Brain, Search, ArrowRight, Sparkles, History, BarChart2, Star, BookOpen, LinkedinIcon, TrendingUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";
import { AppStatusBadge, AppStatusStepper } from "@/components/app-status";
import type { AppStatus, StatusHistoryEntry } from "@/lib/ops-api";
import { buildUserInterestVector, personaliseJob, getTopIndustries, buildPersonalisedChips } from "@/lib/user-profile";
import { parseSearchQuery as parseFn, scoreJob as scoreFn } from "@/lib/smart-search.functions";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — MYFutureJobs" },
      { name: "description", content: "Your saved CV analyses." },
    ],
  }),
});

type InterviewSessionRow = {
  id: string;
  created_at: string;
  role_title: string;
  interview_type: string;
  status: string;
  overall_score: number | null;
  total_questions: number;
};

type ApplicationRow = {
  id: string;
  created_at: string;
  status: AppStatus;
  job_id: string | null;
  poc_vacancy_id: string | null;
  job_title: string | null;
  company_name: string | null;
  location: string | null;
  status_history?: StatusHistoryEntry[];
};

type InvitationRow = {
  id: string;
  status: string;
  deadline: string | null;
  created_at: string;
  overall_score: number | null;
  template_id: string | null;
  template: {
    id: string;
    title: string;
    role_title: string;
    company_name: string | null;
    interview_type: string;
  } | null;
  practical: {
    mode: "in_person" | "online";
    location: string | null;
    date: string;
    time: string;
    notes: string | null;
  } | null;
};

type SavedJobRow = {
  id: string;
  created_at: string;
  job_id: string | null;
  poc_vacancy_id: string | null;
  job_title: string | null;
  company_name: string | null;
  location: string | null;
  salary: string | null;
  salary_min: number | null;
  salary_max: number | null;
};

type AnalysisRow = {
  id: string;
  created_at: string;
  company_type: string;
  industry: string;
  experience_level: string;
  overall_score: number;
  full_results: Record<string, unknown> | null;
};

function scoreColor(s: number) {
  if (s >= 80) return "badge-soft-success";
  if (s >= 60) return "badge-soft-warning";
  return "badge-soft-danger";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function DashboardPage() {
  const { user } = useAuth();
  const { checked, loading: roleLoading } = useRoleGuard("job_seeker");
  const [rows, setRows] = useState<AnalysisRow[] | null>(null);
  const [interviews, setInterviews] = useState<InterviewSessionRow[] | null>(null);
  const [invitations, setInvitations] = useState<InvitationRow[] | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[] | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJobRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<{ id: string; job_title: string | null; state: string | null; salary: string | null; skills: string | null; score: number; matchReason?: string }[] | null>(null);
  const [topIndustries, setTopIndustries] = useState<{ name: string; score: number }[]>([]);
  const [missingSkillsInsight, setMissingSkillsInsight] = useState<string[]>([]);
  const [salaryInsight, setSalaryInsight] = useState<{ anchor: number; label: string } | null>(null);
  const [pocProfile, setPocProfile] = useState<{ candidate_id: string; education_level: string | null; preferred_occupation: string | null; skills: string | null } | null>(null);
  const [pocBehaviour, setPocBehaviour] = useState<{ total_applications: number; total_interviews: number; total_offers: number; sign_in_count: number } | null>(null);

  useEffect(() => {
    if (!checked || !user) return;

    // Load recommended jobs using full personalization engine
    (async () => {
      try {
        const vec = await buildUserInterestVector(user.id);
        setTopIndustries(getTopIndustries(vec));

        // Salary insight
        if (vec.salaryAnchor > 0) {
          const anchor = Math.min(30000, Math.max(1000, vec.salaryAnchor));
          const lo = Math.max(1000, Math.round(anchor * 0.85 / 500) * 500);
          const hi = Math.min(30000, Math.round(anchor * 1.15 / 500) * 500);
          setSalaryInsight({ anchor, label: `RM${lo.toLocaleString()} – RM${hi.toLocaleString()}` });
        }

        // Missing skills insight from analyses
        const { data: latestAnalysis } = await supabase
          .from("analyses").select("full_results").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(1);
        if (latestAnalysis?.[0]?.full_results) {
          try {
            const res = typeof latestAnalysis[0].full_results === "string"
              ? JSON.parse(latestAnalysis[0].full_results) : latestAnalysis[0].full_results;
            const missing: string = res?.skills_analysis?.missing_skills ?? res?.missing_skills ?? "";
            const missingList = missing.split(/[,;|\n]+/).map((s: string) => s.trim()).filter(Boolean).slice(0, 4);
            setMissingSkillsInsight(missingList);
          } catch {}
        }

        // Pull latest CV analysis
        const { data: analysisRows } = await supabase
          .from("analyses").select("full_results").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(1);

        let userSkills: string[] = [];
        let userRole = "";
        let userIndustry = "";

        if (analysisRows?.[0]?.full_results) {
          try {
            const res = typeof analysisRows[0].full_results === "string"
              ? JSON.parse(analysisRows[0].full_results) : analysisRows[0].full_results;
            userSkills = (res?.skills ?? res?.skills_analysis?.skills ?? []).slice(0, 8);
            userRole = res?.target_role ?? res?.current_role ?? res?.role ?? "";
            userIndustry = res?.industry ?? "";
          } catch {}
        }

        // Fallback role from personalization vector
        if (!userRole && vec.roles.length > 0) userRole = vec.roles[0];
        if (!userSkills.length) userSkills = Object.keys(vec.skills).slice(0, 6);

        // Build ilike clauses from user skills + role
        const skillClauses = userSkills.slice(0, 3).map((s: string) => `skills.ilike.%${s}%`).join(",");
        const rolePart = userRole ? `,job_title.ilike.%${userRole.split(" ")[0]}%` : "";
        const orFilter = (skillClauses + rolePart) || "id.gt.0";

        const { data: vacancies } = await supabase
          .from("poc_vacancies")
          .select("id, job_title, state, salary, salary_min, salary_max, skills, occupation_name, industry")
          .or(orFilter)
          .limit(120);

        // Score with NLP scoreJob using profile query
        const profileQuery = [userRole, ...userSkills.slice(0, 4)].filter(Boolean).join(" ");
        const parsed = parseFn(profileQuery || "software engineer");

        const scored = (vacancies ?? []).map((v: any) => {
          const nlpScore = profileQuery ? scoreFn(v as any, parsed, profileQuery) : 0;
          const boost = personaliseJob({ ...v, id: v.id }, vec);
          const combined = nlpScore * 0.7 + boost * 0.3;
          const jSkills = (v.skills ?? "").split(/[,;|]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
          const matchedSkills = jSkills.filter((sk: string) =>
            userSkills.some((us: string) => us.toLowerCase() === sk || sk.includes(us.toLowerCase()))
          ).slice(0, 3);
          const reason = matchedSkills.length > 0
            ? `Matches your skills: ${matchedSkills.join(", ")}`
            : userRole && (v.job_title ?? "").toLowerCase().includes(userRole.split(" ")[0].toLowerCase())
              ? `Matches your role: ${userRole}`
              : userIndustry && (v.industry ?? "").toLowerCase().includes(userIndustry.toLowerCase())
                ? `In your industry: ${userIndustry}`
                : vec.locations[0] && (v.state ?? "").toLowerCase().includes(vec.locations[0].toLowerCase())
                  ? `In your preferred location: ${vec.locations[0]}`
                  : "Based on your profile";
          return { ...v, score: Math.round(combined), matchReason: reason };
        }).filter((v: any) => v.score > 5)
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 6);

        if (scored.length === 0 && vec.hasData) {
          // Fallback: full pool ranked by personalization
          const { data: allVac } = await supabase
            .from("poc_vacancies").select("id, job_title, state, salary, salary_min, salary_max, skills, occupation_name, industry")
            .limit(200);
          const fallback = (allVac ?? []).map((v: any) => ({
            ...v, score: Math.round(personaliseJob({ ...v }, vec)),
            matchReason: "Based on your profile",
          })).filter((v: any) => v.score > 5).sort((a: any, b: any) => b.score - a.score).slice(0, 6);
          setRecommendedJobs(fallback);
          return;
        }

        setRecommendedJobs(scored);
      } catch { setRecommendedJobs([]); }
    })();
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from("analyses")
          .select("id, created_at, company_type, industry, experience_level, overall_score, full_results")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (err) { console.warn("Analyses load failed:", err); }
        setRows((data ?? []) as AnalysisRow[]);
      } catch (e) { console.warn("Analyses load failed:", e); setRows([]); }
    })();
    (async () => {
      try {
        const { data } = await supabase
          .from("interview_sessions")
          .select("id, created_at, role_title, interview_type, status, overall_score, total_questions")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setInterviews((data ?? []) as InterviewSessionRow[]);
      } catch (e) { console.warn("Interviews load failed:", e); setInterviews([]); }
    })();
    (async () => {
      try {
        const { data: invRows } = await (supabase as any)
          .from("interview_invitations")
          .select("id, status, deadline, created_at, overall_score, template_id, ai_summary")
          .eq("candidate_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (!invRows || invRows.length === 0) { setInvitations([]); return; }
        const aiRows = invRows.filter((r: any) => r.template_id);
        const templateIds = [...new Set(aiRows.map((r: any) => r.template_id))];
        const { data: templates } = templateIds.length > 0
          ? await (supabase as any)
              .from("interview_templates")
              .select("id, title, role_title, company_name, interview_type")
              .in("id", templateIds)
          : { data: [] };
        const tMap = new Map((templates ?? []).map((t: any) => [t.id, t]));
        setInvitations(invRows.map((r: any) => {
          const summary = r.ai_summary as Record<string, any> | null;
          const isPractical = summary?.type === "practical";
          return {
            ...r,
            template: r.template_id ? (tMap.get(r.template_id) ?? null) : null,
            practical: isPractical ? {
              mode: summary.mode ?? "in_person",
              location: summary.location ?? null,
              date: summary.date ?? r.deadline?.slice(0, 10) ?? "",
              time: summary.time ?? r.deadline?.slice(11, 16) ?? "",
              notes: summary.notes ?? null,
            } : null,
          };
        }) as InvitationRow[]);
      } catch (e) { console.warn("Invitations load failed:", e); setInvitations([]); }
    })();
    (async () => {
      try {
        const { data: appRows } = await (supabase as any)
          .from("applications")
          .select("id, created_at, status, job_id, poc_vacancy_id, status_history")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (!appRows || appRows.length === 0) { setApplications([]); return; }
        const jobIds = appRows.filter((r: any) => r.job_id).map((r: any) => r.job_id);
        const pocIds = appRows.filter((r: any) => r.poc_vacancy_id).map((r: any) => r.poc_vacancy_id);
        const [jobsResult, pocResult] = await Promise.all([
          jobIds.length > 0 ? supabase.from("jobs").select("id, job_title, company_name, location").in("id", jobIds) : { data: [] },
          pocIds.length > 0 ? supabase.from("poc_vacancies").select("id, job_title, occupation_name, state").in("id", pocIds) : { data: [] },
        ]);
        const jobMap = new Map((jobsResult.data ?? []).map((j: any) => [j.id, j]));
        const pocMap = new Map((pocResult.data ?? []).map((v: any) => [v.id, v]));
        setApplications(appRows.map((r: any) => {
          const base = { ...r, status: (r.status ?? 'applied').toLowerCase() };
          if (r.job_id) {
            const j = jobMap.get(r.job_id);
            return { ...base, job_title: j?.job_title ?? null, company_name: j?.company_name ?? null, location: j?.location ?? null };
          } else {
            const v = pocMap.get(r.poc_vacancy_id);
            return { ...base, job_title: v?.job_title ?? null, company_name: v?.occupation_name ?? "PERKESO Vacancy", location: v?.state ?? null };
          }
        }) as ApplicationRow[]);
      } catch (e) { console.warn("Applications load failed:", e); setApplications([]); }
    })();
    // Load saved jobs
    (async () => {
      try {
        const { data: savedRows } = await supabase
          .from("saved_jobs")
          .select("id, created_at, job_id, poc_vacancy_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (!savedRows || savedRows.length === 0) { setSavedJobs([]); return; }
        const jobIds = savedRows.filter((r: any) => r.job_id).map((r: any) => r.job_id);
        const pocIds = savedRows.filter((r: any) => r.poc_vacancy_id).map((r: any) => r.poc_vacancy_id);
        const [jobsResult, pocResult] = await Promise.all([
          jobIds.length > 0 ? supabase.from("jobs").select("id, job_title, company_name, location").in("id", jobIds) : { data: [] },
          pocIds.length > 0 ? supabase.from("poc_vacancies").select("id, job_title, occupation_name, state, salary, salary_min, salary_max").in("id", pocIds) : { data: [] },
        ]);
        const jobMap = new Map((jobsResult.data ?? []).map((j: any) => [j.id, j]));
        const pocMap = new Map((pocResult.data ?? []).map((v: any) => [v.id, v]));
        setSavedJobs(savedRows.map((r: any) => {
          if (r.job_id) {
            const j = jobMap.get(r.job_id);
            return { id: r.id, created_at: r.created_at, job_id: r.job_id, poc_vacancy_id: null, job_title: j?.job_title ?? null, company_name: j?.company_name ?? null, location: j?.location ?? null, salary: null, salary_min: null, salary_max: null };
          } else {
            const v = pocMap.get(r.poc_vacancy_id);
            return { id: r.id, created_at: r.created_at, job_id: null, poc_vacancy_id: r.poc_vacancy_id, job_title: v?.job_title ?? null, company_name: v?.occupation_name ?? "PERKESO Vacancy", location: v?.state ?? null, salary: v?.salary ?? null, salary_min: v?.salary_min ?? null, salary_max: v?.salary_max ?? null };
          }
        }) as SavedJobRow[]);
      } catch (e) { console.warn("Saved jobs load failed:", e); setSavedJobs([]); }
    })();
    // POC FIX 6: Load POC data if linked — never crash the dashboard
    (async () => {
      if (!user) return;
      try {
        const { data: prof, error: profileError } = await supabase.from("profiles").select("poc_candidate_id").eq("id", user.id).maybeSingle();
        if (profileError) {
          console.warn("POC profile load failed:", profileError);
        }
        const pocId = (prof as any)?.poc_candidate_id;
        if (!pocId) return;
        const { data: pocData } = await (supabase as any).from("poc_candidates").select("candidate_id, education_level, preferred_occupation, skills").eq("candidate_id", pocId).maybeSingle();
        if (pocData) setPocProfile(pocData);
        const { data: beh } = await (supabase as any).from("poc_behaviour").select("total_applications, total_interviews, total_offers, sign_in_count").eq("candidate_id", pocId).maybeSingle();
        if (beh) setPocBehaviour(beh);
      } catch (e) {
        console.warn("POC profile/behaviour load failed:", e);
      }
    })();
  }, [checked, user]);

  if (roleLoading || !checked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--base)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalApps = applications?.length ?? 0;
  const hiredOffered = applications?.filter(a => a.status === "hired" || a.status === "offered").length ?? 0;
  const pendingInterviews = invitations?.filter(i => i.status === "pending" || i.status === "in_progress").length ?? 0;
  const totalAnalyses = rows?.length ?? 0;

  const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
    applied:     { bg: '#ede9fe', color: '#7c3aed', label: 'Applied' },
    shortlisted: { bg: '#dbeafe', color: '#1d4ed8', label: 'Shortlisted' },
    interview:   { bg: '#e0f2fe', color: '#0369a1', label: 'Interview' },
    offered:     { bg: '#fef3c7', color: '#d97706', label: 'Offered' },
    hired:       { bg: '#dcfce7', color: '#15803d', label: 'Hired' },
    rejected:    { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
    kiv:         { bg: '#f3f4f6', color: '#6b7280', label: 'KIV' },
  };

  const statusFunnelOrder = ['hired','offered','shortlisted','applied','kiv','rejected'] as const;
  const statusCounts: Record<string, number> = {};
  (applications ?? []).forEach(a => {
    const k = (a.status ?? 'applied').toLowerCase();
    statusCounts[k] = (statusCounts[k] ?? 0) + 1;
  });
  const maxFunnelCount = Math.max(1, ...Object.values(statusCounts));

  const AI_TOOLS = [
    { icon: FileText,     label: 'Analyse CV',       desc: 'Score your CV',        href: '/analyze',                 bg: '#ede9fe', color: '#7c3aed' },
    { icon: Video,        label: 'AI Interview',     desc: 'Practice interviews',  href: '/interview/setup',         bg: '#dcfce7', color: '#15803d' },
    { icon: Brain,        label: 'Resume Builder',   desc: 'Build with AI',        href: '/resume-builder',          bg: '#fef3c7', color: '#d97706' },
    { icon: Star,         label: 'Skills Passport',  desc: 'Track your skills',    href: '/skills-passport',         bg: '#dbeafe', color: '#1d4ed8' },
    { icon: MapPin,       label: 'Career Pathway',   desc: 'Plan your career',     href: '/career-pathway',          bg: '#fce7f3', color: '#be185d' },
    { icon: LinkedinIcon, label: 'LinkedIn Review',  desc: 'Optimise profile',     href: '/linkedin-review',         bg: '#e0f2fe', color: '#0369a1' },
  ];

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Good morning' : greetHour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── 1. Welcome Bar ─────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--brand)', borderRadius: 'var(--radius-md)', padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, overflow: 'hidden', position: 'relative',
        }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', right: 60, bottom: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'relative' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>{greeting}</p>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>
              {displayName} 👋
            </h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{user?.email}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
            <Link to="/jobs" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-xs)', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none' }}>
              <Search className="size-3.5" /> Browse Jobs
            </Link>
            <Link to="/my-cv" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-xs)', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none' }}>
              <FileText className="size-3.5" /> My CV
            </Link>
            <Link to="/analyze" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-xs)', background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none' }}>
              <FileText className="size-3.5" /> Analyse CV
            </Link>
            <Link to="/interview/setup" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-xs)', background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none' }}>
              <Video className="size-3.5" /> AI Interview
            </Link>
          </div>
        </div>

        {/* ── 2. Stat Cards ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { label: 'Total Applications', value: totalApps,        iconBg: 'rgba(33,31,96,0.08)',  iconColor: 'var(--brand)', Icon: Briefcase },
            { label: 'Hired / Offered',    value: hiredOffered,     iconBg: '#dcfce7',              iconColor: '#15803d',      Icon: CheckCircle2 },
            { label: 'Pending Interviews', value: pendingInterviews, iconBg: '#fef3c7',              iconColor: '#d97706',      Icon: Video },
            { label: 'CV Analyses',        value: totalAnalyses,    iconBg: 'rgba(243,108,33,0.1)', iconColor: 'var(--accent)', Icon: FileText },
          ].map(({ label, value, iconBg, iconColor, Icon }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 18, height: 18, color: iconColor }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 2b. POC Profile Card (shown only when poc_candidate_id is linked) ── */}
        {pocProfile && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(33,31,96,0.08)', fontSize: 11, fontWeight: 800, color: 'var(--brand)' }}>MY</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>PERKESO Profile — {pocProfile.candidate_id}</div>
                {pocProfile.preferred_occupation && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{pocProfile.preferred_occupation}</div>}
                {pocProfile.education_level && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{pocProfile.education_level}</div>}
              </div>
            </div>
            {pocBehaviour && (
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Applications', value: pocBehaviour.total_applications },
                  { label: 'Interviews',   value: pocBehaviour.total_interviews },
                  { label: 'Offers',       value: pocBehaviour.total_offers },
                  { label: 'Sign-ins',     value: pocBehaviour.sign_in_count },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
            {pocProfile.skills && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>SKILLS FROM PERKESO</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {pocProfile.skills.split(/[,;|]+/).slice(0, 8).map((s: string) => s.trim()).filter(Boolean).map((s: string) => (
                    <span key={s} style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(33,31,96,0.07)', fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3. Main 2-column grid ──────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 10, alignItems: 'start' }}>

          {/* Left: Applications with Stepper */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>My Applications</span>
              {applications && applications.length > 5 && (
                <button
                  onClick={() => setExpanded(expanded === '__all_apps__' ? null : '__all_apps__')}
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {expanded === '__all_apps__' ? 'Show less ↑' : `View all (${applications.length}) →`}
                </button>
              )}
            </div>
            {applications === null ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'24px 0' }}><Loader2 className="size-5 animate-spin" style={{ color: 'var(--accent)' }} /></div>
            ) : applications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Briefcase style={{ width: 32, height: 32, color: 'var(--line-strong)', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>No applications yet</p>
                <Link to="/jobs" style={{ display:'inline-block', marginTop:8, fontSize:12, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>Browse Jobs →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(expanded === '__all_apps__' ? applications : applications.slice(0, 5)).map((app) => {
                  const initials = (app.company_name ?? 'J').slice(0, 2).toUpperCase();
                  const lastNote = app.status_history?.at(-1)?.notes;
                  return (
                    <div key={app.id} style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', padding: '10px 12px', background: 'var(--base)' }}>
                      {/* Top row: avatar + title + date */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:'rgba(33,31,96,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:'var(--brand)' }}>{initials}</div>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{app.job_title ?? 'Unknown Job'}</div>
                          <div style={{ fontSize:10, color:'var(--muted)' }}>{app.company_name ?? ''}{app.location ? ` · ${app.location}` : ''}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                          <span style={{ fontSize:9, color:'var(--muted)', whiteSpace:'nowrap' }}>{formatDate(app.created_at)}</span>
                          <Link to="/application/$applicationId" params={{ applicationId: app.id }} style={{ fontSize:10, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>View</Link>
                        </div>
                      </div>
                      {/* Status stepper */}
                      <AppStatusStepper status={app.status as any} />
                      {/* Status note */}
                      {lastNote && (
                        <div style={{ marginTop:6, fontSize:10, color:'var(--muted)', background:'rgba(33,31,96,0.06)', borderRadius:'var(--radius-xs)', padding:'4px 8px' }}>{lastNote}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Interview Invitations + Recent CV Analyses stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Interview Invitations */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Interview Invitations</span>
                <Link to="/interview/setup" style={{ fontSize:12, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>New →</Link>
              </div>
              {invitations === null ? (
                <div style={{ display:'flex', justifyContent:'center', padding:'16px 0' }}><Loader2 className="size-4 animate-spin" style={{ color:'var(--accent)' }} /></div>
              ) : invitations.length === 0 ? (
                <p style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'12px 0' }}>No invitations yet</p>
              ) : (
                <div style={{ display:'flex', flexDirection: 'column', gap:8 }}>
                  {invitations.slice(0,3).map(inv => (
                    <div key={inv.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {inv.practical ? "Practical Interview" : (inv.template?.role_title ?? 'AI Interview')}
                        </div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>
                          {inv.practical
                            ? `${inv.practical.date} at ${inv.practical.time}${inv.practical.location ? ` · ${inv.practical.location}` : ''}`
                            : (inv.template?.company_name ?? '')}
                        </div>
                      </div>
                      {inv.practical ? (
                        <span style={{ fontSize:10, fontWeight:600, color:'var(--accent)', background:'rgba(243,108,33,0.1)', borderRadius:'var(--radius-xs)', padding:'2px 8px', whiteSpace:'nowrap' }}>
                          {inv.practical.mode === 'in_person' ? 'In-person' : 'Online'}
                        </span>
                      ) : inv.status === 'completed' ? (
                        <span style={{ fontSize:10, fontWeight:600, color:'#15803d', background:'#dcfce7', borderRadius:'var(--radius-xs)', padding:'2px 8px', whiteSpace:'nowrap' }}>Done · {inv.overall_score ?? 0}</span>
                      ) : (
                        <a href={`/interview-room.html?invitation=${inv.id}`} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:'var(--radius-xs)', background:'var(--brand)', color:'#fff', fontSize:11, fontWeight:600, textDecoration:'none', whiteSpace:'nowrap' }}>
                          <Video style={{ width:10, height:10 }} />{inv.status === 'in_progress' ? 'Continue' : 'Start'}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent CV Analyses */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Recent CV Analyses</span>
                <Link to="/analyze" style={{ fontSize:12, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>Analyse →</Link>
              </div>
              {rows === null ? (
                <div style={{ display:'flex', justifyContent:'center', padding:'16px 0' }}><Loader2 className="size-4 animate-spin" style={{ color:'var(--accent)' }} /></div>
              ) : rows.length === 0 ? (
                <p style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'12px 0' }}>No analyses yet</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {rows.slice(0,4).map(r => {
                    const sc = r.overall_score;
                    const scColor = sc >= 80 ? '#15803d' : sc >= 60 ? '#d97706' : '#dc2626';
                    const scBg   = sc >= 80 ? '#dcfce7' : sc >= 60 ? '#fef3c7' : '#fee2e2';
                    return (
                      <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:scBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, fontWeight:800, color:scColor }}>{sc}</div>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', textTransform:'capitalize', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.industry} · {r.company_type}</div>
                          <div style={{ fontSize:10, color:'var(--muted)' }}>{formatDate(r.created_at)}</div>
                        </div>
                        <Link to="/results" search={{ id: r.id }} style={{ fontSize:10, fontWeight:600, color:'var(--accent)', textDecoration:'none', whiteSpace:'nowrap' }}>View →</Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Saved Jobs */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Saved Jobs</span>
                <Link to="/jobs" style={{ fontSize:12, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>Browse →</Link>
              </div>
              {savedJobs === null ? (
                <div style={{ display:'flex', justifyContent:'center', padding:'16px 0' }}><Loader2 className="size-4 animate-spin" style={{ color:'var(--accent)' }} /></div>
              ) : savedJobs.length === 0 ? (
                <p style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'12px 0' }}>No saved jobs yet</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {savedJobs.slice(0,5).map(job => (
                    <Link
                      key={job.id}
                      to={job.job_id ? `/jobs/$jobId` : '/jobs'}
                      params={job.job_id ? { jobId: job.job_id } : undefined}
                      search={job.poc_vacancy_id ? { search: job.job_title ?? '' } : undefined}
                      style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}
                    >
                      <div style={{ width:32, height:32, borderRadius:8, background:'rgba(243,108,33,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Bookmark style={{ width:14, height:14, color:'var(--accent)' }} />
                      </div>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{job.job_title ?? 'Unknown Job'}</div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>{job.company_name ?? ''}{job.location ? ` · ${job.location}` : ''}</div>
                      </div>
                      <ArrowRight style={{ width:12, height:12, color:'var(--accent)', flexShrink:0 }} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. Personalised "For You" section ─────────────────────────── */}
        {true && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(243,108,33,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles style={{ width: 14, height: 14, color: 'var(--accent)' }} />
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Jobs For You</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>Personalised based on your CV, skills & history</span>
                </div>
              </div>
              <Link to="/jobs" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Browse all <ArrowRight style={{ width: 12, height: 12 }} />
              </Link>
            </div>

            {recommendedJobs === null ? (
              <div style={{ display: 'flex', gap: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ flex: 1, height: 80, borderRadius: 'var(--radius-sm)', background: 'var(--base)', border: '1px solid var(--line)', animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            ) : recommendedJobs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', borderRadius: 'var(--radius-sm)', background: 'var(--base)', border: '1px dashed var(--line)' }}>
                <Brain style={{ width: 28, height: 28, color: 'var(--accent)', margin: '0 auto 10px', opacity: 0.5 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>Analyse your CV to get job recommendations</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>We'll match jobs from 5,800+ PERKESO vacancies based on your skills and role.</p>
                <Link to="/analyze" style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--accent)', borderRadius: 6, padding: '6px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <FileText style={{ width: 12, height: 12 }} /> Analyse CV Now
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {recommendedJobs.slice(0, 6).map((job) => {
                  const scoreColor = job.score >= 60 ? '#15803d' : job.score >= 35 ? '#d97706' : 'var(--muted)';
                  const scoreBg = job.score >= 60 ? '#dcfce7' : job.score >= 35 ? '#fef3c7' : 'var(--base)';
                  return (
                    <Link
                      key={job.id}
                      to="/jobs"
                      search={{ search: job.job_title ?? '' }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--base)', textDecoration: 'none', transition: 'border-color 0.15s, background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(243,108,33,0.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--base)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, flex: 1 }}>{job.job_title ?? 'Untitled'}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor, background: scoreBg, borderRadius: 999, padding: '1px 7px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Brain style={{ width: 8, height: 8 }} />{job.score}%
                        </span>
                      </div>
                      {job.state && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--muted)' }}>
                          <MapPin style={{ width: 9, height: 9 }} />{job.state}
                        </span>
                      )}
                      {job.salary && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--brand)' }}>{job.salary.startsWith('RM') ? job.salary : `RM ${job.salary}`}</span>
                      )}
                      {job.matchReason && (
                        <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500, background: 'rgba(243,108,33,0.08)', borderRadius: 4, padding: '2px 6px' }}>
                          {job.matchReason}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Insight strip: salary + skill gaps + industry interests */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              {salaryInsight && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(33,31,96,0.05)', borderRadius: 'var(--radius-xs)', padding: '8px 12px', flex: 1, minWidth: 180 }}>
                  <TrendingUp style={{ width: 13, height: 13, color: 'var(--brand)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Salary Range</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{salaryInsight.label}</div>
                  </div>
                </div>
              )}
              {missingSkillsInsight.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', borderRadius: 'var(--radius-xs)', padding: '8px 12px', flex: 2, minWidth: 200 }}>
                  <Zap style={{ width: 13, height: 13, color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Skill Gaps to Close</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {missingSkillsInsight.map(sk => (
                        <span key={sk} style={{ fontSize: 10, fontWeight: 600, color: '#dc2626', background: '#fee2e2', borderRadius: 4, padding: '2px 7px' }}>{sk}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {topIndustries.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(243,108,33,0.06)', borderRadius: 'var(--radius-xs)', padding: '8px 12px', flex: 2, minWidth: 200 }}>
                  <BarChart2 style={{ width: 13, height: 13, color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Your Industry Interests</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {topIndustries.map(ind => (
                        <Link key={ind.name} to="/jobs" search={{ search: ind.name }} style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'rgba(243,108,33,0.12)', borderRadius: 4, padding: '2px 7px', textDecoration: 'none' }}>
                          {ind.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 5. Bottom 3-column grid ────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, alignItems: 'start' }}>

          {/* Col 1: Application Funnel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Application Funnel</span>
            </div>
            {totalApps === 0 ? (
              <p style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'12px 0' }}>Start applying to see your funnel</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {statusFunnelOrder.map(key => {
                  const pill = STATUS_PILL[key];
                  const count = statusCounts[key] ?? 0;
                  const pct = Math.round((count / maxFunnelCount) * 100);
                  return (
                    <div key={key}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:11, fontWeight:600, color:'var(--ink)' }}>{pill.label}</span>
                        <span style={{ fontSize:11, color:'var(--muted)' }}>{count}</span>
                      </div>
                      <div style={{ height:5, borderRadius:999, background:'var(--line)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:999, background:pill.color, width: `${pct}%`, transition:'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Col 2: Interview History */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Interview History</span>
              <Link to="/interview/setup" style={{ fontSize:12, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>New →</Link>
            </div>
            {interviews === null ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'16px 0' }}><Loader2 className="size-4 animate-spin" style={{ color:'var(--accent)' }} /></div>
            ) : interviews.length === 0 ? (
              <p style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'12px 0' }}>No sessions yet</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {interviews.slice(0,5).map(iv => {
                  const initials = iv.role_title.slice(0,2).toUpperCase();
                  return (
                    <div key={iv.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:'rgba(33,31,96,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:700, color:'var(--brand)' }}>{initials}</div>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{iv.role_title}</div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>{iv.interview_type} · {formatDate(iv.created_at)}</div>
                      </div>
                      {iv.status === 'completed' && iv.overall_score !== null ? (
                        <span style={{ fontSize:11, fontWeight:600, color:'#15803d', background:'#dcfce7', borderRadius:'var(--radius-xs)', padding:'2px 6px', whiteSpace:'nowrap' }}>{iv.overall_score}</span>
                      ) : (
                        <a href={`/interview-room.html?session=${iv.id}`} style={{ fontSize:10, fontWeight:600, color:'var(--accent)', textDecoration:'none', whiteSpace:'nowrap' }}>Continue →</a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Col 3: AI Tools 2×3 grid */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>AI Tools</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {AI_TOOLS.map(({ icon: Icon, label, desc, href, bg, color }) => (
                <Link key={label} to={href as any} style={{ display:'flex', flexDirection:'column', gap:4, padding:'10px 10px', borderRadius:'var(--radius-sm)', background:'var(--base)', border:'1px solid var(--line)', textDecoration:'none', transition:'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--base)')}>
                  <div style={{ width:28, height:28, borderRadius:7, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon style={{ width:13, height:13, color }} />
                  </div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--ink)', lineHeight:1.2 }}>{label}</div>
                  <div style={{ fontSize:10, color:'var(--muted)' }}>{desc}</div>
                </Link>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}

// ── Application Analytics Card ────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Applied:     "#6366f1",
  Shortlisted: "#f59e0b",
  Interview:   "#3b82f6",
  KIV:         "#8b5cf6",
  Offered:     "#10b981",
  Hired:       "#059669",
  Placed:      "#059669",
  Rejected:    "#ef4444",
};

function ApplicationAnalyticsCard({ applications }: { applications: ApplicationRow[] }) {
  const stats = useMemo(() => {
    if (applications.length === 0) return null;

    // Status counts
    const statusCounts: Record<string, number> = {};
    applications.forEach((a) => {
      const s = a.status ?? "Applied";
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    });
    const chartData = Object.entries(statusCounts).map(([name, count]) => ({ name, count }));

    // Response rate: statuses beyond "Applied" = responded
    const responded = applications.filter((a) => a.status && a.status !== "Applied").length;
    const responseRate = Math.round((responded / applications.length) * 100);

    // Most applied industries (from job_title heuristics)
    const titleCounts: Record<string, number> = {};
    applications.forEach((a) => {
      if (a.company_name) {
        titleCounts[a.company_name] = (titleCounts[a.company_name] ?? 0) + 1;
      }
    });
    const topCompanies = Object.entries(titleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Average response time
    let avgDays: number | null = null;
    const withHistory = applications.filter(
      (a) => a.status_history && a.status_history.length > 0
    );
    if (withHistory.length > 0) {
      const totalDays = withHistory.reduce((sum, a) => {
        const first = a.status_history![0];
        const daysDiff = Math.round(
          (new Date(first.changed_at ?? a.created_at).getTime() - new Date(a.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return sum + Math.max(0, daysDiff);
      }, 0);
      avgDays = Math.round(totalDays / withHistory.length);
    }

    return { chartData, responseRate, topCompanies, avgDays };
  }, [applications]);

  if (applications.length === 0) {
    return (
      <div style={{ marginTop: 40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Application Analytics</h2>
        </div>
        <div style={{ borderRadius: 'var(--radius-md)', padding: '32px', textAlign: 'center', border: '2px dashed var(--line-strong)', background: 'rgba(33,31,96,0.03)' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Start applying to track your progress</p>
          <Link to="/jobs" style={{ display:'inline-block', marginTop:12, fontSize:13, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>Browse Jobs →</Link>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Application Analytics</h2>
      </div>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
        {/* Summary stats */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 16 }}>Summary</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total Applications</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{applications.length}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Response Rate</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{stats.responseRate}%</span>
            </div>
            {stats.avgDays !== null && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Avg. Response Time</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{stats.avgDays}d</span>
              </div>
            )}
          </div>
          {stats.topCompanies.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginTop: 20, marginBottom: 8 }}>Top Employers Applied</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {stats.topCompanies.map((c) => (
                  <div key={c.name} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color: 'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{c.name}</span>
                    <span style={{ fontWeight:700, color:'var(--ink)' }}>{c.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bar chart */}
        <div style={{ gridColumn: 'span 2', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 16 }}>Applications by Status</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.chartData} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(33,31,96,0.04)' }}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.chartData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? 'var(--brand)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:6 }}>
            {stats.chartData.map((d) => (
              <span key={d.name} style={{ display:'inline-flex', alignItems:'center', gap:4, borderRadius:'var(--radius-xs)', padding:'2px 8px', fontSize:10, fontWeight:600, border:'1px solid var(--line)', color:'var(--ink)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background: STATUS_COLORS[d.name] ?? 'var(--brand)', flexShrink:0 }} />
                {d.name}: {d.count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsDetail({ data, score }: { data: Record<string, unknown> | null; score: number }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No detailed results stored for this analysis.</p>;
  }

  const sections: { key: string; label: string }[] = [
    { key: "structure", label: "Structure" },
    { key: "keywords", label: "Keywords" },
    { key: "language_balance", label: "Language Balance" },
    { key: "malaysia_market_fit", label: "Malaysia Market Fit" },
  ];

  const priority = (data as any).priority_improvements as string[] | undefined;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
        <div style={{ fontSize:36, fontWeight:700, color:'var(--brand)', letterSpacing:'-0.04em' }}>{score}</div>
        <div style={{ fontSize:13, color:'var(--muted)' }}>overall score</div>
      </div>

      <div style={{ display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))' }}>
        {sections.map((s) => {
          const v = (data as any)[s.key];
          if (!v || typeof v !== "object") return null;
          return (
            <div key={s.key} style={{ borderRadius:'var(--radius-sm)', padding:12, border:'1px solid var(--line)', background:'var(--base)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{s.label}</div>
                {typeof v.score === "number" && (
                  <span style={{ fontSize:11, fontWeight:700, borderRadius:'var(--radius-xs)', padding:'2px 7px', background: v.score >= 80 ? '#dcfce7' : v.score >= 60 ? '#fef3c7' : '#fee2e2', color: v.score >= 80 ? '#15803d' : v.score >= 60 ? '#92400e' : '#dc2626' }}>{v.score}</span>
                )}
              </div>
              {Array.isArray(v.present_keywords) && v.present_keywords.length > 0 && (
                <KeywordList label="Present" items={v.present_keywords} tone="ok" />
              )}
              {Array.isArray(v.missing_keywords) && v.missing_keywords.length > 0 && (
                <KeywordList label="Missing" items={v.missing_keywords} tone="warn" />
              )}
              {Array.isArray(v.feedback) && v.feedback.length > 0 && (
                <ul style={{ marginTop:8, paddingLeft:20, display:'flex', flexDirection:'column', gap:3, fontSize:13, color:'var(--muted)' }}>
                  {v.feedback.map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {Array.isArray(priority) && priority.length > 0 && (
        <div style={{ borderRadius:'var(--radius-sm)', padding:12, border:'1px solid var(--line)', background:'var(--base)' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Priority Improvements</div>
          <ul style={{ marginTop:8, paddingLeft:20, display:'flex', flexDirection:'column', gap:4, fontSize:13, color:'var(--muted)' }}>
            {priority.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function KeywordList({ label, items, tone }: { label: string; items: string[]; tone: "ok" | "warn" }) {
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ fontSize:11, color:'var(--muted)' }}>{label}</div>
      <div style={{ marginTop:4, display:'flex', flexWrap:'wrap', gap:4 }}>
        {items.map((k, i) => (
          <span key={i} style={{ fontSize:11, fontWeight:600, borderRadius:'var(--radius-xs)', padding:'2px 7px', background: tone === 'ok' ? '#dcfce7' : '#fef3c7', color: tone === 'ok' ? '#15803d' : '#92400e' }}>{k}</span>
        ))}
      </div>
    </div>
  );
}