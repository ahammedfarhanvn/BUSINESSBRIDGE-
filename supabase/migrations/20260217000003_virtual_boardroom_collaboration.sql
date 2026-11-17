-- ==============================================================================
-- Migration: 20260217000003_virtual_boardroom_collaboration.sql
-- Description: Phase 3 Virtual Boardroom backend schema, invitations,
--              membership automation, chat messages, meetings, recommendations,
--              RLS policies, and Realtime publication.
-- ==============================================================================

-- 1. EXTEND OR UPDATE BOARD_INVITATIONS TABLE
DO $$
BEGIN
  -- Ensure board_invitations table exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'board_invitations') THEN
    CREATE TABLE public.board_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      board_id UUID REFERENCES public.advisory_boards(id) ON DELETE CASCADE,
      mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
      invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      founder_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      status invitation_status NOT NULL DEFAULT 'pending',
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  ELSE
    -- Add founder_id if not present
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'board_invitations' AND column_name = 'founder_id'
    ) THEN
      ALTER TABLE public.board_invitations ADD COLUMN founder_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Make board_id nullable if it was NOT NULL
    ALTER TABLE public.board_invitations ALTER COLUMN board_id DROP NOT NULL;

    -- Make invited_by nullable if it was NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'board_invitations' AND column_name = 'invited_by'
    ) THEN
      ALTER TABLE public.board_invitations ALTER COLUMN invited_by DROP NOT NULL;
    END IF;
  END IF;
END $$;

-- Backfill founder_id from invited_by or advisory_boards
UPDATE public.board_invitations bi
SET founder_id = bi.invited_by
WHERE bi.founder_id IS NULL AND bi.invited_by IS NOT NULL;

UPDATE public.board_invitations bi
SET founder_id = s.founder_id
FROM public.advisory_boards ab
JOIN public.startups s ON s.id = ab.startup_id
WHERE bi.board_id = ab.id AND bi.founder_id IS NULL;

-- Keep invited_by and founder_id synchronized
CREATE OR REPLACE FUNCTION public.sync_board_invitation_founder()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.founder_id IS NULL AND NEW.invited_by IS NOT NULL THEN
    NEW.founder_id := NEW.invited_by;
  ELSIF NEW.invited_by IS NULL AND NEW.founder_id IS NOT NULL THEN
    NEW.invited_by := NEW.founder_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_board_invitation_founder ON public.board_invitations;
CREATE TRIGGER trigger_sync_board_invitation_founder
  BEFORE INSERT OR UPDATE ON public.board_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_board_invitation_founder();

-- Partial unique index to prevent duplicate pending invitations
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation 
ON public.board_invitations(founder_id, mentor_id) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_board_invitations_founder ON public.board_invitations(founder_id);
CREATE INDEX IF NOT EXISTS idx_board_invitations_mentor ON public.board_invitations(mentor_id);
CREATE INDEX IF NOT EXISTS idx_board_invitations_status ON public.board_invitations(status);

-- 2. EXTEND OR UPDATE BOARD_MEMBERS TABLE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'board_members') THEN
    CREATE TABLE public.board_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      board_id UUID REFERENCES public.advisory_boards(id) ON DELETE CASCADE,
      founder_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
      advisory_role TEXT NOT NULL DEFAULT 'Advisory Board Member',
      membership_status board_member_status NOT NULL DEFAULT 'active',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  ELSE
    -- Add founder_id if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'board_members' AND column_name = 'founder_id'
    ) THEN
      ALTER TABLE public.board_members ADD COLUMN founder_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Add created_at if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'board_members' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.board_members ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    -- Make board_id nullable
    ALTER TABLE public.board_members ALTER COLUMN board_id DROP NOT NULL;
  END IF;
END $$;

-- Backfill founder_id for board_members
UPDATE public.board_members bm
SET founder_id = s.founder_id
FROM public.advisory_boards ab
JOIN public.startups s ON s.id = ab.startup_id
WHERE bm.board_id = ab.id AND bm.founder_id IS NULL;

-- Unique constraint/index preventing duplicate active membership
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_board_member 
ON public.board_members(founder_id, mentor_id) 
WHERE membership_status = 'active';

CREATE INDEX IF NOT EXISTS idx_board_members_founder ON public.board_members(founder_id);
CREATE INDEX IF NOT EXISTS idx_board_members_mentor ON public.board_members(mentor_id);
CREATE INDEX IF NOT EXISTS idx_board_members_status ON public.board_members(membership_status);

