import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, FileText, Users, CheckCircle2, Clock, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getEmployerTemplates } from "@/lib/interview-templates.functions";

export const Route = createFileRoute("/employer/interview-templates")({
  ssr: false,
  component: EmployerTemplatesPage,
  head: () => ({
    meta: [
      { title: "Interview Templates — MYFutureJobs Employer" },
      { name: "description", content: "Create and manage interview templates for candidates." },
    ],
  }),
});

type TemplateRow = {
  id: string;
  title: string;
  role_title: string;
  company_name: string | null;
  interview_type: string;
  experience_level: string | null;
  created_at: string;
  question_count: number;
  invitation_counts: { total: number; pending: number; completed: number; in_progress: number };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function EmployerTemplatesPage() {
  const isChildRoute = useRouterState({
    select: (s) => s.location.pathname !== "/employer/interview-templates",
  });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);
  const [templates, setTemplates] = useState<TemplateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      try {
        const { templates: rows } = await getEmployerTemplates({ data: { employer_id: user.id } });
        setTemplates(rows as TemplateRow[]);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [checkingRole, user]);

  if (isChildRoute) return <Outlet />;

  if (authLoading || checkingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--base)' }}>
      <main style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px' }}>
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Interview Templates</h1>
            <p className="mt-1 text-muted-foreground">Create templates and invite candidates to structured interviews.</p>
          </div>
          <Link
            to="/employer/interview-templates/create"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> Create New Template
          </Link>
        </header>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive mb-6">
            {error}
          </div>
        )}

        {templates === null && !error && (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {templates && templates.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Video className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">No templates yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create your first interview template to start inviting candidates.</p>
            <Link
              to="/employer/interview-templates/create"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="size-4" /> Create Template
            </Link>
          </div>
        )}

        {templates && templates.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {templates.map((t) => (
              <Link
                key={t.id}
                to="/employer/interview-templates/$templateId"
                params={{ templateId: t.id }}
                className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{t.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{t.role_title}{t.company_name ? ` · ${t.company_name}` : ""}</p>
                  </div>
                  <span className="shrink-0 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                    {t.interview_type}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <FileText className="size-3.5" /> {t.question_count} question{t.question_count !== 1 ? "s" : ""}
                  </span>
                  {t.experience_level && (
                    <span className="flex items-center gap-1">
                      <Video className="size-3.5" /> {t.experience_level}
                    </span>
                  )}
                  <span className="ml-auto">{formatDate(t.created_at)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                      <Users className="size-3" />
                      <span className="text-xs">Invited</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">{t.invitation_counts.total}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
                      <Clock className="size-3" />
                      <span className="text-xs">Pending</span>
                    </div>
                    <div className="text-lg font-bold text-amber-600">{t.invitation_counts.pending + t.invitation_counts.in_progress}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-500 mb-0.5">
                      <CheckCircle2 className="size-3" />
                      <span className="text-xs">Done</span>
                    </div>
                    <div className="text-lg font-bold text-emerald-600">{t.invitation_counts.completed}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
