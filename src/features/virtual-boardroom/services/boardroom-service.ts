import { createClient } from "@/lib/supabase/client";
import {
  MentorDirectoryItem,
  AIMentorRecommendation,
  EnrichedBoardMember,
  EnrichedInvitation,
  BoardroomOverview,
} from "../types";
import { InvitationStatus } from "@/types/startup";

/**
 * Service providing real data access to Supabase tables for the Virtual Boardroom.
 * Designed to strictly adhere to Row Level Security (RLS) policies.
 */
export const BoardroomService = {
  /**
   * Fetch all verified mentors for the directory
   * Filters out the current logged-in founder and unavailable mentors.
   */
  async getMentorDirectory(options?: {
    currentUserId?: string;
    boardId?: string;
  }): Promise<MentorDirectoryItem[]> {
    const supabase = createClient();

    // Query verified mentors joined with public.profiles
    const { data: mentors, error } = await supabase
      .from("mentor_profiles")
      .select(`
        id,
        user_id,
        professional_title,
        previous_company,
        years_of_experience,
        expertise,
        biography,
        availability,
        verification_status,
        previous_designation,
        industry_expertise,
        specialization,
        achievements,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .eq("verification_status", "verified")
      .neq("availability", "unavailable")
      .order("years_of_experience", { ascending: false });

    if (error) {
      console.error("[BoardroomService] Error fetching mentors:", error);
      throw new Error(error.message || "Failed to load mentor directory.");
    }

    if (!mentors) return [];

    // If boardId provided, fetch active memberships and existing invitations to decorate items
    let existingInvitations: Record<string, { status: InvitationStatus; id: string }> = {};
    let boardMemberMentorIds = new Set<string>();

    if (options?.boardId) {
      // 1. Fetch invitations for this board
      const { data: invs } = await supabase
        .from("board_invitations")
        .select("id, mentor_id, status")
        .eq("board_id", options.boardId);

      if (invs) {
        invs.forEach((inv) => {
          existingInvitations[inv.mentor_id] = {
            id: inv.id,
            status: inv.status as InvitationStatus,
          };
        });
      }

      // 2. Fetch board members
      const { data: members } = await supabase
        .from("board_members")
        .select("mentor_id")
        .eq("board_id", options.boardId)
        .eq("membership_status", "active");

      if (members) {
        members.forEach((m) => boardMemberMentorIds.add(m.mentor_id));
      }
    }

    // Map and filter results
    const items: MentorDirectoryItem[] = mentors
      .filter((m) => {
        // Exclude current user if logged in
        if (options?.currentUserId && m.user_id === options.currentUserId) {
          return false;
        }
        return true;
      })
      .map((m) => {
        // Safe access to joined profiles
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;

        return {
          id: m.id,
          user_id: m.user_id,
          full_name: profile?.full_name || "Executive Advisor",
          email: profile?.email || "",
          avatar_url: profile?.avatar_url || null,
          professional_title: m.professional_title || "Executive Advisor",
          previous_company: m.previous_company || "Corporate Leader",
          previous_designation: m.previous_designation || m.professional_title,
          years_of_experience: m.years_of_experience || 0,
          expertise: Array.isArray(m.expertise) ? m.expertise : [],
          industry_expertise: Array.isArray(m.industry_expertise) ? m.industry_expertise : [],
          specialization: Array.isArray(m.specialization) ? m.specialization : [],
          achievements: m.achievements || null,
          biography: m.biography || "",
          availability: m.availability || "advisory_only",
          verification_status: m.verification_status,
          invitation_status: existingInvitations[m.id]?.status || "none",
          invitation_id: existingInvitations[m.id]?.id,
          is_board_member: boardMemberMentorIds.has(m.id),
        };
      });

    return items;
  },

  /**
   * Fetch a single mentor by mentor_profiles.id
   */
  async getMentorById(
    mentorId: string,
    options?: { boardId?: string }
  ): Promise<MentorDirectoryItem | null> {
    const supabase = createClient();

    const { data: mentor, error } = await supabase
      .from("mentor_profiles")
      .select(`
        id,
        user_id,
        professional_title,
        previous_company,
        years_of_experience,
        expertise,
        biography,
        availability,
        verification_status,
        previous_designation,
        industry_expertise,
        specialization,
        achievements,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .eq("id", mentorId)
      .maybeSingle();

    if (error || !mentor) {
      return null;
    }

    const profile = Array.isArray(mentor.profiles) ? mentor.profiles[0] : mentor.profiles;

    let invitationStatus: InvitationStatus | "none" = "none";
    let invitationId: string | undefined;
    let isBoardMember = false;

    if (options?.boardId) {
      const { data: inv } = await supabase
        .from("board_invitations")
        .select("id, status")
        .eq("board_id", options.boardId)
        .eq("mentor_id", mentorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inv) {
        invitationStatus = inv.status as InvitationStatus;
        invitationId = inv.id;
      }

      const { data: member } = await supabase
        .from("board_members")
        .select("id")
        .eq("board_id", options.boardId)
        .eq("mentor_id", mentorId)
        .eq("membership_status", "active")
        .maybeSingle();

      if (member) {
        isBoardMember = true;
      }
    }

    return {
      id: mentor.id,
      user_id: mentor.user_id,
      full_name: profile?.full_name || "Executive Advisor",
      email: profile?.email || "",
      avatar_url: profile?.avatar_url || null,
      professional_title: mentor.professional_title || "Executive Advisor",
      previous_company: mentor.previous_company || "Corporate Leader",
      previous_designation: mentor.previous_designation || mentor.professional_title,
      years_of_experience: mentor.years_of_experience || 0,
      expertise: Array.isArray(mentor.expertise) ? mentor.expertise : [],
      industry_expertise: Array.isArray(mentor.industry_expertise) ? mentor.industry_expertise : [],
      specialization: Array.isArray(mentor.specialization) ? mentor.specialization : [],
      achievements: mentor.achievements || null,
      biography: mentor.biography || "",
      availability: mentor.availability || "advisory_only",
      verification_status: mentor.verification_status,
      invitation_status: invitationStatus,
      invitation_id: invitationId,
      is_board_member: isBoardMember,
    };
  },

  /**
   * Fetch founder's startup and advisory board
   */
  async getFounderBoardroom(founderId: string): Promise<BoardroomOverview> {
    const supabase = createClient();

    try {
      // 1. Fetch founder's startup
      const { data: startup, error: startupError } = await supabase
        .from("startups")
        .select("*")
        .eq("founder_id", founderId)
        .maybeSingle();

      if (startupError) {
        throw new Error(startupError.message);
      }

      if (!startup) {
        return {
          startup: null,
          board: null,
          members: [],
          invitations: [],
          meetings: [],
          recommendations: [],
          isLoading: false,
          error: "No startup registered for this founder account.",
        };
      }

      // 2. Fetch or ensure advisory board exists
      let { data: board, error: boardError } = await supabase
        .from("advisory_boards")
        .select("*")
        .eq("startup_id", startup.id)
        .maybeSingle();

      if (boardError) {
        throw new Error(boardError.message);
      }

      // If no board exists yet, create one for this startup
      if (!board) {
        const { data: newBoard, error: createBoardError } = await supabase
          .from("advisory_boards")
          .insert({
            startup_id: startup.id,
            name: `${startup.name} Advisory Board`,
          })
          .select()
          .single();

        if (createBoardError) {
          throw new Error(createBoardError.message);
        }
        board = newBoard;
      }

      // 3. Fetch board members with mentor profile & user profile
      const { data: rawMembers, error: membersError } = await supabase
        .from("board_members")
        .select(`
          id,
          board_id,
          mentor_id,
          advisory_role,
          membership_status,
          joined_at,
          mentor_profiles:mentor_id (
            id,
            professional_title,
            previous_company,
            years_of_experience,
            expertise,
            specialization,
            availability,
            profiles:user_id (
              id,
              full_name,
              email,
              avatar_url
            )
          )
        `)
        .eq("board_id", board.id)
        .eq("membership_status", "active");

      if (membersError) {
        console.error("[BoardroomService] Error fetching members:", membersError);
      }

      const members: EnrichedBoardMember[] = (rawMembers || []).map((m: any) => {
        const mp = m.mentor_profiles;
        const p = mp?.profiles ? (Array.isArray(mp.profiles) ? mp.profiles[0] : mp.profiles) : null;
        return {
          id: m.id,
          board_id: m.board_id,
          mentor_id: m.mentor_id,
          advisory_role: m.advisory_role || "Advisory Board Member",
          membership_status: m.membership_status,
          joined_at: m.joined_at,
          profile: {
            id: p?.id || "",
            full_name: p?.full_name || "Board Advisor",
            email: p?.email || "",
            avatar_url: p?.avatar_url || null,
          },
          mentor_profile: {
            id: mp?.id || m.mentor_id,
            professional_title: mp?.professional_title || "Executive Advisor",
            previous_company: mp?.previous_company || "",
            years_of_experience: mp?.years_of_experience || 0,
            expertise: mp?.expertise || [],
            specialization: mp?.specialization || [],
            availability: mp?.availability || "advisory_only",
          },
        };
      });

      // 4. Fetch invitations for this board
      const { data: rawInvitations, error: invError } = await supabase
        .from("board_invitations")
        .select(`
          id,
          board_id,
          mentor_id,
          invited_by,
          status,
          message,
          created_at,
          updated_at,
          mentor_profiles:mentor_id (
            id,
            user_id,
            professional_title,
            previous_company,
            years_of_experience,
            expertise,
            profiles:user_id (
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .eq("board_id", board.id)
        .order("created_at", { ascending: false });

      if (invError) {
        console.error("[BoardroomService] Error fetching invitations:", invError);
      }

      const invitations: EnrichedInvitation[] = (rawInvitations || []).map((inv: any) => {
        const mp = inv.mentor_profiles;
        const p = mp?.profiles ? (Array.isArray(mp.profiles) ? mp.profiles[0] : mp.profiles) : null;
        return {
          id: inv.id,
          board_id: inv.board_id,
          mentor_id: inv.mentor_id,
          invited_by: inv.invited_by,
          status: inv.status,
          message: inv.message,
          created_at: inv.created_at,
          updated_at: inv.updated_at,
          mentor: {
            id: mp?.id || inv.mentor_id,
            user_id: mp?.user_id || "",
            full_name: p?.full_name || "Executive Advisor",
            professional_title: mp?.professional_title || "Advisor",
            previous_company: mp?.previous_company || "",
            avatar_url: p?.avatar_url || null,
            years_of_experience: mp?.years_of_experience || 0,
            expertise: mp?.expertise || [],
          },
        };
      });

      // 5. Fetch meetings
      const { data: meetings } = await supabase
        .from("meetings")
        .select("*")
        .eq("board_id", board.id)
        .order("meeting_date", { ascending: false });

      // 6. Fetch recommendations
      const { data: recommendations } = await supabase
        .from("recommendations")
        .select("*")
        .eq("startup_id", startup.id)
        .order("created_at", { ascending: false });

      return {
        startup,
        board,
        members,
        invitations,
        meetings: meetings || [],
        recommendations: recommendations || [],
        isLoading: false,
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load boardroom data.";
      return {
        startup: null,
        board: null,
        members: [],
        invitations: [],
        meetings: [],
        recommendations: [],
        isLoading: false,
        error: msg,
      };
    }
  },

  /**
   * Send a formal invitation from a founder to a mentor
   * Note: NEVER creates board_members directly from frontend!
   */
  async sendBoardInvitation(params: {
    boardId: string;
    mentorId: string;
    invitedBy: string;
    message?: string;
  }): Promise<{ success: boolean; invitationId?: string; error?: string }> {
    const supabase = createClient();

    try {
      // Check if an invitation already exists
      const { data: existing } = await supabase
        .from("board_invitations")
        .select("id, status")
        .eq("board_id", params.boardId)
        .eq("mentor_id", params.mentorId)
        .maybeSingle();

      if (existing) {
        if (existing.status === "pending") {
          return { success: false, error: "An invitation is already pending for this mentor." };
        }
        if (existing.status === "accepted") {
          return { success: false, error: "This mentor is already an accepted member of your board." };
        }
        // If previously rejected or cancelled, update back to pending with new message
        const { error: updateError } = await supabase
          .from("board_invitations")
          .update({
            status: "pending",
            message: params.message || "We would like to invite you to join our advisory board.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
        return { success: true, invitationId: existing.id };
      }

      // Insert new invitation
      const { data, error } = await supabase
        .from("board_invitations")
        .insert({
          board_id: params.boardId,
          mentor_id: params.mentorId,
          invited_by: params.invitedBy,
          status: "pending",
          message: params.message || "We would like to invite you to join our advisory board.",
        })
        .select("id")
        .single();

      if (error) throw error;

      return { success: true, invitationId: data.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send invitation.";
      return { success: false, error: msg };
    }
  },

  /**
   * Fetch all incoming invitations for a mentor user
   */
  async getMentorInvitations(mentorUserId: string): Promise<EnrichedInvitation[]> {
    const supabase = createClient();

    // 1. Get mentor_profile id for this user
    const { data: mentorProfile } = await supabase
      .from("mentor_profiles")
      .select("id")
      .eq("user_id", mentorUserId)
      .maybeSingle();

    if (!mentorProfile) return [];

    // 2. Fetch invitations with advisory_boards, startups, and founder profiles
    const { data: invitations, error } = await supabase
      .from("board_invitations")
      .select(`
        id,
        board_id,
        mentor_id,
        invited_by,
        status,
        message,
        created_at,
        updated_at,
        advisory_boards:board_id (
          id,
          name,
          startups:startup_id (
            id,
            name,
            industry,
            description,
            business_stage,
            website_url
          )
        ),
        profiles:invited_by (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("mentor_id", mentorProfile.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[BoardroomService] Error fetching mentor invitations:", error);
      return [];
    }

    return (invitations || []).map((inv: any) => {
      const board = Array.isArray(inv.advisory_boards) ? inv.advisory_boards[0] : inv.advisory_boards;
      const startup = board?.startups ? (Array.isArray(board.startups) ? board.startups[0] : board.startups) : null;
      const founder = Array.isArray(inv.profiles) ? inv.profiles[0] : inv.profiles;

      return {
        id: inv.id,
        board_id: inv.board_id,
        mentor_id: inv.mentor_id,
        invited_by: inv.invited_by,
        status: inv.status,
        message: inv.message,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
        startup: startup
          ? {
              id: startup.id,
              name: startup.name,
              industry: startup.industry,
              description: startup.description,
              business_stage: startup.business_stage,
              website_url: startup.website_url,
            }
          : undefined,
        founder: founder
          ? {
              id: founder.id,
              full_name: founder.full_name,
              email: founder.email,
              avatar_url: founder.avatar_url,
            }
          : undefined,
      };
    });
  },

  /**
   * Respond to an incoming invitation (Accept / Reject)
   */
  async respondToInvitation(
    invitationId: string,
    decision: "accepted" | "rejected"
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("board_invitations")
        .update({
          status: decision,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitationId);

      if (error) throw error;

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update invitation.";
      return { success: false, error: msg };
    }
  },

  /**
   * Call Member 2's server-side AI recommendation endpoint.
   * Never calls Gemini directly from the browser.
   */
  async getAIMentorRecommendations(params: {
    startupId?: string;
    industry?: string;
    goals?: string;
  }): Promise<{ recommendations: AIMentorRecommendation[]; error?: string }> {
    try {
      const response = await fetch("/api/ai/recommend-mentors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 501) {
          return {
            recommendations: [],
            error: "AI Mentor Recommendation engine is currently being provisioned by the backend team.",
          };
        }
        const errJson = await response.json().catch(() => ({}));
        return {
          recommendations: [],
          error: errJson.message || "Unable to generate AI mentor recommendations at this time.",
        };
      }

      const data = await response.json();
      return {
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      };
    } catch (err: unknown) {
      return {
        recommendations: [],
        error: "AI recommendation service is temporarily unreachable.",
      };
    }
  },
};
