-- ==============================================================================
-- BUSINESSBRIDGE AUTHENTICATION & USER MANAGEMENT MIGRATION
-- Phase 02: Enhanced Profiles, Role Escalation Protection, and Trigger Automation
-- ==============================================================================

-- 1. Extend public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Extend public.founder_profiles
ALTER TABLE public.founder_profiles
  ADD COLUMN IF NOT EXISTS startup_name TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS business_stage TEXT DEFAULT 'idea',
  ADD COLUMN IF NOT EXISTS business_description TEXT,
  ADD COLUMN IF NOT EXISTS business_goals TEXT;

-- Provide safe default for biography on founder_profiles
ALTER TABLE public.founder_profiles
  ALTER COLUMN biography SET DEFAULT '';

-- 3. Extend public.mentor_profiles
ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS previous_designation TEXT,
  ADD COLUMN IF NOT EXISTS years_experience INTEGER,
  ADD COLUMN IF NOT EXISTS industry_expertise TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specialization TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS achievements TEXT,
  ADD COLUMN IF NOT EXISTS mentoring_availability TEXT DEFAULT 'advisory_only',
  ADD COLUMN IF NOT EXISTS mentoring_format TEXT DEFAULT 'virtual';

-- Provide safe defaults on mentor_profiles
ALTER TABLE public.mentor_profiles
  ALTER COLUMN professional_title SET DEFAULT '',
  ALTER COLUMN previous_company SET DEFAULT '',
  ALTER COLUMN years_of_experience SET DEFAULT 0,
  ALTER COLUMN biography SET DEFAULT '';

-- ==============================================================================
-- 4. Admin Check Helper Function
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 5. Prevent Profile Role Escalation Trigger Function
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  acting_user_role TEXT;
BEGIN
  -- Allow postgres superuser and supabase service_role to bypass all checks
  IF current_user = 'postgres' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Fetch role of acting user
  SELECT role INTO acting_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- If acting user is admin, allow modification
  IF acting_user_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Prevent modifying another user's profile
  IF auth.uid() IS NOT NULL AND auth.uid() != OLD.id THEN
    RAISE EXCEPTION 'Unauthorized: You can only update your own profile.';
  END IF;

  -- Prevent changing role
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Unauthorized: Users are not permitted to change their own role.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_profile_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- ==============================================================================
-- 6. Updated handle_new_user Trigger Function on auth.users
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.user_role;
  raw_role_str TEXT;
  user_full_name TEXT;
