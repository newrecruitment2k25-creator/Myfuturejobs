import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, FileText, Users, BarChart3, CheckCircle2, Clock, Circle, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inviteCandidates, getTemplateInvitations } from "@/lib/interview-templates.functions";

export const Route = createFileRoute("/employer/interview-templates/$templateId")({
  ssr: false,
  component: TemplateDetailPage,
  head: () => ({
    meta: [{ title: "Template Detail — MYFutureJobs Employer" }],
  }),
});

type TemplateRow = {
  id: string; title: string; role_title: string; company_name: string | null;
  interview_type: string; experience_level: string | null; instructions: string | null;
  time_limit_minutes: number | null; job_id: string | null; employer_id: string;
  created_at: string;
};
type QuestionRow = {
  id: string; question_number: number; question_text: string;
  question_type: string | null; scoring_criteria: string | null;
  time_limit_seconds: number | null;
};
type InvitationRow = {
  id: string; candidate_id: string; candidate_email: string; status: string;
  overall_score: number | null; started_at: string | null; completed_at: string | null; created_at: string;
};
type ApplicantRow = { user_id: string; email?: string };

type Tab = "questions" | "invite" | "results";

function scoreColor(s: number) {
  if (s >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s >= 60) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function recBadge(rec: string | null) {
  if (!rec) return null;
  const map: Record<string, string> = {
    strong_hire: "bg-emerald-100 text-emerald-700 border-emerald-200",
    hire: "bg-green-100 text-green-700 border-green-200",
    maybe: "bg-amber-100 text-amber-700 border-amber-200",
    no_hire: "bg-red-100 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = { strong_hire: "Strong Hire", hire: "Hire", maybe: "Maybe", no_hire: "No Hire" };
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[rec] ?? ""}`}>{labels[rec] ?? rec}</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function TemplateDetailPage() {
  const { templateId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);
  const [tab, setTab] = useState<Tab>("questions");

  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [allProfiles, setAllProfiles] = useState<ApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteDeadline, setInviteDeadline] = useState("");
  const [inviting, setInviting] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { void navigate({ to: "/employer/login" }); return; }
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "employer") { void navigate({ to: "/employer/login" }); return; }
      setCheckingRole(false);
    })();
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (checkingRole || !user) return;
    (async () => {
      setLoading(true);
      try {
        // Load template
        const { data: tmpl, error: tErr } = await supabase
          .from("interview_templates")
          .select("*")
          .eq("id", templateId)
          .eq("employer_id", user.id)
          .single();
        if (tErr || !tmpl) { setError("Template not found."); setLoading(false); return; }
        setTemplate(tmpl as unknown as TemplateRow);

        // Load questions
        const { data: qs } = await supabase
          .from("interview_template_questions")
          .select("*")
          .eq("template_id", templateId)
          .order("question_number", { ascending: true });
        setQuestions((qs ?? []) as QuestionRow[]);

        // Load invitations via server fn
        const { invitations: invs } = await getTemplateInvitations({ data: { employer_id: user.id, template_id: templateId } });
        setInvitations(invs as InvitationRow[]);

        // If linked to a job, load applicants
        if ((tmpl as any).job_id) {
          const { data: apps } = await supabase
            .from("applications")
            .select("user_id")
            .eq("job_id", (tmpl as any).job_id);
          const appUserIds = (apps ?? []).map((a: any) => a.user_id);
          // Get emails from auth for applicants
          const appRows: ApplicantRow[] = appUserIds.map((uid: string) => ({ user_id: uid, email: uid }));
          setApplicants(appRows);
        }

        // Load all jobseeker profiles for non-linked invite
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "job_seeker")
          .eq("visible_to_employers", true);
        const profileRows: ApplicantRow[] = (profiles ?? []).map((p: any) => ({ user_id: p.id, email: p.id }));
        setAllProfiles(profileRows);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [checkingRole, user, templateId]);

  const alreadyInvited = new Set(invitations.map((i) => i.candidate_id));
  const candidatePool = template?.job_id ? applicants : allProfiles;
  const filteredPool = candidatePool.filter((c) => {
    if (alreadyInvited.has(c.user_id)) return false;
    if (searchEmail && !c.email?.toLowerCase().includes(searchEmail.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (uid: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(uid) ? s.delete(uid) : s.add(uid);
      return s;
    });
  };

  const sendInvitations = async () => {
    if (!user || selected.size === 0) { toast.error("Select at least one candidate."); return; }
    setInviting(true);
    try {
      const { invited_count } = await inviteCandidates({
        data: {
          employer_id: user.id,
          template_id: templateId,
          candidate_ids: Array.from(selected),
          message: inviteMessage.trim() || undefined,
          deadline: inviteDeadline || undefined,
        },
      });
      toast.success(`${invited_count} invitation${invited_count !== 1 ? "s" : ""} sent!`);
      setSelected(new Set());
      // Reload invitations
      const { invitations: invs } = await getTemplateInvitations({ data: { employer_id: user.id, template_id: templateId } });
      setInvitations(invs as InvitationRow[]);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send invitations.");
    } finally {
      setInviting(false);
    }
  };

  if (authLoading || checkingRole || loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--base)' }}>
        <main>
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Link to="/employer/interview-templates" className="text-sm text-primary hover:underline">← Back to Templates</Link>
          </div>
        </main>
      </div>
    );
  }

  const completedInvitations = invitations.filter((i) => i.status === "completed");

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Link to="/employer/interview-templates" style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, display: 'inline-block', textDecoration: 'none' }}>← Templates</Link>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', margin: 0 }}>{template?.title}</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{template?.role_title}{template?.company_name ? ` · ${template.company_name}` : ""}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ borderRadius: 999, background: 'rgba(81,42,204,0.1)', padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#512ACC', textTransform: 'capitalize' }}>{template?.interview_type}</span>
              {template?.experience_level && <span style={{ borderRadius: 999, background: 'var(--secondary)', padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{template.experience_level}</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6 gap-1">
          {(["questions", "invite", "results"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "invite" ? "Invite Candidates" : t === "questions" ? `Questions (${questions.length})` : `Results (${completedInvitations.length})`}
            </button>
          ))}
        </div>

        {/* ── Tab: Questions ── */}
        {tab === "questions" && (
          <div className="space-y-3">
            {template?.instructions && (
              <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground mb-4">
                <span className="font-medium text-foreground">Instructions: </span>{template.instructions}
              </div>
            )}
            {questions.map((q) => (
              <div key={q.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{q.question_number}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground leading-relaxed">{q.question_text}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.question_type && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">{q.question_type}</span>
                      )}
                      {q.time_limit_seconds && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{q.time_limit_seconds}s limit</span>
                      )}
                    </div>
                    {q.scoring_criteria && (
                      <p className="mt-2 text-xs text-muted-foreground italic">Criteria: {q.scoring_criteria}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Invite ── */}
        {tab === "invite" && (
          <div className="space-y-6">
            {/* Already invited */}
            {invitations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Already Invited ({invitations.length})</h3>
                <div className="space-y-2">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate font-mono">{inv.candidate_email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {inv.status === "completed" ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="size-3.5" /> Completed</span>
                        ) : inv.status === "in_progress" ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-blue-600"><Clock className="size-3.5" /> In Progress</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><Circle className="size-3.5" /> Pending</span>
                        )}
                        {inv.overall_score !== null && (
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${scoreColor(inv.overall_score)}`}>{inv.overall_score}</span>
                        )}
                        {inv.status === "completed" && (
                          <Link
                            to="/employer/interview-templates/$templateId/report/$invitationId"
                            params={{ templateId, invitationId: inv.id }}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            Report <ExternalLink className="size-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite new candidates */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {template?.job_id ? "Applicants for Linked Vacancy" : "Search Jobseeker Profiles"}
              </h3>
              {!template?.job_id && (
                <div className="mb-3">
                  <Input
                    placeholder="Filter by user ID…"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              )}

              {filteredPool.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {template?.job_id ? "No new applicants to invite." : "No visible profiles found."}
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto border border-border rounded-lg p-2">
                  {filteredPool.map((c) => (
                    <label key={c.user_id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(c.user_id)}
                        onChange={() => toggleSelect(c.user_id)}
                        className="size-4 rounded"
                      />
                      <span className="text-sm font-mono text-foreground">{c.email ?? c.user_id}</span>
                    </label>
                  ))}
                </div>
              )}

              {filteredPool.length > 0 && (
                <div className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-medium text-foreground">{selected.size} candidate{selected.size !== 1 ? "s" : ""} selected</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Personal Message (optional)</Label>
                      <Textarea
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        placeholder="e.g. We'd love to assess your skills for the role…"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Deadline (optional)</Label>
                      <Input type="date" value={inviteDeadline} onChange={(e) => setInviteDeadline(e.target.value)} className="text-sm" />
                    </div>
                  </div>
                  <Button onClick={sendInvitations} disabled={inviting || selected.size === 0}>
                    {inviting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
                    Send Invitations
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Results ── */}
        {tab === "results" && (
          <div>
            {invitations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <Users className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">No candidates invited yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...invitations].sort((a, b) => {
                  if (a.overall_score !== null && b.overall_score !== null) return b.overall_score - a.overall_score;
                  if (a.overall_score !== null) return -1;
                  if (b.overall_score !== null) return 1;
                  return 0;
                }).map((inv) => (
                  <div key={inv.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate font-mono">{inv.candidate_email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Invited {formatDate(inv.created_at)}{inv.completed_at ? ` · Completed ${formatDate(inv.completed_at)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {inv.status === "completed" ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="size-3.5" /> Done</span>
                      ) : inv.status === "in_progress" ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-blue-600"><Clock className="size-3.5" /> In Progress</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><Circle className="size-3.5" /> Pending</span>
                      )}
                      {inv.overall_score !== null && (
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${scoreColor(inv.overall_score)}`}>{inv.overall_score}</span>
                      )}
                      {inv.status === "completed" && (
                        <Link
                          to="/employer/interview-templates/$templateId/report/$invitationId"
                          params={{ templateId, invitationId: inv.id }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <BarChart3 className="size-3.5" /> View Report
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
