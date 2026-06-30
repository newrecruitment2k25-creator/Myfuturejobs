
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON public.analyses(user_id);

GRANT SELECT ON public.analyses TO authenticated;

CREATE POLICY "Users can view their own analyses"
ON public.analyses
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
