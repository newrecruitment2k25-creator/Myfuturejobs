-- Allow applications to reference POC vacancies (not just employer jobs)
ALTER TABLE public.applications
  ALTER COLUMN job_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS poc_vacancy_id text;

CREATE INDEX IF NOT EXISTS applications_poc_vacancy_idx ON public.applications(poc_vacancy_id);

-- Allow all authenticated users to read jobs (not just employers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='jobs' AND policyname='Public read jobs'
  ) THEN
    EXECUTE 'CREATE POLICY "Public read jobs" ON public.jobs FOR SELECT USING (status = ''open'')';
  END IF;
END $$;

-- Allow jobseekers to manage their own applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='applications' AND policyname='Users manage own applications'
  ) THEN
    EXECUTE 'CREATE POLICY "Users manage own applications" ON public.applications FOR ALL USING (user_id = auth.uid())';
  END IF;
END $$;
