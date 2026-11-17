-- ==============================================================================
-- BUSINESSBRIDGE DATABASE INITIAL SCHEMA & SECURITY MIGRATION
-- Phase 01: Foundation, Architecture & Project Setup
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums for consistent type safety
CREATE TYPE user_role AS ENUM ('founder', 'mentor', 'admin');
CREATE TYPE mentor_verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE business_stage AS ENUM ('idea', 'prototype', 'early_traction', 'growth', 'scaling');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
CREATE TYPE board_member_status AS ENUM ('active', 'inactive', 'resigned');
CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed', 'delayed');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');

-- Function to automatically set updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 1. PROFILES TABLE (Linked to Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'founder',
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 2. MENTOR PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mentor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_title TEXT NOT NULL,
  previous_company TEXT NOT NULL,
  years_of_experience INTEGER NOT NULL CHECK (years_of_experience >= 0),
  expertise TEXT[] NOT NULL DEFAULT '{}',
  biography TEXT NOT NULL,
  availability TEXT NOT NULL DEFAULT 'advisory_only',
  verification_status mentor_verification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_mentor_profiles_updated_at
  BEFORE UPDATE ON public.mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 3. FOUNDER PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.founder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  experience_level TEXT NOT NULL DEFAULT 'first_time',
  entrepreneurial_interests TEXT[] NOT NULL DEFAULT '{}',
  biography TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_founder_profiles_updated_at
  BEFORE UPDATE ON public.founder_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 4. STARTUPS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.startups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  description TEXT NOT NULL,
  business_stage business_stage NOT NULL DEFAULT 'idea',
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_startups_founder_id ON public.startups(founder_id);

CREATE TRIGGER update_startups_updated_at
  BEFORE UPDATE ON public.startups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. ADVISORY BOARDS TABLE (Virtual Boardroom)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.advisory_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL UNIQUE REFERENCES public.startups(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Advisory Board',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_advisory_boards_startup ON public.advisory_boards(startup_id);

-- ==============================================================================
-- 6. BOARD MEMBERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.advisory_boards(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  advisory_role TEXT NOT NULL DEFAULT 'Advisory Board Member',
  membership_status board_member_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_board_mentor UNIQUE (board_id, mentor_id)
);

CREATE INDEX idx_board_members_board ON public.board_members(board_id);
CREATE INDEX idx_board_members_mentor ON public.board_members(mentor_id);

-- ==============================================================================
-- 7. BOARD INVITATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.board_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.advisory_boards(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status invitation_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_board ON public.board_invitations(board_id);
CREATE INDEX idx_invitations_mentor ON public.board_invitations(mentor_id);

CREATE TRIGGER update_board_invitations_updated_at
  BEFORE UPDATE ON public.board_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 8. MILESTONES TABLE (Business Journey Tracker)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status milestone_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_startup ON public.milestones(startup_id);

CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 9. TASKS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status task_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_milestone ON public.tasks(milestone_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 10. TASK UPDATES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.task_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_updates_task ON public.task_updates(task_id);

-- ==============================================================================
-- 11. MEETINGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.advisory_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_date TIMESTAMPTZ NOT NULL,
  meeting_notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meetings_board ON public.meetings(board_id);

-- ==============================================================================
-- 12. RECOMMENDATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommendations_startup ON public.recommendations(startup_id);
CREATE INDEX idx_recommendations_mentor ON public.recommendations(mentor_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisory_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. MENTOR PROFILES POLICIES
CREATE POLICY "Verified mentor profiles are viewable by authenticated users"
  ON public.mentor_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mentors can insert their own mentor profile"
  ON public.mentor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mentors can update their own mentor profile"
  ON public.mentor_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. FOUNDER PROFILES POLICIES
CREATE POLICY "Founder profiles are viewable by authenticated users"
  ON public.founder_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Founders can insert their own founder profile"
  ON public.founder_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Founders can update their own founder profile"
  ON public.founder_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. STARTUPS POLICIES
CREATE POLICY "Founders can manage their own startups"
  ON public.startups FOR ALL
  TO authenticated
  USING (auth.uid() = founder_id)
  WITH CHECK (auth.uid() = founder_id);

CREATE POLICY "Board mentors can view startups they advise"
  ON public.startups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.advisory_boards ab
      JOIN public.board_members bm ON bm.board_id = ab.id
      JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
      WHERE ab.startup_id = public.startups.id
      AND mp.user_id = auth.uid()
      AND bm.membership_status = 'active'
    )
  );

-- 5. ADVISORY BOARDS POLICIES
CREATE POLICY "Startups founders can manage advisory boards"
  ON public.advisory_boards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startups s
      WHERE s.id = public.advisory_boards.startup_id
      AND s.founder_id = auth.uid()
    )
  );

CREATE POLICY "Active board members can view their advisory board"
  ON public.advisory_boards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.board_members bm
      JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
      WHERE bm.board_id = public.advisory_boards.id
      AND mp.user_id = auth.uid()
      AND bm.membership_status = 'active'
    )
  );