BEGIN
  -- Extract raw role string (lowercased)
  raw_role_str := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'founder'));

  -- Strict validation: Only 'founder' or 'mentor' allowed from client metadata.
  -- If 'admin' or invalid, default to 'founder'. NEVER allow public admin registration.
  IF raw_role_str = 'mentor' THEN
    assigned_role := 'mentor'::public.user_role;
  ELSE
    assigned_role := 'founder'::public.user_role;
  END IF;

  -- Extract full name or fallback to username from email
  user_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- 1. Insert or update public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    avatar_url,
    phone,
    location,
    bio,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_full_name,
    NEW.email,
    assigned_role,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'location',
    COALESCE(NEW.raw_user_meta_data->>'bio', NEW.raw_user_meta_data->>'biography'),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    location = COALESCE(EXCLUDED.location, public.profiles.location),
    bio = COALESCE(EXCLUDED.bio, public.profiles.bio),
    updated_at = NOW();

  -- 2. Insert into role-specific profile table
  IF assigned_role = 'founder' THEN
    INSERT INTO public.founder_profiles (
      user_id,
      experience_level,
      entrepreneurial_interests,
      biography,
      startup_name,
      industry,
      business_stage,
      business_description,
      business_goals,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'experience_level', 'first_time'),
      CASE
        WHEN NEW.raw_user_meta_data->'entrepreneurial_interests' IS NOT NULL
             AND jsonb_typeof(NEW.raw_user_meta_data->'entrepreneurial_interests') = 'array'
        THEN (SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'entrepreneurial_interests')))
        ELSE '{}'::TEXT[]
      END,
      COALESCE(NEW.raw_user_meta_data->>'biography', NEW.raw_user_meta_data->>'bio', ''),
      NEW.raw_user_meta_data->>'startup_name',
      NEW.raw_user_meta_data->>'industry',
      COALESCE(NEW.raw_user_meta_data->>'business_stage', 'idea'),
      NEW.raw_user_meta_data->>'business_description',
      NEW.raw_user_meta_data->>'business_goals',
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

  ELSIF assigned_role = 'mentor' THEN
    INSERT INTO public.mentor_profiles (
      user_id,
      professional_title,
      previous_company,
      previous_designation,
      years_of_experience,
      years_experience,
      expertise,
      industry_expertise,
      specialization,
      biography,
      achievements,
      availability,
      mentoring_availability,
      mentoring_format,
      verification_status,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'professional_title', NEW.raw_user_meta_data->>'previous_designation', ''),
      COALESCE(NEW.raw_user_meta_data->>'previous_company', ''),
      NEW.raw_user_meta_data->>'previous_designation',
      COALESCE((NEW.raw_user_meta_data->>'years_of_experience')::INTEGER, (NEW.raw_user_meta_data->>'years_experience')::INTEGER, 0),
      COALESCE((NEW.raw_user_meta_data->>'years_experience')::INTEGER, (NEW.raw_user_meta_data->>'years_of_experience')::INTEGER, 0),
      CASE
        WHEN NEW.raw_user_meta_data->'expertise' IS NOT NULL
             AND jsonb_typeof(NEW.raw_user_meta_data->'expertise') = 'array'
        THEN (SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'expertise')))
        ELSE '{}'::TEXT[]
      END,
      CASE
        WHEN NEW.raw_user_meta_data->'industry_expertise' IS NOT NULL
             AND jsonb_typeof(NEW.raw_user_meta_data->'industry_expertise') = 'array'
        THEN (SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'industry_expertise')))
        ELSE '{}'::TEXT[]
      END,
      CASE
        WHEN NEW.raw_user_meta_data->'specialization' IS NOT NULL
             AND jsonb_typeof(NEW.raw_user_meta_data->'specialization') = 'array'
        THEN (SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'specialization')))
        ELSE '{}'::TEXT[]
      END,
      COALESCE(NEW.raw_user_meta_data->>'biography', NEW.raw_user_meta_data->>'bio', ''),
      NEW.raw_user_meta_data->>'achievements',
      COALESCE(NEW.raw_user_meta_data->>'availability', 'advisory_only'),
      COALESCE(NEW.raw_user_meta_data->>'mentoring_availability', 'advisory_only'),
      COALESCE(NEW.raw_user_meta_data->>'mentoring_format', 'virtual'),
      'pending'::public.mentor_verification_status,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reattach handle_new_user trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. Row Level Security Policies
-- ==============================================================================

-- PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- FOUNDER PROFILES
DROP POLICY IF EXISTS "Founder profiles are viewable by authenticated users" ON public.founder_profiles;
CREATE POLICY "Founder profiles are viewable by authenticated users"
  ON public.founder_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Founders can insert their own founder profile" ON public.founder_profiles;
CREATE POLICY "Founders can insert their own founder profile"
  ON public.founder_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Founders can update their own founder profile" ON public.founder_profiles;
CREATE POLICY "Founders can update their own founder profile"
  ON public.founder_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins have full access to founder profiles" ON public.founder_profiles;
CREATE POLICY "Admins have full access to founder profiles"
  ON public.founder_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- MENTOR PROFILES
DROP POLICY IF EXISTS "Verified mentor profiles are viewable by authenticated users" ON public.mentor_profiles;
CREATE POLICY "Verified mentor profiles are viewable by authenticated users"
  ON public.mentor_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Mentors can insert their own mentor profile" ON public.mentor_profiles;
CREATE POLICY "Mentors can insert their own mentor profile"
  ON public.mentor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mentors can update their own mentor profile" ON public.mentor_profiles;
CREATE POLICY "Mentors can update their own mentor profile"
  ON public.mentor_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins have full access to mentor profiles" ON public.mentor_profiles;
CREATE POLICY "Admins have full access to mentor profiles"
  ON public.mentor_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
