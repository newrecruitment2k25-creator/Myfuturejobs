-- Allow all authenticated users to read open jobs (not just the posting employer)
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

-- Ensure applications table has RLS enabled
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
