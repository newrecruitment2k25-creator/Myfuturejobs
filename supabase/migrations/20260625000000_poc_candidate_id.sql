-- POC FIX 6: Link registered users to PERKESO candidate IDs
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS poc_candidate_id text;

-- Demo: link test account to C0001 POC candidate
UPDATE profiles SET poc_candidate_id = 'C0001'
WHERE id = (SELECT id FROM auth.users WHERE email = 'testjobseeker@resumy.my' LIMIT 1);
