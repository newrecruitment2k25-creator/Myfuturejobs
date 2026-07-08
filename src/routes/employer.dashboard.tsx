import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Briefcase, Edit, X, Video, Users, Brain, Sparkles, BarChart2, Calendar, MapPin, Clock, MessageSquare, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getEmployerApplications, updateApplicationStatus, sendAiInterviewInvitation, schedulePracticalInterview, type AppStatus } from "@/lib/ops-api";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/employer/dashboard")({
  ssr: false,
  component: EmployerDashboardPage,
  head: () => ({
    meta: [
      { title: "Employer Dashboard — MYFutureJobs" },
      { name: "description", content: "Post jobs and manage your listings." },
    ],
  }),
});

type JobRow = {
  id: string;
  created_at: string;
  job_title: string;
  company_name: string;
  employer_type: string;
  location: string;
  status: string;
  industry: string;
  description: string;
  requirements: string;
};

const EMPLOYER_TYPES = ["GLC", "MNC", "Local", "Government"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function EmployerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [checkingRole, setCheckingRole] = useState(true);
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingJob, setEditingJob] = useState<JobRow | null>(null);

  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [employerType, setEmployerType] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");

  // Applications state
  const [applications, setApplications] = useState<any[] | null>(null);
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("All");
  const [appSortBy, setAppSortBy] = useState<string>("recent");

  // Interview options panel state
  const [interviewTemplates, setInterviewTemplates] = useState<{ id: string; title: string; role_title: string | null }[]>([]);
  const [interviewPanel, setInterviewPanel] = useState<{ open: boolean; applicationId: string; jobTitle: string } | null>(null);
  const [interviewMode, setInterviewMode] = useState<"ai" | "practical" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [practicalDate, setPracticalDate] = useState("");
  const [practicalTime, setPracticalTime] = useState("");
  const [practicalLocation, setPracticalLocation] = useState("");
  const [practicalMode, setPracticalMode] = useState<"in_person" | "online">("in_person");
  const [practicalNotes, setPracticalNotes] = useState("");
  const [sendingInterview, setSendingInterview] = useState(false);

  // Auth + role gate
  useEffect(() => {
    if (authLoading) return;
    if (!user) { void navigate({ to: "/employer/login" }); return; }
    (async () => {
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role === "job_seeker") {
        toast.info("Redirected to your jobseeker dashboard");
        void navigate({ to: "/dashboard" });
        return;
      }
      if (profile?.role !== "employer") {
        void navigate({ to: "/employer/login" });
        return;
      }
      setCheckingRole(false);
    })();
  }, [authLoading, user, navigate]);

  const loadJobs = async () => {
    if (!user) return;
    try {
      const { data, error: err } = await supabase
        .from("jobs")
        .select("id, created_at, job_title, company_name, employer_type, location, status, industry, description, requirements")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });
      if (err) { console.warn('[employer] loadJobs error:', err); setJobs([]); return; }
      setJobs((data ?? []) as JobRow[]);
    } catch (e) {
      console.warn('[employer] loadJobs crashed:', e);
      setJobs([]);
    }
  };

  // Load applications via ops-api (service role — bypasses RLS)
  const loadApplications = async () => {
    if (!user) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      console.warn('[employer] No session token yet, retrying in 1s');
      setTimeout(() => void loadApplications(), 1000);
      return;
    }
    try {
      const result = await getEmployerApplications();
      console.log('[ea-dash] API result:', JSON.stringify(result));
      const apps = (result as any)?.applications ?? [];
      console.log('[ea-dash] Applications received:', apps.length);
      setApplications(apps.map((a: any) => ({
        id: a.id,
        user_id: a.user_id,
        created_at: a.created_at,
        status: (a.status ?? 'applied').toLowerCase(),
        job_title: a.job_title,
        candidate_email: a.candidate_email,
        candidate_name: null,
        overall_score: a.overall_score ?? null,
      })));
    } catch (e) {
      console.error('[employer] loadApplications error:', e);
      setApplications([]);
    }
  };

  useEffect(() => {
    if (!checkingRole && user) {
      void loadJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingRole, user]);

  // Load applications once role is confirmed (independent of jobs list)
  useEffect(() => {
    if (!checkingRole && user) void loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingRole, user]);

  const loadInterviewTemplates = async () => {
    if (!user) return;
    try {
      const { data } = await (supabase as any)
        .from("interview_templates")
        .select("id, title, role_title")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });
      setInterviewTemplates((data ?? []) as { id: string; title: string; role_title: string | null }[]);
    } catch (e) {
      console.warn('[employer] loadInterviewTemplates crashed:', e);
      setInterviewTemplates([]);
    }
  };

  const updateAppStatus = async (appId: string, newStatus: string, jobTitle?: string) => {
    try {
      await updateApplicationStatus(appId, newStatus as AppStatus);
      await loadApplications();
      if (newStatus.toLowerCase() === "interview") {
        await loadInterviewTemplates();
        setInterviewPanel({ open: true, applicationId: appId, jobTitle: jobTitle ?? "this position" });
        setInterviewMode(null);
        setSelectedTemplate("");
        setPracticalDate("");
        setPracticalTime("");
        setPracticalLocation("");
        setPracticalMode("in_person");
        setPracticalNotes("");
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update status');
    }
  };

  const submitAiInterview = async () => {
    if (!interviewPanel || !selectedTemplate) return;
    setSendingInterview(true);
    try {
      await sendAiInterviewInvitation(interviewPanel.applicationId, selectedTemplate);
      toast.success("AI interview invitation sent");
      setInterviewPanel(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send invitation");
    } finally {
      setSendingInterview(false);
    }
  };

  const submitPracticalInterview = async () => {
    if (!interviewPanel || !practicalDate || !practicalTime) return;
    setSendingInterview(true);
    try {
      await schedulePracticalInterview(interviewPanel.applicationId, {
        date: practicalDate,
        time: practicalTime,
        location: practicalLocation,
        mode: practicalMode,
        notes: practicalNotes,
      });
      toast.success("Practical interview scheduled");
      setInterviewPanel(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to schedule interview");
    } finally {
      setSendingInterview(false);
    }
  };

  const resetForm = () => {
    setJobTitle(""); setCompanyName(""); setEmployerType("");
    setIndustry(""); setLocation(""); setDescription(""); setRequirements("");
    setEditingJob(null);
  };

  const startEdit = (job: JobRow) => {
    setEditingJob(job);
    setJobTitle(job.job_title);
    setCompanyName(job.company_name);
    setEmployerType(job.employer_type);
    setIndustry(job.industry);
    setLocation(job.location);
    setDescription(job.description);
    setRequirements(job.requirements);
    setShowForm(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!jobTitle || !companyName || !employerType || !industry || !location || !description || !requirements) {
      toast.error("Please fill in all fields."); return;
    }
    setSubmitting(true);
    
    let error;
    if (editingJob) {
      // Update existing job
      const { error: err } = await supabase
        .from("jobs")
        .update({
          job_title: jobTitle,
          company_name: companyName,
          employer_type: employerType,
          industry,
          location,
          description,
          requirements,
        })
        .eq("id", editingJob.id);
      error = err;
      if (!error) toast.success("Job updated!");
    } else {
      // Create new job
      const { error: err } = await supabase.from("jobs").insert({
        employer_id: user.id,
        job_title: jobTitle,
        company_name: companyName,
        employer_type: employerType,
        industry,
        location,
        description,
        requirements,
        status: "open",
      });
      error = err;
      if (!error) toast.success("Job posted!");
    }
    
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    resetForm();
    setShowForm(false);
    void loadJobs();
  };

  if (authLoading || checkingRole) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--base)' }}>
        <Loader2 className="size-6 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      <main>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
          {/* ── Welcome Header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #512ACC 0%, #6B4FD6 60%, #512ACC 100%)', borderRadius: 16, padding: '24px 28px',
            display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24,
            overflow: 'hidden', position: 'relative', boxShadow: '0 4px 20px rgba(81,42,204,0.15)',
          }}>
            <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'absolute', right: 80, bottom: -70, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Employer Portal
              </div>
              <h1 style={{ marginTop: 4, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Recruiter Dashboard</h1>
              <p style={{ marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Manage job postings, candidates, and applications.</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, position: 'relative' }}>
              <Link to="/employer/labour-market-intelligence" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.9)', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'8px 14px', textDecoration:'none', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <BarChart2 className="size-4" /> Market Insights
              </Link>
              <Link to="/employer/vacancy-builder" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.9)', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'8px 14px', textDecoration:'none', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <Sparkles className="size-4" /> Create Job Posting
              </Link>
              <button style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, color:'#fff', background:'linear-gradient(135deg, #31C47A 0%, #27A866 100%)', border:'none', borderRadius:10, padding:'8px 16px', cursor:'pointer', boxShadow: '0 2px 10px rgba(49,196,122,0.3)' }} onClick={() => {
                if (showForm) { resetForm(); } else { setShowForm(true); }
              }}>
                {showForm ? <><X className="size-4" /> Cancel</> : <><Plus className="size-4" /> Create Job Posting</>}
              </button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={onSubmit} style={{ marginTop:16, display:'grid', gap:16, gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:16, padding:24, boxShadow: '0 4px 20px rgba(81,42,204,0.08)' }}>
              <div style={{ gridColumn:'1/-1' }}>
                <h2 style={{ fontSize:18, fontWeight:800, color:'var(--ink)', letterSpacing:'-0.02em' }}>
                  {editingJob ? "Edit Job Posting" : "Create New Job Posting"}
                </h2>
              </div>
              <div style={{ gridColumn:'1/-1', display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Job title</label>
                <input id="job_title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required
                  style={{ width:'100%', height:42, padding:'0 14px', borderRadius:10, border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', outline:'none', transition: 'border-color 0.15s' }}
                />
              </div>
              <div style={{ display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Company name</label>
                <input id="company_name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                  style={{ width:'100%', height:42, padding:'0 14px', borderRadius:10, border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', outline:'none' }}
                />
              </div>
              <div style={{ display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Employer type</label>
                <Select value={employerType} onValueChange={setEmployerType}>
                  <SelectTrigger id="employer_type"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Industry</label>
                <input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} required
                  style={{ width:'100%', height:42, padding:'0 14px', borderRadius:10, border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', outline:'none' }}
                />
              </div>
              <div style={{ display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Location</label>
                <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kuala Lumpur" required
                  style={{ width:'100%', height:42, padding:'0 14px', borderRadius:10, border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', outline:'none' }}
                />
              </div>
              <div style={{ gridColumn:'1/-1', display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Description</label>
                <Textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} required
                  style={{ borderRadius:10, border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', padding:'10px 14px' }}
                />
              </div>
              <div style={{ gridColumn:'1/-1', display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Requirements</label>
                <Textarea id="requirements" rows={5} value={requirements} onChange={(e) => setRequirements(e.target.value)} required
                  style={{ borderRadius:10, border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', padding:'10px 14px' }}
                />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <button type="submit" disabled={submitting} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'#fff', background:'linear-gradient(135deg, #31C47A 0%, #27A866 100%)', border:'none', borderRadius:10, padding:'10px 24px', cursor:'pointer', boxShadow: '0 2px 10px rgba(49,196,122,0.2)' }}>
                  {submitting ? (
                    <><Loader2 className="size-4 animate-spin" /> {editingJob ? "Saving…" : "Creating…"}</>
                  ) : (
                    editingJob ? "Save Changes" : "Create Job Posting"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Recent Applications Section */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(81,42,204,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users style={{ width: 16, height: 16, color: '#512ACC' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0 }}>Recent Applications</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Review and manage candidate applications</p>
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3" style={{ marginTop: 16 }}>
              <div className="flex-1 min-w-[200px] relative">
                <input
                  placeholder="Search by name or email..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  style={{ width:'100%', height:38, padding:'0 14px', borderRadius:10, border:'1px solid var(--line)', fontSize:13, background:'var(--surface)', color:'var(--ink)', outline:'none' }}
                />
              </div>
              <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
                <SelectTrigger style={{ width:140, height:38, fontSize:13 }}><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offered">Offered</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="kiv">KIV</SelectItem>
                </SelectContent>
              </Select>
              <Select value={appSortBy} onValueChange={setAppSortBy}>
                <SelectTrigger style={{ width:140, height:38, fontSize:13 }}><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="score">Match Score</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Applications List */}
            <div className="mt-4">
              {applications === null ? (
                <div style={{ display:'flex', justifyContent:'center', padding:'32px 0' }}><Loader2 className="size-5 animate-spin" style={{ color: '#f36c21' }} /></div>
              ) : applications.length === 0 ? (
                <div style={{ borderRadius:14, padding:40, textAlign:'center', border:'1px dashed var(--line-strong)', background:'var(--base)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Users style={{ width:24, height:24, color:'var(--muted)' }} />
                  </div>
                  <p style={{ fontSize:13, color:'var(--muted)' }}>No applications yet.</p>
                </div>
              ) : (
                <ul style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {applications
                    .filter((app) => {
                      if (appStatusFilter !== "All" && (app.status ?? "").toLowerCase() !== appStatusFilter.toLowerCase()) return false;
                      if (appSearch) {
                        const searchLower = appSearch.toLowerCase();
                        return (
                          app.candidate_email?.toLowerCase().includes(searchLower) ||
                          app.candidate_name?.toLowerCase().includes(searchLower) ||
                          app.job_title?.toLowerCase().includes(searchLower)
                        );
                      }
                      return true;
                    })
                    .sort((a, b) => {
                      if (appSortBy === "recent") {
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                      }
                      return (b.match_score || 0) - (a.match_score || 0);
                    })
                    .map((app) => (
                    <li key={app.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:'14px 16px', gap:12, transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(81,42,204,0.04)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(81,42,204,0.3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; }}
                    >
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {app.candidate_name || app.candidate_email || 'Anonymous'}
                        </p>
                        {app.candidate_name && (
                          <p style={{ fontSize:11, color:'var(--muted)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{app.candidate_email}</p>
                        )}
                        <p style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{app.job_title} · Applied {formatDate(app.created_at)}</p>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                        <span style={{ fontSize:11, fontWeight:600, borderRadius:6, padding:'3px 10px',
                          background: app.status === 'hired' || app.status === 'Placed' ? '#dcfce7' : app.status === 'rejected' || app.status === 'Rejected' ? '#fee2e2' : app.status === 'interview' || app.status === 'Interview' ? 'rgba(81,42,204,0.1)' : app.status === 'shortlisted' || app.status === 'Shortlisted' ? '#fef3c7' : 'rgba(81,42,204,0.08)',
                          color: app.status === 'hired' || app.status === 'Placed' ? '#15803d' : app.status === 'rejected' || app.status === 'Rejected' ? '#dc2626' : app.status === 'interview' || app.status === 'Interview' ? '#512ACC' : app.status === 'shortlisted' || app.status === 'Shortlisted' ? '#92400e' : '#512ACC'
                        }}>{app.status}</span>
                        <Select value={app.status} onValueChange={(val) => void updateAppStatus(app.id, val, app.job_title)}>
                          <SelectTrigger style={{ width:130, height:28, fontSize:11 }}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="shortlisted">Shortlisted</SelectItem>
                            <SelectItem value="interview">Interview</SelectItem>
                            <SelectItem value="offered">Offered</SelectItem>
                            <SelectItem value="hired">Hired</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="kiv">KIV</SelectItem>
                          </SelectContent>
                        </Select>
                        {app.user_id && (
                          <Link to="/employer/candidate/$candidateId" params={{ candidateId: app.user_id }} style={{ fontSize:11, fontWeight:600, color:'#512ACC', background:'rgba(81,42,204,0.08)', border:'1px solid var(--line)', borderRadius:8, padding:'5px 12px', textDecoration:'none' }}>View Profile</Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Interview Options Panel */}
          {interviewPanel?.open && (
            <div style={{ marginTop: 20, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(81,42,204,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 2 }}>Schedule Interview</h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>Candidate is at Interview stage for {interviewPanel.jobTitle}. Choose how to proceed.</p>
                </div>
                <button onClick={() => setInterviewPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><X className="size-5" /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 16 }}>
                <button onClick={() => setInterviewMode('practical')}
                  style={{ padding: 18, borderRadius: 14, border: interviewMode === 'practical' ? '2px solid #31C47A' : '1px solid var(--line)', background: interviewMode === 'practical' ? 'rgba(49,196,122,0.05)' : 'var(--base)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(49,196,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar className="size-5" style={{ color: '#31C47A' }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Schedule Interview</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>Set a real-world date, time, location or meeting link, and mode (in-person or online).</p>
                </button>
              </div>

              {interviewMode === 'practical' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>Date</label>
                    <Input type="date" value={practicalDate} onChange={(e) => setPracticalDate(e.target.value)} style={{ height: 42 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>Time</label>
                    <Input type="time" value={practicalTime} onChange={(e) => setPracticalTime(e.target.value)} style={{ height: 42 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>Mode</label>
                    <Select value={practicalMode} onValueChange={(v) => setPracticalMode(v as any)}>
                      <SelectTrigger style={{ height: 42, fontSize: 13 }}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_person">In-person</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>{practicalMode === 'in_person' ? 'Location / Venue' : 'Meeting Link'}</label>
                    <Input value={practicalLocation} onChange={(e) => setPracticalLocation(e.target.value)} placeholder={practicalMode === 'in_person' ? 'e.g. PERKESO Office, Kuala Lumpur' : 'e.g. https://meet.google.com/abc-defg-hij'} style={{ height: 42 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>Notes</label>
                    <Textarea value={practicalNotes} onChange={(e) => setPracticalNotes(e.target.value)} rows={3} placeholder="Additional instructions for the candidate…" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <button onClick={() => void submitPracticalInterview()} disabled={!practicalDate || !practicalTime || sendingInterview}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #31C47A 0%, #27A866 100%)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!practicalDate || !practicalTime || sendingInterview) ? 0.6 : 1, boxShadow: '0 2px 10px rgba(49,196,122,0.2)' }}>
                      {sendingInterview ? <><Loader2 className="size-4 animate-spin" /> Scheduling…</> : <><Calendar className="size-4" /> Send Invite</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(81,42,204,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase style={{ width: 16, height: 16, color: '#512ACC' }} />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0 }}>Active Job Postings</h2>
            </div>
            {error && <p style={{ fontSize:13, color:'#dc2626', marginBottom:12 }}>{error}</p>}
            {jobs === null && !error ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'32px 0' }}><Loader2 className="size-5 animate-spin" style={{ color: '#f36c21' }} /></div>
            ) : jobs && jobs.length === 0 ? (
              <div style={{ borderRadius:14, padding:40, textAlign:'center', border:'1px dashed var(--line-strong)', background:'var(--base)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Briefcase style={{ width:24, height:24, color:'var(--muted)' }} />
                </div>
                <p style={{ fontSize:13, color:'var(--muted)' }}>You haven't created any job postings yet.</p>
              </div>
            ) : (
              <ul style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {jobs?.map((j) => (
                  <li key={j.id} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:'16px 18px', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(81,42,204,0.04)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(81,42,204,0.3)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; }}
                  >
                    <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <h3 style={{ fontSize:15, fontWeight:700, color:'#512ACC', margin:0 }}>{j.job_title}</h3>
                        <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
                          {j.company_name} · {j.employer_type} · {j.location}
                        </p>
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:11, color:'var(--muted)' }}>{formatDate(j.created_at)}</span>
                        <span style={{ fontSize:11, fontWeight:600, color:'#512ACC', background:'rgba(81,42,204,0.08)', borderRadius:6, padding:'3px 10px', textTransform:'capitalize' }}>{j.status}</span>
                        <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId: j.id }} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'#512ACC', background:'rgba(81,42,204,0.07)', border:'1px solid var(--line)', borderRadius:8, padding:'5px 12px', textDecoration:'none' }}>
                          <Users className="size-3.5" /> Match
                        </Link>
                        <Link to="/employer/vacancies/$jobId/occupation" params={{ jobId: j.id }} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'#512ACC', background:'rgba(81,42,204,0.07)', border:'1px solid var(--line)', borderRadius:8, padding:'5px 12px', textDecoration:'none' }}>
                          <Brain className="size-3.5" /> MASCO AI
                        </Link>
                        <Link to="/employer/vacancy/$jobId/optimize" params={{ jobId: j.id }} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'#f36c21', background:'rgba(243,108,33,0.08)', border:'1px solid rgba(243,108,33,0.2)', borderRadius:8, padding:'5px 12px', textDecoration:'none' }}>
                          <Sparkles className="size-3.5" /> Optimize
                        </Link>
                        <button onClick={() => startEdit(j)} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'var(--ink)', background:'var(--base)', border:'1px solid var(--line)', borderRadius:8, padding:'5px 12px', cursor:'pointer' }}>
                          <Edit className="size-3.5" /> Edit
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}