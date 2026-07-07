import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Copy, Mail, Users, FileText, Clock, CheckCircle, AlertCircle, Eye, ToggleLeft, ToggleRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OfficerSidebar } from "@/components/officer-sidebar";

export const Route = createFileRoute("/employer/interviews")({
  ssr: false,
  component: EmployerInterviewsPage,
  head: () => ({
    meta: [
      { title: "AI Interview Templates — PerksoPrax AI Employer" },
      { name: "description", content: "Create and manage AI-powered interview templates for candidates." },
    ],
  }),
});

type Template = {
  id: string;
  title: string;
  role_title: string;
  company_name: string | null;
  interview_type: string;
  experience_level: string | null;
  created_at: string;
  question_count: number;
  total_invitations: number;
  pending_invitations: number;
  completed_invitations: number;
  is_active: boolean;
};

function EmployerInterviewsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { void navigate({ to: "/employer/login" }); return; }
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "employer") { void navigate({ to: "/employer/login" }); return; }
      setCheckingRole(false);

      // Load templates with stats
      const { data: templateRows, error } = await supabase
        .from("interview_templates")
        .select("id, title, role_title, company_name, interview_type, experience_level, created_at, is_active")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      const templatesWithStats = await Promise.all(
        (templateRows ?? []).map(async (t) => {
          const { data: questions } = await supabase
            .from("interview_template_questions")
            .select("id")
            .eq("template_id", t.id);

          const { data: invitations } = await supabase
            .from("interview_invitations")
            .select("id, status")
            .eq("template_id", t.id);

          const total = invitations?.length ?? 0;
          const pending = invitations?.filter((i) => i.status === "pending").length ?? 0;
          const completed = invitations?.filter((i) => i.status === "completed").length ?? 0;

          return {
            ...t,
            question_count: questions?.length ?? 0,
            total_invitations: total,
            pending_invitations: pending,
            completed_invitations: completed,
          };
        })
      );

      setTemplates(templatesWithStats);
      setLoading(false);
    })();
  }, [authLoading, user]);

  const copyShareLink = (templateId: string) => {
    const url = `${window.location.origin}/interview-room.html?template=${templateId}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard");
  };

  const sendEmailInvite = (template: Template) => {
    const subject = encodeURIComponent(`Interview Invitation - ${template.role_title}`);
    const body = encodeURIComponent(
      `You have been invited to complete an AI interview for the role of ${template.role_title}.\n\nClick here to start: ${window.location.origin}/interview-room.html?template=${template.id}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const toggleTemplateStatus = async (templateId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("interview_templates")
      .update({ is_active: !currentStatus })
      .eq("id", templateId);

    if (error) {
      toast.error("Failed to update template status");
      return;
    }

    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, is_active: !currentStatus } : t))
    );
    toast.success(`Template ${!currentStatus ? "activated" : "deactivated"}`);
  };

  if (authLoading || checkingRole) {
    return <div className="flex min-h-screen items-center justify-center"><div className="size-8 animate-spin border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <OfficerSidebar>
      <div style={{ padding: '32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6, padding: '3px 10px', borderRadius: 20, background: 'var(--accent-glow)', border: '1px solid var(--line)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                  AI Interview
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', margin: 0 }}>Interview Templates</h1>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Create templates and invite candidates to complete AI interviews.</p>
              </div>
            </div>
            <Link to="/employer/interview-templates/create"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#0f172a', fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px rgba(6,182,212,0.2)' }}
            >
              <Plus className="size-4" /> Create Template
            </Link>
          </div>
        </div>

        {/* Templates */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-8 animate-spin border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <Users className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">No interview templates yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Create your first AI interview template to start screening candidates.</p>
            <Button asChild variant="navy" className="mt-6">
              <Link to="/employer/interview-templates/create">
                <Plus className="mr-2 size-4" /> Create First Template
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{template.title}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        template.is_active 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : "bg-muted text-muted-foreground border border-border"
                      }`}>
                        {template.is_active ? <CheckCircle className="size-3" /> : <ToggleLeft className="size-3" />}
                        {template.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {template.role_title} · {template.company_name || "Your Company"}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {template.interview_type} · {template.experience_level || "Any level"} · {template.question_count} questions
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        Total: {template.total_invitations}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        Pending: {template.pending_invitations}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="size-3" />
                        Completed: {template.completed_invitations}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyShareLink(template.id)}
                    >
                      <Copy className="mr-1.5 size-4" /> Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendEmailInvite(template)}
                    >
                      <Mail className="mr-1.5 size-4" /> Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to="/employer/interview-templates/$templateId" params={{ templateId: template.id }}>
                        <Eye className="mr-1.5 size-4" /> View Results
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                    >
                      {template.is_active ? (
                        <ToggleRight className="size-4 text-muted-foreground" />
                      ) : (
                        <ToggleLeft className="size-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </OfficerSidebar>
  );
}