-- 3. AUTOMATED TRIGGER: INVITATION ACCEPTANCE -> BOARD MEMBER CREATION / ACTIVATION
CREATE OR REPLACE FUNCTION public.handle_board_invitation_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_board_id UUID := NEW.board_id;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    -- If board_id is not already on the invitation, look up the founder's advisory board
    IF v_board_id IS NULL AND NEW.founder_id IS NOT NULL THEN
      SELECT ab.id INTO v_board_id
      FROM public.startups s
      JOIN public.advisory_boards ab ON ab.startup_id = s.id
      WHERE s.founder_id = NEW.founder_id
      LIMIT 1;
    END IF;

    -- Upsert membership record for this founder and mentor
    IF EXISTS (
      SELECT 1 FROM public.board_members 
      WHERE founder_id = NEW.founder_id AND mentor_id = NEW.mentor_id
    ) THEN
      UPDATE public.board_members
      SET membership_status = 'active',
          joined_at = NOW(),
          board_id = COALESCE(v_board_id, board_members.board_id)
      WHERE founder_id = NEW.founder_id AND mentor_id = NEW.mentor_id;
    ELSE
      INSERT INTO public.board_members (
        founder_id,
        board_id,
        mentor_id,
        advisory_role,
        membership_status,
        joined_at,
        created_at
      ) VALUES (
        NEW.founder_id,
        v_board_id,
        NEW.mentor_id,
        'Advisory Board Member',
        'active',
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_board_invitation_accepted ON public.board_invitations;
CREATE TRIGGER trigger_board_invitation_accepted
  AFTER UPDATE OF status ON public.board_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_board_invitation_accepted();

-- 4. COLLABORATION TABLES: BOARD_MESSAGES, BOARD_MEETINGS, BOARD_RECOMMENDATIONS

-- 4A. BOARD_MESSAGES
CREATE TABLE IF NOT EXISTS public.board_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.advisory_boards(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0 AND char_length(message) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_messages_founder ON public.board_messages(founder_id);
CREATE INDEX IF NOT EXISTS idx_board_messages_sender ON public.board_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_board_messages_created ON public.board_messages(created_at);

-- 4B. BOARD_MEETINGS
CREATE TABLE IF NOT EXISTS public.board_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.advisory_boards(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TEXT,
  agenda TEXT,
  meeting_notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_meetings_founder ON public.board_meetings(founder_id);
CREATE INDEX IF NOT EXISTS idx_board_meetings_date ON public.board_meetings(meeting_date);

DROP TRIGGER IF EXISTS update_board_meetings_updated_at ON public.board_meetings;
CREATE TRIGGER update_board_meetings_updated_at
  BEFORE UPDATE ON public.board_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4C. BOARD_RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS public.board_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID REFERENCES public.startups(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_recommendations_founder ON public.board_recommendations(founder_id);
CREATE INDEX IF NOT EXISTS idx_board_recommendations_author ON public.board_recommendations(author_id);

DROP TRIGGER IF EXISTS update_board_recommendations_updated_at ON public.board_recommendations;
CREATE TRIGGER update_board_recommendations_updated_at
  BEFORE UPDATE ON public.board_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. HELPER FUNCTION: is_board_participant
CREATE OR REPLACE FUNCTION public.is_board_participant(
  check_founder_id UUID,
  check_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Founder themselves
  IF check_founder_id = check_user_id THEN
    RETURN TRUE;
  END IF;

  -- 2. Platform Admin
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = check_user_id AND p.role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Active board member directly linked by founder_id
  IF EXISTS (
    SELECT 1
    FROM public.board_members bm
    LEFT JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
    WHERE bm.founder_id = check_founder_id
      AND bm.membership_status = 'active'
      AND (bm.mentor_id = check_user_id OR mp.user_id = check_user_id)
  ) THEN
    RETURN TRUE;
  END IF;

  -- 4. Active board member linked through advisory_boards -> startups
  IF EXISTS (
    SELECT 1
    FROM public.board_members bm
    JOIN public.advisory_boards ab ON ab.id = bm.board_id
    JOIN public.startups s ON s.id = ab.startup_id
    LEFT JOIN public.mentor_profiles mp ON mp.id = bm.mentor_id
    WHERE s.founder_id = check_founder_id
      AND bm.membership_status = 'active'
      AND (bm.mentor_id = check_user_id OR mp.user_id = check_user_id)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
ALTER TABLE public.board_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_recommendations ENABLE ROW LEVEL SECURITY;

-- 6A. BOARD INVITATIONS RLS
DROP POLICY IF EXISTS "Founders can manage invitations they sent" ON public.board_invitations;
DROP POLICY IF EXISTS "Mentors can view and respond to their invitations" ON public.board_invitations;
DROP POLICY IF EXISTS "Mentors can update invitation status" ON public.board_invitations;
DROP POLICY IF EXISTS "board_invitations_founder_all" ON public.board_invitations;
DROP POLICY IF EXISTS "board_invitations_mentor_select" ON public.board_invitations;
DROP POLICY IF EXISTS "board_invitations_mentor_update" ON public.board_invitations;

-- Founder can view and create/manage invitations
CREATE POLICY "board_invitations_founder_all"
  ON public.board_invitations FOR ALL
  TO authenticated
  USING (founder_id = auth.uid() OR invited_by = auth.uid())
  WITH CHECK (founder_id = auth.uid() OR invited_by = auth.uid());

-- Mentor can view invitations addressed to them
CREATE POLICY "board_invitations_mentor_select"
  ON public.board_invitations FOR SELECT
  TO authenticated
  USING (
    mentor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.id = public.board_invitations.mentor_id
      AND mp.user_id = auth.uid()
    )
  );

-- Only the addressed mentor can update invitation status (accept/reject)
CREATE POLICY "board_invitations_mentor_update"
  ON public.board_invitations FOR UPDATE
  TO authenticated
  USING (
    mentor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.id = public.board_invitations.mentor_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    mentor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.id = public.board_invitations.mentor_id
      AND mp.user_id = auth.uid()
    )
  );

-- 6B. BOARD MEMBERS RLS
DROP POLICY IF EXISTS "Founders can view and manage board members" ON public.board_members;
DROP POLICY IF EXISTS "Mentors can view their own board memberships" ON public.board_members;
DROP POLICY IF EXISTS "board_members_founder_all" ON public.board_members;
DROP POLICY IF EXISTS "board_members_select_participants" ON public.board_members;

-- Founders can view and manage their board members
CREATE POLICY "board_members_founder_all"
  ON public.board_members FOR ALL
  TO authenticated
  USING (
    founder_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.advisory_boards ab
      JOIN public.startups s ON s.id = ab.startup_id
      WHERE ab.id = public.board_members.board_id
      AND s.founder_id = auth.uid()
    )
  )
  WITH CHECK (
    founder_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.advisory_boards ab
      JOIN public.startups s ON s.id = ab.startup_id
      WHERE ab.id = public.board_members.board_id
      AND s.founder_id = auth.uid()
    )
  );

-- Board participants (active mentors & founders) can view board members
CREATE POLICY "board_members_select_participants"
  ON public.board_members FOR SELECT
  TO authenticated
  USING (
    mentor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.id = public.board_members.mentor_id
      AND mp.user_id = auth.uid()
    )
    OR (founder_id IS NOT NULL AND public.is_board_participant(founder_id, auth.uid()))
  );

-- 6C. BOARD MESSAGES RLS
DROP POLICY IF EXISTS "board_messages_select_participant" ON public.board_messages;
DROP POLICY IF EXISTS "board_messages_insert_sender" ON public.board_messages;

CREATE POLICY "board_messages_select_participant"
  ON public.board_messages FOR SELECT
  TO authenticated
  USING (public.is_board_participant(founder_id, auth.uid()));

CREATE POLICY "board_messages_insert_sender"
  ON public.board_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_board_participant(founder_id, auth.uid())
    AND auth.uid() = sender_id
  );

