/**
 * BusinessBridge - Board Membership Service
 * Server-Side Service for managing Virtual Boardroom invitations, memberships,
 * and role-based access checks.
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  BoardInvitationRecord,
  BoardMemberRecord,
  BoardInvitationStatus,
  BoardMembershipStatus,
} from "@/types/boardroom";
import { EnrichedBoardMember, EnrichedInvitation } from "@/features/virtual-boardroom/types";

/**
 * Returns an admin Supabase client if available, falling back to the standard server client.
 */
async function getSupabaseClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return createAdminClient();
    } catch {
      // Fallback to standard server client
    }
  }
  return await createClient();
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Sends a board invitation from a founder to a mentor.
 *
 * @param founderUserId - UUID of the founder sending the invitation
 * @param mentorProfileId - UUID of the mentor (mentor_profiles.id or profiles.id)
 * @param message - Optional personal invitation message
 */
export async function sendBoardInvitation(
  founderUserId: string,
  mentorProfileId: string,
  message?: string
): Promise<ServiceResult<BoardInvitationRecord>> {
  try {
    if (!founderUserId) {
      return { success: false, error: "Founder user ID is required." };
    }
    if (!mentorProfileId) {
      return { success: false, error: "Mentor ID is required." };
    }

    const supabase = await getSupabaseClient();

    // 1. Verify founder exists and has 'founder' or 'admin' role
    const { data: founderProfile, error: founderErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", founderUserId)
      .single();

    if (founderErr || !founderProfile) {
      return { success: false, error: "Founder profile not found." };
    }

    if (founderProfile.role !== "founder" && founderProfile.role !== "admin") {
      return { success: false, error: "Only founders or administrators can issue board invitations." };
    }

    // 2. Resolve mentor profile (supports mentor_profiles.id or mentor_profiles.user_id)
    const { data: mentorProfile, error: mentorErr } = await supabase
      .from("mentor_profiles")
      .select("id, user_id, verification_status")
      .or(`id.eq.${mentorProfileId},user_id.eq.${mentorProfileId}`)
      .maybeSingle();

    if (mentorErr || !mentorProfile) {
      return { success: false, error: "Target mentor profile not found." };
    }

    const resolvedMentorId = mentorProfile.id;

    // Prevent sending invitation to self
    if (mentorProfile.user_id === founderUserId) {
      return { success: false, error: "You cannot invite yourself to your advisory board." };
    }

    // 3. Resolve founder's startup and advisory board
    let boardId: string | null = null;
    const { data: startup } = await supabase
      .from("startups")
      .select("id, advisory_boards (id)")
      .eq("founder_id", founderUserId)
      .maybeSingle();

    if (startup) {
      const boards = startup.advisory_boards as { id: string }[] | { id: string } | null;
      if (Array.isArray(boards) && boards.length > 0) {
        boardId = boards[0].id;
      } else if (boards && "id" in boards) {
        boardId = (boards as { id: string }).id;
      } else {
        // Automatically create an advisory board record if one doesn't exist yet
        const { data: newBoard } = await supabase
          .from("advisory_boards")
          .insert({
            startup_id: startup.id,
            name: "Advisory Board",
          })
          .select("id")
          .single();

        if (newBoard) {
          boardId = newBoard.id;
        }
      }
    }

    // 4. Check if mentor is already an active board member
    const { data: existingActiveMember } = await supabase
      .from("board_members")
      .select("id")
      .eq("founder_id", founderUserId)
      .eq("mentor_id", resolvedMentorId)
      .eq("membership_status", "active")
      .maybeSingle();

    if (existingActiveMember) {
      return { success: false, error: "This mentor is already an active member of your advisory board." };
    }

    // 5. Check if an invitation is already pending
    const { data: existingPendingInvitation } = await supabase
      .from("board_invitations")
      .select("id")
      .eq("founder_id", founderUserId)
      .eq("mentor_id", resolvedMentorId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPendingInvitation) {
      return {
        success: false,
        error: "An invitation to this mentor is already pending. Please wait for their response.",
      };
    }

    // 6. Insert new invitation
    const { data: invitation, error: insertErr } = await supabase
      .from("board_invitations")
      .insert({
        founder_id: founderUserId,
        invited_by: founderUserId,
        board_id: boardId,
        mentor_id: resolvedMentorId,
        status: "pending",
        message: message?.trim() || null,
      })
      .select("*")
      .single();

    if (insertErr || !invitation) {
      console.error("[board-membership.service] sendBoardInvitation error:", insertErr);
      return { success: false, error: insertErr?.message || "Failed to create board invitation." };
    }

    return {
      success: true,
      data: invitation as unknown as BoardInvitationRecord,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unexpected error while sending invitation.";
    console.error("[board-membership.service] Exception in sendBoardInvitation:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Retrieves all invitations sent by a founder.
 *
 * @param founderUserId - UUID of the founder
 */
export async function getFounderInvitations(
  founderUserId: string
): Promise<ServiceResult<EnrichedInvitation[]>> {
  try {
    if (!founderUserId) {
      return { success: false, error: "Founder user ID is required." };
    }

    const supabase = await getSupabaseClient();

    // Fetch invitations for this founder
    const { data: invitations, error: invErr } = await supabase
      .from("board_invitations")
      .select("*")
      .or(`founder_id.eq.${founderUserId},invited_by.eq.${founderUserId}`)
      .order("created_at", { ascending: false });

    if (invErr) {
      console.error("[board-membership.service] getFounderInvitations error:", invErr);
      return { success: false, error: invErr.message };
    }

    if (!invitations || invitations.length === 0) {
      return { success: true, data: [] };
    }

    // Enrich with mentor details
    const mentorIds = Array.from(new Set(invitations.map((inv) => inv.mentor_id)));

    const { data: mentorProfiles } = await supabase
      .from("mentor_profiles")
      .select(`
        id,
        user_id,
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
      `)
      .in("id", mentorIds);

    const mentorMap = new Map<string, any>();
    if (mentorProfiles) {
      for (const mp of mentorProfiles) {
        const prof = Array.isArray(mp.profiles) ? mp.profiles[0] : mp.profiles;
        mentorMap.set(mp.id, {
          id: mp.id,
          user_id: mp.user_id,
          full_name: prof?.full_name || "Executive Advisor",
          email: prof?.email || "",
          avatar_url: prof?.avatar_url || null,
          professional_title: mp.professional_title || "Executive Advisor",
          previous_company: mp.previous_company || "Company",
          years_of_experience: mp.years_of_experience || 0,
          expertise: mp.expertise || [],
        });
      }
    }

    const enriched: EnrichedInvitation[] = invitations.map((inv) => {
      const mentor = mentorMap.get(inv.mentor_id);
      return {
        id: inv.id,
        board_id: inv.board_id || "",
        mentor_id: inv.mentor_id,
        invited_by: inv.invited_by || inv.founder_id || founderUserId,
        status: inv.status,
        message: inv.message || null,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
        mentor: mentor || undefined,
      };
    });

    return { success: true, data: enriched };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unexpected error fetching founder invitations.";
    console.error("[board-membership.service] Exception in getFounderInvitations:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Retrieves all invitations addressed to a mentor.
 *
 * @param mentorUserId - UUID of the mentor's user account (auth.uid)
 */
export async function getMentorInvitations(
  mentorUserId: string
): Promise<ServiceResult<EnrichedInvitation[]>> {
  try {
    if (!mentorUserId) {
      return { success: false, error: "Mentor user ID is required." };
    }

    const supabase = await getSupabaseClient();

    // 1. Resolve mentor profile
    const { data: mentorProfile } = await supabase
      .from("mentor_profiles")
      .select("id, user_id")
      .or(`user_id.eq.${mentorUserId},id.eq.${mentorUserId}`)
      .maybeSingle();

    const mentorProfileId = mentorProfile?.id || mentorUserId;

    // 2. Fetch invitations
    const { data: invitations, error: invErr } = await supabase
      .from("board_invitations")
      .select("*")
      .or(`mentor_id.eq.${mentorProfileId},mentor_id.eq.${mentorUserId}`)
      .order("created_at", { ascending: false });

    if (invErr) {
      console.error("[board-membership.service] getMentorInvitations error:", invErr);
      return { success: false, error: invErr.message };
    }

    if (!invitations || invitations.length === 0) {
      return { success: true, data: [] };
    }

    // 3. Enrich with founder & startup details
    const founderIds = Array.from(
      new Set(invitations.map((inv) => inv.founder_id || inv.invited_by).filter(Boolean))
    );

    const [profilesRes, startupsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", founderIds),
      supabase.from("startups").select("id, founder_id, name, industry, description, business_stage, website_url").in("founder_id", founderIds),
    ]);

    const profileMap = new Map<string, any>();
    if (profilesRes.data) {
      for (const p of profilesRes.data) {
        profileMap.set(p.id, p);
      }
    }

    const startupMap = new Map<string, any>();
    if (startupsRes.data) {
      for (const s of startupsRes.data) {
        startupMap.set(s.founder_id, s);
      }
    }

    const enriched: EnrichedInvitation[] = invitations.map((inv) => {
      const founderId = inv.founder_id || inv.invited_by;
      const founder = profileMap.get(founderId);
      const startup = startupMap.get(founderId);

      return {
        id: inv.id,
        board_id: inv.board_id || "",
        mentor_id: inv.mentor_id,
        invited_by: inv.invited_by || founderId,
        status: inv.status,
        message: inv.message || null,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
        founder: founder
          ? {
              id: founder.id,
              full_name: founder.full_name,
              email: founder.email,
              avatar_url: founder.avatar_url,
            }
          : undefined,
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
      };
    });

    return { success: true, data: enriched };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unexpected error fetching mentor invitations.";
    console.error("[board-membership.service] Exception in getMentorInvitations:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Responds to a board invitation (accept or reject).
 * Upon acceptance, updates/creates an active board membership record.
 *
 * @param mentorUserId - UUID of the mentor responding
 * @param invitationId - UUID of the invitation record
 * @param decision - 'accepted' | 'rejected'
 */
export async function respondToInvitation(
  mentorUserId: string,
  invitationId: string,
  decision: "accepted" | "rejected"
): Promise<ServiceResult<BoardInvitationRecord>> {
  try {
    if (!mentorUserId) {
      return { success: false, error: "Mentor user ID is required." };
    }
    if (!invitationId) {
      return { success: false, error: "Invitation ID is required." };
    }
    if (decision !== "accepted" && decision !== "rejected") {
      return { success: false, error: "Decision must be 'accepted' or 'rejected'." };
    }

    const supabase = await getSupabaseClient();

    // 1. Resolve mentor profile
    const { data: mentorProfile } = await supabase
      .from("mentor_profiles")
      .select("id, user_id")
      .or(`user_id.eq.${mentorUserId},id.eq.${mentorUserId}`)
      .maybeSingle();

    const mentorProfileId = mentorProfile?.id;

    // 2. Fetch the target invitation
    const { data: invitation, error: fetchErr } = await supabase
      .from("board_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (fetchErr || !invitation) {
      return { success: false, error: "Invitation not found." };
    }

    // 3. Verify the invitation is addressed to this mentor
    const isTargetMentor =
      invitation.mentor_id === mentorUserId ||
      (mentorProfileId && invitation.mentor_id === mentorProfileId) ||
      (mentorProfile && mentorProfile.user_id === mentorUserId);

    if (!isTargetMentor) {
      return { success: false, error: "Unauthorized: This invitation was not addressed to you." };
    }

    // 4. Validate current status
    if (invitation.status !== "pending") {
      return {
        success: false,
        error: `This invitation has already been ${invitation.status}.`,
      };
    }

    // 5. Update invitation status
    const { data: updatedInvitation, error: updateErr } = await supabase
      .from("board_invitations")
      .update({
        status: decision,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .select("*")
      .single();

    if (updateErr || !updatedInvitation) {
      console.error("[board-membership.service] respondToInvitation error:", updateErr);
      return { success: false, error: updateErr?.message || "Failed to update invitation status." };
    }

    // 6. If accepted, verify/guarantee active board membership
    if (decision === "accepted") {
      const founderId = updatedInvitation.founder_id || updatedInvitation.invited_by;
      const targetMentorId = updatedInvitation.mentor_id;

      let boardId = updatedInvitation.board_id;
      if (!boardId && founderId) {
        const { data: startup } = await supabase
          .from("startups")
          .select("id, advisory_boards(id)")
          .eq("founder_id", founderId)
          .maybeSingle();

        if (startup) {
          const boards = startup.advisory_boards as { id: string }[] | { id: string } | null;
          if (Array.isArray(boards) && boards.length > 0) {
            boardId = boards[0].id;
          } else if (boards && "id" in boards) {
            boardId = (boards as { id: string }).id;
          }
        }
      }

      // Check existing membership
      const { data: existingMember } = await supabase
        .from("board_members")
        .select("id")
        .eq("founder_id", founderId)
        .eq("mentor_id", targetMentorId)
        .maybeSingle();

      if (existingMember) {
        await supabase
          .from("board_members")
          .update({
            membership_status: "active",
            joined_at: new Date().toISOString(),
            board_id: boardId || undefined,
          })
          .eq("id", existingMember.id);
      } else {
        await supabase.from("board_members").insert({
          founder_id: founderId,
          board_id: boardId || null,
          mentor_id: targetMentorId,
          advisory_role: "Advisory Board Member",
          membership_status: "active",
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      }
    }

    return {
      success: true,
      data: updatedInvitation as unknown as BoardInvitationRecord,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unexpected error responding to invitation.";
    console.error("[board-membership.service] Exception in respondToInvitation:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Retrieves all active board members for a given founder's advisory board.
 *
 * @param founderUserId - UUID of the founder
 */
export async function getBoardMembers(
  founderUserId: string
): Promise<ServiceResult<EnrichedBoardMember[]>> {
  try {
    if (!founderUserId) {
      return { success: false, error: "Founder user ID is required." };
    }

    const supabase = await getSupabaseClient();

    // Query board members by founder_id, or joined via advisory_boards -> startups
    let query = supabase
      .from("board_members")
      .select("*")
      .eq("founder_id", founderUserId)
      .eq("membership_status", "active")
      .order("joined_at", { ascending: false });

    let { data: members, error: memErr } = await query;

    // Fallback: If no members found with direct founder_id, check advisory_boards linked to founder's startup
    if (!members || members.length === 0) {
      const { data: startup } = await supabase
        .from("startups")
        .select("id, advisory_boards(id)")
        .eq("founder_id", founderUserId)
        .maybeSingle();

      if (startup) {
        const boards = startup.advisory_boards as { id: string }[] | { id: string } | null;
        const bId = Array.isArray(boards) ? boards[0]?.id : (boards as { id: string })?.id;
        if (bId) {
          const { data: fallbackMembers } = await supabase
            .from("board_members")
            .select("*")
            .eq("board_id", bId)
            .eq("membership_status", "active");

          if (fallbackMembers) {
            members = fallbackMembers;
          }
        }
      }
    }

    if (memErr) {
      console.error("[board-membership.service] getBoardMembers error:", memErr);
      return { success: false, error: memErr.message };
    }

    if (!members || members.length === 0) {
      return { success: true, data: [] };
    }

    // Enrich with mentor profile and user profile details
    const mentorIds = Array.from(new Set(members.map((m) => m.mentor_id)));

    const { data: mentorProfiles } = await supabase
      .from("mentor_profiles")
      .select(`
        id,
        user_id,
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
      `)
      .in("id", mentorIds);

    const mentorMap = new Map<string, any>();
    if (mentorProfiles) {
      for (const mp of mentorProfiles) {
        const prof = Array.isArray(mp.profiles) ? mp.profiles[0] : mp.profiles;
        mentorMap.set(mp.id, {
          profile: {
            id: prof?.id || mp.user_id,
            full_name: prof?.full_name || "Executive Advisor",
            email: prof?.email || "",
            avatar_url: prof?.avatar_url || null,
          },
          mentor_profile: {
            id: mp.id,
            professional_title: mp.professional_title || "Executive Advisor",
            previous_company: mp.previous_company || "Corporate Leader",
            years_of_experience: mp.years_of_experience || 0,
            expertise: mp.expertise || [],
            specialization: mp.specialization || [],
            availability: mp.availability || "advisory_only",
          },
        });
      }
    }

    const enriched: EnrichedBoardMember[] = members.map((m) => {
      const details = mentorMap.get(m.mentor_id);
      return {
        id: m.id,
        board_id: m.board_id || "",
        mentor_id: m.mentor_id,
        advisory_role: m.advisory_role || "Advisory Board Member",
        membership_status: m.membership_status as BoardMembershipStatus,
        joined_at: m.joined_at,
        profile: details?.profile || {
          id: m.mentor_id,
          full_name: "Executive Advisor",
          email: "",
          avatar_url: null,
        },
        mentor_profile: details?.mentor_profile || {
          id: m.mentor_id,
          professional_title: "Executive Advisor",
          previous_company: "Corporate Leader",
          years_of_experience: 0,
          expertise: [],
          specialization: [],
          availability: "advisory_only",
        },
      };
    });

    return { success: true, data: enriched };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unexpected error fetching board members.";
    console.error("[board-membership.service] Exception in getBoardMembers:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Checks whether a given user is either the founder or an active board member of the founder's board.
 * Useful for authorization guards on boardroom messages, meetings, and recommendations.
 *
 * @param userId - UUID of the user to check (e.g. auth.uid)
 * @param founderUserId - UUID of the founder who owns the boardroom
 */
export async function isUserBoardMemberOrFounder(
  userId: string,
  founderUserId: string
): Promise<boolean> {
  try {
    if (!userId || !founderUserId) {
      return false;
    }

    // 1. Founder themselves
    if (userId === founderUserId) {
      return true;
    }

    const supabase = await getSupabaseClient();

    // 2. Check if user is platform admin
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (userProfile?.role === "admin") {
      return true;
    }

    // 3. Resolve user's mentor_profile id if exists
    const { data: mentorProfile } = await supabase
      .from("mentor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const mentorIdConditions = [userId];
    if (mentorProfile) {
      mentorIdConditions.push(mentorProfile.id);
    }

    // 4. Check active membership with direct founder_id
    const { data: activeMembership } = await supabase
      .from("board_members")
      .select("id")
      .eq("founder_id", founderUserId)
      .eq("membership_status", "active")
      .in("mentor_id", mentorIdConditions)
      .maybeSingle();

    if (activeMembership) {
      return true;
    }

    // 5. Check active membership linked through advisory_boards -> startups
    const { data: startup } = await supabase
      .from("startups")
      .select("id, advisory_boards(id)")
      .eq("founder_id", founderUserId)
      .maybeSingle();

    if (startup) {
      const boards = startup.advisory_boards as { id: string }[] | { id: string } | null;
      const boardId = Array.isArray(boards) ? boards[0]?.id : (boards as { id: string })?.id;

      if (boardId) {
        const { data: boardMembership } = await supabase
          .from("board_members")
          .select("id")
          .eq("board_id", boardId)
          .eq("membership_status", "active")
          .in("mentor_id", mentorIdConditions)
          .maybeSingle();

        if (boardMembership) {
          return true;
        }
      }
    }

    return false;
  } catch (err: unknown) {
    console.error("[board-membership.service] Exception in isUserBoardMemberOrFounder:", err);
    return false;
  }
}
