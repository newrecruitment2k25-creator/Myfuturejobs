import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Copy, Mail, Users, FileText, Clock, CheckCircle, AlertCircle, Eye, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/interviews")({
  ssr: false,
  component: EmployerInterviewsPage,
  head: () => ({
    meta: [
      { title: "AI Interview Templates — MYFutureJobs Employer" },
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
    const url = `https://MYFutureJobs-new.chjaved649.workers.dev/interview-room.html?template=${templateId}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard");
  };

  const sendEmailInvite = (template: Template) => {
    const subject = encodeURIComponent(`Interview Invitation - ${template.role_title}`);
    const body = encodeURIComponent(
      `You have been invited to complete an AI interview for the role of ${template.role_title}.\n\nClick here to start: https://MYFutureJobs-new.chjaved649.workers.dev/interview-room.html?template=${template.id}`
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
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px' }}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employer Portal</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary">AI Interview Templates</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create templates and invite candidates to complete AI interviews.</p>
          </div>
          <Button asChild variant="navy">
            <Link to="/employer/interview-templates/create">
              <Plus className="mr-2 size-4" /> Create Template
            </Link>
          </Button>
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
      </main>
    </div>
  );
}
