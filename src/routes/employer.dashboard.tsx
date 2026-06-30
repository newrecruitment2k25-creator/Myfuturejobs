import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Briefcase, Edit, X, Video, Users, Brain, Sparkles, BarChart2, Calendar, MapPin, Clock, MessageSquare, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getEmployerApplications, updateApplicationStatus, sendAiInterviewInvitation, schedulePracticalInterview } from "@/lib/ops-api";
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
      await updateApplicationStatus(appId, newStatus);
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
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Employer Portal</p>
              <h1 style={{ marginTop: 4, fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em' }}>My Dashboard</h1>
              <p style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>Manage vacancies, candidates, and AI interviews.</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Link to="/employer/interviews" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600, color:'var(--brand)', background:'rgba(33,31,96,0.07)', border:'1px solid var(--line)', borderRadius:'var(--radius-xs)', padding:'6px 12px', textDecoration:'none' }}>
                <Video className="size-4" /> AI Interviews
              </Link>
              <Link to="/employer/labour-market-intelligence" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600, color:'var(--brand)', background:'rgba(33,31,96,0.07)', border:'1px solid var(--line)', borderRadius:'var(--radius-xs)', padding:'6px 12px', textDecoration:'none' }}>
                <BarChart2 className="size-4" /> Labour Market
              </Link>
              <Link to="/employer/vacancy-builder" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600, color:'var(--brand)', background:'rgba(33,31,96,0.07)', border:'1px solid var(--line)', borderRadius:'var(--radius-xs)', padding:'6px 12px', textDecoration:'none' }}>
                <Sparkles className="size-4" /> Vacancy Builder
              </Link>
              <button style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600, color:'#fff', background:'var(--accent)', border:'none', borderRadius:'var(--radius-xs)', padding:'7px 14px', cursor:'pointer' }} onClick={() => {
                if (showForm) { resetForm(); } else { setShowForm(true); }
              }}>
                {showForm ? <><X className="size-4" /> Cancel</> : <><Plus className="size-4" /> Post a Job</>}
              </button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={onSubmit} style={{ marginTop:16, display:'grid', gap:16, gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:24, boxShadow:'var(--shadow-card)' }}>
              <div style={{ gridColumn:'1/-1' }}>
                <h2 style={{ fontSize:18, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.02em' }}>
                  {editingJob ? "Edit Job" : "Post a New Job"}
                </h2>
              </div>
              <div style={{ gridColumn:'1/-1', display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Job title</label>
                <input id="job_title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required
                  style={{ width:'100%', height:40, padding:'0 14px', borderRadius:'var(--radius-xs)', border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', outline:'none' }}
                />
              </div>
              <div style={{ display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Company name</label>
                <input id="company_name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                  style={{ width:'100%', height:40, padding:'0 14px', borderRadius:'var(--radius-xs)', border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', outline:'none' }}
                />
              </div>
              <div style={{ display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Employer type</label>
                <Select value={employerType} onValueChange={setEmployerType}>
                  <SelectTrigger id="employer_type"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Industry</label>
                <input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} required
                  style={{ width:'100%', height:40, padding:'0 14px', borderRadius:'var(--radius-xs)', border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', outline:'none' }}
                />
              </div>
              <div style={{ display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Location</label>
                <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kuala Lumpur" required
                  style={{ width:'100%', height:40, padding:'0 14px', borderRadius:'var(--radius-xs)', border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', outline:'none' }}
                />
              </div>
              <div style={{ gridColumn:'1/-1', display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Description</label>
                <Textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} required
                  style={{ borderRadius:'var(--radius-xs)', border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', padding:'10px 14px' }}
                />
              </div>
              <div style={{ gridColumn:'1/-1', display:'grid', gap:6 }}>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink)' }}>Requirements</label>
                <Textarea id="requirements" rows={5} value={requirements} onChange={(e) => setRequirements(e.target.value)} required
                  style={{ borderRadius:'var(--radius-xs)', border:'1px solid var(--line)', fontSize:13, background:'var(--base)', color:'var(--ink)', padding:'10px 14px' }}
                />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <button type="submit" disabled={submitting} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'#fff', background:'var(--brand)', border:'none', borderRadius:'var(--radius-xs)', padding:'8px 20px', cursor:'pointer' }}>
                  {submitting ? (
                    <><Loader2 className="size-4 animate-spin" /> {editingJob ? "Updating…" : "Posting…"}</>
                  ) : (
                    editingJob ? "Update Job" : "Post Job"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Recent Applications Section */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 4 }}>Recent Applications</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Review and manage candidate applications</p>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <input
                  placeholder="Search by name or email..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  style={{ width:'100%', height:36, padding:'0 14px', borderRadius:'var(--radius-xs)', border:'1px solid var(--line)', fontSize:13, background:'var(--surface)', color:'var(--ink)', outline:'none' }}
                />
              </div>
              <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
                <SelectTrigger style={{ width:140, height:36, fontSize:13 }}><SelectValue placeholder="Status" /></SelectTrigger>
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
                <SelectTrigger style={{ width:140, height:36, fontSize:13 }}><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="score">Match Score</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Applications List */}
            <div className="mt-4">
              {applications === null ? (
                <div style={{ display:'flex', justifyContent:'center', padding:'32px 0' }}><Loader2 className="size-5 animate-spin" style={{ color: 'var(--accent)' }} /></div>
              ) : applications.length === 0 ? (
                <div style={{ borderRadius:'var(--radius-md)', padding:32, textAlign:'center', border:'2px dashed var(--line-strong)', background:'var(--base)' }}>
                  <Users style={{ width:32, height:32, color:'var(--muted)', margin:'0 auto 8px' }} />
                  <p style={{ fontSize:13, color:'var(--muted)' }}>No applications yet.</p>
                </div>
              ) : (
                <ul style={{ display:'flex', flexDirection:'column', gap:8 }}>
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
                    <li key={app.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-sm)', padding:'12px 16px', gap:12 }}>
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
                        <span style={{ fontSize:11, fontWeight:600, borderRadius:'var(--radius-xs)', padding:'2px 8px',
                          background: app.status === 'hired' || app.status === 'Placed' ? '#dcfce7' : app.status === 'rejected' || app.status === 'Rejected' ? '#fee2e2' : app.status === 'interview' || app.status === 'Interview' ? 'rgba(33,31,96,0.1)' : app.status === 'shortlisted' || app.status === 'Shortlisted' ? '#fef3c7' : 'rgba(33,31,96,0.08)',
                          color: app.status === 'hired' || app.status === 'Placed' ? '#15803d' : app.status === 'rejected' || app.status === 'Rejected' ? '#dc2626' : app.status === 'interview' || app.status === 'Interview' ? 'var(--brand)' : app.status === 'shortlisted' || app.status === 'Shortlisted' ? '#92400e' : 'var(--brand)'
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
                          <Link to="/employer/candidate/$candidateId" params={{ candidateId: app.user_id }} style={{ fontSize:11, fontWeight:600, color:'var(--brand)', background:'rgba(33,31,96,0.07)', border:'1px solid var(--line)', borderRadius:'var(--radius-xs)', padding:'4px 10px', textDecoration:'none' }}>View Profile</Link>
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
            <div style={{ marginTop: 20, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 24, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 2 }}>Interview Options</h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>Candidate is now at Interview stage for {interviewPanel.jobTitle}. Choose how to proceed.</p>
                </div>
                <button onClick={() => setInterviewPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X className="size-5" /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
                <button onClick={() => setInterviewMode('ai')}
                  style={{ padding: 16, borderRadius: 'var(--radius-sm)', border: interviewMode === 'ai' ? '2px solid var(--brand)' : '1px solid var(--line)', background: interviewMode === 'ai' ? 'rgba(33,31,96,0.05)' : 'var(--base)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Video className="size-5" style={{ color: 'var(--brand)' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Send AI Interview</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>Pick one of your saved AI/video interview templates and invite the candidate to complete it.</p>
                </button>
                <button onClick={() => setInterviewMode('practical')}
                  style={{ padding: 16, borderRadius: 'var(--radius-sm)', border: interviewMode === 'practical' ? '2px solid var(--accent)' : '1px solid var(--line)', background: interviewMode === 'practical' ? 'rgba(243,108,33,0.05)' : 'var(--base)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Calendar className="size-5" style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Schedule Practical Interview</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>Set a real-world date, time, location or meeting link, and mode (in-person or online).</p>
                </button>
              </div>

              {interviewMode === 'ai' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>Select Interview Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger style={{ width: '100%', maxWidth: 400, height: 40, fontSize: 13 }}>
                      <SelectValue placeholder={interviewTemplates.length === 0 ? 'No templates yet — create one in AI Interviews' : 'Choose a template'} />
                    </SelectTrigger>
                    <SelectContent>
                      {interviewTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title}{t.role_title ? ` · ${t.role_title}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button onClick={() => void submitAiInterview()} disabled={!selectedTemplate || sendingInterview}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 'var(--radius-xs)', border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: 'fit-content', opacity: (!selectedTemplate || sendingInterview) ? 0.6 : 1 }}>
                    {sendingInterview ? <><Loader2 className="size-4 animate-spin" /> Sending…</> : <><Send className="size-4" /> Send Invitation</>}
                  </button>
                </div>
              )}

              {interviewMode === 'practical' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>Date</label>
                    <Input type="date" value={practicalDate} onChange={(e) => setPracticalDate(e.target.value)} style={{ height: 40 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>Time</label>
                    <Input type="time" value={practicalTime} onChange={(e) => setPracticalTime(e.target.value)} style={{ height: 40 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>Mode</label>
                    <Select value={practicalMode} onValueChange={(v) => setPracticalMode(v as any)}>
                      <SelectTrigger style={{ height: 40, fontSize: 13 }}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_person">In-person</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>{practicalMode === 'in_person' ? 'Location / Venue' : 'Meeting Link'}</label>
                    <Input value={practicalLocation} onChange={(e) => setPracticalLocation(e.target.value)} placeholder={practicalMode === 'in_person' ? 'e.g. PERKESO Office, Kuala Lumpur' : 'e.g. https://meet.google.com/abc-defg-hij'} style={{ height: 40 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>Notes</label>
                    <Textarea value={practicalNotes} onChange={(e) => setPracticalNotes(e.target.value)} rows={3} placeholder="Additional instructions for the candidate…" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <button onClick={() => void submitPracticalInterview()} disabled={!practicalDate || !practicalTime || sendingInterview}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 'var(--radius-xs)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!practicalDate || !practicalTime || sendingInterview) ? 0.6 : 1 }}>
                      {sendingInterview ? <><Loader2 className="size-4 animate-spin" /> Scheduling…</> : <><Calendar className="size-4" /> Schedule Interview</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 16 }}>Your Job Posts</h2>
            {error && <p style={{ fontSize:13, color:'#dc2626', marginBottom:12 }}>{error}</p>}
            {jobs === null && !error ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'32px 0' }}><Loader2 className="size-5 animate-spin" style={{ color: 'var(--accent)' }} /></div>
            ) : jobs && jobs.length === 0 ? (
              <div style={{ borderRadius:'var(--radius-md)', padding:40, textAlign:'center', border:'2px dashed var(--line-strong)', background:'var(--base)' }}>
                <Briefcase style={{ width:32, height:32, color:'var(--muted)', margin:'0 auto 8px' }} />
                <p style={{ fontSize:13, color:'var(--muted)' }}>You haven't posted any jobs yet.</p>
              </div>
            ) : (
              <ul style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {jobs?.map((j) => (
                  <li key={j.id} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-sm)', padding:'16px 18px' }}>
                    <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <h3 style={{ fontSize:14, fontWeight:600, color:'var(--brand)', margin:0 }}>{j.job_title}</h3>
                        <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>
                          {j.company_name} · {j.employer_type} · {j.location}
                        </p>
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:11, color:'var(--muted)' }}>{formatDate(j.created_at)}</span>
                        <span style={{ fontSize:11, fontWeight:600, color:'var(--brand)', background:'rgba(33,31,96,0.08)', borderRadius:'var(--radius-xs)', padding:'2px 8px', textTransform:'capitalize' }}>{j.status}</span>
                        <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId: j.id }} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'var(--brand)', background:'rgba(33,31,96,0.07)', border:'1px solid var(--line)', borderRadius:'var(--radius-xs)', padding:'4px 10px', textDecoration:'none' }}>
                          <Users className="size-3.5" /> Match
                        </Link>
                        <Link to="/employer/vacancies/$jobId/occupation" params={{ jobId: j.id }} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'var(--brand)', background:'rgba(33,31,96,0.07)', border:'1px solid var(--line)', borderRadius:'var(--radius-xs)', padding:'4px 10px', textDecoration:'none' }}>
                          <Brain className="size-3.5" /> MASCO AI
                        </Link>
                        <Link to="/employer/vacancy/$jobId/optimize" params={{ jobId: j.id }} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'var(--accent)', background:'rgba(243,108,33,0.08)', border:'1px solid rgba(243,108,33,0.2)', borderRadius:'var(--radius-xs)', padding:'4px 10px', textDecoration:'none' }}>
                          <Sparkles className="size-3.5" /> Optimize
                        </Link>
                        <button onClick={() => startEdit(j)} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'var(--ink)', background:'var(--base)', border:'1px solid var(--line)', borderRadius:'var(--radius-xs)', padding:'4px 10px', cursor:'pointer' }}>
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