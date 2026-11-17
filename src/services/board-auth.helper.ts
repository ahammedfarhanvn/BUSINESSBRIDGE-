import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isUserBoardMemberOrFounder } from "./board-membership.service";

export interface BoardAuthorizationResult {
  isAuthorized: boolean;
  isFounder: boolean;
  mentorProfileId?: string;
  error?: string;
}

/**
 * Returns an admin Supabase client if service role key is configured,
 * otherwise falls back to the authenticated server client.
 */
export async function getSupabaseServerClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return createAdminClient();
    } catch {
      // Fallback to standard server client
    }
  }
  return await createClient();
}

/**
 * Validates that currentUserId is either:
 * 1. The founder (currentUserId === founderId)
 * 2. An active board member of this founder's advisory board (membership_status = 'active')
 *
 * Integrates directly with board-membership.service.ts isUserBoardMemberOrFounder for unified validation.
 */
export async function verifyBoardMemberOrFounder(
  founderId: string,
  userId: string,
  client?: any
): Promise<BoardAuthorizationResult> {
  if (!founderId || !userId) {
    return {
      isAuthorized: false,
      isFounder: false,
      error: "founderId and userId are required for authorization.",
    };
  }

  // 1. Direct match: founder themselves
  if (userId === founderId) {
    return { isAuthorized: true, isFounder: true };
  }

  // 2. Delegate to board-membership.service for consistent authorization rules
  try {
    const isAuthorized = await isUserBoardMemberOrFounder(userId, founderId);
    if (isAuthorized) {
      return { isAuthorized: true, isFounder: false };
    }
  } catch (err) {
    console.warn("[verifyBoardMemberOrFounder] isUserBoardMemberOrFounder threw, using local fallback check:", err);
  }

  // 3. Fallback verification
  const supabase = client || (await getSupabaseServerClient());

  let mentorId: string | undefined;
  try {
    const { data: mentorProfile } = await supabase
      .from("mentor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (mentorProfile?.id) {
      mentorId = mentorProfile.id;
    }
  } catch {
    // Continue
  }

  const mentorIdConditions = [userId];
  if (mentorId) {
    mentorIdConditions.push(mentorId);
  }

  try {
    const { data: directMembers, error: directError } = await supabase
      .from("board_members")
      .select("id")
      .eq("founder_id", founderId)
      .eq("membership_status", "active")
      .in("mentor_id", mentorIdConditions)
      .maybeSingle();

    if (!directError && directMembers) {
      return { isAuthorized: true, isFounder: false, mentorProfileId: mentorId };
    }
  } catch {
    // Column founder_id might not exist on board_members in some migrations
  }

  try {
    const { data: startups } = await supabase
      .from("startups")
      .select("id, advisory_boards(id)")
      .eq("founder_id", founderId);

    if (startups && startups.length > 0) {
      const boardIds = startups
        .flatMap((s: any) => s.advisory_boards || [])
        .map((b: any) => b.id)
        .filter(Boolean);

      if (boardIds.length > 0) {
        const { data: boardMember } = await supabase
          .from("board_members")
          .select("id")
          .in("board_id", boardIds)
          .eq("membership_status", "active")
          .in("mentor_id", mentorIdConditions)
          .maybeSingle();

        if (boardMember) {
          return { isAuthorized: true, isFounder: false, mentorProfileId: mentorId };
        }
      }
    }
  } catch {
    // Handled
  }

  return {
    isAuthorized: false,
    isFounder: false,
    error: "Unauthorized: You must be the founder or an active board member of this board.",
  };
}
