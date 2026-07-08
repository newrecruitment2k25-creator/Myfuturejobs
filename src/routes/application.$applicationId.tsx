import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, Briefcase, Building2, MapPin, Calendar, FileText, Clock, ChevronRight, CheckCircle2, Circle, XCircle, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";
import { AppStatusStepper } from "@/components/app-status";
import type { AppStatus } from "@/lib/ops-api";

export const Route = createFileRoute("/application/$applicationId")({
  ssr: false,
  component: ApplicationDetailPage,
  head: () => ({ meta: [{ title: "Application Details — MYFutureJobs" }] }),
});

type TimelineEvent = {
  id: string;
  label: string;
  detail: string;
  date: string;
  icon: "status" | "activity" | "applied";
};

type JobDetail = {
  source: "employer" | "poc";
  job_title: string | null;
  company_name: string | null;
  location: string | null;
  salary: string | null;
  description: string | null;
  requirements: string | null;
  masco_code: string | null;
  industry: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function salaryDisplay(v: any): string {
  if (v?.salary) {
    const s = v.salary as string;
    return s.startsWith("RM") ? s : `RM ${s}`;
  }
  if (v?.salary_min != null && v?.salary_max != null) {
    return `RM ${Number(v.salary_min).toLocaleString()} – RM ${Number(v.salary_max).toLocaleString()}`;
  }
  if (v?.salary_min != null) return `From RM ${Number(v.salary_min).toLocaleString()}`;
  return "Salary not specified";
}

function ApplicationDetailPage() {
  const { applicationId } = Route.useParams();
  const { user } = useAuth();
  const { checked, loading: roleLoading } = useRoleGuard("job_seeker");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any | null>(null);
  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!checked || !user || !applicationId) return;
    (async () => {
      setLoading(true);
      try {
        // Load the application row (RLS ensures the jobseeker owns it)
        const { data: app, error: appErr } = await (supabase as any)
          .from("applications")
          .select("id, created_at, status, status_history, job_id, poc_vacancy_id, user_id, cover_letter, employer_notes")
          .eq("id", applicationId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (appErr || !app) {
          setError(appErr?.message ?? "Application not found.");
          setLoading(false);
          return;
        }
        setApplication(app);

        // Load job/vacancy details
        let detail: JobDetail | null = null;
        if (app.job_id) {
          const { data: job } = await supabase
            .from("jobs")
            .select("job_title, company_name, location, description, requirements, industry, employer_id")
            .eq("id", app.job_id)
            .maybeSingle();
          detail = {
            source: "employer",
            job_title: job?.job_title ?? null,
            company_name: job?.company_name ?? null,
            location: job?.location ?? null,
            salary: "Salary not specified",
            description: job?.description ?? null,
            requirements: job?.requirements ?? null,
            masco_code: job?.industry ?? null,
            industry: job?.industry ?? null,
          };
        } else if (app.poc_vacancy_id) {
          const { data: vac } = await (supabase as any)
            .from("poc_vacancies")
            .select("job_title, occupation_name, state, city, salary, salary_min, salary_max, job_description, skills")
            .eq("id", app.poc_vacancy_id)
            .maybeSingle();
          detail = {
            source: "poc",
            job_title: vac?.job_title ?? null,
            company_name: vac?.occupation_name ?? "PERKESO Vacancy",
            location: [vac?.state, vac?.city].filter(Boolean).join(", ") || null,
            salary: salaryDisplay(vac),
            description: vac?.job_description ?? null,
            requirements: vac?.skills ?? null,
            masco_code: vac?.occupation_name ?? null,
            industry: null,
          };
        }
        setJobDetail(detail);

        // Build timeline
        const events: TimelineEvent[] = [];
        events.push({
          id: `${app.id}-applied`,
          label: "Applied",
          detail: "You submitted your application.",
          date: app.created_at,
          icon: "applied",
        });

        const history: any[] = Array.isArray(app.status_history) ? app.status_history : [];
        history.forEach((h, idx) => {
          events.push({
            id: `${app.id}-hist-${idx}`,
            label: `Status changed to ${h.to ?? h.status ?? "Unknown"}`,
            detail: h.notes ? `Note: ${h.notes}` : `From ${h.from ?? "Applied"} to ${h.to ?? h.status ?? "Unknown"}`,
            date: h.changed_at ?? h.created_at ?? app.created_at,
            icon: "status",
          });
        });

        // Load related POC activity log entries (if any)
        try {
          const { data: logs } = await (supabase as any)
            .from("poc_activity_log")
            .select("id, created_at, activity_type, description, metadata")
            .eq("application_id", app.id)
            .order("created_at", { ascending: false })
            .limit(20);
          (logs ?? []).forEach((log: any) => {
            events.push({
              id: `${app.id}-log-${log.id}`,
              label: log.activity_type ?? "Activity",
              detail: log.description ?? "",
              date: log.created_at,
              icon: "activity",
            });
          });
        } catch {
          /* poc_activity_log may not exist or have different schema */
        }

        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setTimeline(events);
      } catch (e: any) {
        setError(e.message ?? "Failed to load application details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [checked, user, applicationId]);

  if (roleLoading || !checked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--base)" }}>
        <Loader2 className="size-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--base)" }}>
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
            <Loader2 className="size-6 animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        </main>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--base)" }}>
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
          <button onClick={() => void navigate({ to: "/dashboard" })} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 16 }}>
            <ArrowLeft className="size-4" /> Back to Dashboard
          </button>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 32, textAlign: "center" }}>
            <p style={{ color: "#dc2626", fontSize: 14 }}>{error ?? "Application not found."}</p>
          </div>
        </main>
      </div>
    );
  }

  const S = {
    card: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "16px 18px" } as React.CSSProperties,
    heading: { fontSize: 11, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        <button onClick={() => void navigate({ to: "/dashboard" })} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", padding: 0, width: "fit-content" }}>
          <ArrowLeft className="size-4" /> Back to Dashboard
        </button>

        {/* Header */}
        <div style={{ ...S.card, borderRadius: "var(--radius-md)", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(33,31,96,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Briefcase className="size-5" style={{ color: "var(--brand)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Application</p>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", margin: "2px 0 0", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {jobDetail?.job_title ?? "Unknown Job"}
              </h1>
            </div>
            <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>Applied {formatDate(application.created_at)}</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 20px", fontSize: 12, color: "var(--muted)" }}>
            {jobDetail?.company_name && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Building2 className="size-3.5" /> {jobDetail.company_name}</span>
            )}
            {jobDetail?.location && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin className="size-3.5" /> {jobDetail.location}</span>
            )}
            {jobDetail?.salary && jobDetail.salary !== "Salary not specified" && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontWeight: 700, color: "var(--brand)" }}>{jobDetail.salary}</span></span>
            )}
            {jobDetail?.masco_code && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><FileText className="size-3.5" /> MASCO: {jobDetail.masco_code}</span>
            )}
          </div>
        </div>

        {/* Status stepper */}
        <div style={S.card}>
          <p style={S.heading}><Clock className="size-4" style={{ color: "var(--accent)" }} /> Current Status</p>
          <AppStatusStepper status={(application.status ?? "applied") as AppStatus} />
        </div>

        {/* Job details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={S.card}>
            <p style={S.heading}><FileText className="size-4" style={{ color: "var(--accent)" }} /> Job Description</p>
            <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {jobDetail?.description ?? "No description provided."}
            </p>
          </div>
          <div style={S.card}>
            <p style={S.heading}><CheckCircle2 className="size-4" style={{ color: "var(--accent)" }} /> Requirements</p>
            <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {jobDetail?.requirements ?? "No requirements listed."}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div style={S.card}>
          <p style={S.heading}><History className="size-4" style={{ color: "var(--accent)" }} /> Application Timeline</p>
          {timeline.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>No timeline events yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
              {timeline.map((event, idx) => {
                const isLast = idx === timeline.length - 1;
                const Icon = event.icon === "applied" ? CheckCircle2 : event.icon === "status" ? Circle : History;
                return (
                  <div key={event.id} style={{ display: "flex", gap: 12, position: "relative" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: 24, flexShrink: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: event.icon === "applied" ? "var(--brand)" : "rgba(33,31,96,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon className="size-3" style={{ color: event.icon === "applied" ? "#fff" : "var(--brand)" }} />
                      </div>
                      {!isLast && <div style={{ width: 2, flex: 1, background: "var(--line)", margin: "4px 0" }} />}
                    </div>
                    <div style={{ paddingBottom: 18, flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", margin: 0 }}>{event.label}</p>
                      <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>{formatDateTime(event.date)}</p>
                      {event.detail && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>{event.detail}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
