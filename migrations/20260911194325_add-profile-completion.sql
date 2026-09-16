ALTER TABLE public.profiles
  ADD COLUMN completion_percentage integer NOT NULL DEFAULT 0
    CHECK (completion_percentage BETWEEN 0 AND 100),
  ADD COLUMN missing_fields text[] NOT NULL DEFAULT ARRAY[
    'Full name', 'Email', 'Location', 'Current/recent job title', 'Experience level',
    'Years of experience', 'Skills', 'Job titles seeking', 'Remote preference', 'Work authorization'
  ],
  ADD COLUMN first_completed_at timestamptz;

GRANT UPDATE (completion_percentage, missing_fields, first_completed_at)
  ON public.profiles TO authenticated;
