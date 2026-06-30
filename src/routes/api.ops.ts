import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { insertNotification } from "@/lib/notifications";

// Bypass Supabase generated types for tables with runtime-migrated columns
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function verifyTokenAndRole(
  request: Request,
  allowedRoles: string[],
): Promise<{ ok: true; userId: string; role: string; email: string } | { ok: false; res: Response }> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, res: json({ error: "Missing Authorization header" }, 401) };

  const { data: ud, error: ue } = await supabaseAdmin.auth.getUser(token);
  if (ue || !ud?.user) return { ok: false, res: json({ error: "Invalid or expired token" }, 401) };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", ud.user.id)
    .maybeSingle();

  const role = profile?.role ?? "job_seeker";
  if (!allowedRoles.includes(role)) {
    return { ok: false, res: json({ error: "Insufficient permissions", role }, 403) };
  }

  return { ok: true, userId: ud.user.id, role, email: ud.user.email ?? "" };
}

async function logAudit(opts: {
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  module: string;
  severity: "Info" | "Warning" | "Critical";
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await (supabaseAdmin as any).from("admin_audit_logs").insert({
      actor_id: opts.actor_id,
      actor_email: opts.actor_email,
      actor_role: opts.actor_role,
      action: opts.action,
      module: opts.module,
      severity: opts.severity,
      entity_type: opts.entity_type ?? null,
      entity_id: opts.entity_id ?? null,
      metadata: opts.metadata ?? {},
    });
  } catch { /* non-blocking */ }
}

