-- =============================================================================
-- MYFutureJobs — Full Database Schema
-- Target: irqwetayrcfugtqyrmvz (new Supabase project)
-- Reconstructs all tables, RLS policies, triggers, indexes, and functions
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'job_seeker',
  visible_to_employers boolean NOT NULL DEFAULT false,
  poc_candidate_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'job_seeker')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. analyses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_type text NOT NULL,
  industry text NOT NULL,
  experience_level text NOT NULL,
  language_preference text NOT NULL,
  overall_score integer NOT NULL,
  full_results jsonb NOT NULL,
  email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON public.analyses(user_id);

GRANT SELECT, INSERT ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analyses"
  ON public.analyses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users can view their own analyses"
  ON public.analyses FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. jobs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  employer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title text NOT NULL,
  company_name text NOT NULL,
  employer_type text NOT NULL,
  industry text NOT NULL,
  location text NOT NULL,
  description text NOT NULL,
  requirements text NOT NULL,
  status text NOT NULL DEFAULT 'open'
);

CREATE INDEX IF NOT EXISTS jobs_employer_id_idx ON public.jobs(employer_id);

GRANT SELECT, INSERT, UPDATE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers view own jobs" ON public.jobs
  FOR SELECT TO authenticated USING (employer_id = auth.uid());
CREATE POLICY "Employers insert own jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (employer_id = auth.uid());
CREATE POLICY "Employers update own jobs" ON public.jobs
  FOR UPDATE TO authenticated USING (employer_id = auth.uid()) WITH CHECK (employer_id = auth.uid());
CREATE POLICY "Public read jobs" ON public.jobs
  FOR SELECT USING (status = 'open');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. applications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  poc_vacancy_id text,
  status text NOT NULL DEFAULT 'applied',
  cover_letter text,
  employer_notes text,
  notes text,
  status_history jsonb DEFAULT '[]',
  updated_by uuid,
  CONSTRAINT applications_user_job_unique UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS applications_user_id_idx ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS applications_job_id_idx ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS applications_poc_vacancy_idx ON public.applications(poc_vacancy_id);

GRANT SELECT, INSERT, UPDATE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own applications" ON public.applications
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. interview_sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  role_title text NOT NULL,
  company_type text,
  industry text,
  experience_level text,
  interview_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'in_progress',
  total_questions integer NOT NULL DEFAULT 5,
  current_question integer NOT NULL DEFAULT 0,
  overall_score integer,
  model_used text,
  ai_summary jsonb
);

CREATE INDEX IF NOT EXISTS interview_sessions_user_id_idx ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS interview_sessions_employer_id_idx ON public.interview_sessions(employer_id);

GRANT SELECT, INSERT, UPDATE ON public.interview_sessions TO authenticated;
GRANT ALL ON public.interview_sessions TO service_role;

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interview sessions" ON public.interview_sessions
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. interview_responses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id uuid NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  answer_text text,
  score integer,
  feedback jsonb,
  model_used text
);

CREATE INDEX IF NOT EXISTS interview_responses_session_id_idx ON public.interview_responses(session_id);

GRANT SELECT, INSERT, UPDATE ON public.interview_responses TO authenticated;
GRANT ALL ON public.interview_responses TO service_role;

