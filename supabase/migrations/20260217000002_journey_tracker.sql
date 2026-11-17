-- ==============================================================================
-- BUSINESSBRIDGE DATABASE MIGRATION - PHASE 4: BUSINESS JOURNEY TRACKER
-- Migration: 20260217000002_journey_tracker.sql
-- Description: Creates startup_projects, project_milestones, project_tasks,
--              and milestone_feedback tables with indexes, triggers, and RLS.
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shared updated_at function (idempotent definition)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 1. STARTUP PROJECTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.startup_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  stage TEXT,
  goal TEXT,
  target_launch_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'paused', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. PROJECT MILESTONES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.startup_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  stage TEXT,
  start_date DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. PROJECT TASKS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. MILESTONE FEEDBACK TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.milestone_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.startup_projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_startup_projects_founder ON public.startup_projects(founder_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_milestone ON public.project_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON public.project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_milestone_feedback_project ON public.milestone_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_milestone_feedback_milestone ON public.milestone_feedback(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_feedback_author ON public.milestone_feedback(author_id);

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================
DROP TRIGGER IF EXISTS update_startup_projects_updated_at ON public.startup_projects;
CREATE TRIGGER update_startup_projects_updated_at
  BEFORE UPDATE ON public.startup_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_tasks_updated_at ON public.project_tasks;
CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.startup_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_feedback ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. STARTUP PROJECTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Founders can manage their own startup projects" ON public.startup_projects;
CREATE POLICY "Founders can manage their own startup projects"
  ON public.startup_projects FOR ALL
  TO authenticated
  USING (auth.uid() = founder_id)
  WITH CHECK (auth.uid() = founder_id);

DROP POLICY IF EXISTS "Accepted board mentors can view founder startup projects" ON public.startup_projects;
CREATE POLICY "Accepted board mentors can view founder startup projects"
  ON public.startup_projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startups s
      JOIN public.advisory_boards ab ON ab.startup_id = s.id
      JOIN public.board_members bm ON bm.board_id = ab.id
      JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
      WHERE s.founder_id = public.startup_projects.founder_id
      AND mp.user_id = auth.uid()
      AND bm.membership_status = 'active'
    )
  );

-- ------------------------------------------------------------------------------
-- 2. PROJECT MILESTONES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Founders can manage milestones for their projects" ON public.project_milestones;
CREATE POLICY "Founders can manage milestones for their projects"
  ON public.project_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_projects p
      WHERE p.id = public.project_milestones.project_id
      AND p.founder_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.startup_projects p
      WHERE p.id = public.project_milestones.project_id
      AND p.founder_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Accepted board mentors can view project milestones" ON public.project_milestones;
CREATE POLICY "Accepted board mentors can view project milestones"
  ON public.project_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_projects p
      JOIN public.startups s ON s.founder_id = p.founder_id
      JOIN public.advisory_boards ab ON ab.startup_id = s.id
      JOIN public.board_members bm ON bm.board_id = ab.id
      JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
      WHERE p.id = public.project_milestones.project_id
      AND mp.user_id = auth.uid()
      AND bm.membership_status = 'active'
    )
  );

-- ------------------------------------------------------------------------------
-- 3. PROJECT TASKS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Founders can manage tasks for their projects" ON public.project_tasks;
CREATE POLICY "Founders can manage tasks for their projects"
  ON public.project_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_milestones m
      JOIN public.startup_projects p ON p.id = m.project_id
      WHERE m.id = public.project_tasks.milestone_id
      AND p.founder_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_milestones m
      JOIN public.startup_projects p ON p.id = m.project_id
      WHERE m.id = public.project_tasks.milestone_id
      AND p.founder_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Assigned users and board mentors can view project tasks" ON public.project_tasks;
CREATE POLICY "Assigned users and board mentors can view project tasks"
  ON public.project_tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_milestones m
      JOIN public.startup_projects p ON p.id = m.project_id
      JOIN public.startups s ON s.founder_id = p.founder_id
      JOIN public.advisory_boards ab ON ab.startup_id = s.id
      JOIN public.board_members bm ON bm.board_id = ab.id
      JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
      WHERE m.id = public.project_tasks.milestone_id
      AND mp.user_id = auth.uid()
      AND bm.membership_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Assigned users can update their assigned tasks" ON public.project_tasks;
CREATE POLICY "Assigned users can update their assigned tasks"
  ON public.project_tasks FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- ------------------------------------------------------------------------------
-- 4. MILESTONE FEEDBACK POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Founders can view feedback on their projects" ON public.milestone_feedback;
CREATE POLICY "Founders can view feedback on their projects"
  ON public.milestone_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_projects p
      WHERE p.id = public.milestone_feedback.project_id
      AND p.founder_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Active board mentors can view project feedback" ON public.milestone_feedback;
CREATE POLICY "Active board mentors can view project feedback"
  ON public.milestone_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_projects p
      JOIN public.startups s ON s.founder_id = p.founder_id
      JOIN public.advisory_boards ab ON ab.startup_id = s.id
      JOIN public.board_members bm ON bm.board_id = ab.id
      JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
      WHERE p.id = public.milestone_feedback.project_id
      AND mp.user_id = auth.uid()
      AND bm.membership_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Active board mentors and founders can insert milestone feedback" ON public.milestone_feedback;
CREATE POLICY "Active board mentors and founders can insert milestone feedback"
  ON public.milestone_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.startup_projects p
        JOIN public.startups s ON s.founder_id = p.founder_id
        JOIN public.advisory_boards ab ON ab.startup_id = s.id
        JOIN public.board_members bm ON bm.board_id = ab.id
        JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
        WHERE p.id = public.milestone_feedback.project_id
        AND mp.user_id = auth.uid()
        AND bm.membership_status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.startup_projects p
        WHERE p.id = public.milestone_feedback.project_id
        AND p.founder_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Authors can update their own milestone feedback" ON public.milestone_feedback;
CREATE POLICY "Authors can update their own milestone feedback"
  ON public.milestone_feedback FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
