/**
 * Client-side helpers for /api/ops — all calls include the Supabase access token.
 */
import { supabase } from "@/integrations/supabase/client";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

async function opsGET<T = any>(action: string, params: Record<string, string> = {}): Promise<T> {
  const token = await getToken();
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`/api/ops?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as any;
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function opsPOST<T = any>(body: Record<string, unknown>): Promise<T> {
  const token = await getToken();
  const res = await fetch("/api/ops", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as any;
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  return opsGET<AdminStats>("admin_stats");
}

export type DailyTrendRow = { date: string; analyses: number; applications: number; interviews: number; placements: number };

export async function getAdminDailyTrend(days = 60) {
  return opsGET<{ trend: DailyTrendRow[] }>("admin_daily_trend", { days: String(days) });
}

export async function listProfiles() {
  return opsGET<{ profiles: ProfileRow[] }>("list_profiles");
}

export async function listCandidates(params: { search?: string; source?: "all" | "registered" | "poc"; poc_page?: number } = {}) {
  const p: Record<string, string> = {};
  if (params.search) p.search = params.search;
  if (params.source) p.source = params.source;
  if (params.poc_page !== undefined) p.poc_page = String(params.poc_page);
  return opsGET<{ candidates: UnifiedCandidateRow[]; registered_count: number; poc_total: number; poc_page: number; poc_limit: number; total: number }>("list_candidates", p);
}

export async function listEmployers() {
  return opsGET<{ employers: EmployerRow[] }>("list_employers");
}

export async function listPlacements() {
  return opsGET<{ placements: PlacementRow[]; demo?: boolean }>("list_placements");
}

export async function getSystemStats() {
  return opsGET<{ counts: Record<string, number> }>("system_stats");
}

export async function getCandidate(candidateId: string) {
  return opsGET<CandidateDetail>("get_candidate", { candidate_id: candidateId });
}

export async function listAuditLogs(filters: { severity?: string; module?: string; actor?: string } = {}) {
  const params: Record<string, string> = {};
  if (filters.severity) params.severity = filters.severity;
  if (filters.module) params.module = filters.module;
  if (filters.actor) params.actor = filters.actor;
  return opsGET<{ logs: AuditLog[]; demo?: boolean }>("list_audit_logs", params);
}

export async function updateUserRole(targetUserId: string, newRole: string) {
  return opsPOST<{ ok: boolean }>({ action: "update_user_role", target_user_id: targetUserId, new_role: newRole });
}

export async function createPlacement(data: {
  candidate_id: string;
  employer_id?: string;
  job_id?: string;
  role_title?: string;
  salary?: number;
  placement_date?: string;
  industry?: string;
}) {
  return opsPOST<{ placement: PlacementRow }>({ action: "create_placement", ...data });
}

export async function runMigration() {
  return opsGET<{ results: string[] }>("run_migration");
}

export async function listConfig() {
  return opsGET<{ configs: ConfigRow[]; error?: string }>("list_config");
}

export async function updateConfig(key: string, value: any) {
  return opsPOST<{ ok: boolean }>({ action: "update_config", key, value });
}

export async function listTaxonomy() {
  return opsGET<{ taxonomy: TaxonomyRow[]; error?: string }>("list_taxonomy");
}

export async function createTaxonomy(data: { code: string; title: string; level?: number; parent_code?: string; description?: string; skills?: string[] }) {
  return opsPOST<{ entry: TaxonomyRow }>({ action: "create_taxonomy", ...data });
}

export async function updateTaxonomy(taxonomy_id: number, updates: Partial<TaxonomyRow>) {
  return opsPOST<{ ok: boolean }>({ action: "update_taxonomy", taxonomy_id, ...updates });
}

export async function toggleTaxonomy(taxonomy_id: number, is_active: boolean) {
  return opsPOST<{ ok: boolean }>({ action: "toggle_taxonomy", taxonomy_id, is_active });
}

export async function suspendUser(targetUserId: string) {
  return opsPOST<{ ok: boolean }>({ action: "suspend_user", target_user_id: targetUserId });
}

export async function activateUser(targetUserId: string) {
  return opsPOST<{ ok: boolean }>({ action: "activate_user", target_user_id: targetUserId });
}

export async function updateApplicationStatus(applicationId: string, newStatus: AppStatus, notes?: string) {
  return opsPOST<{ ok: boolean; new_status: string }>({
    action: "update_application_status",
    application_id: applicationId,
    new_status: newStatus,
    notes,
  });
}

export async function sendAiInterviewInvitation(applicationId: string, templateId: string) {
  return opsPOST<{ ok: boolean; invitation_id: string }>({
    action: "send_ai_interview_invitation",
    application_id: applicationId,
    template_id: templateId,
  });
}

export async function schedulePracticalInterview(
  applicationId: string,
  payload: { date: string; time: string; location: string; mode: "in_person" | "online"; notes: string }
) {
  return opsPOST<{ ok: boolean; invitation_id: string }>({
    action: "schedule_practical_interview",
    application_id: applicationId,
    ...payload,
  });
}

export async function listJobApplications(jobId: string) {
  return opsGET<{ applications: AppApplication[] }>("list_job_applications", { job_id: jobId });
}

export async function listEmployerApplications() {
  return opsGET<{ applications: EnrichedApplication[] }>("list_employer_applications");
}

export async function getEmployerApplications() {
  return opsGET<{ applications: EnrichedApplication[] }>("employer_applications");
}

export async function getEmployerCandidate(candidateId: string) {
  return opsGET<{
    email: string;
    name: string;
    analysis: Record<string, any> | null;
    applications: Array<{ id: string; created_at: string; status: string; job_id: string; job_title: string }>;
  }>("employer_candidate", { candidate_id: candidateId });
}

export interface EnrichedApplication {
  id: string;
  user_id: string;
  job_id: string | null;
  poc_vacancy_id: string | null;
  status: AppStatus;
  created_at: string;
  job_title: string;
  candidate_email: string;
  overall_score: number | null;
  industry: string | null;
  experience_level: string | null;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_users: number;
  job_seekers: number;
  employers: number;
  admins: number;
  jobs: number;
  applications: number;
  analyses: number;
  interviews: number;
  placements: number;
  poc_candidates: number;
  total_candidates: number;
}

export interface ProfileRow {
  id: string;
  role: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  analysis_count: number;
  app_count: number;
  interview_count: number;
}

export interface CandidateRow {
  id: string;
  email: string;
  joined: string;
  overall_score: number | null;
  industry: string | null;
  experience_level: string | null;
  has_analysis: boolean;
  application_count: number;
  interview_count: number;
  interview_status: string | null;
}

export interface UnifiedCandidateRow {
  source: "registered" | "poc";
  id: string;
  candidate_id: string | null;
  email: string;
  education_level: string | null;
  field_of_study: string | null;
  preferred_state: string | null;
  preferred_salary: string | null;
  previous_occupation: string | null;
  preferred_occupation: string | null;
  previous_years_experience: string | null;
  skills: string | null;
  joined: string | null;
  overall_score: number | null;
  has_analysis: boolean;
  application_count: number;
  interview_count: number;
  interview_status: string | null;
  applications: number;
  interviews: number;
  offers: number;
}

export interface EmployerRow {
  id: string;
  email: string;
  joined: string;
  job_count: number;
  application_count: number;
  interview_count: number;
}

export interface PlacementRow {
  id: string;
  candidate_id: string;
  employer_id: string | null;
  job_id: string | null;
  role_title: string | null;
  job_title: string | null;
  company_name: string | null;
  salary: number | null;
  placement_date: string | null;
  status: string;
  retention_status: string;
  industry: string | null;
  notes: string | null;
  candidate_email: string;
  employer_email: string;
  created_at: string;
}

export interface ConfigRow {
  id: number;
  key: string;
  value: string;
  category: string;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface TaxonomyRow {
  id: number;
  code: string;
  title: string;
  level: number;
  parent_code: string | null;
  description: string | null;
  skills: string[];
  is_active: boolean;
  created_at: string;
}

export interface CandidateDetail {
  email: string;
  profile: { id: string; role: string; created_at: string } | null;
  analyses: Array<{
    id: string;
    created_at: string;
    industry: string;
    overall_score: number;
    experience_level: string;
    full_results: any;
  }>;
  applications: Array<{
    id: string;
    created_at: string;
    status: string;
    job_id: string | null;
  }>;
  interviewSessions: Array<{
    id: string;
    created_at: string;
    role_title: string;
    status: string;
    overall_score: number | null;
  }>;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  module: string;
  severity: "Info" | "Warning" | "Critical";
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export type AppStatus =
  | "applied"
  | "shortlisted"
  | "interview"
  | "kiv"
  | "offered"
  | "hired"
  | "rejected";

export interface StatusHistoryEntry {
  from: string;
  to: string;
  changed_by: string;
  changed_by_email: string;
  changed_at: string;
  notes: string | null;
}

export interface AppApplication {
  id: string;
  user_id: string;
  status: AppStatus;
  notes: string | null;
  status_history: StatusHistoryEntry[];
  created_at: string;
  updated_by: string | null;
  candidate_email: string;
  overall_score: number | null;
  industry: string | null;
  experience_level: string | null;
  interview_score: number | null;
  interview_status: string | null;
  interview_session_id: string | null;
}
