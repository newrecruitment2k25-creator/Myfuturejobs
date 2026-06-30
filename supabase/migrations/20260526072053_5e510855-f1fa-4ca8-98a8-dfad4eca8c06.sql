
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_type TEXT NOT NULL,
  industry TEXT NOT NULL,
  experience_level TEXT NOT NULL,
  language_preference TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  full_results JSONB NOT NULL,
  email TEXT
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Public insert (anyone can create an analysis, no auth required)
CREATE POLICY "Anyone can insert analyses"
  ON public.analyses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
