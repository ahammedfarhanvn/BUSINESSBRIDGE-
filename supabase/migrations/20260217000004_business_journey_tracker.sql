-- ==============================================================================
-- BUSINESSBRIDGE DATABASE MIGRATION
-- Phase 04: Business Journey Tracker (Projects, Milestones, Tasks, Feedback)
-- ==============================================================================

-- 1. STARTUP PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.startup_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES public.startups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stage TEXT NOT NULL DEFAULT 'idea_validation' CHECK (
    stage IN (
      'idea_validation',
      'business_planning',
      'product_development',
      'launch_preparation',
      'business_launch',
      'growth_scaling'
    )
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'completed', 'paused')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startup_projects_founder ON public.startup_projects(founder_id);
CREATE INDEX IF NOT EXISTS idx_startup_projects_startup ON public.startup_projects(startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_projects_status ON public.startup_projects(status);

DROP TRIGGER IF EXISTS tr_startup_projects_updated_at ON public.startup_projects;
CREATE TRIGGER tr_startup_projects_updated_at
  BEFORE UPDATE ON public.startup_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. PROJECT MILESTONES TABLE
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.startup_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    status IN ('not_started', 'in_progress', 'completed')
  ),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON public.project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_order ON public.project_milestones(project_id, order_index);

DROP TRIGGER IF EXISTS tr_project_milestones_updated_at ON public.project_milestones;
CREATE TRIGGER tr_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. PROJECT TASKS TABLE
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    status IN ('not_started', 'in_progress', 'completed')
  ),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high')
  ),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_milestone ON public.project_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON public.project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON public.project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_priority ON public.project_tasks(priority);

DROP TRIGGER IF EXISTS tr_project_tasks_updated_at ON public.project_tasks;
CREATE TRIGGER tr_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. MILESTONE FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS public.milestone_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
  feedback_type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestone_feedback_milestone ON public.milestone_feedback(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_feedback_author ON public.milestone_feedback(author_id);

DROP TRIGGER IF EXISTS tr_milestone_feedback_updated_at ON public.milestone_feedback;
CREATE TRIGGER tr_milestone_feedback_updated_at
  BEFORE UPDATE ON public.milestone_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- 5. Helper Functions for Access Control
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.can_access_project(check_project_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  p_founder_id UUID;
BEGIN
  -- 1. Check if user is admin
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  -- 2. Fetch project founder
  SELECT founder_id INTO p_founder_id
  FROM public.startup_projects
  WHERE id = check_project_id;

  IF p_founder_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 3. Founder owns project
  IF p_founder_id = check_user_id THEN
    RETURN TRUE;
  END IF;

  -- 4. Active board member of this founder's advisory board
  IF EXISTS (
    SELECT 1 FROM public.board_members bm
    JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
    WHERE bm.founder_id = p_founder_id
      AND mp.user_id = check_user_id
      AND bm.membership_status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 5. Legacy advisory_boards check if founder_id not populated
  IF EXISTS (
    SELECT 1 FROM public.advisory_boards ab
    JOIN public.startups s ON s.id = ab.startup_id
    JOIN public.board_members bm ON bm.board_id = ab.id
    JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
    WHERE s.founder_id = p_founder_id
      AND mp.user_id = check_user_id
      AND bm.membership_status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_access_milestone(check_milestone_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  m_project_id UUID;
BEGIN
  SELECT project_id INTO m_project_id
  FROM public.project_milestones
  WHERE id = check_milestone_id;

  IF m_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN public.can_access_project(m_project_id, check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ==============================================================================
ALTER TABLE public.startup_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_feedback ENABLE ROW LEVEL SECURITY;

-- STARTUP PROJECTS POLICIES
DROP POLICY IF EXISTS "Projects viewable by founder, board mentors, and admin" ON public.startup_projects;
CREATE POLICY "Projects viewable by founder, board mentors, and admin"
  ON public.startup_projects FOR SELECT
  TO authenticated
  USING (public.can_access_project(id, auth.uid()));

DROP POLICY IF EXISTS "Founders can insert their own projects" ON public.startup_projects;
CREATE POLICY "Founders can insert their own projects"
  ON public.startup_projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = founder_id);

DROP POLICY IF EXISTS "Founders can update their own projects" ON public.startup_projects;
CREATE POLICY "Founders can update their own projects"
  ON public.startup_projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = founder_id)
  WITH CHECK (auth.uid() = founder_id);

DROP POLICY IF EXISTS "Founders can delete their own projects" ON public.startup_projects;
CREATE POLICY "Founders can delete their own projects"
  ON public.startup_projects FOR DELETE
  TO authenticated
  USING (auth.uid() = founder_id);

-- PROJECT MILESTONES POLICIES
DROP POLICY IF EXISTS "Milestones viewable by authorized project participants" ON public.project_milestones;
CREATE POLICY "Milestones viewable by authorized project participants"
  ON public.project_milestones FOR SELECT
  TO authenticated
  USING (public.can_access_project(project_id, auth.uid()));

DROP POLICY IF EXISTS "Founders can manage project milestones" ON public.project_milestones;
CREATE POLICY "Founders can manage project milestones"
  ON public.project_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_projects p
      WHERE p.id = public.project_milestones.project_id
      AND p.founder_id = auth.uid()
    )
  );

-- PROJECT TASKS POLICIES
DROP POLICY IF EXISTS "Tasks viewable by authorized project participants" ON public.project_tasks;
CREATE POLICY "Tasks viewable by authorized project participants"
  ON public.project_tasks FOR SELECT
  TO authenticated
  USING (public.can_access_milestone(milestone_id, auth.uid()));

DROP POLICY IF EXISTS "Founders and assigned mentors can insert tasks" ON public.project_tasks;
CREATE POLICY "Founders and assigned mentors can insert tasks"
  ON public.project_tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_milestone(milestone_id, auth.uid()));

DROP POLICY IF EXISTS "Founders and assigned members can update tasks" ON public.project_tasks;
CREATE POLICY "Founders and assigned members can update tasks"
  ON public.project_tasks FOR UPDATE
  TO authenticated
  USING (public.can_access_milestone(milestone_id, auth.uid()))
  WITH CHECK (public.can_access_milestone(milestone_id, auth.uid()));

DROP POLICY IF EXISTS "Founders can delete tasks" ON public.project_tasks;
CREATE POLICY "Founders can delete tasks"
  ON public.project_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_milestones m
      JOIN public.startup_projects p ON p.id = m.project_id
      WHERE m.id = public.project_tasks.milestone_id
      AND p.founder_id = auth.uid()
    )
  );

-- MILESTONE FEEDBACK POLICIES
DROP POLICY IF EXISTS "Feedback viewable by authorized project participants" ON public.milestone_feedback;
CREATE POLICY "Feedback viewable by authorized project participants"
  ON public.milestone_feedback FOR SELECT
  TO authenticated
  USING (public.can_access_milestone(milestone_id, auth.uid()));

DROP POLICY IF EXISTS "Authorized board participants can insert feedback" ON public.milestone_feedback;
CREATE POLICY "Authorized board participants can insert feedback"
  ON public.milestone_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND public.can_access_milestone(milestone_id, auth.uid())
  );

DROP POLICY IF EXISTS "Authors can update their own feedback" ON public.milestone_feedback;
CREATE POLICY "Authors can update their own feedback"
  ON public.milestone_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);