export const Route = createFileRoute("/api/ops")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        // ── run_migration ────────────────────────────────────────────────────
        if (action === "run_migration") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const migrations = [
            `CREATE TABLE IF NOT EXISTS admin_audit_logs (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              actor_id uuid REFERENCES auth.users(id),
              actor_email text,
              actor_role text,
              action text NOT NULL,
              module text NOT NULL,
              severity text NOT NULL DEFAULT 'Info',
              entity_type text,
              entity_id text,
              metadata jsonb DEFAULT '{}',
              created_at timestamptz NOT NULL DEFAULT now()
            )`,
            `CREATE TABLE IF NOT EXISTS placements (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              candidate_id uuid REFERENCES auth.users(id),
              employer_id uuid REFERENCES auth.users(id),
              job_id uuid,
              role_title text,
              salary numeric,
              placement_date date,
              status text NOT NULL DEFAULT 'Active',
              retention_status text NOT NULL DEFAULT 'Retained',
              industry text,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now()
            )`,
            `CREATE TABLE IF NOT EXISTS user_activity_logs (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id uuid REFERENCES auth.users(id),
              activity text NOT NULL,
              module text,
              metadata jsonb DEFAULT '{}',
              created_at timestamptz NOT NULL DEFAULT now()
            )`,
          ];

          const results: string[] = [];
          for (const sql of migrations) {
            const { error } = await db.rpc("exec_sql", { sql }).maybeSingle();
            results.push(error ? `skipped: ${error.message.slice(0, 60)}` : "ok");
          }
          return json({ results });
        }

        // ── admin_stats: dashboard KPIs ──────────────────────────────────────
        if (action === "admin_stats") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const [profilesRes, jobsRes, pocVacanciesRes, appsRes, analysesRes] = await Promise.all([
            supabaseAdmin.from("profiles").select("id, role", { count: "exact" }),
            supabaseAdmin.from("jobs").select("id", { count: "exact" }),
            supabaseAdmin.from("poc_vacancies").select("id", { count: "exact" }),
            supabaseAdmin.from("applications").select("id", { count: "exact" }),
            supabaseAdmin.from("analyses").select("id", { count: "exact" }),
          ]);

          const profiles = profilesRes.data ?? [];
          const roleCounts = profiles.reduce((acc: Record<string, number>, p) => {
            acc[p.role] = (acc[p.role] ?? 0) + 1;
            return acc;
          }, {});

          let interviewCount = 0;
          try {
            const { count } = await supabaseAdmin.from("interview_sessions").select("id", { count: "exact", head: true });
            interviewCount = count ?? 0;
          } catch { /* table may not exist */ }

          let placementCount = 0;
          try {
            const { count } = await (supabaseAdmin as any).from("placements").select("id", { count: "exact", head: true });
            placementCount = count ?? 0;
          } catch { /* table may not exist */ }

          let pocCandidateCount = 0;
          try {
            const { count } = await (supabaseAdmin as any).from("poc_candidates").select("id", { count: "exact", head: true });
            pocCandidateCount = count ?? 0;
          } catch { /* ignore */ }

          return json({
            total_users: profilesRes.count ?? profiles.length,
            job_seekers: roleCounts["job_seeker"] ?? 0,
            employers: roleCounts["employer"] ?? 0,
            admins: roleCounts["admin"] ?? 0,
            jobs: (jobsRes.count ?? 0) + (pocVacanciesRes.count ?? 0),
            applications: appsRes.count ?? 0,
            analyses: analysesRes.count ?? 0,
            interviews: interviewCount,
            placements: placementCount,
            poc_candidates: pocCandidateCount,
            total_candidates: (roleCounts["job_seeker"] ?? 0) + pocCandidateCount,
          });
        }

        // ── admin_daily_trend ────────────────────────────────────────────────
        if (action === "admin_daily_trend") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const days = parseInt(url.searchParams.get("days") ?? "60");
          const since = new Date(Date.now() - days * 86400000).toISOString();

          const [anaRes, appRes, intRes, placRes] = await Promise.all([
            supabaseAdmin.from("analyses").select("created_at").gte("created_at", since),
            supabaseAdmin.from("applications").select("created_at").gte("created_at", since),
            supabaseAdmin.from("interview_sessions").select("created_at").gte("created_at", since).limit(2000),
            (supabaseAdmin as any).from("placements").select("created_at").gte("created_at", since).limit(2000),
          ]);

          const bucket = (rows: any[]) => {
            const map: Record<string, number> = {};
            (rows ?? []).forEach((r: any) => {
              const d = (r.created_at as string).slice(0, 10);
              map[d] = (map[d] ?? 0) + 1;
            });
            return map;
          };

          const analyses     = bucket(anaRes.data ?? []);
          const applications = bucket(appRes.data ?? []);
          const interviews   = bucket(intRes.data ?? []);
          const placements   = bucket(placRes.data ?? []);

          // Build sorted day list
          const allDays = Array.from({ length: days }, (_, i) => {
            const d = new Date(Date.now() - (days - 1 - i) * 86400000);
            return d.toISOString().slice(0, 10);
          });

          const trend = allDays.map(d => ({
            date: d,
            analyses: analyses[d] ?? 0,
            applications: applications[d] ?? 0,
            interviews: interviews[d] ?? 0,
            placements: placements[d] ?? 0,
          }));

          return json({ trend });
        }

        // ── list_candidates ──────────────────────────────────────────────────
        if (action === "list_candidates") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const pocPage = parseInt(url.searchParams.get("poc_page") ?? "0");
          const pocLimit = 50;
          const pocOffset = pocPage * pocLimit;
          const search = url.searchParams.get("search") ?? "";
          const sourceFilter = url.searchParams.get("source") ?? "all";

          // ── Registered candidates ────────────────────────────────────────
          let registeredCandidates: any[] = [];
          if (sourceFilter !== "poc") {
            const { data: profiles } = await supabaseAdmin
              .from("profiles")
              .select("id, role, created_at")
              .eq("role", "job_seeker")
              .order("created_at", { ascending: false })
              .limit(200);

            const emailMap: Record<string, string> = {};
            try {
              const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
              authList?.users?.forEach(u => { emailMap[u.id] = u.email ?? ""; });
            } catch { /* ignore */ }

            const userIds = (profiles ?? []).map(p => p.id);
            const analysisMap: Record<string, any> = {};
            const appCountMap: Record<string, number> = {};
            let sessionMap: Record<string, { count: number; status: string }> = {};

            if (userIds.length > 0) {
              const { data: analyses } = await supabaseAdmin
                .from("analyses").select("user_id, overall_score, industry, experience_level")
                .in("user_id", userIds).order("created_at", { ascending: false });
              (analyses ?? []).forEach(a => { if (!analysisMap[a.user_id!]) analysisMap[a.user_id!] = a; });

              const { data: appRows } = await supabaseAdmin
                .from("applications").select("user_id").in("user_id", userIds);
              (appRows ?? []).forEach(a => { appCountMap[a.user_id!] = (appCountMap[a.user_id!] ?? 0) + 1; });

              try {
                const { data: sessions } = await supabaseAdmin
                  .from("interview_sessions").select("user_id, status").in("user_id", userIds);
                (sessions ?? []).forEach((s: any) => {
                  if (!sessionMap[s.user_id]) sessionMap[s.user_id] = { count: 0, status: s.status };
                  sessionMap[s.user_id].count++;
                  sessionMap[s.user_id].status = s.status;
                });
              } catch { /* ignore */ }
            }

            registeredCandidates = (profiles ?? []).map(p => ({
              source: "registered",
              id: p.id,
              candidate_id: null,
              email: emailMap[p.id] ?? "—",
              education_level: analysisMap[p.id]?.experience_level ?? null,
              field_of_study: analysisMap[p.id]?.industry ?? null,
              preferred_state: null,
              preferred_salary: null,
              previous_occupation: null,
              previous_years_experience: analysisMap[p.id]?.experience_level ?? null,
              skills: null,
              joined: p.created_at,
              overall_score: analysisMap[p.id]?.overall_score ?? null,
              has_analysis: !!analysisMap[p.id],
              application_count: appCountMap[p.id] ?? 0,
              interview_count: sessionMap[p.id]?.count ?? 0,
              interview_status: sessionMap[p.id]?.status ?? null,
              applications: appCountMap[p.id] ?? 0,
              interviews: sessionMap[p.id]?.count ?? 0,
              offers: 0,
            })).filter(c => {
              if (!search) return true;
              const q = search.toLowerCase();
              return c.email.toLowerCase().includes(q) || (c.field_of_study ?? "").toLowerCase().includes(q);
            });
          }

          // ── POC candidates (paginated) ────────────────────────────────────
          let pocCandidates: any[] = [];
          let pocTotal = 0;
          if (sourceFilter !== "registered") {
            try {
              let pocQ = (supabaseAdmin as any).from("poc_candidates").select("*", { count: "exact" });
              if (search) {
                pocQ = pocQ.or(`skills.ilike.%${search}%,preferred_state.ilike.%${search}%,education_level.ilike.%${search}%,previous_occupation.ilike.%${search}%,preferred_occupation.ilike.%${search}%,candidate_id.ilike.%${search}%`);
              }
              pocQ = pocQ.range(pocOffset, pocOffset + pocLimit - 1);
              const { data: poc, count } = await pocQ;
              pocTotal = count ?? 0;

              if (poc && poc.length > 0) {
                const pocIds = poc.map((c: any) => c.id);
                const { data: behaviour } = await (supabaseAdmin as any)
                  .from("poc_behaviour").select("candidate_id, total_applications, total_interviews, total_offers")
                  .in("candidate_id", pocIds);
                const bMap = new Map((behaviour ?? []).map((b: any) => [b.candidate_id, b]));

                pocCandidates = poc.map((c: any) => {
                  const b = bMap.get(c.id);
                  return {
                    source: "poc",
                    id: c.id,
                    candidate_id: c.candidate_id,
                    email: c.candidate_id ?? "—",
                    education_level: c.education_level,
                    field_of_study: c.field_of_study,
                    preferred_state: c.preferred_state,
                    preferred_salary: c.preferred_salary,
                    previous_occupation: c.previous_occupation,
                    preferred_occupation: c.preferred_occupation,
                    previous_years_experience: c.previous_years_experience,
                    skills: c.skills,
                    joined: null,
                    overall_score: null,
                    has_analysis: false,
                    application_count: b?.total_applications ?? 0,
                    interview_count: b?.total_interviews ?? 0,
                    interview_status: null,
                    applications: b?.total_applications ?? 0,
                    interviews: b?.total_interviews ?? 0,
                    offers: b?.total_offers ?? 0,
                  };
                });
              }
            } catch (e) {
              console.error("[list_candidates] poc query error:", e);
            }
          }

          const all = [...registeredCandidates, ...pocCandidates];
          return json({
            candidates: all,
            registered_count: registeredCandidates.length,
            poc_total: pocTotal,
            poc_page: pocPage,
            poc_limit: pocLimit,
            total: registeredCandidates.length + pocTotal,
          });
        }

        // ── list_employers ───────────────────────────────────────────────────
        if (action === "list_employers") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const { data: profiles, error: pe } = await supabaseAdmin
            .from("profiles")
            .select("id, role, created_at")
            .eq("role", "employer")
            .order("created_at", { ascending: false })
            .limit(100);

          if (pe) return json({ error: pe.message }, 500);
          if (!profiles?.length) return json({ employers: [] });

          const userIds = profiles.map(p => p.id);

          const emailMap: Record<string, string> = {};
          try {
            const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
            authList?.users?.forEach(u => { emailMap[u.id] = u.email ?? ""; });
          } catch { /* ignore */ }

          const { data: jobs } = await supabaseAdmin
            .from("jobs")
            .select("user_id, id")
            .in("user_id", userIds);

          const jobCountMap: Record<string, number> = {};
          const jobIds: string[] = [];
          (jobs ?? []).forEach((j: any) => {
            jobCountMap[j.user_id] = (jobCountMap[j.user_id] ?? 0) + 1;
            jobIds.push(j.id);
          });

          let appCountMap: Record<string, number> = {};
          if (jobIds.length) {
            const { data: appRows } = await supabaseAdmin
              .from("applications")
              .select("job_id")
              .in("job_id", jobIds);
            const jobToUser: Record<string, string> = {};
            (jobs ?? []).forEach((j: any) => { jobToUser[j.id] = j.user_id; });
            (appRows ?? []).forEach((a: any) => {
              const uid = jobToUser[a.job_id];
              if (uid) appCountMap[uid] = (appCountMap[uid] ?? 0) + 1;
            });
          }

          let interviewCountMap: Record<string, number> = {};
          try {
            const { data: sessions } = await supabaseAdmin
              .from("interview_sessions")
              .select("employer_id")
              .in("employer_id", userIds);
            (sessions ?? []).forEach((s: any) => {
              interviewCountMap[s.employer_id] = (interviewCountMap[s.employer_id] ?? 0) + 1;
            });
          } catch { /* ignore */ }

          const employers = profiles.map(p => ({
            id: p.id,
            email: emailMap[p.id] ?? "—",
            joined: p.created_at,
            job_count: jobCountMap[p.id] ?? 0,
            application_count: appCountMap[p.id] ?? 0,
            interview_count: interviewCountMap[p.id] ?? 0,
          }));

          return json({ employers });
        }

        // ── list_placements ──────────────────────────────────────────────────
        if (action === "list_placements") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          try {
            const { data, error } = await (supabaseAdmin as any)
              .from("placements")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(100);

            if (error) return json({ placements: [], demo: true });

            const emailMap: Record<string, string> = {};
            try {
              const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
              authList?.users?.forEach((u: any) => { emailMap[u.id] = u.email ?? ""; });
            } catch { /* ignore */ }

            const enriched = (data ?? []).map((p: any) => ({
              ...p,
              candidate_email: emailMap[p.candidate_id] ?? "—",
              employer_email: emailMap[p.employer_id] ?? "—",
            }));

            return json({ placements: enriched });
          } catch {
            return json({ placements: [], demo: true });
          }
        }

        // ── system_stats: real table counts ──────────────────────────────────
        if (action === "system_stats") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const tables = ["profiles", "jobs", "applications", "analyses"];
          const counts: Record<string, number> = {};

          for (const t of tables) {
            const { count } = await supabaseAdmin.from(t as any).select("id", { count: "exact", head: true });
            counts[t] = count ?? 0;
          }

          const optionalTables = [
            "interview_sessions", "interview_templates", "placements", "admin_audit_logs",
            "user_activity_logs", "poc_vacancies", "poc_candidates", "poc_match_results",
            "poc_activity_log", "notifications", "system_config", "masco_taxonomy",
          ];
          for (const t of optionalTables) {
            try {
              const { count } = await (supabaseAdmin as any).from(t).select("id", { count: "exact", head: true });
              counts[t] = count ?? 0;
            } catch { counts[t] = -1; }
          }

          // Role breakdown
          const { data: profileData } = await supabaseAdmin.from("profiles").select("role");
          const roleCounts: Record<string, number> = {};
          (profileData ?? []).forEach((p: any) => { roleCounts[p.role] = (roleCounts[p.role] ?? 0) + 1; });
          counts["job_seekers"] = roleCounts["job_seeker"] ?? 0;
          counts["employers"] = roleCounts["employer"] ?? 0;
          counts["admins"] = roleCounts["admin"] ?? 0;

          return json({ counts });
        }

        // ── list_config ───────────────────────────────────────────────────────
        if (action === "list_config") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          try {
            const { data, error } = await (supabaseAdmin as any)
              .from("system_config")
              .select("*")
              .order("category")
              .order("key");
            if (error) return json({ configs: [], error: error.message });
            return json({ configs: data ?? [] });
          } catch {
            return json({ configs: [], error: "system_config table not found" });
          }
        }

        // ── list_taxonomy ─────────────────────────────────────────────────────
        if (action === "list_taxonomy") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          try {
            const { data, error } = await (supabaseAdmin as any)
              .from("masco_taxonomy")
              .select("*")
              .order("code")
              .limit(500);
            if (error) return json({ taxonomy: [], error: error.message });
            return json({ taxonomy: data ?? [] });
          } catch {
            return json({ taxonomy: [], error: "masco_taxonomy table not found" });
          }
        }

        // ── get_user_detail ──────────────────────────────────────────────────
        if (action === "get_user_detail") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const userId = url.searchParams.get("user_id");
          if (!userId) return json({ error: "user_id required" }, 400);

          let email = "—";
          let lastLogin: string | null = null;
          try {
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
            email = u?.user?.email ?? "—";
            lastLogin = u?.user?.last_sign_in_at ?? null;
          } catch { /* ignore */ }

          const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
          const { count: analysisCount } = await supabaseAdmin.from("analyses").select("id", { count: "exact", head: true }).eq("user_id", userId);
          const { count: appCount } = await supabaseAdmin.from("applications").select("id", { count: "exact", head: true }).eq("user_id", userId);

          let interviewCount = 0;
          try {
            const { count } = await supabaseAdmin.from("interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId);
            interviewCount = count ?? 0;
          } catch { /* ignore */ }

          return json({ email, lastLogin, profile, analysisCount: analysisCount ?? 0, appCount: appCount ?? 0, interviewCount });
        }

        // ── list_profiles ────────────────────────────────────────────────────
        if (action === "list_profiles") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const { data: profiles, error } = await supabaseAdmin
            .from("profiles")
            .select("id, role, created_at, updated_at")
            .order("created_at", { ascending: false })
            .limit(300);

          if (error) return json({ error: error.message }, 500);

          const emailMap: Record<string, string> = {};
          const lastLoginMap: Record<string, string | null> = {};
          try {
            const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
            authList?.users?.forEach(u => {
              emailMap[u.id] = u.email ?? "";
              lastLoginMap[u.id] = u.last_sign_in_at ?? null;
            });
          } catch { /* ignore */ }

          const userIds = (profiles ?? []).map(p => p.id);
          const { data: analysisRows } = await supabaseAdmin.from("analyses").select("user_id").in("user_id", userIds);
          const { data: appRows } = await supabaseAdmin.from("applications").select("user_id").in("user_id", userIds);

          const analysisCountMap: Record<string, number> = {};
          (analysisRows ?? []).forEach(a => { analysisCountMap[a.user_id!] = (analysisCountMap[a.user_id!] ?? 0) + 1; });

          const appCountMap: Record<string, number> = {};
          (appRows ?? []).forEach(a => { appCountMap[a.user_id!] = (appCountMap[a.user_id!] ?? 0) + 1; });

          let interviewCountMap: Record<string, number> = {};
          try {
            const { data: sessions } = await supabaseAdmin.from("interview_sessions").select("user_id").in("user_id", userIds);
            (sessions ?? []).forEach((s: any) => { interviewCountMap[s.user_id] = (interviewCountMap[s.user_id] ?? 0) + 1; });
          } catch { /* ignore */ }

          const result = (profiles ?? []).map(p => ({
            ...p,
            email: emailMap[p.id] ?? "—",
            last_login: lastLoginMap[p.id] ?? null,
            analysis_count: analysisCountMap[p.id] ?? 0,
            app_count: appCountMap[p.id] ?? 0,
            interview_count: interviewCountMap[p.id] ?? 0,
          }));

          return json({ profiles: result });
        }

        // ── list_audit_logs ──────────────────────────────────────────────────
        if (action === "list_audit_logs") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const severity = url.searchParams.get("severity");
          const module = url.searchParams.get("module");
          const actor = url.searchParams.get("actor");

          try {
            let q = (supabaseAdmin as any)
              .from("admin_audit_logs")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(300);

            if (severity) q = q.ilike("severity", severity);
            if (module) q = q.ilike("module", module);
            if (actor) q = q.ilike("actor_email", `%${actor}%`);

            const { data, error } = await q;
            if (error) return json({ logs: [], demo: true });
            return json({ logs: data ?? [] });
          } catch {
            return json({ logs: [], demo: true });
          }
        }

        // ── list_job_applications ────────────────────────────────────────────
        if (action === "list_job_applications") {
          const auth = await verifyTokenAndRole(request, ["employer", "admin"]);
          if (!auth.ok) return auth.res;

          const jobId = url.searchParams.get("job_id");
          if (!jobId) return json({ error: "job_id required" }, 400);

          if (auth.role === "employer") {
            const { data: job } = await db.from("jobs").select("employer_id").eq("id", jobId).maybeSingle();
            if (job && job.employer_id !== auth.userId) return json({ error: "Not your vacancy" }, 403);
          }

          let { data: apps, error: ae } = await db
            .from("applications")
            .select("id, user_id, status, notes, status_history, created_at, updated_by")
            .eq("job_id", jobId)
            .order("created_at", { ascending: false });

          if (ae) return json({ error: ae.message }, 500);

          // Fallback: also check poc_vacancy_id for POC jobs
          if (!apps?.length) {
            const { data: pocApps } = await db
              .from("applications")
              .select("id, user_id, status, notes, status_history, created_at, updated_by")
              .eq("poc_vacancy_id", jobId)
              .order("created_at", { ascending: false });
            apps = pocApps ?? [];
          }

          if (!apps?.length) return json({ applications: [] });

          const userIds: string[] = [...(new Set(apps.map((a: any) => a.user_id as string)) as Set<string>)];
          const emailMap: Record<string, string> = {};
          try {
            const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
            authList?.users?.forEach((u: any) => { emailMap[u.id] = u.email ?? ""; });
          } catch { /* ignore */ }

          const { data: analyses } = await db
            .from("analyses")
            .select("user_id, overall_score, industry, experience_level")
            .in("user_id", userIds)
            .order("created_at", { ascending: false });
          const analysisMap: Record<string, any> = {};
          (analyses ?? []).forEach((a: any) => { if (!analysisMap[a.user_id]) analysisMap[a.user_id] = a; });

          let sessionMap: Record<string, { score: number | null; status: string; id: string }> = {};
          try {
            const { data: sessions } = await db
              .from("interview_sessions")
              .select("user_id, overall_score, status, id")
              .in("user_id", userIds)
              .order("created_at", { ascending: false });
            (sessions ?? []).forEach((s: any) => { if (!sessionMap[s.user_id]) sessionMap[s.user_id] = { score: s.overall_score, status: s.status, id: s.id }; });
          } catch { /* ignore */ }

          const enriched = apps.map((a: any) => ({
            ...a,
            candidate_email: emailMap[a.user_id] ?? "—",
            overall_score: analysisMap[a.user_id]?.overall_score ?? null,
            industry: analysisMap[a.user_id]?.industry ?? null,
            experience_level: analysisMap[a.user_id]?.experience_level ?? null,
            interview_score: sessionMap[a.user_id]?.score ?? null,
            interview_status: sessionMap[a.user_id]?.status ?? null,
            interview_session_id: sessionMap[a.user_id]?.id ?? null,
          }));

          return json({ applications: enriched });
        }

        // ── employer_applications ─────────────────────────────────────────────
        if (action === "employer_applications") {
          const auth = await verifyTokenAndRole(request, ["employer", "admin"]);
          if (!auth.ok) return auth.res;

          const empId = auth.userId;
          console.log("[ea] employer userId:", empId);

          // Step 1: jobs owned by this employer (service role — bypasses RLS)
          const { data: myJobs, error: jobErr } = await supabaseAdmin
            .from("jobs")
            .select("id, job_title")
            .eq("employer_id", empId);
          console.log("[ea] job query error:", jobErr?.message ?? "none");
          console.log("[ea] jobs found:", myJobs?.length ?? 0, JSON.stringify(myJobs?.map((j: any) => j.id)));

          const jobIds = (myJobs ?? []).map((j: any) => j.id as string);
          const titleMap: Record<string, string> = {};
          (myJobs ?? []).forEach((j: any) => { titleMap[j.id] = j.job_title; });

          if (jobIds.length === 0) {
            console.log("[ea] No jobs — returning empty");
            return json({ applications: [] });
          }

          // Step 2: applications for those jobs (service role — bypasses RLS)
          const { data: apps, error: appErr } = await supabaseAdmin
            .from("applications")
            .select("id, user_id, job_id, poc_vacancy_id, status, created_at")
            .in("job_id", jobIds)
            .order("created_at", { ascending: false });
          console.log("[ea] app query error:", appErr?.message ?? "none");
          console.log("[ea] applications found:", apps?.length ?? 0);

          if (!apps || apps.length === 0) return json({ applications: [] });

          // Step 3: resolve emails via auth admin (service role)
          const userIds = [...new Set(apps.map((a: any) => a.user_id as string))];
          const emailMap: Record<string, string> = {};
          try {
            const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
            (authList?.users ?? []).forEach((u: any) => { emailMap[u.id] = u.email ?? ""; });
          } catch (e) { console.log("[ea] email resolution error:", e); }

          // Step 4: CV scores
          const { data: analyses } = await supabaseAdmin
            .from("analyses")
            .select("user_id, overall_score, industry, experience_level")
            .in("user_id", userIds)
            .order("created_at", { ascending: false });
          const analysisMap: Record<string, any> = {};
          (analyses ?? []).forEach((a: any) => { if (!analysisMap[a.user_id]) analysisMap[a.user_id] = a; });

          const enriched = apps.map((a: any) => ({
            ...a,
            job_title: titleMap[a.job_id] ?? "Unknown Job",
            candidate_email: emailMap[a.user_id] ?? "—",
            overall_score: analysisMap[a.user_id]?.overall_score ?? null,
            industry: analysisMap[a.user_id]?.industry ?? null,
            experience_level: analysisMap[a.user_id]?.experience_level ?? null,
          }));

          console.log("[ea] enriched count:", enriched.length);
          return json({ applications: enriched });
        }

        // ── employer_candidate ────────────────────────────────────────────────
        if (action === "employer_candidate") {
          const auth = await verifyTokenAndRole(request, ["employer", "admin"]);
          if (!auth.ok) return auth.res;

          const candidateId = url.searchParams.get("candidate_id");
          if (!candidateId) return json({ error: "candidate_id required" }, 400);

          console.log("[ec] looking up candidate:", candidateId);

          // 1. Resolve email + name via auth admin (service role)
          let candidateEmail = "";
          let candidateName = "";
          try {
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(candidateId);
            candidateEmail = u?.user?.email ?? "";
            candidateName = (u?.user?.user_metadata?.full_name as string | undefined) ?? "";
            console.log("[ec] email:", candidateEmail, "name:", candidateName);
          } catch (e) { console.log("[ec] auth lookup error:", e); }

          // 2. Fetch analyses (service role — bypasses RLS)
          const { data: analyses, error: anaErr } = await supabaseAdmin
            .from("analyses")
            .select("id, created_at, overall_score, industry, experience_level, full_results")
            .eq("user_id", candidateId)
            .order("created_at", { ascending: false })
            .limit(5);
          console.log("[ec] analysesCount:", analyses?.length ?? 0, "error:", anaErr?.message ?? "none");

          // 3. Fetch employer's jobs then candidate's applications to those jobs (service role)
          const { data: myJobs } = await supabaseAdmin
            .from("jobs")
            .select("id, job_title")
            .eq("employer_id", auth.userId);
          const jobIds = (myJobs ?? []).map((j: any) => j.id as string);
          const titleMap: Record<string, string> = {};
          (myJobs ?? []).forEach((j: any) => { titleMap[j.id] = j.job_title; });

          let enrichedApps: any[] = [];
          if (jobIds.length > 0) {
            const { data: apps } = await (supabaseAdmin as any)
              .from("applications")
              .select("id, created_at, status, job_id")
              .eq("user_id", candidateId)
              .in("job_id", jobIds)
              .order("created_at", { ascending: false });
            enrichedApps = (apps ?? []).map((a: any) => ({
              ...a,
              status: (a.status ?? "applied").toLowerCase(),
              job_title: titleMap[a.job_id] ?? "Unknown",
            }));
          }

          return json({
            email: candidateEmail,
            name: candidateName,
            analysis: analyses?.[0] ?? null,
            applications: enrichedApps,
          });
        }

        // ── debug_employer_jobs (temporary) ──────────────────────────────────
        if (action === "debug_employer_jobs") {
          const { data: jobs, error: je } = await db
            .from("jobs")
            .select("id, job_title, employer_id, created_at")
            .order("created_at", { ascending: false })
            .limit(20);
          return json({ jobs, error: je });
        }

        // ── debug_applications (temporary) ───────────────────────────────────
        if (action === "debug_applications") {
          const { data: allDbApps, error: dbErr } = await db
            .from("applications")
            .select("id, user_id, job_id, poc_vacancy_id, status, created_at")
            .order("created_at", { ascending: false })
            .limit(20);
          console.log("[debug] ALL applications:", JSON.stringify(allDbApps));
          console.log("[debug] Error:", dbErr);
          return json({ data: allDbApps, error: dbErr });
        }

        // ── list_employer_applications ───────────────────────────────────────
        if (action === "list_employer_applications") {
          const auth = await verifyTokenAndRole(request, ["employer", "admin"]);
          if (!auth.ok) return auth.res;

          // Step 1: Get employer's jobs
          const { data: myJobs } = await db
            .from("jobs")
            .select("id, job_title")
            .eq("employer_id", auth.userId);

          console.log("[emp-apps] Employer jobs:", JSON.stringify(myJobs));

          const jobIds: string[] = (myJobs ?? []).map((j: any) => j.id as string);
          const jobTitles: string[] = (myJobs ?? []).map((j: any) => (j.job_title as string)?.toLowerCase()).filter(Boolean);
          const jobTitleMap: Record<string, string> = {};
          (myJobs ?? []).forEach((j: any) => { jobTitleMap[j.id] = j.job_title; });

          // Step 2: Get ALL applications (fetch-all, filter in memory to avoid UUID/string type issues)
          const { data: allApps, error: appErr } = await db
            .from("applications")
            .select("id, user_id, job_id, poc_vacancy_id, status, notes, status_history, created_at, updated_by")
            .order("created_at", { ascending: false })
            .limit(500);

          console.log("[emp-apps] Total applications in DB:", allApps?.length ?? 0);
          console.log("[emp-apps] App error:", appErr);

          if (!allApps || allApps.length === 0) return json({ applications: [] });

          // Step 3: Direct job_id match (string comparison to avoid UUID cast issues)
          const matchedApps: any[] = [];
          const seen = new Set<string>();

          const directMatches = allApps.filter((a: any) => a.job_id && jobIds.includes(String(a.job_id)));
          console.log("[emp-apps] Direct job_id matches:", directMatches.length);
          for (const a of directMatches) { if (!seen.has(a.id)) { seen.add(a.id); matchedApps.push(a); } }

          // Step 4: POC vacancy title match
          if (jobTitles.length > 0) {
            const titleFilter = jobTitles.map((t: string) => `job_title.ilike.%25${encodeURIComponent(t)}%25`).join(",");
            const { data: matchingPocVacs } = await db
              .from("poc_vacancies")
              .select("id, job_title")
              .or(jobTitles.map((t: string) => `job_title.ilike.%${t}%`).join(","))
              .limit(100);

            const pocIds: string[] = (matchingPocVacs ?? []).map((v: any) => String(v.id));
            console.log("[emp-apps] Matching POC vacancy IDs:", pocIds);
            (matchingPocVacs ?? []).forEach((v: any) => {
              const match = (myJobs ?? []).find((j: any) => (j.job_title as string)?.toLowerCase().includes((v.job_title as string)?.toLowerCase()) || (v.job_title as string)?.toLowerCase().includes((j.job_title as string)?.toLowerCase()));
              if (match) jobTitleMap[String(v.id)] = match.job_title;
            });

            if (pocIds.length > 0) {
              const pocMatches = allApps.filter((a: any) => a.poc_vacancy_id && pocIds.includes(String(a.poc_vacancy_id)));
              console.log("[emp-apps] POC vacancy matches:", pocMatches.length);
              for (const a of pocMatches) { if (!seen.has(a.id)) { seen.add(a.id); matchedApps.push(a); } }
            }
          }

          console.log("[emp-apps] Total matched:", matchedApps.length);
          if (matchedApps.length === 0) return json({ applications: [] });

          // Step 5: Resolve real emails
          const userIds: string[] = [...new Set(matchedApps.map((a: any) => a.user_id as string).filter(Boolean))];
          const emailMap: Record<string, string> = {};
          try {
            const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
            (authList?.users ?? []).forEach((u: any) => { emailMap[u.id] = u.email ?? ""; });
          } catch (e) { console.log("[emp-apps] Email resolution failed:", e); }

          // Step 6: Resolve CV scores
          const { data: analyses } = await db
            .from("analyses")
            .select("user_id, overall_score, industry, experience_level")
            .in("user_id", userIds)
            .order("created_at", { ascending: false });
          const analysisMap: Record<string, any> = {};
          (analyses ?? []).forEach((a: any) => { if (!analysisMap[a.user_id]) analysisMap[a.user_id] = a; });

          // Step 7: Resolve POC vacancy titles for poc_vacancy_id apps
          const pocVacIds = matchedApps.filter((a: any) => a.poc_vacancy_id && !a.job_id).map((a: any) => String(a.poc_vacancy_id));
          if (pocVacIds.length > 0) {
            const { data: pocVacs } = await db.from("poc_vacancies").select("id, job_title").in("id", pocVacIds);
            (pocVacs ?? []).forEach((v: any) => { if (!jobTitleMap[String(v.id)]) jobTitleMap[String(v.id)] = v.job_title; });
          }

          const enriched = matchedApps.map((a: any) => ({
            ...a,
            job_title: jobTitleMap[String(a.job_id)] ?? jobTitleMap[String(a.poc_vacancy_id)] ?? "Unknown Job",
            candidate_email: emailMap[a.user_id] ?? a.user_id ?? "—",
            overall_score: analysisMap[a.user_id]?.overall_score ?? null,
            industry: analysisMap[a.user_id]?.industry ?? null,
            experience_level: analysisMap[a.user_id]?.experience_level ?? null,
          }));

          enriched.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return json({ applications: enriched });
        }

        // ── get_candidate (admin view) ───────────────────────────────────────
        if (action === "get_candidate") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const candidateId = url.searchParams.get("candidate_id");
          if (!candidateId) return json({ error: "candidate_id required" }, 400);

          let email = "—";
          try {
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(candidateId);
            email = u?.user?.email ?? "—";
          } catch { /* ignore */ }

          const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", candidateId).maybeSingle();
          const { data: analyses } = await supabaseAdmin.from("analyses").select("*").eq("user_id", candidateId).order("created_at", { ascending: false }).limit(5);
          const { data: applications } = await supabaseAdmin.from("applications").select("*").eq("user_id", candidateId).order("created_at", { ascending: false }).limit(10);

          let interviewSessions: any[] = [];
          try {
            const { data } = await supabaseAdmin.from("interview_sessions").select("id, created_at, role_title, status, overall_score").eq("user_id", candidateId).order("created_at", { ascending: false }).limit(5);
            interviewSessions = data ?? [];
          } catch { /* ignore */ }

          return json({ email, profile, analyses: analyses ?? [], applications: applications ?? [], interviewSessions });
        }

        return json({ error: "Unknown action" }, 400);
      },

      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as any;
        if (!body?.action) return json({ error: "action required" }, 400);

        // ── update_user_role ─────────────────────────────────────────────────
        if (body.action === "update_user_role") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const { target_user_id, new_role } = body;
          const validRoles = ["job_seeker", "employer", "admin"];
          if (!target_user_id || !validRoles.includes(new_role)) {
            return json({ error: "target_user_id and valid new_role required" }, 400);
          }

          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ role: new_role, updated_at: new Date().toISOString() })
            .eq("id", target_user_id);

          if (error) return json({ error: error.message }, 500);

          await logAudit({
            actor_id: auth.userId,
            actor_email: auth.email,
            actor_role: auth.role,
            action: `User role changed to ${new_role}`,
            module: "User Management",
            severity: "Warning",
            entity_type: "user",
            entity_id: target_user_id,
            metadata: { target_user_id, new_role },
          });

          return json({ ok: true });
        }

        // ── create_placement ─────────────────────────────────────────────────
        if (body.action === "create_placement") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const { candidate_id, employer_id, job_id, role_title, salary, placement_date, industry } = body;
          if (!candidate_id) return json({ error: "candidate_id required" }, 400);

          try {
            const { data, error } = await (supabaseAdmin as any)
              .from("placements")
              .insert({ candidate_id, employer_id, job_id, role_title, salary, placement_date, industry, status: "Active", retention_status: "Retained" })
              .select()
              .single();

            if (error) return json({ error: error.message }, 500);

            await logAudit({
              actor_id: auth.userId,
              actor_email: auth.email,
              actor_role: auth.role,
              action: `Placement recorded for candidate`,
              module: "Placements",
              severity: "Info",
              entity_type: "placement",
              entity_id: data.id,
              metadata: { candidate_id, employer_id, role_title },
            });

            return json({ placement: data });
          } catch (e: any) {
            return json({ error: "placements table not created yet. Run migration first.", code: "table_missing" }, 503);
          }
        }

        // ── update_application_status ────────────────────────────────────────
        if (body.action === "update_application_status") {
          const auth = await verifyTokenAndRole(request, ["employer", "admin"]);
          if (!auth.ok) return auth.res;

          const { application_id, new_status, notes } = body;
          const VALID_STATUSES = ["applied", "shortlisted", "interview", "kiv", "offered", "hired", "rejected"];
          if (!application_id || !VALID_STATUSES.includes(new_status)) {
            return json({ error: "application_id and valid new_status required" }, 400);
          }

          const { data: existing, error: fetchErr } = await (supabaseAdmin as any)
            .from("applications")
            .select("id, status, status_history, user_id, job_id, poc_vacancy_id")
            .eq("id", application_id)
            .maybeSingle();

          console.log("[uas] applicationId:", application_id, "oldStatus:", existing?.status, "newStatus:", new_status);
          if (fetchErr || !existing) return json({ error: "Application not found" }, 404);

          if (auth.role === "employer") {
            const { data: job } = await (supabaseAdmin as any)
              .from("jobs")
              .select("employer_id")
              .eq("id", existing.job_id)
              .maybeSingle();
            console.log("[uas] job.employer_id:", job?.employer_id, "auth.userId:", auth.userId);
            if (!job || job.employer_id !== auth.userId) {
              return json({ error: "Not your vacancy" }, 403);
            }
          }

          const historyEntry = {
            from: existing.status as string,
            to: new_status,
            changed_by: auth.userId,
            changed_by_email: auth.email,
            changed_at: new Date().toISOString(),
            notes: notes ?? null,
          };

          const currentHistory: any[] = Array.isArray(existing.status_history) ? existing.status_history : [];

          const { error: updateErr, data: updatedRows } = await (supabaseAdmin as any)
            .from("applications")
            .update({
              status: new_status,
              notes: notes ?? null,
              updated_by: auth.userId,
              status_history: [...currentHistory, historyEntry],
            })
            .eq("id", application_id)
            .select("id");
          const rowsUpdated = (updatedRows as any[])?.length ?? 0;

          console.log("[uas] rowsUpdated:", rowsUpdated, "updateErr:", (updateErr as any)?.message ?? "none");
          if (updateErr) return json({ error: (updateErr as any).message }, 500);

          // Log activity for jobseeker milestone stepper
          try {
            await (supabaseAdmin as any).from("poc_activity_log").insert({
              candidate_id: existing.user_id,
              activity_type: "application_status",
              description: `Application status changed to ${new_status}`,
              application_id,
              job_id: existing.job_id,
              metadata: { from: existing.status, to: new_status },
              created_at: new Date().toISOString(),
            });
          } catch (logErr) {
            console.log("[uas] poc_activity_log insert skipped (table may differ):", (logErr as any)?.message);
          }

          await logAudit({
            actor_id: auth.userId,
            actor_email: auth.email,
            actor_role: auth.role,
            action: `Application status changed: ${existing.status} → ${new_status}`,
            module: "Applications",
            severity: new_status === "hired" ? "Info" : new_status === "rejected" ? "Warning" : "Info",
            entity_type: "application",
            entity_id: application_id,
            metadata: { application_id, from: existing.status, to: new_status, candidate_id: existing.user_id },
          });

          // Notify the jobseeker of the status change
          let jobTitle = "a position";
          if (existing.job_id) {
            const { data: jobRow } = await db.from("jobs").select("job_title").eq("id", existing.job_id).maybeSingle();
            jobTitle = jobRow?.job_title ?? jobTitle;
          } else if (existing.poc_vacancy_id) {
            const { data: pocRow } = await (db as any).from("poc_vacancies").select("job_title").eq("id", existing.poc_vacancy_id).maybeSingle();
            jobTitle = pocRow?.job_title ?? jobTitle;
          }
          const statusLabels: Record<string, string> = {
            applied: "Applied", shortlisted: "Shortlisted", interview: "Interview",
            kiv: "Kept In View", offered: "Offered", hired: "Hired", rejected: "Not Progressed",
          };
          const notifyCount = await insertNotification({
            user_id: existing.user_id,
            title: "Application Status Updated",
            message: `Your application for "${jobTitle}" has been updated to: ${statusLabels[new_status] ?? new_status}.${notes ? ` Note: ${notes}` : ""}`,
            type: new_status === "hired" || new_status === "offered" ? "success" : new_status === "rejected" ? "warning" : "info",
            link: `/application/${application_id}`,
            metadata: { application_id, new_status },
          });
          console.log("[update_application_status] notification inserted count:", notifyCount, "for user", existing.user_id);

          return json({ ok: true, new_status, notification_count: notifyCount });
        }

        // ── Helper: resolve application + job title for employer-owned actions ──
        async function resolveApplicationForEmployer(application_id: string, employerUserId: string | undefined) {
          const { data: app } = await (supabaseAdmin as any)
            .from("applications")
            .select("id, user_id, job_id, poc_vacancy_id")
            .eq("id", application_id)
            .maybeSingle();
          if (!app) return null;

          if (employerUserId && app.job_id) {
            const { data: job } = await (supabaseAdmin as any)
              .from("jobs")
              .select("employer_id, job_title")
              .eq("id", app.job_id)
              .maybeSingle();
            if (!job || job.employer_id !== employerUserId) return null;
            return { app, job_title: job.job_title ?? "a position" };
          }

          // For POC or admin, resolve title from poc_vacancies if needed
          let jobTitle = "a position";
          if (app.job_id) {
            const { data: job } = await (supabaseAdmin as any).from("jobs").select("job_title").eq("id", app.job_id).maybeSingle();
            jobTitle = job?.job_title ?? jobTitle;
          } else if (app.poc_vacancy_id) {
            const { data: poc } = await (supabaseAdmin as any).from("poc_vacancies").select("job_title").eq("id", app.poc_vacancy_id).maybeSingle();
            jobTitle = poc?.job_title ?? jobTitle;
          }
          return { app, job_title: jobTitle };
        }

        // ── send_ai_interview_invitation ─────────────────────────────────────
        if (body.action === "send_ai_interview_invitation") {
          const auth = await verifyTokenAndRole(request, ["employer", "admin"]);
          if (!auth.ok) return auth.res;

          const { application_id, template_id } = body;
          if (!application_id || !template_id) {
            return json({ error: "application_id and template_id required" }, 400);
          }

          const resolved = await resolveApplicationForEmployer(application_id, auth.role === "employer" ? auth.userId : undefined);
          if (!resolved) return json({ error: "Application not found or not your vacancy" }, 403);
          const { app, job_title } = resolved;

          // Verify template belongs to employer (or skip for admin)
          if (auth.role === "employer") {
            const { data: template } = await (supabaseAdmin as any)
              .from("interview_templates")
              .select("employer_id")
              .eq("id", template_id)
              .maybeSingle();
            if (!template || template.employer_id !== auth.userId) {
              return json({ error: "Interview template not found or not yours" }, 403);
            }
          }

          const deadline = new Date(Date.now() + 7 * 86400000).toISOString();
          const { data: invite, error: inviteErr } = await (supabaseAdmin as any)
            .from("interview_invitations")
            .insert({
              template_id,
              candidate_id: app.user_id,
              application_id,
              status: "pending",
              message: "You have been selected to complete a structured AI interview for this position. Please complete it before the deadline.",
              deadline,
            })
            .select("id")
            .single();

          if (inviteErr) return json({ error: (inviteErr as any).message }, 500);
          const invitation_id = invite?.id;

          try {
            await (supabaseAdmin as any).from("poc_activity_log").insert({
              candidate_id: app.user_id,
              activity_type: "ai_interview_invitation",
              description: `AI interview invitation sent for ${job_title}`,
              application_id,
              job_id: app.job_id ?? null,
              metadata: { invitation_id, template_id, source: "employer" },
              created_at: new Date().toISOString(),
            });
          } catch (logErr) {
            console.log("[ai_invite] poc_activity_log insert skipped:", (logErr as any)?.message);
          }

          await insertNotification({
            user_id: app.user_id,
            title: "AI Interview Invitation",
            message: `You have been invited to an AI interview for "${job_title}". Complete it before the deadline.`,
            type: "success",
            link: `/application/${application_id}`,
            metadata: { application_id, invitation_id, template_id, kind: "ai_interview" },
          });

          return json({ ok: true, invitation_id });
        }

        // ── schedule_practical_interview ───────────────────────────────────────
        if (body.action === "schedule_practical_interview") {
          const auth = await verifyTokenAndRole(request, ["employer", "admin"]);
          if (!auth.ok) return auth.res;

          const { application_id, date, time, location, mode, notes } = body;
          if (!application_id || !date || !time || !mode) {
            return json({ error: "application_id, date, time and mode required" }, 400);
          }

          const resolved = await resolveApplicationForEmployer(application_id, auth.role === "employer" ? auth.userId : undefined);
          if (!resolved) return json({ error: "Application not found or not your vacancy" }, 403);
          const { app, job_title } = resolved;

          const deadline = new Date(`${date}T${time}`).toISOString();
          const { data: invite, error: inviteErr } = await (supabaseAdmin as any)
            .from("interview_invitations")
            .insert({
              template_id: null,
              candidate_id: app.user_id,
              application_id,
              status: "practical_scheduled",
              message: notes ?? `Practical interview scheduled (${mode === "in_person" ? "In-person" : "Online"}).`,
              deadline,
              ai_summary: { type: "practical", mode, location: location ?? null, date, time, notes: notes ?? null },
            })
            .select("id")
            .single();

          if (inviteErr) return json({ error: (inviteErr as any).message }, 500);
          const invitation_id = invite?.id;

          try {
            await (supabaseAdmin as any).from("poc_activity_log").insert({
              candidate_id: app.user_id,
              activity_type: "practical_interview_scheduled",
              description: `Practical interview scheduled for ${job_title} on ${date} at ${time}`,
              application_id,
              job_id: app.job_id ?? null,
              metadata: { invitation_id, mode, location, date, time, notes },
              created_at: new Date().toISOString(),
            });
          } catch (logErr) {
            console.log("[practical_invite] poc_activity_log insert skipped:", (logErr as any)?.message);
          }

          await insertNotification({
            user_id: app.user_id,
            title: "Practical Interview Scheduled",
            message: `You have a ${mode === "in_person" ? "in-person" : "online"} interview for "${job_title}" on ${date} at ${time}.${location ? ` Location: ${location}.` : ""}`,
            type: "info",
            link: `/application/${application_id}`,
            metadata: { application_id, invitation_id, mode, location, date, time, kind: "practical_interview" },
          });

          return json({ ok: true, invitation_id });
        }

        // ── update_config ──────────────────────────────────────────────────────
        if (body.action === "update_config") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const { config_id, key, value } = body;
          if (!config_id && !key) return json({ error: "config_id or key required" }, 400);

          try {
            let q = (supabaseAdmin as any).from("system_config")
              .update({ value: JSON.stringify(value), updated_at: new Date().toISOString(), updated_by: auth.userId });
            if (config_id) q = q.eq("id", config_id);
            else q = q.eq("key", key);
            const { error } = await q;
            if (error) return json({ error: error.message }, 500);

            await logAudit({
              actor_id: auth.userId, actor_email: auth.email, actor_role: auth.role,
              action: `Config updated: ${key ?? config_id}`, module: "Configuration",
              severity: "Info", entity_type: "config", entity_id: key ?? config_id,
              metadata: { key, value },
            });
            return json({ ok: true });
          } catch (e: any) {
            return json({ error: e?.message ?? "Failed to update config" }, 500);
          }
        }

        // ── create_taxonomy ────────────────────────────────────────────────────
        if (body.action === "create_taxonomy") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const { code, title, level, parent_code, description, skills } = body;
          if (!code || !title) return json({ error: "code and title required" }, 400);

          try {
            const { data, error } = await (supabaseAdmin as any)
              .from("masco_taxonomy")
              .insert({ code, title, level: level ?? 1, parent_code: parent_code ?? null, description: description ?? null, skills: skills ?? [] })
              .select()
              .single();
            if (error) return json({ error: error.message }, 500);

            await logAudit({
              actor_id: auth.userId, actor_email: auth.email, actor_role: auth.role,
              action: `Taxonomy created: ${code} - ${title}`, module: "Taxonomy",
              severity: "Info", entity_type: "taxonomy", entity_id: code,
              metadata: { code, title, level },
            });
            return json({ entry: data });
          } catch (e: any) {
            return json({ error: e?.message ?? "Failed to create taxonomy" }, 500);
          }
        }

        // ── update_taxonomy ────────────────────────────────────────────────────
        if (body.action === "update_taxonomy") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const { taxonomy_id, ...updates } = body;
          if (!taxonomy_id) return json({ error: "taxonomy_id required" }, 400);
          delete updates.action;

          try {
            const { error } = await (supabaseAdmin as any)
              .from("masco_taxonomy")
              .update(updates)
              .eq("id", taxonomy_id);
            if (error) return json({ error: error.message }, 500);

            await logAudit({
              actor_id: auth.userId, actor_email: auth.email, actor_role: auth.role,
              action: `Taxonomy updated: ${taxonomy_id}`, module: "Taxonomy",
              severity: "Info", entity_type: "taxonomy", entity_id: String(taxonomy_id),
              metadata: updates,
            });
            return json({ ok: true });
          } catch (e: any) {
            return json({ error: e?.message ?? "Failed to update taxonomy" }, 500);
          }
        }

        // ── toggle_taxonomy ────────────────────────────────────────────────────
        if (body.action === "toggle_taxonomy") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const { taxonomy_id, is_active } = body;
          if (!taxonomy_id) return json({ error: "taxonomy_id required" }, 400);

          try {
            const { error } = await (supabaseAdmin as any)
              .from("masco_taxonomy")
              .update({ is_active: !!is_active })
              .eq("id", taxonomy_id);
            if (error) return json({ error: error.message }, 500);

            await logAudit({
              actor_id: auth.userId, actor_email: auth.email, actor_role: auth.role,
              action: `Taxonomy ${is_active ? "activated" : "deactivated"}: ${taxonomy_id}`, module: "Taxonomy",
              severity: "Info", entity_type: "taxonomy", entity_id: String(taxonomy_id),
              metadata: { is_active },
            });
            return json({ ok: true });
          } catch (e: any) {
            return json({ error: e?.message ?? "Failed to toggle taxonomy" }, 500);
          }
        }

        // ── suspend_user ───────────────────────────────────────────────────────
        if (body.action === "suspend_user") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const { target_user_id } = body;
          if (!target_user_id) return json({ error: "target_user_id required" }, 400);

          const { error } = await supabaseAdmin.from("profiles")
            .update({ status: "suspended", updated_at: new Date().toISOString() } as any)
            .eq("id", target_user_id);
          if (error) return json({ error: error.message }, 500);

          await logAudit({
            actor_id: auth.userId, actor_email: auth.email, actor_role: auth.role,
            action: "User suspended", module: "User Management",
            severity: "Warning", entity_type: "user", entity_id: target_user_id,
            metadata: { target_user_id },
          });
          return json({ ok: true });
        }

        // ── activate_user ──────────────────────────────────────────────────────
        if (body.action === "activate_user") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          const { target_user_id } = body;
          if (!target_user_id) return json({ error: "target_user_id required" }, 400);

          const { error } = await supabaseAdmin.from("profiles")
            .update({ status: "active", updated_at: new Date().toISOString() } as any)
            .eq("id", target_user_id);
          if (error) return json({ error: error.message }, 500);

          await logAudit({
            actor_id: auth.userId, actor_email: auth.email, actor_role: auth.role,
            action: "User activated", module: "User Management",
            severity: "Info", entity_type: "user", entity_id: target_user_id,
            metadata: { target_user_id },
          });
          return json({ ok: true });
        }

        // ── log_audit (manual) ───────────────────────────────────────────────
        if (body.action === "log_audit") {
          const auth = await verifyTokenAndRole(request, ["admin"]);
          if (!auth.ok) return auth.res;

          await logAudit({
            actor_id: auth.userId,
            actor_email: auth.email,
            actor_role: auth.role,
            action: String(body.audit_action ?? "Unknown action"),
            module: String(body.module ?? "System"),
            severity: (["Info", "Warning", "Critical"].includes(body.severity) ? body.severity : "Info") as any,
            entity_type: body.entity_type,
            entity_id: body.entity_id,
            metadata: body.metadata ?? {},
          });

          return json({ ok: true });
        }

        return json({ error: "Unknown action" }, 400);
      },
    },
  },
});