-- 6D. BOARD MEETINGS RLS
DROP POLICY IF EXISTS "board_meetings_select_participant" ON public.board_meetings;
DROP POLICY IF EXISTS "board_meetings_insert_participant" ON public.board_meetings;
DROP POLICY IF EXISTS "board_meetings_update_participant" ON public.board_meetings;
DROP POLICY IF EXISTS "board_meetings_delete_creator_or_founder" ON public.board_meetings;

CREATE POLICY "board_meetings_select_participant"
  ON public.board_meetings FOR SELECT
  TO authenticated
  USING (public.is_board_participant(founder_id, auth.uid()));

CREATE POLICY "board_meetings_insert_participant"
  ON public.board_meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_board_participant(founder_id, auth.uid())
    AND auth.uid() = created_by
  );

CREATE POLICY "board_meetings_update_participant"
  ON public.board_meetings FOR UPDATE
  TO authenticated
  USING (public.is_board_participant(founder_id, auth.uid()))
  WITH CHECK (public.is_board_participant(founder_id, auth.uid()));

CREATE POLICY "board_meetings_delete_creator_or_founder"
  ON public.board_meetings FOR DELETE
  TO authenticated
  USING (founder_id = auth.uid() OR created_by = auth.uid());

-- 6E. BOARD RECOMMENDATIONS RLS
DROP POLICY IF EXISTS "board_recommendations_select_participant" ON public.board_recommendations;
DROP POLICY IF EXISTS "board_recommendations_insert_participant" ON public.board_recommendations;
DROP POLICY IF EXISTS "board_recommendations_update_participant" ON public.board_recommendations;
DROP POLICY IF EXISTS "board_recommendations_delete_author_or_founder" ON public.board_recommendations;

CREATE POLICY "board_recommendations_select_participant"
  ON public.board_recommendations FOR SELECT
  TO authenticated
  USING (public.is_board_participant(founder_id, auth.uid()));

CREATE POLICY "board_recommendations_insert_participant"
  ON public.board_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_board_participant(founder_id, auth.uid())
    AND auth.uid() = author_id
  );

CREATE POLICY "board_recommendations_update_participant"
  ON public.board_recommendations FOR UPDATE
  TO authenticated
  USING (public.is_board_participant(founder_id, auth.uid()))
  WITH CHECK (public.is_board_participant(founder_id, auth.uid()));

CREATE POLICY "board_recommendations_delete_author_or_founder"
  ON public.board_recommendations FOR DELETE
  TO authenticated
  USING (founder_id = auth.uid() OR author_id = auth.uid());

-- 7. CONFIGURE SUPABASE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'board_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.board_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
