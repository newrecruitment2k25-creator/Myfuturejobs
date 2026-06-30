
-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'job_seeker',
  visible_to_employers boolean NOT NULL DEFAULT false,
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

-- Trigger to auto-create profile on signup
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

-- Backfill existing users
INSERT INTO public.profiles (id, role)
SELECT id, 'job_seeker' FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Jobs table
CREATE TABLE public.jobs (
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

CREATE INDEX jobs_employer_id_idx ON public.jobs(employer_id);

GRANT SELECT, INSERT, UPDATE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers view own jobs" ON public.jobs
  FOR SELECT TO authenticated USING (employer_id = auth.uid());
CREATE POLICY "Employers insert own jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (employer_id = auth.uid());
CREATE POLICY "Employers update own jobs" ON public.jobs
  FOR UPDATE TO authenticated USING (employer_id = auth.uid()) WITH CHECK (employer_id = auth.uid());
