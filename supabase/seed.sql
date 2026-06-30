-- =============================================================================
-- ResuMY Seed Data
-- Generates demo data for all public tables using ONLY existing columns.
-- Requires at least 1 row in auth.users (8 exist).
-- Run via Supabase SQL editor with service_role / postgres privileges.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Helpers — capture existing user IDs into a temp table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE seed_users AS
SELECT id, row_number() OVER (ORDER BY created_at) AS rn
FROM auth.users;

-- We only have 8 real users. We'll reuse them in round-robin for FK columns.
-- All NEW fake entities (analyses, jobs, etc.) that need a user_id will use
-- round-robin from these 8 IDs.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. analyses — 100 rows (no FK except nullable user_id → auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.analyses (
  id, created_at, company_type, industry, experience_level,
  language_preference, overall_score, full_results, email, user_id
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '180 days'),
  (ARRAY['GLC','MNC','SME','Startup','Government'])[ceil(random()*5)::int],
  (ARRAY[
    'Information Technology','Finance','Healthcare','Engineering',
    'Education','Retail','Manufacturing','Construction',
    'Logistics','Hospitality'
  ])[ceil(random()*10)::int],
  (ARRAY['Fresh Graduate','1-3 years','3-5 years','5-10 years','10+ years'])[ceil(random()*5)::int],
  (ARRAY['English','Malay','Both'])[ceil(random()*3)::int],
  (40 + floor(random()*61))::int,
  jsonb_build_object(
    'overall_score', (40 + floor(random()*61))::int,
    'skills', jsonb_build_object(
      'technical', jsonb_build_array('Python','SQL','Excel'),
      'soft', jsonb_build_array('Communication','Teamwork')
    ),
    'strengths', jsonb_build_array('Analytical','Detail-oriented'),
    'improvements', jsonb_build_array('Public speaking')
  ),
  'candidate' || gs || '@demo.resumy.my',
  (SELECT id FROM seed_users WHERE rn = ((gs - 1) % 8) + 1)
FROM generate_series(1, 100) gs;

-- Capture the new analysis IDs for later FK use
CREATE TEMP TABLE seed_analyses AS
SELECT id, row_number() OVER (ORDER BY created_at) AS rn
FROM public.analyses
WHERE email LIKE '%@demo.resumy.my'
ORDER BY created_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. jobs — 200 rows (employer_id → auth.users; reuse existing 8 users)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.jobs (
  id, created_at, employer_id, job_title, company_name,
  employer_type, industry, location, description, requirements, status
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '120 days'),
  (SELECT id FROM seed_users WHERE rn = ((gs - 1) % 8) + 1),
  (ARRAY[
    'Software Engineer','Data Analyst','Product Manager','HR Executive',
    'Accountant','Marketing Specialist','Operations Manager','Business Analyst',
    'Network Engineer','UX Designer','Finance Executive','Sales Executive',
    'Customer Service Officer','Logistics Coordinator','Civil Engineer',
    'Mechanical Engineer','Electrical Engineer','IT Support Specialist',
    'Administrative Assistant','Project Manager'
  ])[ceil(random()*20)::int],
  (ARRAY[
    'Petronas','Maybank','Tenaga Nasional','Axiata','CIMB Group',
    'AirAsia','Gamuda','IHH Healthcare','Genting Group','Sime Darby',
    'Public Bank','RHB Bank','Hong Leong Bank','Telekom Malaysia','Maxis',
    'Sunway Group','IOI Corporation','YTL Corporation','MISC Berhad','AmBank'
  ])[gs % 20 + 1],
  (ARRAY['GLC','MNC','SME','Startup','Government'])[ceil(random()*5)::int],
  (ARRAY[
    'Information Technology','Finance','Healthcare','Engineering',
    'Education','Retail','Manufacturing','Construction',
    'Logistics','Hospitality'
  ])[ceil(random()*10)::int],
  (ARRAY[
    'Kuala Lumpur','Selangor','Penang','Johor Bahru','Kota Kinabalu',
    'Kuching','Ipoh','Shah Alam','Petaling Jaya','Subang Jaya'
  ])[ceil(random()*10)::int],
  'We are looking for a talented professional to join our growing team. '
    || 'You will work collaboratively with cross-functional teams to deliver '
    || 'high-quality outcomes that align with our business objectives.',
  'Degree in relevant field. Minimum ' || (1 + floor(random()*5))::int
    || ' years of experience. Strong communication skills. Proficiency in MS Office.',
  (ARRAY['open','open','open','closed','draft'])[ceil(random()*5)::int]
FROM generate_series(1, 200) gs;

-- Capture new job IDs
CREATE TEMP TABLE seed_jobs AS
SELECT id, row_number() OVER (ORDER BY created_at) AS rn
FROM public.jobs
WHERE description LIKE 'We are looking for a talented%'
ORDER BY created_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. applications — 1000 rows (user_id + job_id → auth.users / jobs)
-- ─────────────────────────────────────────────────────────────────────────────
-- Each (user_id, job_id) pair must be unique.
-- With 8 users × 200 jobs = 1,600 unique combinations, 1,000 rows is safe
-- as long as we use a deterministic spread: user = gs % 8, job = gs % 200
-- offset by user index so the same job isn't shared by two users at the same slot.
INSERT INTO public.applications (
  id, created_at, updated_at, user_id, job_id,
  status, cover_letter, employer_notes, notes, status_history
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '100 days'),
  now() - (random() * interval '50 days'),
  (SELECT id FROM seed_users WHERE rn = (gs % 8) + 1),
  (SELECT id FROM seed_jobs  WHERE rn = ((gs * 7 + (gs % 8) * 25) % 200) + 1),
  (ARRAY['applied','shortlisted','interview','kiv','offered','hired','rejected'])[ceil(random()*7)::int],
  'I am excited to apply for this position. My background in '
    || (ARRAY['technology','finance','operations','marketing'])[ceil(random()*4)::int]
    || ' makes me a strong fit for this role.',
  CASE WHEN random() > 0.5
    THEN (ARRAY['Good candidate','Promising profile','Need follow-up','Strong technical skills'])[ceil(random()*4)::int]
    ELSE NULL END,
  CASE WHEN random() > 0.7 THEN 'Reviewed by hiring manager' ELSE NULL END,
  jsonb_build_array(
    jsonb_build_object('status','applied','at', (now() - interval '80 days')::text)
  )
FROM generate_series(0, 999) gs
ON CONFLICT (user_id, job_id) DO NOTHING;

-- Capture application IDs
CREATE TEMP TABLE seed_applications AS
SELECT id, user_id, job_id, row_number() OVER (ORDER BY created_at) AS rn
FROM public.applications
WHERE cover_letter LIKE 'I am excited to apply%'
ORDER BY created_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. interview_sessions — 300 rows (user_id → auth.users; job_id → jobs nullable)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.interview_sessions (
  id, created_at, updated_at, user_id, job_id, analysis_id,
  role_title, company_type, industry, experience_level,
  interview_type, status, total_questions, current_question,
  overall_score, model_used
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '90 days'),
  now() - (random() * interval '45 days'),
  (SELECT id FROM seed_users WHERE rn = ((gs - 1) % 8) + 1),
  CASE WHEN random() > 0.3
    THEN (SELECT id FROM seed_jobs WHERE rn = ((gs - 1) % 200) + 1)
    ELSE NULL END,
  CASE WHEN random() > 0.5
    THEN (SELECT id FROM seed_analyses WHERE rn = ((gs - 1) % 100) + 1)
    ELSE NULL END,
  (ARRAY[
    'Software Engineer','Data Analyst','Product Manager','HR Executive',
    'Accountant','Marketing Specialist','Operations Manager','Business Analyst',
    'Network Engineer','UX Designer'
  ])[ceil(random()*10)::int],
  (ARRAY['GLC','MNC','SME','Startup','Government'])[ceil(random()*5)::int],
  (ARRAY[
    'Information Technology','Finance','Healthcare','Engineering','Education'
  ])[ceil(random()*5)::int],
  (ARRAY['Fresh Graduate','1-3 years','3-5 years','5-10 years'])[ceil(random()*4)::int],
  (ARRAY['behavioral','technical','general','competency'])[ceil(random()*4)::int],
  (ARRAY['completed','completed','completed','in_progress','abandoned'])[ceil(random()*5)::int],
  (5 + floor(random()*6))::int,
  (5 + floor(random()*6))::int,
  (ARRAY[NULL,NULL,(45 + floor(random()*56))::int])[ceil(random()*3)::int],
  'gpt-5.4-mini'
FROM generate_series(1, 300) gs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. admin_audit_logs — 500 rows (actor_id nullable → auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.admin_audit_logs (
  id, created_at, actor_id, actor_email, actor_role,
  action, module, entity_type, entity_id, metadata
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '150 days'),
  (SELECT id FROM seed_users WHERE rn = ((gs - 1) % 8) + 1),
  'admin' || ((gs % 3) + 1) || '@resumy.my',
  (ARRAY['admin','admin','admin','caseworker'])[ceil(random()*4)::int],
  (ARRAY[
    'view_candidate','update_status','export_data','create_job',
    'delete_application','invite_candidate','update_profile',
    'view_analytics','send_notification','bulk_export'
  ])[ceil(random()*10)::int],
  (ARRAY[
    'candidates','jobs','applications','analytics',
    'placements','interviews','settings','users'
  ])[ceil(random()*8)::int],
  (ARRAY['candidate','job','application','placement','interview','profile'])[ceil(random()*6)::int],
  gen_random_uuid()::text,
  jsonb_build_object(
    'ip', '10.0.' || (floor(random()*255))::text || '.' || (floor(random()*255))::text,
    'user_agent', 'Mozilla/5.0',
    'duration_ms', (50 + floor(random()*500))::int
  )
FROM generate_series(1, 500) gs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. notifications — 500 rows (user_id reuses existing auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  message    text        NOT NULL,
  type       text        NOT NULL DEFAULT 'info',
  link       text,
  is_read    boolean     NOT NULL DEFAULT false,
  metadata   jsonb       NOT NULL DEFAULT '{}'
);

INSERT INTO public.notifications (
  user_id, title, message, type, link, is_read, metadata, created_at
)
SELECT
  (SELECT id FROM seed_users WHERE rn = ((gs - 1) % 8) + 1),
  (ARRAY[
    'Application Status Updated','Interview Complete','New Job Match',
    'CV Analysis Ready','Invitation Received','Shortlisted for Role',
    'Offer Extended','Interview Scheduled','Profile Viewed','Action Required'
  ])[ceil(random()*10)::int],
  (ARRAY[
    'Your application has been reviewed by the employer.',
    'Your AI interview is complete. Check your score now.',
    'A new job matching your profile has been posted.',
    'Your CV analysis is ready. Overall score: ' || (50 + floor(random()*50))::text || '/100.',
    'You have been invited to an AI interview. Complete it by the deadline.',
    'Congratulations! You have been shortlisted for the next round.',
    'An offer has been extended for your application.',
    'Your interview has been scheduled. Please confirm your availability.',
    'An employer viewed your profile.',
    'Please update your profile to improve your job match score.'
  ])[ceil(random()*10)::int],
  (ARRAY['info','success','warning','info','success','success','success','info','info','warning'])[ceil(random()*10)::int],
  CASE WHEN random() > 0.4
    THEN '/dashboard'
    ELSE NULL END,
  (random() > 0.6),
  jsonb_build_object('seed', true),
  now() - (random() * interval '90 days')
FROM generate_series(1, 500) gs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. caseworker_assignments — insert all 56 possible unique pairs (8 users × 7 offsets)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.caseworker_assignments (
  id, created_at, updated_at,
  candidate_id, caseworker_id,
  status, risk_level, priority, notes
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '60 days'),
  now() - (random() * interval '30 days'),
  (SELECT id FROM seed_users WHERE rn = u),
  (SELECT id FROM seed_users WHERE rn = (u % 8) + 1),
  (ARRAY['active','active','active','closed','on_hold'])[ceil(random()*5)::int],
  (ARRAY['Low','Medium','High','Critical'])[ceil(random()*4)::int],
  (1 + floor(random()*5))::int,
  CASE WHEN random() > 0.5
    THEN 'Candidate requires close monitoring and regular follow-ups.'
    ELSE NULL END
FROM generate_series(1, 8) u
ON CONFLICT (caseworker_id, candidate_id) DO NOTHING;

-- Capture ALL existing assignment IDs (including pre-existing rows)
CREATE TEMP TABLE seed_assignments AS
SELECT id, candidate_id, caseworker_id, row_number() OVER (ORDER BY created_at) AS rn
FROM public.caseworker_assignments
ORDER BY created_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. interventions — only insert if assignments exist
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  asgn_count int;
BEGIN
  SELECT count(*) INTO asgn_count FROM seed_assignments;
  IF asgn_count = 0 THEN
    RAISE NOTICE 'No caseworker_assignments found — skipping interventions.';
    RETURN;
  END IF;

  INSERT INTO public.interventions (
    id, created_at, assignment_id, candidate_id, caseworker_id,
    title, type, status, priority, description, outcome, completed_at
  )
  SELECT
    gen_random_uuid(),
    now() - (random() * interval '50 days'),
    (SELECT id          FROM seed_assignments WHERE rn = ((gs - 1) % asgn_count) + 1),
    (SELECT candidate_id  FROM seed_assignments WHERE rn = ((gs - 1) % asgn_count) + 1),
    (SELECT caseworker_id FROM seed_assignments WHERE rn = ((gs - 1) % asgn_count) + 1),
    (ARRAY[
      'Resume Review Session','Job Application Coaching','Interview Preparation',
      'Skills Gap Training','Career Counselling','Employer Introduction',
      'Follow-up Check-in','Digital Skills Workshop','Soft Skills Training',
      'Industry Networking Session'
    ])[ceil(random()*10)::int],
    (ARRAY['coaching','training','referral','counselling','workshop','follow_up'])[ceil(random()*6)::int],
    (ARRAY['planned','in_progress','completed','completed','cancelled'])[ceil(random()*5)::int],
    (ARRAY['Low','Medium','High'])[ceil(random()*3)::int],
    'Structured session to address candidate skill gaps and improve employability outcomes.',
    CASE WHEN random() > 0.5
      THEN (ARRAY['Positive — candidate showed improvement','Completed successfully','No change observed','Pending follow-up'])[ceil(random()*4)::int]
      ELSE NULL END,
    CASE WHEN random() > 0.5
      THEN now() - (random() * interval '20 days')
      ELSE NULL END
  FROM generate_series(1, 80) gs;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. placements — 40 rows (no unique constraint, safe to insert freely)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.placements (
  id, created_at, updated_at, candidate_id, employer_id,
  job_id, application_id, caseworker_id, status,
  placement_date, salary_achieved, retention_check_date, notes
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '60 days'),
  now() - (random() * interval '30 days'),
  (SELECT id FROM seed_users WHERE rn = ((gs - 1) % 8) + 1),
  (SELECT id FROM seed_users WHERE rn = (gs % 8) + 1),
  (SELECT id FROM seed_jobs        WHERE rn = ((gs - 1) % 200) + 1),
  (SELECT id FROM seed_applications WHERE rn = ((gs - 1) % greatest((SELECT count(*)::int FROM seed_applications), 1)) + 1),
  (SELECT id FROM seed_users WHERE rn = (gs % 8) + 1),
  (ARRAY['Active','Active','Active','Completed','Resigned','Terminated'])[ceil(random()*6)::int],
  (current_date - (floor(random()*180))::int)::date,
  (2500 + floor(random()*5000))::int,
  (current_date + (floor(random()*365))::int)::date,
  CASE WHEN random() > 0.5
    THEN 'Candidate successfully placed and is performing well in the role.'
    ELSE NULL END
FROM generate_series(1, 40) gs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. candidate_matches — 100 rows (job_id → jobs; analysis_id → analyses)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.candidate_matches (
  id, created_at, job_id, analysis_id, candidate_id,
  match_score, breakdown, explanation, shortlisted, model_used
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '60 days'),
  (SELECT id FROM seed_jobs     WHERE rn = ((gs - 1) % 200) + 1),
  (SELECT id FROM seed_analyses WHERE rn = ((gs - 1) % 100) + 1),
  (SELECT id FROM seed_users    WHERE rn = ((gs - 1) % 8) + 1),
  (30 + floor(random()*71))::int,
  jsonb_build_object(
    'skills',    (20 + floor(random()*80))::int,
    'education', (30 + floor(random()*70))::int,
    'experience',(25 + floor(random()*75))::int,
    'location',  (40 + floor(random()*60))::int
  ),
  CASE WHEN random() > 0.4
    THEN 'Candidate profile aligns well with the job requirements in terms of technical skills and experience level.'
    ELSE NULL END,
  (random() > 0.7),
  'gpt-5.4-mini'
FROM generate_series(1, 100) gs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. employability_scores — 80 rows (user_id + analysis_id → existing)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.employability_scores (
  id, created_at, user_id, analysis_id,
  overall_score, breakdown, recommendations, explanation, model_used
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '90 days'),
  (SELECT id FROM seed_users    WHERE rn = ((gs - 1) % 8) + 1),
  (SELECT id FROM seed_analyses WHERE rn = ((gs - 1) % 100) + 1),
  (40 + floor(random()*61))::int,
  jsonb_build_object(
    'skills',          (35 + floor(random()*65))::int,
    'experience',      (30 + floor(random()*70))::int,
    'education',       (40 + floor(random()*60))::int,
    'communication',   (45 + floor(random()*55))::int,
    'digital_literacy',(30 + floor(random()*70))::int
  ),
  jsonb_build_array(
    'Update CV with recent projects',
    'Obtain relevant certifications',
    'Improve LinkedIn profile visibility'
  ),
  'Employability assessment based on CV analysis and interview performance.',
  'gpt-5.4-mini'
FROM generate_series(1, 80) gs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. skills_passports — 80 rows
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.skills_passports (
  id, created_at, user_id, analysis_id,
  technical_skills, transferable_skills, missing_skills,
  market_readiness_score, summary, model_used
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '90 days'),
  (SELECT id FROM seed_users    WHERE rn = ((gs - 1) % 8) + 1),
  (SELECT id FROM seed_analyses WHERE rn = ((gs - 1) % 100) + 1),
  jsonb_build_array('Python','SQL','Excel','PowerBI','Git'),
  jsonb_build_array('Communication','Problem-solving','Teamwork','Adaptability'),
  jsonb_build_array('Machine Learning','Cloud Computing','Docker'),
  (50 + floor(random()*51))::int,
  'Candidate demonstrates strong foundational technical skills with room to grow in cloud and AI domains.',
  'gpt-5.4-mini'
FROM generate_series(1, 80) gs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. career_pathways — 60 rows
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.career_pathways (
  id, created_at, user_id, analysis_id,
  current_profile, target_role, bridge_role,
  skills_gap, action_plan, timeline, model_used
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '90 days'),
  (SELECT id FROM seed_users    WHERE rn = ((gs - 1) % 8) + 1),
  (SELECT id FROM seed_analyses WHERE rn = ((gs - 1) % 100) + 1),
  jsonb_build_object('title','Junior Developer','experience','1-3 years','industry','IT'),
  jsonb_build_object('title','Senior Software Engineer','salary_range','RM 8,000–12,000','timeline','2-3 years'),
  jsonb_build_object('title','Mid-level Developer','salary_range','RM 5,000–8,000'),
  jsonb_build_array('System design','Leadership','Cloud architecture','CI/CD'),
  jsonb_build_array(
    jsonb_build_object('step',1,'action','Complete AWS certification','deadline','6 months'),
    jsonb_build_object('step',2,'action','Lead a small team project','deadline','12 months')
  ),
  '2-3 years',
  'gpt-5.4-mini'
FROM generate_series(1, 60) gs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. salary_estimates — 60 rows
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.salary_estimates (
  id, created_at, user_id, analysis_id,
  estimated_salary, growth_projection, market_comparison,
  salary_gap, model_used
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '90 days'),
  (SELECT id FROM seed_users    WHERE rn = ((gs - 1) % 8) + 1),
  (SELECT id FROM seed_analyses WHERE rn = ((gs - 1) % 100) + 1),
  jsonb_build_object(
    'min', (2500 + floor(random()*2500))::int,
    'max', (5000 + floor(random()*5000))::int,
    'median', (3500 + floor(random()*3500))::int,
    'currency', 'MYR'
  ),
  jsonb_build_object(
    'year_1', (3 + floor(random()*8))::text || '%',
    'year_3', (8 + floor(random()*12))::text || '%',
    'year_5', (15 + floor(random()*20))::text || '%'
  ),
  jsonb_build_object(
    'market_median', (4000 + floor(random()*4000))::int,
    'percentile',    (25 + floor(random()*75))::int
  ),
  CASE WHEN random() > 0.5
    THEN 'Your current salary expectation is ' || (floor(random()*20))::text || '% below market median.'
    ELSE 'Your salary expectation aligns with the current market rate.' END,
  'gpt-5.4-mini'
FROM generate_series(1, 60) gs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. training_plans — 60 rows
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.training_plans (
  id, created_at, user_id, analysis_id,
  learning_path, skills_development, certifications,
  readiness_projection, model_used
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '90 days'),
  (SELECT id FROM seed_users    WHERE rn = ((gs - 1) % 8) + 1),
  (SELECT id FROM seed_analyses WHERE rn = ((gs - 1) % 100) + 1),
  jsonb_build_array(
    jsonb_build_object('week',1,'topic','Foundations of Data Analytics','platform','Coursera'),
    jsonb_build_object('week',4,'topic','SQL for Data Science','platform','DataCamp'),
    jsonb_build_object('week',8,'topic','Python for Machine Learning','platform','Udemy')
  ),
  jsonb_build_object(
    'technical',    jsonb_build_array('SQL','Python','Tableau'),
    'soft',         jsonb_build_array('Presentation','Critical Thinking'),
    'priority_gap', jsonb_build_array('Machine Learning','Cloud')
  ),
  jsonb_build_array(
    jsonb_build_object('name','Google Data Analytics','provider','Google','duration','6 months'),
    jsonb_build_object('name','AWS Cloud Practitioner','provider','Amazon','duration','3 months')
  ),
  jsonb_build_object(
    'current_readiness', (30 + floor(random()*40))::int,
    'projected_6m',      (50 + floor(random()*30))::int,
    'projected_12m',     (65 + floor(random()*35))::int
  ),
  'gpt-5.4-mini'
FROM generate_series(1, 60) gs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. interview_templates — 20 rows (employer_id → auth.users; job_id → jobs)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.interview_templates (
  id, created_at, employer_id, title, role_title,
  job_id, company_name, industry, experience_level,
  interview_type, instructions, time_limit_minutes
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '60 days'),
  (SELECT id FROM seed_users WHERE rn = ((gs - 1) % 8) + 1),
  (ARRAY[
    'Technical Screen — Software Engineer','Behavioural Interview — HR','Finance Role Assessment',
    'Customer Service Evaluation','General Management Screen','Operations Interview',
    'Data Analyst Technical Test','Marketing Creative Assessment','Sales Competency Screen',
    'Graduate Programme Assessment','Leadership Potential Interview','IT Support Technical Screen',
    'Accountant Competency Test','Engineering Problem Solving','Product Manager Case Study',
    'Logistics Coordinator Interview','Healthcare Admin Screen','Business Analyst Requirements',
    'UX Designer Portfolio Review','Network Engineer Technical Test'
  ])[gs],
  (ARRAY[
    'Software Engineer','HR Executive','Finance Executive','Customer Service Officer',
    'Operations Manager','Operations Executive','Data Analyst','Marketing Specialist',
    'Sales Executive','Graduate Trainee','Team Lead','IT Support Specialist',
    'Accountant','Civil Engineer','Product Manager','Logistics Coordinator',
    'Administrative Assistant','Business Analyst','UX Designer','Network Engineer'
  ])[gs],
  (SELECT id FROM seed_jobs WHERE rn = gs),
  (ARRAY[
    'Petronas','Maybank','CIMB Group','Axiata','AirAsia',
    'Gamuda','IHH Healthcare','Genting Group','Sime Darby','Public Bank',
    'RHB Bank','Tenaga Nasional','Maxis','Sunway Group','IOI Corporation',
    'YTL Corporation','MISC Berhad','AmBank','Telekom Malaysia','Hong Leong Bank'
  ])[gs],
  (ARRAY[
    'Information Technology','Finance','Finance','Hospitality','Manufacturing',
    'Logistics','Information Technology','Retail','Retail','Education',
    'Information Technology','Information Technology','Finance','Engineering','Information Technology',
    'Logistics','Healthcare','Finance','Information Technology','Information Technology'
  ])[gs],
  (ARRAY['1-3 years','Fresh Graduate','3-5 years','Fresh Graduate','5-10 years',
          '1-3 years','1-3 years','Fresh Graduate','1-3 years','Fresh Graduate',
          '5-10 years','1-3 years','3-5 years','3-5 years','3-5 years',
          '1-3 years','Fresh Graduate','3-5 years','1-3 years','3-5 years'])[gs],
  (ARRAY['technical','behavioral','competency','behavioral','general',
          'general','technical','general','competency','general',
          'competency','technical','competency','technical','general',
          'behavioral','general','competency','general','technical'])[gs],
  'Please answer each question clearly and concisely. Take your time to think before responding.',
  (ARRAY[30,20,25,20,30,25,35,20,25,30,30,25,25,35,30,20,20,25,20,35])[gs]
FROM generate_series(1, 20) gs;

-- Capture template IDs
CREATE TEMP TABLE seed_templates AS
SELECT id, employer_id, row_number() OVER (ORDER BY created_at) AS rn
FROM public.interview_templates
WHERE instructions = 'Please answer each question clearly and concisely. Take your time to think before responding.'
ORDER BY created_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. interview_template_questions — 5 per template = 100 rows
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.interview_template_questions (
  id, created_at, template_id, question_number, question_text, question_type,
  scoring_criteria, time_limit_seconds
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '60 days'),
  (SELECT id FROM seed_templates WHERE rn = ceil(gs::float / 5)::int),
  ((gs - 1) % 5) + 1,
  (ARRAY[
    'Tell me about yourself and why you are interested in this role.',
    'Describe a challenging project you completed and what you learned from it.',
    'How do you prioritise tasks when managing multiple deadlines?',
    'Give an example of how you resolved a conflict with a colleague.',
    'Where do you see yourself professionally in the next three to five years?'
  ])[((gs - 1) % 5) + 1],
  (ARRAY['open_ended','behavioral','situational','behavioral','open_ended'])[((gs - 1) % 5) + 1],
  (ARRAY[
    'Assess clarity of self-presentation and alignment with role requirements.',
    'Look for STAR structure: Situation, Task, Action, Result.',
    'Evaluate organisational skills and ability to work under pressure.',
    'Check for empathy, communication, and conflict resolution approach.',
    'Assess ambition, self-awareness, and career planning ability.'
  ])[((gs - 1) % 5) + 1],
  (ARRAY[120,180,120,150,120])[((gs - 1) % 5) + 1]
FROM generate_series(1, 100) gs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. interview_invitations — 60 rows
--    (template_id → interview_templates; candidate_id → auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.interview_invitations (
  id, created_at, template_id, candidate_id, application_id, status,
  message, deadline, started_at, completed_at,
  overall_score, ai_summary
)
SELECT
  gen_random_uuid(),
  now() - (random() * interval '40 days'),
  (SELECT id FROM seed_templates    WHERE rn = ((gs - 1) % 20) + 1),
  (SELECT id FROM seed_users        WHERE rn = ((gs - 1) % 8) + 1),
  CASE WHEN random() > 0.4
    THEN (SELECT id FROM seed_applications WHERE rn = ((gs - 1) % 1000) + 1)
    ELSE NULL END,
  (ARRAY['pending','in_progress','completed','completed','pending'])[ceil(random()*5)::int],
  'You have been selected to complete a structured AI interview for this position. Please complete it before the deadline.',
  now() + (floor(random()*14) + 3)::int * interval '1 day',
  CASE WHEN random() > 0.4 THEN now() - (random() * interval '10 days') ELSE NULL END,
  CASE WHEN random() > 0.5 THEN now() - (random() * interval '5 days')  ELSE NULL END,
  CASE WHEN random() > 0.5 THEN (45 + floor(random()*56))::int ELSE NULL END,
  CASE WHEN random() > 0.5
    THEN jsonb_build_object(
      'overall_score', (45 + floor(random()*56))::int,
      'strengths', jsonb_build_array('Clear communication','Relevant experience'),
      'improvements', jsonb_build_array('More specific examples needed')
    )
    ELSE NULL END
FROM generate_series(1, 60) gs
ON CONFLICT (template_id, candidate_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. template_questions — 30 rows (template_id → interview_templates)
--    This table is SEPARATE from interview_template_questions.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.template_questions (
  id, template_id, question_number, question_text, question_type,
  scoring_criteria, time_limit_seconds
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM seed_templates WHERE rn = ((gs - 1) % 20) + 1),
  ((gs - 1) % 5) + 1,
  (ARRAY[
    'Describe your most significant professional achievement to date.',
    'How do you approach learning a new technology or process quickly?',
    'Tell me about a time you demonstrated leadership without formal authority.',
    'How do you handle receiving critical feedback from a supervisor?',
    'Describe a situation where you had to work with limited resources.'
  ])[((gs - 1) % 5) + 1],
  (ARRAY['behavioral','situational','behavioral','behavioral','situational'])[((gs - 1) % 5) + 1],
  (ARRAY[
    'STAR format expected. Look for initiative and measurable outcomes.',
    'Assess learning agility and resourcefulness.',
    'Evaluate leadership qualities: influence, communication, motivation.',
    'Check emotional maturity, coachability and professional growth mindset.',
    'Test problem-solving, creativity and resilience under constraint.'
  ])[((gs - 1) % 5) + 1],
  (ARRAY[150,120,180,120,150])[((gs - 1) % 5) + 1]
FROM generate_series(1, 30) gs
ON CONFLICT (template_id, question_number) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. Cleanup temp tables
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS seed_users;
DROP TABLE IF EXISTS seed_analyses;
DROP TABLE IF EXISTS seed_jobs;
DROP TABLE IF EXISTS seed_applications;
DROP TABLE IF EXISTS seed_assignments;
DROP TABLE IF EXISTS seed_templates;
