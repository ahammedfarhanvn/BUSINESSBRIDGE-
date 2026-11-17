-- ==============================================================================
-- 1. Extend profiles table
-- ==============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ==============================================================================
-- 2. Extend founder_profiles table
-- ==============================================================================
ALTER TABLE public.founder_profiles
  ADD COLUMN IF NOT EXISTS startup_name TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS business_stage TEXT DEFAULT 'idea',
  ADD COLUMN IF NOT EXISTS business_description TEXT,
  ADD COLUMN IF NOT EXISTS business_goals TEXT;

ALTER TABLE public.founder_profiles
  ALTER COLUMN biography DROP NOT NULL;

-- ==============================================================================
-- 3. Extend mentor_profiles table
-- ==============================================================================
ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS previous_designation TEXT,
  ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS industry_expertise TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specialization TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS achievements TEXT,
  ADD COLUMN IF NOT EXISTS mentoring_availability TEXT DEFAULT 'advisory_only',
  ADD COLUMN IF NOT EXISTS mentoring_format TEXT DEFAULT 'virtual';

ALTER TABLE public.mentor_profiles
  ALTER COLUMN professional_title DROP NOT NULL,
  ALTER COLUMN previous_company DROP NOT NULL,
  ALTER COLUMN years_of_experience DROP NOT NULL,
  ALTER COLUMN biography DROP NOT NULL;

-- ==============================================================================
-- 4. Robust handle_new_user Trigger (Wrapped in Exception Handlers)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.user_role;
  raw_role_str TEXT;
  user_full_name TEXT;
BEGIN
  raw_role_str := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'founder'));
  IF raw_role_str = 'mentor' THEN
    assigned_role := 'mentor'::public.user_role;
  ELSIF raw_role_str = 'admin' THEN
    assigned_role := 'admin'::public.user_role;
  ELSE
    assigned_role := 'founder'::public.user_role;
  END IF;

  user_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  BEGIN
    INSERT INTO public.profiles (
      id, full_name, email, role, avatar_url, phone, location, bio, is_active
    ) VALUES (
      NEW.id,
      user_full_name,
      NEW.email,
      assigned_role,
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'location',
      COALESCE(NEW.raw_user_meta_data->>'bio', NEW.raw_user_meta_data->>'biography'),
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      location = COALESCE(EXCLUDED.location, public.profiles.location),
      bio = COALESCE(EXCLUDED.bio, public.profiles.bio),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile: %', SQLERRM;
  END;

  IF assigned_role = 'founder' THEN
    BEGIN
      INSERT INTO public.founder_profiles (
        user_id, experience_level, entrepreneurial_interests, biography,
        startup_name, industry, business_stage, business_description, business_goals
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'experience_level', 'first_time'),
        ARRAY[COALESCE(NEW.raw_user_meta_data->>'industry', 'Tech')],
        COALESCE(NEW.raw_user_meta_data->>'biography', NEW.raw_user_meta_data->>'business_goals', ''),
        NEW.raw_user_meta_data->>'startup_name',
        NEW.raw_user_meta_data->>'industry',
        COALESCE(NEW.raw_user_meta_data->>'business_stage', 'idea'),
        NEW.raw_user_meta_data->>'business_description',
        NEW.raw_user_meta_data->>'business_goals'
      )
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error creating founder profile: %', SQLERRM;
    END;
  ELSIF assigned_role = 'mentor' THEN
    BEGIN
      INSERT INTO public.mentor_profiles (
        user_id, professional_title, previous_company, previous_designation,
        years_experience, years_of_experience, biography, mentoring_availability,
        mentoring_format, verification_status
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'professional_title', NEW.raw_user_meta_data->>'previous_designation', 'Advisor'),
        COALESCE(NEW.raw_user_meta_data->>'previous_company', 'Business Leadership'),
        NEW.raw_user_meta_data->>'previous_designation',
        COALESCE((NEW.raw_user_meta_data->>'years_experience')::INTEGER, (NEW.raw_user_meta_data->>'years_of_experience')::INTEGER, 10),
        COALESCE((NEW.raw_user_meta_data->>'years_of_experience')::INTEGER, (NEW.raw_user_meta_data->>'years_experience')::INTEGER, 10),
        COALESCE(NEW.raw_user_meta_data->>'biography', 'Retired business leader & mentor'),
        COALESCE(NEW.raw_user_meta_data->>'mentoring_availability', 'advisory_only'),
        COALESCE(NEW.raw_user_meta_data->>'mentoring_format', 'virtual'),
        'verified'::public.mentor_verification_status
      )
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error creating mentor profile: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reattach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 5. Business Journey Tracker Tables
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.startup_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES public.startups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  stage TEXT NOT NULL DEFAULT 'idea_validation',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.startup_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_started',
  order_index INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.milestone_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.startup_projects(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  feedback_type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.startup_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_feedback ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated full access to startup_projects" ON public.startup_projects;
CREATE POLICY "Allow authenticated full access to startup_projects" ON public.startup_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to project_milestones" ON public.project_milestones;
CREATE POLICY "Allow authenticated full access to project_milestones" ON public.project_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to project_tasks" ON public.project_tasks;
CREATE POLICY "Allow authenticated full access to project_tasks" ON public.project_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to milestone_feedback" ON public.milestone_feedback;
CREATE POLICY "Allow authenticated full access to milestone_feedback" ON public.milestone_feedback FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow public anon select on profiles for demo
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
