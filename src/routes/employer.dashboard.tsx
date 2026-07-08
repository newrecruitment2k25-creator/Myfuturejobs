import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2, Plus, Briefcase, Edit, X, Users, Brain, Sparkles,
  BarChart2, CheckCircle2, Filter, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getEmployerApplications, updateApplicationStatus, type AppStatus } from "@/lib/ops-api";
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

const APP_STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  applied:     { label: "Applied",     dot: "#7c3aed", bg: "#ede9fe", text: "#7c3aed" },
  shortlisted: { label: "Shortlisted", dot: "#1d4ed8", bg: "#dbeafe", text: "#1d4ed8" },
  interview:   { label: "Screening",   dot: "#0369a1", bg: "#e0f2fe", text: "#0369a1" },
  offered:     { label: "Offered",     dot: "#d97706", bg: "#fef3c7", text: "#d97706" },
  hired:       { label: "Hired",       dot: "#15803d", bg: "#dcfce7", text: "#15803d" },
  rejected:    { label: "Rejected",    dot: "#dc2626", bg: "#fee2e2", text: "#dc2626" },
  kiv:         { label: "KIV",         dot: "#6b7280", bg: "#f3f4f6", text: "#6b7280" },
};

function QuickStat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent: string }) {
  return (
    <div style={{ borderRadius: 16, padding: 16, background: `${accent}10`, border: `1px solid ${accent}20`, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}15`, border: `1px solid ${accent}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ width: 20, height: 20, color: accent }} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
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

  const updateAppStatus = async (appId: string, newStatus: string) => {
    try {
      await updateApplicationStatus(appId, newStatus as AppStatus);
      await loadApplications();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update status');
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
          {/* ── Recruiter Cockpit Header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #211F60 0%, #512ACC 60%, #6B4FD6 100%)', borderRadius: 20, padding: '24px 28px',
            display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20,
            overflow: 'hidden', position: 'relative', boxShadow: '0 6px 24px rgba(81,42,204,0.18)',
          }}>
            <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'absolute', right: 80, bottom: -70, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Employer Portal · Recruiter Cockpit
              </div>
              <h1 style={{ marginTop: 4, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.035em' }}>Recruiter Cockpit</h1>
              <p style={{ marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Track applications, manage postings, and hire faster.</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, position: 'relative' }}>
              <Link to="/employer/labour-market-intelligence" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, color:'#fff', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:12, padding:'9px 15px', textDecoration:'none', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
              >
                <BarChart2 className="size-4" /> Market Insights
              </Link>
              <Link to="/employer/vacancy-builder" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, color:'#211F60', background:'#fff', border:'1px solid rgba(255,255,255,0.3)', borderRadius:12, padding:'9px 15px', textDecoration:'none', transition: 'all 0.15s', boxShadow:'0 4px 14px rgba(0,0,0,0.1)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f3f4f6'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
              >
                <Sparkles className="size-4" /> AI Vacancy Builder
              </Link>
              <button style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, color:'#fff', background:'linear-gradient(135deg, #31C47A 0%, #27A866 100%)', border:'none', borderRadius:12, padding:'9px 16px', cursor:'pointer', boxShadow: '0 4px 14px rgba(49,196,122,0.3)' }} onClick={() => {
                if (showForm) { resetForm(); } else { setShowForm(true); }
              }}>
                {showForm ? <><X className="size-4" /> Close</> : <><Plus className="size-4" /> Quick Post</>}
              </button>
            </div>
          </div>

          {/* ── Quick Stats ── */}
          {(() => {
            const openJobs = jobs?.filter(j => j.status === 'open').length ?? 0;
            const totalApps = applications?.length ?? 0;
            const hiredApps = applications?.filter((a: any) => a.status === 'hired').length ?? 0;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                <QuickStat icon={Briefcase} label="Open Jobs" value={openJobs} accent="#512ACC" />
                <QuickStat icon={Users} label="Applications" value={totalApps} accent="#f36c21" />
                <QuickStat icon={CheckCircle2} label="Hired" value={hiredApps} accent="#15803d" />
              </div>
            );
          })()}

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
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, rgba(81,42,204,0.12), rgba(107,79,214,0.08))', border: '1px solid rgba(81,42,204,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users style={{ width: 18, height: 18, color: '#512ACC' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0 }}>Applications Pipeline</h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Move candidates through your hiring stages</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    placeholder="Search by name, email, job..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    style={{ width:220, height:36, padding:'0 10px 0 28px', borderRadius:10, border:'1px solid var(--line)', fontSize:12, background:'var(--surface)', color:'var(--ink)', outline:'none' }}
                  />
                </div>
                <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
                  <SelectTrigger style={{ width:135, height:36, fontSize:12 }}><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Stages</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="interview">Screening</SelectItem>
                    <SelectItem value="offered">Offered</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="kiv">KIV</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={appSortBy} onValueChange={setAppSortBy}>
                  <SelectTrigger style={{ width:130, height:36, fontSize:12 }}><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="score">Match Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stage summary rail */}
            {applications && applications.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 16 }}>
                {['applied','shortlisted','interview','offered','hired','rejected','kiv'].map((s) => {
                  const count = applications.filter((a: any) => a.status === s).length;
                  const cfg = APP_STATUS_CONFIG[s] ?? APP_STATUS_CONFIG.applied;
                  const active = appStatusFilter === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setAppStatusFilter(active ? "All" : s)}
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '8px 12px', border: active ? `1px solid ${cfg.text}` : '1px solid var(--line)', background: active ? cfg.bg : 'var(--surface)' }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{cfg.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: cfg.text, background: active ? '#fff' : cfg.bg, borderRadius: 6, padding: '1px 6px' }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Applications List */}
            <div>
              {applications === null ? (
                <div style={{ display:'flex', justifyContent:'center', padding:'40px 0', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:16 }}><Loader2 className="size-6 animate-spin" style={{ color: '#f36c21' }} /></div>
              ) : applications.length === 0 ? (
                <div style={{ borderRadius:16, padding:44, textAlign:'center', border:'1px dashed var(--line-strong)', background:'var(--surface)' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Users style={{ width:26, height:26, color:'var(--muted)' }} />
                  </div>
                  <p style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>No applications yet</p>
                  <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Post a job to start receiving candidates.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {applications
                    .filter((app: any) => {
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
                    .sort((a: any, b: any) => {
                      if (appSortBy === "recent") {
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                      }
                      return (b.match_score || 0) - (a.match_score || 0);
                    })
                    .map((app: any) => {
                      const cfg = APP_STATUS_CONFIG[app.status] ?? APP_STATUS_CONFIG.applied;
                      return (
                        <div key={app.id} style={{ display:'grid', gridTemplateColumns: '1fr auto', alignItems:'center', gap:16, background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:'14px 16px', transition:'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(81,42,204,0.25)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; }}
                        >
                          <div style={{ minWidth:0, display:'flex', alignItems:'center', gap:12 }}>
                            <div style={{ width:38, height:38, borderRadius:'50%', background: cfg.bg, color: cfg.text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0 }}>
                              {(app.candidate_name || app.candidate_email || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth:0 }}>
                              <p style={{ fontSize:13, fontWeight:700, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {app.candidate_name || app.candidate_email || 'Anonymous'}
                              </p>
                              <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:10, fontSize:11, color:'var(--muted)', marginTop:3 }}>
                                <span>{app.job_title}</span>
                                <span>·</span>
                                <span>Applied {formatDate(app.created_at)}</span>
                                {app.match_score && <><span>·</span><span style={{ color:'#f36c21', fontWeight:700 }}>{app.match_score}% match</span></>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
                            <span style={{ fontSize:11, fontWeight:700, borderRadius:8, padding:'4px 10px', background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                            <Select value={app.status} onValueChange={(val) => void updateAppStatus(app.id, val)}>
                              <SelectTrigger style={{ width:120, height:30, fontSize:11 }}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                <SelectItem value="interview">Screening</SelectItem>
                                <SelectItem value="offered">Offered</SelectItem>
                                <SelectItem value="hired">Hired</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="kiv">KIV</SelectItem>
                              </SelectContent>
                            </Select>
                            {app.user_id && (
                              <Link to="/employer/candidate/$candidateId" params={{ candidateId: app.user_id }} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, color:'#512ACC', background:'rgba(81,42,204,0.08)', border:'1px solid rgba(81,42,204,0.12)', borderRadius:8, padding:'5px 10px', textDecoration:'none' }}>
                                <Eye className="size-3.5" /> Profile
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Active Job Postings */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, rgba(243,108,33,0.12), rgba(243,108,33,0.06))', border: '1px solid rgba(243,108,33,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase style={{ width: 18, height: 18, color: '#f36c21' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0 }}>Active Job Postings</h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{jobs?.length ?? 0} listing{(jobs?.length ?? 0) === 1 ? '' : 's'} live on your portal</p>
                </div>
              </div>
              <button onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:'#fff', background:'#512ACC', border:'none', borderRadius:10, padding:'8px 14px', cursor:'pointer' }}>
                <Plus className="size-4" /> New Listing
              </button>
            </div>
            {error && <p style={{ fontSize:13, color:'#dc2626', marginBottom:12 }}>{error}</p>}
            {jobs === null && !error ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'40px 0', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:16 }}><Loader2 className="size-6 animate-spin" style={{ color: '#f36c21' }} /></div>
            ) : jobs && jobs.length === 0 ? (
              <div style={{ borderRadius:16, padding:44, textAlign:'center', border:'1px dashed var(--line-strong)', background:'var(--surface)' }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Briefcase style={{ width:26, height:26, color:'var(--muted)' }} />
                </div>
                <p style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>No job postings yet</p>
                <p style={{ fontSize:12, color:'var(--muted)', marginTop:4, marginBottom:16 }}>Create your first vacancy to attract candidates.</p>
                <button onClick={() => setShowForm(true)} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, color:'#fff', background:'#512ACC', border:'none', borderRadius:10, padding:'9px 18px', cursor:'pointer' }}>
                  <Plus className="size-4" /> Create Job Posting
                </button>
              </div>
            ) : (
              <div style={{ display:'grid', gap:14, gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {jobs?.map((j) => {
                  const statusCfg: any = {
                    open: { label:'Open', bg:'#dcfce7', text:'#15803d' },
                    closed: { label:'Closed', bg:'#fee2e2', text:'#dc2626' },
                    draft: { label:'Draft', bg:'#f3f4f6', text:'#6b7280' },
                  }[j.status] ?? { label:j.status, bg:'#ede9fe', text:'#512ACC' };
                  return (
                    <div key={j.id} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:16, padding:16, display:'flex', flexDirection:'column', gap:12, transition:'all 0.15s', boxShadow:'0 1px 3px rgba(81,42,204,0.04)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(81,42,204,0.25)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; }}
                    >
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                        <div>
                          <span style={{ fontSize:10, fontWeight:800, borderRadius:6, padding:'2px 8px', background:statusCfg.bg, color:statusCfg.text, textTransform:'uppercase', letterSpacing:'0.04em' }}>{statusCfg.label}</span>
                          <h3 style={{ fontSize:14, fontWeight:800, color:'var(--ink)', marginTop:8, marginBottom:0 }}>{j.job_title}</h3>
                        </div>
                        <div style={{ width:34, height:34, borderRadius:10, background:'var(--base)', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#512ACC' }}>
                          {j.company_name?.charAt(0).toUpperCase() ?? 'J'}
                        </div>
                      </div>
                      <p style={{ fontSize:12, color:'var(--muted)', margin:0, lineHeight:1.5 }}>
                        {j.company_name} · {j.employer_type}<br />{j.location} · {j.industry}
                      </p>
                      <div style={{ marginTop:'auto', display:'flex', flexWrap:'wrap', gap:6 }}>
                        <Link to="/employer/vacancies/$jobId/candidates" params={{ jobId: j.id }} style={{ flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, fontWeight:700, color:'#512ACC', background:'rgba(81,42,204,0.08)', border:'1px solid rgba(81,42,204,0.12)', borderRadius:8, padding:'6px 10px', textDecoration:'none' }}>
                          <Users className="size-3.5" /> Match
                        </Link>
                        <Link to="/employer/vacancies/$jobId/occupation" params={{ jobId: j.id }} style={{ flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, fontWeight:700, color:'#512ACC', background:'rgba(81,42,204,0.08)', border:'1px solid rgba(81,42,204,0.12)', borderRadius:8, padding:'6px 10px', textDecoration:'none' }}>
                          <Brain className="size-3.5" /> MASCO
                        </Link>
                        <Link to="/employer/vacancy/$jobId/optimize" params={{ jobId: j.id }} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, fontWeight:700, color:'#f36c21', background:'rgba(243,108,33,0.08)', border:'1px solid rgba(243,108,33,0.15)', borderRadius:8, padding:'6px 10px', textDecoration:'none' }}>
                          <Sparkles className="size-3.5" />
                        </Link>
                        <button onClick={() => startEdit(j)} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, fontWeight:700, color:'var(--ink)', background:'var(--base)', border:'1px solid var(--line)', borderRadius:8, padding:'6px 10px', cursor:'pointer' }}>
                          <Edit className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}