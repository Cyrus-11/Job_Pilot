CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  location text,
  current_title text,
  experience_level text CHECK (
    experience_level IS NULL
    OR experience_level IN ('junior', 'mid', 'senior', 'lead')
  ),
  years_experience integer CHECK (
    years_experience IS NULL
    OR years_experience >= 0
  ),
  skills text[] NOT NULL DEFAULT '{}',
  industries text[] NOT NULL DEFAULT '{}',
  work_experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  education jsonb NOT NULL DEFAULT '{}'::jsonb,
  job_titles_seeking text[] NOT NULL DEFAULT '{}',
  remote_preference text CHECK (
    remote_preference IS NULL
    OR remote_preference IN ('remote', 'onsite', 'hybrid', 'any')
  ),
  preferred_locations text[] NOT NULL DEFAULT '{}',
  salary_expectation text,
  cover_letter_tone text CHECK (
    cover_letter_tone IS NULL
    OR cover_letter_tone IN ('formal', 'casual', 'enthusiastic')
  ),
  linkedin_url text,
  portfolio_url text,
  work_authorization text CHECK (
    work_authorization IS NULL
    OR work_authorization IN ('citizen', 'permanent_resident', 'visa_required')
  ),
  resume_pdf_url text,
  resume_pdf_key text,
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running' CHECK (
    status IN ('running', 'completed', 'failed')
  ),
  job_title_searched text NOT NULL,
  location_searched text,
  jobs_found integer NOT NULL DEFAULT 0 CHECK (jobs_found >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('search', 'url')),
  source_url text,
  external_apply_url text,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  salary text,
  job_type text CHECK (
    job_type IS NULL
    OR job_type IN ('fulltime', 'parttime', 'contract')
  ),
  about_role text,
  responsibilities text[] NOT NULL DEFAULT '{}',
  requirements text[] NOT NULL DEFAULT '{}',
  nice_to_have text[] NOT NULL DEFAULT '{}',
  benefits text[] NOT NULL DEFAULT '{}',
  about_company text,
  match_score integer CHECK (
    match_score IS NULL
    OR (match_score >= 0 AND match_score <= 100)
  ),
  match_reason text,
  matched_skills text[] NOT NULL DEFAULT '{}',
  missing_skills text[] NOT NULL DEFAULT '{}',
  company_research jsonb,
  found_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  level text NOT NULL DEFAULT 'info' CHECK (
    level IN ('info', 'success', 'warning', 'error')
  ),
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_is_complete_idx
  ON public.profiles (is_complete);

CREATE INDEX IF NOT EXISTS agent_runs_user_started_idx
  ON public.agent_runs (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS agent_runs_user_status_idx
  ON public.agent_runs (user_id, status);

CREATE INDEX IF NOT EXISTS jobs_user_found_idx
  ON public.jobs (user_id, found_at DESC);

CREATE INDEX IF NOT EXISTS jobs_user_match_idx
  ON public.jobs (user_id, match_score DESC);

CREATE INDEX IF NOT EXISTS jobs_run_idx
  ON public.jobs (run_id);

CREATE INDEX IF NOT EXISTS jobs_company_research_idx
  ON public.jobs (user_id)
  WHERE company_research IS NOT NULL;

CREATE INDEX IF NOT EXISTS agent_logs_run_created_idx
  ON public.agent_logs (run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS agent_logs_user_created_idx
  ON public.agent_logs (user_id, created_at DESC);

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_owner_select ON public.profiles;
DROP POLICY IF EXISTS profiles_owner_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_owner_update ON public.profiles;

CREATE POLICY profiles_owner_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY profiles_owner_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY profiles_owner_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS agent_runs_owner_select ON public.agent_runs;
DROP POLICY IF EXISTS agent_runs_owner_insert ON public.agent_runs;
DROP POLICY IF EXISTS agent_runs_owner_update ON public.agent_runs;

CREATE POLICY agent_runs_owner_select ON public.agent_runs
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY agent_runs_owner_insert ON public.agent_runs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY agent_runs_owner_update ON public.agent_runs
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS jobs_owner_select ON public.jobs;
DROP POLICY IF EXISTS jobs_owner_insert ON public.jobs;
DROP POLICY IF EXISTS jobs_owner_update ON public.jobs;

CREATE POLICY jobs_owner_select ON public.jobs
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY jobs_owner_insert ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY jobs_owner_update ON public.jobs
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS agent_logs_owner_select ON public.agent_logs;
DROP POLICY IF EXISTS agent_logs_owner_insert ON public.agent_logs;

CREATE POLICY agent_logs_owner_select ON public.agent_logs
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY agent_logs_owner_insert ON public.agent_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_objects_resumes_select ON storage.objects;
DROP POLICY IF EXISTS storage_objects_resumes_insert ON storage.objects;
DROP POLICY IF EXISTS storage_objects_resumes_update ON storage.objects;
DROP POLICY IF EXISTS storage_objects_resumes_delete ON storage.objects;

CREATE POLICY storage_objects_resumes_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket = 'resumes'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY storage_objects_resumes_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket = 'resumes'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY storage_objects_resumes_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket = 'resumes'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
  )
  WITH CHECK (
    bucket = 'resumes'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY storage_objects_resumes_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket = 'resumes'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
  );

REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.agent_runs FROM anon, authenticated;
REVOKE ALL ON public.jobs FROM anon, authenticated;
REVOKE ALL ON public.agent_logs FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.profiles TO authenticated;
GRANT UPDATE (
  full_name,
  email,
  phone,
  location,
  current_title,
  experience_level,
  years_experience,
  skills,
  industries,
  work_experience,
  education,
  job_titles_seeking,
  remote_preference,
  preferred_locations,
  salary_expectation,
  cover_letter_tone,
  linkedin_url,
  portfolio_url,
  work_authorization,
  resume_pdf_url,
  resume_pdf_key,
  is_complete
) ON public.profiles TO authenticated;

GRANT SELECT, INSERT ON public.agent_runs TO authenticated;
GRANT UPDATE (
  status,
  jobs_found,
  completed_at
) ON public.agent_runs TO authenticated;

GRANT SELECT, INSERT ON public.jobs TO authenticated;
GRANT UPDATE (
  source_url,
  external_apply_url,
  title,
  company,
  location,
  salary,
  job_type,
  about_role,
  responsibilities,
  requirements,
  nice_to_have,
  benefits,
  about_company,
  match_score,
  match_reason,
  matched_skills,
  missing_skills,
  company_research
) ON public.jobs TO authenticated;

GRANT SELECT, INSERT ON public.agent_logs TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
