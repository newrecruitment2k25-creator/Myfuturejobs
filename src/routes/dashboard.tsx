import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronDown, FileText, Loader2, Video, Clock, CheckCircle2, Circle, Mail, Building2, CalendarClock, Briefcase, MapPin, Brain, Search, ArrowRight, Sparkles, History, BarChart2, Star, BookOpen, LinkedinIcon, TrendingUp, Zap, Bookmark, Award, Target, Rocket, Calendar, Activity, Gift, Medal, Flame, Trophy, Lightbulb, Users2, GraduationCap, PieChart, Play } from "lucide-react";
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
      { title: "Dashboard — PerksoPrax AI" },
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
      <main style={{ flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── 1. Hero Welcome Banner ─────────────────────────────────────── */}
        <div style={{
          borderRadius: 20, padding: 0, overflow: 'hidden', position: 'relative',
          boxShadow: '0 8px 32px rgba(10,38,71,0.12)',
          background: 'linear-gradient(120deg, #0A2647 0%, #144272 40%, #1B4D8A 70%, #205295 100%)',
        }}>
          {/* Decorative mesh */}
          <div style={{ position: 'absolute', right: -60, top: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(243,108,33,0.15) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', left: -30, bottom: -80, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', right: 200, top: 20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

          {/* Top accent line */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #f36c21 0%, #ff8c42 50%, transparent 100%)' }} />

          <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 10, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 8px #4ade80' }} />
                Job Seeker Portal
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.035em', margin: 0, lineHeight: 1.1 }}>
                {greeting}, {displayName}
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6, fontWeight: 400 }}>{user?.email}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
              <Link to="/jobs" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:12, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none', transition: 'all 0.2s', backdropFilter: 'blur(4px)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.16)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
              >
                <Search style={{ width: 14, height: 14 }} /> Browse Jobs
              </Link>
              <Link to="/my-cv" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:12, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none', transition: 'all 0.2s', backdropFilter: 'blur(4px)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.16)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
              >
                <FileText style={{ width: 14, height: 14 }} /> My CV
              </Link>
              <Link to="/analyze" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:12, background:'linear-gradient(135deg, #f36c21 0%, #ff8c42 100%)', color:'#fff', fontSize:13, fontWeight:700, textDecoration:'none', boxShadow: '0 4px 16px rgba(243,108,33,0.35)', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(243,108,33,0.45)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(243,108,33,0.35)'; }}
              >
                <FileText style={{ width: 14, height: 14 }} /> Analyse CV
              </Link>
            </div>
          </div>
        </div>

        {/* ── 2. Stat Cards — new design with top accent bar ─────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {[
            { label: 'Total Applications', value: totalApps,        accent: '#205295', iconBg: 'rgba(32,82,149,0.1)',  iconColor: '#205295',      Icon: Briefcase },
            { label: 'Hired / Offered',    value: hiredOffered,     accent: '#15803d', iconBg: '#dcfce7',              iconColor: '#15803d',      Icon: CheckCircle2 },
            { label: 'Saved Jobs',         value: savedJobs?.length ?? 0, accent: '#d97706', iconBg: '#fef3c7',              iconColor: '#d97706',      Icon: Bookmark },
            { label: 'CV Analyses',        value: totalAnalyses,    accent: '#f36c21', iconBg: 'rgba(243,108,33,0.1)', iconColor: '#f36c21',      Icon: FileText },
          ].map(({ label, value, accent, iconBg, iconColor, Icon }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, transition: 'all 0.25s', boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(10,38,71,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = `${accent}30`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(10,38,71,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; }}
            >
              <div style={{ height: 3, background: `linear-gradient(90deg, ${accent} 0%, ${accent}80 100%)` }} />
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${accent}15` }}>
                  <Icon style={{ width: 22, height: 22, color: iconColor }} />
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 600, letterSpacing: '0.01em' }}>{label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 2c. Profile Completion + Quick Insights Strip ─────────────── */}
        {(() => {
          const checks = [
            { label: 'CV Analysis', done: (rows?.length ?? 0) > 0, icon: FileText, href: '/analyze' },
            { label: 'Job Applications', done: (applications?.length ?? 0) > 0, icon: Briefcase, href: '/jobs' },
            { label: 'Saved Jobs', done: (savedJobs?.length ?? 0) > 0, icon: Bookmark, href: '/jobs' },
            { label: 'Skills Passport', done: !!pocProfile?.skills, icon: Star, href: '/skills-passport' },
            { label: 'PERKESO Linked', done: !!pocProfile, icon: Building2, href: '/my-cv' },
          ];
          const doneCount = checks.filter(c => c.done).length;
          const pct = Math.round((doneCount / checks.length) * 100);
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Profile Completion */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
                <div style={{ height: 3, background: `linear-gradient(90deg, #205295 0%, #4a90d9 100%)` }} />
                <div style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(32,82,149,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(32,82,149,0.12)' }}>
                        <Target style={{ width: 16, height: 16, color: '#205295' }} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Profile Completion</span>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 900, color: '#205295', letterSpacing: '-0.03em' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #205295 0%, #4a90d9 100%)', width: `${pct}%`, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {checks.map(c => (
                      <Link key={c.label} to={c.href as any} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, textDecoration: 'none', padding: '5px 12px', borderRadius: 20, transition: 'all 0.15s', ...(c.done ? { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' } : { background: 'var(--base)', color: 'var(--muted)', border: '1px solid var(--line)' }) }}>
                        {c.done ? <CheckCircle2 style={{ width: 12, height: 12 }} /> : <Circle style={{ width: 12, height: 12 }} />}
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Career Insights Mini */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
                <div style={{ height: 3, background: `linear-gradient(90deg, #f36c21 0%, #ff8c42 100%)` }} />
                <div style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(243,108,33,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(243,108,33,0.12)' }}>
                      <Rocket style={{ width: 16, height: 16, color: '#f36c21' }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Career Insights</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 12, background: 'rgba(32,82,149,0.06)', border: '1px solid rgba(32,82,149,0.08)' }}>
                      <TrendingUp style={{ width: 16, height: 16, color: '#205295', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#205295', lineHeight: 1 }}>{topIndustries.length}</div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3, fontWeight: 600 }}>Industries</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 12, background: 'rgba(243,108,33,0.06)', border: '1px solid rgba(243,108,33,0.08)' }}>
                      <Zap style={{ width: 16, height: 16, color: '#f36c21', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#f36c21', lineHeight: 1 }}>{missingSkillsInsight.length}</div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3, fontWeight: 600 }}>Skill Gaps</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 12, background: 'rgba(21,128,61,0.06)', border: '1px solid rgba(21,128,61,0.08)' }}>
                      <Award style={{ width: 16, height: 16, color: '#15803d', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#15803d', lineHeight: 1 }}>{hiredOffered}</div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3, fontWeight: 600 }}>Offers</div>
                    </div>
                  </div>
                  {salaryInsight && (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(32,82,149,0.06)', border: '1px solid rgba(32,82,149,0.08)' }}>
                      <PieChart style={{ width: 14, height: 14, color: '#205295' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>Salary Range:</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#205295' }}>{salaryInsight.label}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        {pocProfile && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, overflow: 'hidden', boxShadow: '0 2px 8px rgba(10,38,71,0.04)' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #205295 0%, #0A2647 100%)' }} />
            <div style={{ padding: '18px 22px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #0A2647 0%, #205295 100%)', fontSize: 13, fontWeight: 900, color: '#fff', boxShadow: '0 2px 8px rgba(10,38,71,0.2)' }}>MY</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>PERKESO Profile — {pocProfile.candidate_id}</div>
                  {pocProfile.preferred_occupation && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{pocProfile.preferred_occupation}</div>}
                  {pocProfile.education_level && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{pocProfile.education_level}</div>}
                </div>
              </div>
              {pocBehaviour && (
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Applications', value: pocBehaviour.total_applications },
                    { label: 'Interviews',   value: pocBehaviour.total_interviews },
                    { label: 'Offers',       value: pocBehaviour.total_offers },
                    { label: 'Sign-ins',     value: pocBehaviour.sign_in_count },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#f36c21', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, fontWeight: 600 }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}
              {pocProfile.skills && (
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Skills from PERKESO</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {pocProfile.skills.split(/[,;|]+/).slice(0, 8).map((s: string) => s.trim()).filter(Boolean).map((s: string) => (
                      <span key={s} style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(32,82,149,0.08)', fontSize: 11, color: '#205295', fontWeight: 600, border: '1px solid rgba(32,82,149,0.12)' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 3. Main 2-column grid ──────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>

          {/* Left: Applications with Stepper */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(32,82,149,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(32,82,149,0.12)' }}>
                  <Briefcase style={{ width: 16, height: 16, color: '#205295' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>My Applications</span>
              </div>
              {applications && applications.length > 5 && (
                <button
                  onClick={() => setExpanded(expanded === '__all_apps__' ? null : '__all_apps__')}
                  style={{ fontSize: 12, fontWeight: 600, color: '#f36c21', background: 'rgba(243,108,33,0.08)', border: '1px solid rgba(243,108,33,0.15)', borderRadius: 8, cursor: 'pointer', padding: '5px 12px', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(243,108,33,0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(243,108,33,0.08)'; }}
                >
                  {expanded === '__all_apps__' ? 'Show less ↑' : `View all (${applications.length}) →`}
                </button>
              )}
            </div>
            <div style={{ padding: '16px 22px' }}>
            {applications === null ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'24px 0' }}><Loader2 className="size-5 animate-spin" style={{ color: '#f36c21' }} /></div>
            ) : applications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '1px solid var(--line)' }}>
                  <Briefcase style={{ width: 26, height: 26, color: 'var(--line-strong)' }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>No applications yet</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>Start your job search today</p>
                <Link to="/jobs" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:'#fff', background:'linear-gradient(135deg, #f36c21 0%, #ff8c42 100%)', borderRadius:10, padding:'8px 18px', textDecoration:'none', boxShadow:'0 2px 10px rgba(243,108,33,0.25)' }}>
                  <Search style={{ width: 12, height: 12 }} /> Browse Jobs
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(expanded === '__all_apps__' ? applications : applications.slice(0, 5)).map((app) => {
                  const initials = (app.company_name ?? 'J').slice(0, 2).toUpperCase();
                  const lastNote = app.status_history?.at(-1)?.notes;
                  return (
                    <div key={app.id} style={{ borderRadius: 14, border: '1px solid var(--line)', padding: '14px 16px', background: 'var(--base)', transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(32,82,149,0.3)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(10,38,71,0.04)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                    >
                      {/* Top row: avatar + title + date */}
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                        <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg, rgba(32,82,149,0.12) 0%, rgba(10,38,71,0.08) 100%)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, fontWeight:800, color:'#205295', border:'1px solid rgba(32,82,149,0.1)' }}>{initials}</div>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{app.job_title ?? 'Unknown Job'}</div>
                          <div style={{ fontSize:11, color:'var(--muted)', marginTop: 2 }}>{app.company_name ?? ''}{app.location ? ` · ${app.location}` : ''}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                          <span style={{ fontSize:10, color:'var(--muted)', whiteSpace:'nowrap' }}>{formatDate(app.created_at)}</span>
                          <Link to="/application/$applicationId" params={{ applicationId: app.id }} style={{ fontSize:11, fontWeight:700, color:'#f36c21', textDecoration:'none', padding: '3px 8px', borderRadius: 6, background: 'rgba(243,108,33,0.08)' }}>View</Link>
                        </div>
                      </div>
                      {/* Status stepper */}
                      <AppStatusStepper status={app.status as any} />
                      {/* Status note */}
                      {lastNote && (
                        <div style={{ marginTop:8, fontSize:10, color:'var(--muted)', background:'rgba(32,82,149,0.05)', borderRadius:8, padding:'5px 10px', border:'1px solid rgba(32,82,149,0.06)' }}>{lastNote}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>

          {/* Right: Recent CV Analyses + Saved Jobs stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Recent CV Analyses */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(243,108,33,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(243,108,33,0.12)' }}>
                    <FileText style={{ width: 15, height: 15, color: '#f36c21' }} />
                  </div>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>Recent CV Analyses</span>
                </div>
                <Link to="/analyze" style={{ fontSize:12, fontWeight:600, color:'#f36c21', textDecoration:'none' }}>Analyse →</Link>
              </div>
              <div style={{ padding: '14px 18px' }}>
              {rows === null ? (
                <div style={{ display:'flex', justifyContent:'center', padding:'16px 0' }}><Loader2 className="size-4 animate-spin" style={{ color: '#f36c21' }} /></div>
              ) : rows.length === 0 ? (
                <p style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'16px 0' }}>No analyses yet</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {rows.slice(0,4).map(r => {
                    const sc = r.overall_score;
                    const scColor = sc >= 80 ? '#15803d' : sc >= 60 ? '#d97706' : '#dc2626';
                    const scBg   = sc >= 80 ? '#dcfce7' : sc >= 60 ? '#fef3c7' : '#fee2e2';
                    return (
                      <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:12, background:scBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13, fontWeight:900, color:scColor, border: `1px solid ${scColor}15` }}>{sc}</div>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', textTransform:'capitalize', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.industry} · {r.company_type}</div>
                          <div style={{ fontSize:10, color:'var(--muted)', marginTop: 2 }}>{formatDate(r.created_at)}</div>
                        </div>
                        <Link to="/results" search={{ id: r.id }} style={{ fontSize:10, fontWeight:700, color:'#f36c21', textDecoration:'none', whiteSpace:'nowrap', padding: '3px 8px', borderRadius: 6, background: 'rgba(243,108,33,0.08)' }}>View →</Link>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </div>

            {/* Saved Jobs */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(243,108,33,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(243,108,33,0.12)' }}>
                    <Bookmark style={{ width: 15, height: 15, color: '#f36c21' }} />
                  </div>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>Saved Jobs</span>
                </div>
                <Link to="/jobs" style={{ fontSize:12, fontWeight:600, color:'#f36c21', textDecoration:'none' }}>Browse →</Link>
              </div>
              <div style={{ padding: '14px 18px' }}>
              {savedJobs === null ? (
                <div style={{ display:'flex', justifyContent:'center', padding:'16px 0' }}><Loader2 className="size-4 animate-spin" style={{ color: '#f36c21' }} /></div>
              ) : savedJobs.length === 0 ? (
                <p style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'16px 0' }}>No saved jobs yet</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {savedJobs.slice(0,5).map(job => (
                    <Link
                      key={job.id}
                      to={job.job_id ? `/jobs/$jobId` : '/jobs'}
                      params={job.job_id ? { jobId: job.job_id } : undefined}
                      search={job.poc_vacancy_id ? { search: job.job_title ?? '' } : undefined}
                      style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', padding: '6px 0', borderBottom: '1px solid var(--line)' }}
                    >
                      <div style={{ width:34, height:34, borderRadius:12, background:'rgba(243,108,33,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'1px solid rgba(243,108,33,0.12)' }}>
                        <Bookmark style={{ width:14, height:14, color:'#f36c21' }} />
                      </div>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{job.job_title ?? 'Unknown Job'}</div>
                        <div style={{ fontSize:10, color:'var(--muted)', marginTop: 2 }}>{job.company_name ?? ''}{job.location ? ` · ${job.location}` : ''}</div>
                      </div>
                      <ArrowRight style={{ width:12, height:12, color:'#f36c21', flexShrink:0 }} />
                    </Link>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Personalised "For You" section ─────────────────────────── */}
        {true && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, rgba(243,108,33,0.15) 0%, rgba(243,108,33,0.08) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(243,108,33,0.12)' }}>
                  <Sparkles style={{ width: 18, height: 18, color: '#f36c21' }} />
                </div>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Jobs For You</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 10, fontWeight: 400 }}>Personalised based on your CV, skills & history</span>
                </div>
              </div>
              <Link to="/jobs" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#f36c21', textDecoration: 'none', padding: '6px 14px', borderRadius: 10, background: 'rgba(243,108,33,0.08)', border: '1px solid rgba(243,108,33,0.12)', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(243,108,33,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(243,108,33,0.08)'; }}
              >
                Browse all <ArrowRight style={{ width: 12, height: 12 }} />
              </Link>
            </div>

            <div style={{ padding: '18px 22px' }}>
            {recommendedJobs === null ? (
              <div style={{ display: 'flex', gap: 14 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ flex: 1, height: 110, borderRadius: 14, background: 'var(--base)', border: '1px solid var(--line)', animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            ) : recommendedJobs.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', borderRadius: 14, background: 'var(--base)', border: '1px dashed var(--line)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(243,108,33,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '1px solid rgba(243,108,33,0.1)' }}>
                  <Brain style={{ width: 28, height: 28, color: '#f36c21', opacity: 0.6 }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>Analyse your CV to get job recommendations</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 16px' }}>We'll match jobs from 5,800+ PERKESO vacancies based on your skills and role.</p>
                <Link to="/analyze" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #f36c21 0%, #ff8c42 100%)', borderRadius: 10, padding: '10px 22px', textDecoration: 'none', boxShadow: '0 4px 16px rgba(243,108,33,0.3)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(243,108,33,0.4)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(243,108,33,0.3)'; }}
                >
                  <FileText style={{ width: 14, height: 14 }} /> Analyse CV Now
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {recommendedJobs.slice(0, 6).map((job) => {
                  const scoreColor = job.score >= 60 ? '#15803d' : job.score >= 35 ? '#d97706' : 'var(--muted)';
                  const scoreBg = job.score >= 60 ? '#dcfce7' : job.score >= 35 ? '#fef3c7' : 'var(--base)';
                  return (
                    <Link
                      key={job.id}
                      to="/jobs"
                      search={{ search: job.job_title ?? '' }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 18px', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--base)', textDecoration: 'none', transition: 'all 0.25s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(243,108,33,0.4)'; e.currentTarget.style.background = 'rgba(243,108,33,0.02)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(10,38,71,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--base)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, flex: 1 }}>{job.job_title ?? 'Untitled'}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: scoreColor, background: scoreBg, borderRadius: 999, padding: '3px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${scoreColor}15` }}>
                          <Brain style={{ width: 9, height: 9 }} />{job.score}%
                        </span>
                      </div>
                      {job.state && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
                          <MapPin style={{ width: 11, height: 11 }} />{job.state}
                        </span>
                      )}
                      {job.salary && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#205295' }}>{job.salary.startsWith('RM') ? job.salary : `RM ${job.salary}`}</span>
                      )}
                      {job.matchReason && (
                        <span style={{ fontSize: 10, color: '#f36c21', fontWeight: 600, background: 'rgba(243,108,33,0.08)', borderRadius: 8, padding: '4px 10px', border: '1px solid rgba(243,108,33,0.06)' }}>
                          {job.matchReason}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Insight strip: salary + skill gaps + industry interests */}
            <div style={{ display: 'flex', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
              {salaryInsight && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(32,82,149,0.06)', borderRadius: 12, padding: '12px 16px', flex: 1, minWidth: 180, border: '1px solid rgba(32,82,149,0.08)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(32,82,149,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(32,82,149,0.12)' }}>
                    <TrendingUp style={{ width: 16, height: 16, color: '#205295' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Salary Range</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>{salaryInsight.label}</div>
                  </div>
                </div>
              )}
              {missingSkillsInsight.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fef2f2', borderRadius: 12, padding: '12px 16px', flex: 2, minWidth: 200, border: '1px solid #fee2e2' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap style={{ width: 16, height: 16, color: '#dc2626' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Skill Gaps to Close</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {missingSkillsInsight.map(sk => (
                        <span key={sk} style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fee2e2', borderRadius: 8, padding: '3px 10px', border: '1px solid #fecaca' }}>{sk}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {topIndustries.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(243,108,33,0.06)', borderRadius: 12, padding: '12px 16px', flex: 2, minWidth: 200, border: '1px solid rgba(243,108,33,0.08)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(243,108,33,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(243,108,33,0.12)' }}>
                    <BarChart2 style={{ width: 16, height: 16, color: '#f36c21' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#f36c21', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Your Industry Interests</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {topIndustries.map(ind => (
                        <Link key={ind.name} to="/jobs" search={{ search: ind.name }} style={{ fontSize: 10, fontWeight: 700, color: '#f36c21', background: 'rgba(243,108,33,0.12)', borderRadius: 8, padding: '3px 10px', textDecoration: 'none', border: '1px solid rgba(243,108,33,0.1)' }}>
                          {ind.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        )}

        {/* ── 5. Bottom 2-column grid ────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

          {/* Col 1: Application Funnel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(32,82,149,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(32,82,149,0.12)' }}>
                  <BarChart2 style={{ width: 15, height: 15, color: '#205295' }} />
                </div>
                <span style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>Application Funnel</span>
              </div>
            </div>
            <div style={{ padding: '16px 18px' }}>
            {totalApps === 0 ? (
              <p style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'20px 0' }}>Start applying to see your funnel</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {statusFunnelOrder.map(key => {
                  const pill = STATUS_PILL[key];
                  const count = statusCounts[key] ?? 0;
                  const pct = Math.round((count / maxFunnelCount) * 100);
                  return (
                    <div key={key}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--ink)' }}>{pill.label}</span>
                        <span style={{ fontSize:12, fontWeight: 800, color: pill.color }}>{count}</span>
                      </div>
                      <div style={{ height:7, borderRadius:999, background:'var(--line)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:999, background:`linear-gradient(90deg, ${pill.color} 0%, ${pill.color}cc 100%)`, width: `${pct}%`, transition:'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>

          {/* Col 2: AI Tools 2×3 grid */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(243,108,33,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(243,108,33,0.12)' }}>
                  <Sparkles style={{ width: 15, height: 15, color: '#f36c21' }} />
                </div>
                <span style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>AI Tools</span>
              </div>
            </div>
            <div style={{ padding: '14px 18px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {AI_TOOLS.map(({ icon: Icon, label, desc, href, bg, color }) => (
                <Link key={label} to={href as any} style={{ display:'flex', flexDirection:'column', gap:6, padding:'14px 14px', borderRadius:14, background:'var(--base)', border:'1px solid var(--line)', textDecoration:'none', transition:'all 0.25s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}40`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(10,38,71,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border: `1px solid ${color}15` }}>
                    <Icon style={{ width:16, height:16, color }} />
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', lineHeight:1.2 }}>{label}</div>
                  <div style={{ fontSize:10, color:'var(--muted)' }}>{desc}</div>
                </Link>
              ))}
            </div>
            </div>
          </div>

        </div>

        {/* ── 6. Activity Timeline + Achievement Badges ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>

          {/* Activity Timeline */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(32,82,149,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(32,82,149,0.12)' }}>
                  <Activity style={{ width: 16, height: 16, color: '#205295' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Recent Activity</span>
              </div>
            </div>
            <div style={{ padding: '16px 22px' }}>
              {(() => {
                const events: { date: string; type: string; label: string; icon: any; color: string; bg: string }[] = [];
                (applications ?? []).slice(0, 3).forEach(a => events.push({ date: a.created_at, type: 'application', label: `Applied to ${a.job_title ?? 'a job'}`, icon: Briefcase, color: '#205295', bg: 'rgba(32,82,149,0.1)' }));
                (rows ?? []).slice(0, 2).forEach(r => events.push({ date: r.created_at, type: 'analysis', label: `CV Analysis scored ${r.overall_score}`, icon: FileText, color: '#f36c21', bg: 'rgba(243,108,33,0.1)' }));
                (savedJobs ?? []).slice(0, 2).forEach(s => events.push({ date: s.created_at, type: 'saved', label: `Saved ${s.job_title ?? 'a job'}`, icon: Bookmark, color: '#d97706', bg: '#fef3c7' }));
                events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const timeline = events.slice(0, 7);

                if (timeline.length === 0) {
                  return <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>No recent activity yet. Start by browsing jobs or analysing your CV.</p>;
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                    {timeline.map((ev, i) => (
                      <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < timeline.length - 1 ? 18 : 0, position: 'relative' }}>
                        {i < timeline.length - 1 && <div style={{ position: 'absolute', left: 17, top: 36, bottom: 0, width: 2, background: 'var(--line)' }} />}
                        <div style={{ width: 36, height: 36, borderRadius: 12, background: ev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${ev.color}15`, zIndex: 1 }}>
                          <ev.icon style={{ width: 16, height: 16, color: ev.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{formatDate(ev.date)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Achievement Badges */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, rgba(243,108,33,0.15) 0%, rgba(243,108,33,0.08) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(243,108,33,0.12)' }}>
                <Trophy style={{ width: 16, height: 16, color: '#f36c21' }} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Achievements</span>
            </div>
            <div style={{ padding: '16px 22px' }}>
              {(() => {
                const badges = [
                  { label: 'First Steps', desc: 'Created account', icon: Rocket, earned: true, color: '#205295', bg: 'rgba(32,82,149,0.1)' },
                  { label: 'Job Hunter', desc: 'Applied to 1+ jobs', icon: Briefcase, earned: (totalApps) > 0, color: '#1d4ed8', bg: '#dbeafe' },
                  { label: 'CV Pro', desc: 'Analysed CV', icon: FileText, earned: totalAnalyses > 0, color: '#7c3aed', bg: '#ede9fe' },
                  { label: 'Bookmarker', desc: 'Saved 1+ jobs', icon: Bookmark, earned: (savedJobs?.length ?? 0) > 0, color: '#d97706', bg: '#fef3c7' },
                  { label: 'Rising Star', desc: 'Got an offer', icon: Star, earned: hiredOffered > 0, color: '#15803d', bg: '#dcfce7' },
                  { label: 'Profile Complete', desc: '100% profile', icon: Medal, earned: false, color: '#f36c21', bg: 'rgba(243,108,33,0.1)' },
                ];
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {badges.map(b => (
                      <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, padding: '14px 8px', borderRadius: 14, border: '1px solid var(--line)', transition: 'all 0.2s', ...(b.earned ? { background: b.bg, borderColor: `${b.color}20` } : { background: 'var(--base)', opacity: 0.45 }) }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: b.earned ? b.bg : 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${b.color}15` }}>
                          {b.earned ? <b.icon style={{ width: 20, height: 20, color: b.color }} /> : <Circle style={{ width: 20, height: 20, color: 'var(--line-strong)' }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: b.earned ? 'var(--ink)' : 'var(--muted)' }}>{b.label}</div>
                          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{b.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── 7. Upcoming Events + Market Pulse ─────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

          {/* Upcoming Events */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(220,38,38,0.1)' }}>
                  <Calendar style={{ width: 16, height: 16, color: '#dc2626' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Upcoming Events</span>
              </div>
              <Link to="/events" style={{ fontSize: 12, fontWeight: 600, color: '#f36c21', textDecoration: 'none' }}>View all →</Link>
            </div>
            <div style={{ padding: '16px 22px' }}>
              {(() => {
                const mockEvents = [
                  { title: 'Career Fair 2025', date: '15 Jul 2025', location: 'Kuala Lumpur Convention Centre', type: 'Career Fair', icon: Users2, color: '#205295', bg: 'rgba(32,82,149,0.08)' },
                  { title: 'Resume Workshop', date: '22 Jul 2025', location: 'Online via Zoom', type: 'Workshop', icon: GraduationCap, color: '#7c3aed', bg: '#ede9fe' },
                  { title: 'Tech Industry Talk', date: '30 Jul 2025', location: 'Bangsar South', type: 'Talk', icon: Lightbulb, color: '#d97706', bg: '#fef3c7' },
                ];
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {mockEvents.map((ev, i) => (
                      <Link key={i} to="/events" style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--base)', textDecoration: 'none', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${ev.color}30`; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(10,38,71,0.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: ev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${ev.color}15` }}>
                          <ev.icon style={{ width: 20, height: 20, color: ev.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{ev.title}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: ev.color, background: ev.bg, borderRadius: 20, padding: '2px 8px', border: `1px solid ${ev.color}15` }}>{ev.type}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--muted)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar style={{ width: 11, height: 11 }} />{ev.date}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 11, height: 11 }} />{ev.location}</span>
                          </div>
                        </div>
                        <ArrowRight style={{ width: 14, height: 14, color: 'var(--muted)', flexShrink: 0, alignSelf: 'center' }} />
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Market Pulse */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 0, boxShadow: '0 2px 8px rgba(10,38,71,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(107,70,193,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(107,70,193,0.1)' }}>
                  <BarChart2 style={{ width: 16, height: 16, color: '#6b46c1' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Market Pulse</span>
              </div>
              <Link to="/labour-insights" style={{ fontSize: 12, fontWeight: 600, color: '#f36c21', textDecoration: 'none' }}>Explore →</Link>
            </div>
            <div style={{ padding: '16px 22px' }}>
              {(() => {
                const stats = [
                  { label: 'Active Vacancies', value: '5,828', trend: '+12%', trendUp: true, icon: Briefcase, color: '#205295', bg: 'rgba(32,82,149,0.08)' },
                  { label: 'Avg. Salary (IT)', value: 'RM 4.5k', trend: '+8%', trendUp: true, icon: TrendingUp, color: '#15803d', bg: '#dcfce7' },
                  { label: 'Hot Sector', value: 'Tech', trend: 'High demand', trendUp: true, icon: Flame, color: '#dc2626', bg: '#fee2e2' },
                  { label: 'Top Hiring State', value: 'Selangor', trend: '1,920 jobs', trendUp: true, icon: MapPin, color: '#d97706', bg: '#fef3c7' },
                ];
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {stats.map(s => (
                      <div key={s.label} style={{ padding: '14px 14px', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--base)', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${s.color}30`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${s.color}15` }}>
                            <s.icon style={{ width: 14, height: 14, color: s.color }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: s.trendUp ? '#15803d' : '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <TrendingUp style={{ width: 10, height: 10 }} />{s.trend}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

        </div>

        {/* ── 8. Quick Links Strip ──────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg, rgba(10,38,71,0.03) 0%, rgba(32,82,149,0.03) 100%)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Links:</span>
          {[
            { label: 'Browse Jobs', href: '/jobs', icon: Search },
            { label: 'Analyse CV', href: '/analyze', icon: FileText },
            { label: 'My CV', href: '/my-cv', icon: BookOpen },
            { label: 'Skills Passport', href: '/skills-passport', icon: Star },
            { label: 'Career Pathway', href: '/career-pathway', icon: MapPin },
            { label: 'Labour Insights', href: '/labour-insights', icon: BarChart2 },
            { label: 'Recommended Jobs', href: '/recommended-jobs', icon: Sparkles },
            { label: 'Guided Demo', href: '/demo', icon: Play },
          ].map(l => (
            <Link key={l.label} to={l.href as any} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none', padding: '7px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--line)', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#f36c21'; (e.currentTarget as HTMLElement).style.color = '#f36c21'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; }}
            >
              <l.icon style={{ width: 13, height: 13 }} />{l.label}
            </Link>
          ))}
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