ALTER TABLE public.interview_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interview responses" ON public.interview_responses
  FOR ALL TO authenticated USING (
    session_id IN (SELECT id FROM public.interview_sessions WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. interview_templates
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  employer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  role_title text NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  company_name text,
  industry text,
  experience_level text,
  interview_type text NOT NULL DEFAULT 'general',
  instructions text,
  time_limit_minutes integer
);

CREATE INDEX IF NOT EXISTS idx_interview_templates_employer ON public.interview_templates(employer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_templates TO authenticated;
GRANT ALL ON public.interview_templates TO service_role;

ALTER TABLE public.interview_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employer_manage_templates" ON public.interview_templates
  FOR ALL TO authenticated USING (employer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. interview_template_questions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  template_id uuid NOT NULL REFERENCES public.interview_templates(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  question_type text,
  scoring_criteria text,
  time_limit_seconds integer
);

CREATE INDEX IF NOT EXISTS idx_interview_template_questions_template ON public.interview_template_questions(template_id, question_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_template_questions TO authenticated;
GRANT ALL ON public.interview_template_questions TO service_role;

ALTER TABLE public.interview_template_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employer_manage_questions" ON public.interview_template_questions
  FOR ALL TO authenticated USING (
    template_id IN (SELECT id FROM public.interview_templates WHERE employer_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. interview_invitations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  template_id uuid NOT NULL REFERENCES public.interview_templates(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  message text,
  deadline timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  overall_score integer,
  ai_summary jsonb,
  UNIQUE (template_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_invitations_template ON public.interview_invitations(template_id);
CREATE INDEX IF NOT EXISTS idx_interview_invitations_candidate ON public.interview_invitations(candidate_id);

GRANT SELECT, INSERT, UPDATE ON public.interview_invitations TO authenticated;
GRANT ALL ON public.interview_invitations TO service_role;

ALTER TABLE public.interview_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employer_read_invitations" ON public.interview_invitations
  FOR SELECT TO authenticated USING (
    template_id IN (SELECT id FROM public.interview_templates WHERE employer_id = auth.uid())
  );
CREATE POLICY "employer_insert_invitations" ON public.interview_invitations
  FOR INSERT TO authenticated WITH CHECK (
    template_id IN (SELECT id FROM public.interview_templates WHERE employer_id = auth.uid())
  );
CREATE POLICY "employer_update_invitations" ON public.interview_invitations
  FOR UPDATE TO authenticated USING (
    template_id IN (SELECT id FROM public.interview_templates WHERE employer_id = auth.uid())
  );
CREATE POLICY "candidate_own_invitations" ON public.interview_invitations
  FOR ALL TO authenticated USING (candidate_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. invitation_responses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitation_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  invitation_id uuid NOT NULL REFERENCES public.interview_invitations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.interview_template_questions(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  answer_text text,
  score integer,
  feedback jsonb,
  UNIQUE (invitation_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_invitation_responses_invitation ON public.invitation_responses(invitation_id, question_number);

GRANT SELECT, INSERT, UPDATE ON public.invitation_responses TO authenticated;
GRANT ALL ON public.invitation_responses TO service_role;

ALTER TABLE public.invitation_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidate_own_responses" ON public.invitation_responses
  FOR ALL TO authenticated USING (
    invitation_id IN (SELECT id FROM public.interview_invitations WHERE candidate_id = auth.uid())
  );
CREATE POLICY "employer_read_responses" ON public.invitation_responses
  FOR SELECT TO authenticated USING (
    invitation_id IN (
      SELECT ii.id FROM public.interview_invitations ii
      JOIN public.interview_templates it ON it.id = ii.template_id
      WHERE it.employer_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. template_questions (separate from interview_template_questions)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.interview_templates(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  question_type text,
  scoring_criteria text,
  time_limit_seconds integer,
  UNIQUE (template_id, question_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_questions TO authenticated;
GRANT ALL ON public.template_questions TO service_role;

ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employer_manage_template_questions" ON public.template_questions
  FOR ALL TO authenticated USING (
    template_id IN (SELECT id FROM public.interview_templates WHERE employer_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. candidate_matches
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.candidate_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  candidate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_score integer NOT NULL,
  breakdown jsonb NOT NULL DEFAULT '{}',
  explanation text,
  shortlisted boolean NOT NULL DEFAULT false,
  model_used text
);

GRANT SELECT, INSERT, UPDATE ON public.candidate_matches TO authenticated;
GRANT ALL ON public.candidate_matches TO service_role;

ALTER TABLE public.candidate_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own candidate_matches" ON public.candidate_matches
  FOR SELECT TO authenticated USING (candidate_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. employability_scores
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employability_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  overall_score integer NOT NULL,
  breakdown jsonb NOT NULL DEFAULT '{}',
  recommendations jsonb NOT NULL DEFAULT '[]',
  explanation text,
  model_used text
);

GRANT SELECT ON public.employability_scores TO authenticated;
GRANT ALL ON public.employability_scores TO service_role;

ALTER TABLE public.employability_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own employability_scores" ON public.employability_scores
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. skills_passports
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skills_passports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  technical_skills jsonb NOT NULL DEFAULT '[]',
  transferable_skills jsonb NOT NULL DEFAULT '[]',
  missing_skills jsonb NOT NULL DEFAULT '[]',
  market_readiness_score integer,
  summary text,
  model_used text
);

GRANT SELECT ON public.skills_passports TO authenticated;
GRANT ALL ON public.skills_passports TO service_role;

ALTER TABLE public.skills_passports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own skills_passports" ON public.skills_passports
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. career_pathways
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.career_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  current_profile jsonb NOT NULL DEFAULT '{}',
  target_role jsonb NOT NULL DEFAULT '{}',
  bridge_role jsonb,
  skills_gap jsonb NOT NULL DEFAULT '[]',
  action_plan jsonb NOT NULL DEFAULT '[]',
  timeline text,
  model_used text
);

GRANT SELECT ON public.career_pathways TO authenticated;
GRANT ALL ON public.career_pathways TO service_role;

ALTER TABLE public.career_pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own career_pathways" ON public.career_pathways
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. salary_estimates
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.salary_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  estimated_salary jsonb NOT NULL DEFAULT '{}',
  growth_projection jsonb NOT NULL DEFAULT '{}',
  market_comparison jsonb,
  salary_gap text,
  model_used text
);

GRANT SELECT ON public.salary_estimates TO authenticated;
GRANT ALL ON public.salary_estimates TO service_role;

ALTER TABLE public.salary_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own salary_estimates" ON public.salary_estimates
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. training_plans
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  learning_path jsonb NOT NULL DEFAULT '[]',
  skills_development jsonb NOT NULL DEFAULT '{}',
  certifications jsonb NOT NULL DEFAULT '[]',
  readiness_projection jsonb,
  model_used text
);

GRANT SELECT ON public.training_plans TO authenticated;
GRANT ALL ON public.training_plans TO service_role;

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own training_plans" ON public.training_plans
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. caseworker_assignments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.caseworker_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  candidate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caseworker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  risk_level text,
  priority integer,
  notes text,
  UNIQUE (caseworker_id, candidate_id)
);

GRANT SELECT, INSERT, UPDATE ON public.caseworker_assignments TO authenticated;
GRANT ALL ON public.caseworker_assignments TO service_role;

ALTER TABLE public.caseworker_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caseworkers manage own assignments" ON public.caseworker_assignments
  FOR ALL TO authenticated USING (caseworker_id = auth.uid() OR candidate_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. interventions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  assignment_id uuid NOT NULL REFERENCES public.caseworker_assignments(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caseworker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  priority text,
  description text,
  outcome text,
  completed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.interventions TO authenticated;
GRANT ALL ON public.interventions TO service_role;

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caseworkers manage own interventions" ON public.interventions
  FOR ALL TO authenticated USING (caseworker_id = auth.uid() OR candidate_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. placements
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  candidate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  caseworker_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Active',
  placement_date date,
  salary_achieved numeric,
  retention_check_date date,
  notes text
);

GRANT SELECT ON public.placements TO authenticated;
GRANT ALL ON public.placements TO service_role;

ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own placements" ON public.placements
  FOR SELECT TO authenticated USING (candidate_id = auth.uid() OR employer_id = auth.uid() OR caseworker_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 21. saved_jobs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  poc_vacancy_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_jobs_one_target CHECK (num_nonnulls(job_id, poc_vacancy_id) = 1),
  CONSTRAINT saved_jobs_user_target_unique UNIQUE (user_id, job_id, poc_vacancy_id)
);

CREATE INDEX IF NOT EXISTS saved_jobs_user_id_idx ON public.saved_jobs(user_id);

GRANT SELECT, INSERT, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved jobs" ON public.saved_jobs
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own saved jobs" ON public.saved_jobs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own saved jobs" ON public.saved_jobs
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 22. notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications" ON public.notifications
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 23. admin_audit_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,
  actor_role text,
  action text NOT NULL,
  module text NOT NULL,
  severity text NOT NULL DEFAULT 'Info',
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}'
);

GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 24. user_activity_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity text NOT NULL,
  module text,
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS user_activity_logs_user_id_idx ON public.user_activity_logs(user_id);

GRANT SELECT, INSERT ON public.user_activity_logs TO authenticated;
GRANT ALL ON public.user_activity_logs TO service_role;

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own activity logs" ON public.user_activity_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 25. system_config
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL DEFAULT 'general',
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.system_config TO authenticated;
GRANT ALL ON public.system_config TO service_role;

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage system_config" ON public.system_config
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 26. masco_taxonomy
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.masco_taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  parent_code text,
  description text,
  skills jsonb DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.masco_taxonomy TO authenticated;
GRANT ALL ON public.masco_taxonomy TO service_role;

ALTER TABLE public.masco_taxonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read masco_taxonomy" ON public.masco_taxonomy
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Admins manage masco_taxonomy" ON public.masco_taxonomy
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 27. poc_vacancies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poc_vacancies (
  id text PRIMARY KEY,
  job_title text,
  occupation_name text,
  job_description text,
  education_level text,
  field_of_study text,
  state text,
  city text,
  salary text,
  salary_min numeric,
  salary_max numeric,
  skills text,
  embedding vector(384),
  embedding_updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS poc_vacancies_embedding_hnsw_idx
  ON public.poc_vacancies USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

GRANT SELECT ON public.poc_vacancies TO authenticated, anon;
GRANT ALL ON public.poc_vacancies TO service_role;

ALTER TABLE public.poc_vacancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poc_vacancies" ON public.poc_vacancies
  FOR SELECT TO authenticated, anon USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 28. poc_candidates
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poc_candidates (
  id text PRIMARY KEY,
  candidate_id text,
  education_level text,
  nec_1d text,
  nec_2d text,
  preferred_occupation text,
  previous_occupation text,
  previous_years_experience text,
  preferred_salary text,
  salary_min numeric,
  salary_max numeric,
  preferred_state text,
  skills text,
  institution text,
  field_of_study text,
  embedding vector(384),
  embedding_updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS poc_candidates_embedding_hnsw_idx
  ON public.poc_candidates USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

GRANT SELECT ON public.poc_candidates TO authenticated, anon;
GRANT ALL ON public.poc_candidates TO service_role;

ALTER TABLE public.poc_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poc_candidates" ON public.poc_candidates
  FOR SELECT TO authenticated, anon USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 29. poc_behaviour
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poc_behaviour (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id text NOT NULL,
  job_search_count integer NOT NULL DEFAULT 0,
  submitted_application_count integer NOT NULL DEFAULT 0,
  interview_count integer NOT NULL DEFAULT 0,
  job_offer_count integer NOT NULL DEFAULT 0,
  report_for_duty_count integer NOT NULL DEFAULT 0,
  total_applications integer NOT NULL DEFAULT 0,
  total_interviews integer NOT NULL DEFAULT 0,
  total_offers integer NOT NULL DEFAULT 0,
  UNIQUE (candidate_id)
);

GRANT SELECT ON public.poc_behaviour TO authenticated, anon;
GRANT ALL ON public.poc_behaviour TO service_role;

ALTER TABLE public.poc_behaviour ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poc_behaviour" ON public.poc_behaviour
  FOR SELECT TO authenticated, anon USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 30. poc_activity_log
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poc_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id text NOT NULL,
  activity_name text NOT NULL,
  activity_date date,
  job_title text,
  occupation_name text,
  state text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS poc_activity_log_candidate_id_idx ON public.poc_activity_log(candidate_id);

GRANT SELECT ON public.poc_activity_log TO authenticated, anon;
GRANT ALL ON public.poc_activity_log TO service_role;

ALTER TABLE public.poc_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poc_activity_log" ON public.poc_activity_log
  FOR SELECT TO authenticated, anon USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 31. poc_match_results
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poc_match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id text NOT NULL,
  vacancy_id text NOT NULL,
  match_score numeric NOT NULL DEFAULT 0,
  skill_match_score numeric,
  education_match_score numeric,
  salary_match_score numeric,
  location_match_score numeric,
  experience_match_score numeric,
  explanation text,
  matched_skills jsonb DEFAULT '[]',
  transferable_skills jsonb DEFAULT '[]',
  skill_gaps jsonb DEFAULT '[]',
  taxonomy_relationship text,
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, vacancy_id)
);

GRANT SELECT, INSERT, UPDATE ON public.poc_match_results TO authenticated, anon;
GRANT ALL ON public.poc_match_results TO service_role;

ALTER TABLE public.poc_match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poc_match_results" ON public.poc_match_results
  FOR SELECT TO authenticated, anon USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 32. linkedin_analyses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.linkedin_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_url text,
  analysis_result jsonb NOT NULL DEFAULT '{}',
  overall_score integer,
  model_used text
);

GRANT SELECT, INSERT ON public.linkedin_analyses TO authenticated;
GRANT ALL ON public.linkedin_analyses TO service_role;

ALTER TABLE public.linkedin_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own linkedin_analyses" ON public.linkedin_analyses
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC Functions for semantic search
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.match_vacancies(
  query_embedding vector(384),
  match_limit int DEFAULT 20
)
RETURNS TABLE (
  id text,
  job_title text,
  occupation_name text,
  job_description text,
  education_level text,
  field_of_study text,
  state text,
  city text,
  salary text,
  salary_min numeric,
  salary_max numeric,
  skills text,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    v.id, v.job_title, v.occupation_name, v.job_description,
    v.education_level, v.field_of_study, v.state, v.city,
    v.salary, v.salary_min, v.salary_max, v.skills,
    1 - (v.embedding <=> query_embedding) AS similarity
  FROM public.poc_vacancies v
  WHERE v.embedding IS NOT NULL
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_limit;
$$;

GRANT EXECUTE ON FUNCTION public.match_vacancies(vector, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_vacancies(vector, int) TO anon;
GRANT EXECUTE ON FUNCTION public.match_vacancies(vector, int) TO service_role;

CREATE OR REPLACE FUNCTION public.match_candidates(
  query_embedding vector(384),
  match_limit int DEFAULT 20
)
RETURNS TABLE (
  id text,
  education_level text,
  nec_1d text,
  nec_2d text,
  preferred_occupation text,
  previous_occupation text,
  previous_years_experience text,
  preferred_salary text,
  preferred_state text,
  skills text,
  institution text,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id, c.education_level, c.nec_1d, c.nec_2d,
    c.preferred_occupation, c.previous_occupation,
    c.previous_years_experience, c.preferred_salary,
    c.preferred_state, c.skills, c.institution,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.poc_candidates c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_limit;
$$;

GRANT EXECUTE ON FUNCTION public.match_candidates(vector, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_candidates(vector, int) TO anon;
GRANT EXECUTE ON FUNCTION public.match_candidates(vector, int) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill profiles for existing auth.users
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, role)
SELECT id, 'job_seeker' FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DONE — Full schema created
-- =============================================================================