-- 6. BOARD MEMBERS POLICIES
CREATE POLICY "Founders can view and manage board members"
  ON public.board_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.advisory_boards ab
      JOIN public.startups s ON s.id = ab.startup_id
      WHERE ab.id = public.board_members.board_id
      AND s.founder_id = auth.uid()
    )
  );

CREATE POLICY "Mentors can view their own board memberships"
  ON public.board_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.id = public.board_members.mentor_id
      AND mp.user_id = auth.uid()
    )
  );

-- 7. BOARD INVITATIONS POLICIES
CREATE POLICY "Founders can manage invitations they sent"
  ON public.board_invitations FOR ALL
  TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Mentors can view and respond to their invitations"
  ON public.board_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.id = public.board_invitations.mentor_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Mentors can update invitation status"
  ON public.board_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.id = public.board_invitations.mentor_id
      AND mp.user_id = auth.uid()
    )
  );

-- 8. MILESTONES POLICIES
CREATE POLICY "Founders can manage milestones for their startups"
  ON public.milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startups s
      WHERE s.id = public.milestones.startup_id
      AND s.founder_id = auth.uid()
    )
  );

CREATE POLICY "Board mentors can view milestones"
  ON public.milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.advisory_boards ab
      JOIN public.board_members bm ON bm.board_id = ab.id
      JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
      WHERE ab.startup_id = public.milestones.startup_id
      AND mp.user_id = auth.uid()
      AND bm.membership_status = 'active'
    )
  );

-- 9. TASKS POLICIES
CREATE POLICY "Founders can manage tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.milestones m
      JOIN public.startups s ON s.id = m.startup_id
      WHERE m.id = public.tasks.milestone_id
      AND s.founder_id = auth.uid()
    )
  );

CREATE POLICY "Assigned users and board mentors can view tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.milestones m
      JOIN public.advisory_boards ab ON ab.startup_id = m.startup_id
      JOIN public.board_members bm ON bm.board_id = ab.id
      JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
      WHERE m.id = public.tasks.milestone_id
      AND mp.user_id = auth.uid()
      AND bm.membership_status = 'active'
    )
  );

-- 10. TASK UPDATES POLICIES
CREATE POLICY "Authorized users can view task updates"
  ON public.task_updates FOR SELECT
  TO authenticated
  USING (
    updated_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON m.id = t.milestone_id
      JOIN public.startups s ON s.id = m.startup_id
      WHERE t.id = public.task_updates.task_id
      AND s.founder_id = auth.uid()
    )
  );

CREATE POLICY "Users can create updates on permitted tasks"
  ON public.task_updates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = updated_by);

-- 11. MEETINGS POLICIES
CREATE POLICY "Board participants can view meetings"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.advisory_boards ab
      JOIN public.startups s ON s.id = ab.startup_id
      WHERE ab.id = public.meetings.board_id
      AND s.founder_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.board_members bm
      JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
      WHERE bm.board_id = public.meetings.board_id
      AND mp.user_id = auth.uid()
      AND bm.membership_status = 'active'
    )
  );

CREATE POLICY "Founders can create and manage meetings"
  ON public.meetings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.advisory_boards ab
      JOIN public.startups s ON s.id = ab.startup_id
      WHERE ab.id = public.meetings.board_id
      AND s.founder_id = auth.uid()
    )
  );

-- 12. RECOMMENDATIONS POLICIES
CREATE POLICY "Startup participants can view recommendations"
  ON public.recommendations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startups s
      WHERE s.id = public.recommendations.startup_id
      AND s.founder_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.id = public.recommendations.mentor_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Mentors can create recommendations"
  ON public.recommendations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.id = mentor_id
      AND mp.user_id = auth.uid()
    )
  );

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'founder'::user_role),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
