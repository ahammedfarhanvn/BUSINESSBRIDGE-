/**
 * BusinessBridge - Virtual Boardroom Collaboration Service
 * Handles Board Meetings and Board Recommendations backend operations with strict authorization.
 */

import {
  BoardMeetingRecord,
  EnrichedBoardMeeting,
  BoardRecommendationRecord,
  EnrichedBoardRecommendation,
  CreateMeetingInput,
  CreateRecommendationInput,
  BoardMeetingStatus,
  BoardRecommendationStatus,
} from "@/types/boardroom";
import { UserRole } from "@/types/auth";
import {
  getSupabaseServerClient,
  verifyBoardMemberOrFounder,
} from "./board-auth.helper";

export interface GroupedBoardMeetings {
  upcoming: EnrichedBoardMeeting[];
  past: EnrichedBoardMeeting[];
  all: EnrichedBoardMeeting[];
}

/**
 * ==============================================================================
 * BOARD MEETINGS
 * ==============================================================================
 */

/**
 * Fetches all board meetings for a specific founder's boardroom (both upcoming and past).
 * Validates that currentUserId is either the founder or an active board member.
 */
export async function getBoardMeetings(
  founderId: string,
  currentUserId: string,
  client?: any
): Promise<EnrichedBoardMeeting[]> {
  if (!founderId || !currentUserId) {
    throw new Error("founderId and currentUserId are required.");
  }

  const supabase = client || (await getSupabaseServerClient());

  // 1. Authorize caller: founder or active board member
  const auth = await verifyBoardMemberOrFounder(founderId, currentUserId, supabase);
  if (!auth.isAuthorized) {
    throw new Error(
      auth.error || "Unauthorized: You must be the founder or an active board member to view meetings."
    );
  }

  // 2. Query board_meetings
  try {
    const { data, error } = await supabase
      .from("board_meetings")
      .select(`
        id,
        board_id,
        founder_id,
        title,
        meeting_date,
        meeting_time,
        agenda,
        meeting_notes,
        status,
        created_by,
        created_at,
        updated_at,
        profiles:created_by (
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .eq("founder_id", founderId)
      .order("meeting_date", { ascending: false });

    if (!error && data) {
      const missingCreatorIds = data
        .filter((row: any) => !row.profiles && !row.creator)
        .map((row: any) => row.created_by);

      const profileMap = new Map<string, any>();
      if (missingCreatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, role")
          .in("id", [...new Set(missingCreatorIds)]);

        (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
      }

      return data.map((row: any): EnrichedBoardMeeting => {
        const rawCreator = Array.isArray(row.profiles) ? row.profiles[0] : (row.profiles || row.creator);
        const creator = rawCreator || profileMap.get(row.created_by);

        return {
          id: row.id,
          board_id: row.board_id || null,
          founder_id: row.founder_id,
          title: row.title,
          meeting_date: row.meeting_date,
          meeting_time: row.meeting_time || null,
          agenda: row.agenda || null,
          meeting_notes: row.meeting_notes || null,
          status: (row.status as BoardMeetingStatus) || "scheduled",
          created_by: row.created_by,
          created_at: row.created_at,
          updated_at: row.updated_at || row.created_at,
          creator: creator
            ? {
                id: creator.id,
                full_name: creator.full_name || "Board Member",
                email: creator.email || "",
                avatar_url: creator.avatar_url || null,
                role: (creator.role as UserRole) || "founder",
              }
            : undefined,
        };
      });
    }

    // Fallback: Query legacy meetings table
    const { data: startups } = await supabase
      .from("startups")
      .select("id, advisory_boards(id)")
      .eq("founder_id", founderId);

    const boardIds = (startups || [])
      .flatMap((s: any) => s.advisory_boards || [])
      .map((b: any) => b.id)
      .filter(Boolean);

    if (boardIds.length === 0) {
      return [];
    }

    const { data: legacyMeetings, error: legacyError } = await supabase
      .from("meetings")
      .select("*")
      .in("board_id", boardIds)
      .order("meeting_date", { ascending: false });

    if (legacyError) {
      console.error("[getBoardMeetings] Error fetching legacy meetings:", legacyError);
      return [];
    }

    if (!legacyMeetings || legacyMeetings.length === 0) {
      return [];
    }

    const creatorIds = [...new Set(legacyMeetings.map((m: any) => m.created_by))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role")
      .in("id", creatorIds);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

    return legacyMeetings.map((m: any): EnrichedBoardMeeting => {
      const creator = profileMap.get(m.created_by);
      return {
        id: m.id,
        board_id: m.board_id,
        founder_id: founderId,
        title: m.title,
        meeting_date: m.meeting_date,
        meeting_time: null,
        agenda: m.meeting_notes || null,
        meeting_notes: m.meeting_notes || null,
        status: new Date(m.meeting_date) < new Date() ? "completed" : "scheduled",
        created_by: m.created_by,
        created_at: m.created_at,
        updated_at: m.created_at,
        creator: creator
          ? {
              id: creator.id,
              full_name: creator.full_name || "Board Member",
              email: creator.email || "",
              avatar_url: creator.avatar_url || null,
              role: (creator.role as UserRole) || "founder",
            }
          : undefined,
      };
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Unauthorized")) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "Error loading board meetings.";
    console.error("[getBoardMeetings] Unhandled exception:", msg);
    throw new Error(msg);
  }
}

/**
 * Creates a new board meeting.
 * Validates that currentUserId is authorized (founder or active board member).
 */
export async function createBoardMeeting(
  founderId: string,
  currentUserId: string,
  data: CreateMeetingInput,
  client?: any
): Promise<EnrichedBoardMeeting> {
  if (!founderId || !currentUserId) {
    throw new Error("founderId and currentUserId are required.");
  }

  const title = (data.title || "").trim();
  if (!title) {
    throw new Error("Meeting title is required.");
  }

  if (!data.meetingDate) {
    throw new Error("Meeting date is required.");
  }

  const supabase = client || (await getSupabaseServerClient());

  // 1. Authorize caller
  const auth = await verifyBoardMemberOrFounder(founderId, currentUserId, supabase);
  if (!auth.isAuthorized) {
    throw new Error(
      auth.error || "Unauthorized: You must be the founder or an active board member to schedule meetings."
    );
  }

  // 2. Insert into board_meetings
  try {
    const insertPayload = {
      founder_id: founderId,
      title,
      meeting_date: data.meetingDate,
      meeting_time: data.meetingTime || null,
      agenda: data.agenda?.trim() || null,
      meeting_notes: null,
      status: "scheduled" as BoardMeetingStatus,
      created_by: currentUserId,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("board_meetings")
      .insert(insertPayload)
      .select()
      .single();

    if (!insertError && inserted) {
      let creatorProfile = null;
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, role")
          .eq("id", currentUserId)
          .maybeSingle();
        creatorProfile = prof;
      } catch {
        // Fallback
      }

      return {
        id: inserted.id,
        board_id: inserted.board_id || null,
        founder_id: inserted.founder_id,
        title: inserted.title,
        meeting_date: inserted.meeting_date,
        meeting_time: inserted.meeting_time || null,
        agenda: inserted.agenda || null,
        meeting_notes: inserted.meeting_notes || null,
        status: (inserted.status as BoardMeetingStatus) || "scheduled",
        created_by: inserted.created_by,
        created_at: inserted.created_at,
        updated_at: inserted.updated_at || inserted.created_at,
        creator: creatorProfile
          ? {
              id: creatorProfile.id,
              full_name: creatorProfile.full_name || "Board Member",
              email: creatorProfile.email || "",
              avatar_url: creatorProfile.avatar_url || null,
              role: (creatorProfile.role as UserRole) || "founder",
            }
          : undefined,
      };
    }

    // Fallback: If board_meetings table fails, insert into legacy meetings table
    const { data: startups } = await supabase
      .from("startups")
      .select("id, advisory_boards(id)")
      .eq("founder_id", founderId)
      .maybeSingle();

    const boardId = startups?.advisory_boards?.[0]?.id;
    if (!boardId) {
      throw new Error("No advisory board found for this founder.");
    }

    const { data: legacyInserted, error: legacyError } = await supabase
      .from("meetings")
      .insert({
        board_id: boardId,
        title,
        meeting_date: data.meetingDate,
        meeting_notes: data.agenda?.trim() || null,
        created_by: currentUserId,
      })
      .select()
      .single();

    if (legacyError || !legacyInserted) {
      throw new Error(legacyError?.message || "Failed to schedule meeting.");
    }

    return {
      id: legacyInserted.id,
      board_id: legacyInserted.board_id,
      founder_id: founderId,
      title: legacyInserted.title,
      meeting_date: legacyInserted.meeting_date,
      meeting_time: data.meetingTime || null,
      agenda: data.agenda?.trim() || null,
      meeting_notes: legacyInserted.meeting_notes,
      status: "scheduled",
      created_by: legacyInserted.created_by,
      created_at: legacyInserted.created_at,
      updated_at: legacyInserted.created_at,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Unauthorized")) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "Failed to create board meeting.";
    console.error("[createBoardMeeting] Error:", msg);
    throw new Error(msg);
  }
}

/**
 * Updates an existing board meeting (notes, time, status, agenda, etc.).
 * Validates that currentUserId is authorized.
 */
export async function updateBoardMeeting(
  meetingId: string,
  currentUserId: string,
  updates: Partial<BoardMeetingRecord>,
  client?: any
): Promise<BoardMeetingRecord> {
  if (!meetingId || !currentUserId) {
    throw new Error("meetingId and currentUserId are required.");
  }

  const supabase = client || (await getSupabaseServerClient());

  // 1. Fetch meeting to identify founder
  let founderId: string | null = null;
  let isLegacy = false;

  const { data: meeting } = await supabase
    .from("board_meetings")
    .select("id, founder_id")
    .eq("id", meetingId)
    .maybeSingle();

  if (meeting?.founder_id) {
    founderId = meeting.founder_id;
  } else {
    // Check legacy meetings table
    const { data: legacyMeeting } = await supabase
      .from("meetings")
      .select(`
        id,
        board_id,
        advisory_boards:board_id (
          startups:startup_id (
            founder_id
          )
        )
      `)
      .eq("id", meetingId)
      .maybeSingle();

    if (legacyMeeting) {
      isLegacy = true;
      const board: any = legacyMeeting.advisory_boards;
      const startup: any = Array.isArray(board?.startups) ? board.startups[0] : board?.startups;
      founderId = startup?.founder_id || null;
    }
  }

  if (!founderId) {
    throw new Error("Meeting not found.");
  }

  // 2. Authorize caller
  const auth = await verifyBoardMemberOrFounder(founderId, currentUserId, supabase);
  if (!auth.isAuthorized) {
    throw new Error(
      auth.error || "Unauthorized: You must be the founder or an active board member to update meetings."
    );
  }

  // 3. Perform update
  if (!isLegacy) {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) updatePayload.title = updates.title.trim();
    if (updates.meeting_date !== undefined) updatePayload.meeting_date = updates.meeting_date;
    if (updates.meeting_time !== undefined) updatePayload.meeting_time = updates.meeting_time;
    if (updates.agenda !== undefined) updatePayload.agenda = updates.agenda;
    if (updates.meeting_notes !== undefined) updatePayload.meeting_notes = updates.meeting_notes;
    if (updates.status !== undefined) updatePayload.status = updates.status;

    const { data: updated, error } = await supabase
      .from("board_meetings")
      .update(updatePayload)
      .eq("id", meetingId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || "Failed to update meeting.");
    }

    return updated as BoardMeetingRecord;
  } else {
    // Legacy meetings update
    const legacyUpdates: Record<string, any> = {};
    if (updates.title !== undefined) legacyUpdates.title = updates.title.trim();
    if (updates.meeting_date !== undefined) legacyUpdates.meeting_date = updates.meeting_date;
    if (updates.meeting_notes !== undefined || updates.agenda !== undefined) {
      legacyUpdates.meeting_notes = updates.meeting_notes ?? updates.agenda;
    }

    const { data: updated, error } = await supabase
      .from("meetings")
      .update(legacyUpdates)
      .eq("id", meetingId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || "Failed to update meeting.");
    }

    return {
      id: updated.id,
      board_id: updated.board_id,
      founder_id: founderId,
      title: updated.title,
      meeting_date: updated.meeting_date,
      meeting_time: updates.meeting_time || null,
      agenda: updated.meeting_notes || null,
      meeting_notes: updated.meeting_notes || null,
      status: updates.status || "scheduled",
      created_by: updated.created_by,
      created_at: updated.created_at,
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * ==============================================================================
 * BOARD RECOMMENDATIONS
 * ==============================================================================
 */

/**
 * Fetches all formal strategic recommendations for a founder's board.
 * Enriches author profile and mentor details.
 */
export async function getBoardRecommendations(
  founderId: string,
  currentUserId: string,
  client?: any
): Promise<EnrichedBoardRecommendation[]> {
  if (!founderId || !currentUserId) {
    throw new Error("founderId and currentUserId are required.");
  }

  const supabase = client || (await getSupabaseServerClient());

  // 1. Authorize caller
  const auth = await verifyBoardMemberOrFounder(founderId, currentUserId, supabase);
  if (!auth.isAuthorized) {
    throw new Error(
      auth.error || "Unauthorized: You must be the founder or an active board member to view recommendations."
    );
  }

  // 2. Query board_recommendations
  try {
    const { data, error } = await supabase
      .from("board_recommendations")
      .select(`
        id,
        startup_id,
        founder_id,
        author_id,
        mentor_id,
        title,
        description,
        status,
        created_at,
        updated_at,
        profiles:author_id (
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .eq("founder_id", founderId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const missingAuthorIds = data
        .filter((row: any) => !row.profiles && !row.author)
        .map((row: any) => row.author_id);

      const profileMap = new Map<string, any>();
      if (missingAuthorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, role")
          .in("id", [...new Set(missingAuthorIds)]);

        (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
      }

      // Also get mentor professional title / company if available
      const authorIds = [...new Set(data.map((r: any) => r.author_id))];
      const { data: mentorProfiles } = await supabase
        .from("mentor_profiles")
        .select("user_id, professional_title, previous_company")
        .in("user_id", authorIds);

      const mentorInfoMap = new Map<string, any>();
      (mentorProfiles || []).forEach((mp: any) => mentorInfoMap.set(mp.user_id, mp));

      return data.map((row: any): EnrichedBoardRecommendation => {
        const rawAuthor = Array.isArray(row.profiles) ? row.profiles[0] : (row.profiles || row.author);
        const author = rawAuthor || profileMap.get(row.author_id);
        const mentorInfo = mentorInfoMap.get(row.author_id);

        return {
          id: row.id,
          startup_id: row.startup_id || null,
          founder_id: row.founder_id,
          author_id: row.author_id,
          mentor_id: row.mentor_id || null,
          title: row.title,
          description: row.description,
          status: (row.status as BoardRecommendationStatus) || "proposed",
          created_at: row.created_at,
          updated_at: row.updated_at || row.created_at,
          author: author
            ? {
                id: author.id,
                full_name: author.full_name || "Board Advisor",
                email: author.email || "",
                avatar_url: author.avatar_url || null,
                role: (author.role as UserRole) || "mentor",
                professional_title: mentorInfo?.professional_title,
                company: mentorInfo?.previous_company,
              }
            : undefined,
        };
      });
    }

    // Fallback: Query legacy recommendations table
    const { data: startups } = await supabase
      .from("startups")
      .select("id")
      .eq("founder_id", founderId);

    const startupIds = (startups || []).map((s: any) => s.id);
    if (startupIds.length === 0) {
      return [];
    }

    const { data: legacyRecs, error: legacyError } = await supabase
      .from("recommendations")
      .select(`
        id,
        startup_id,
        mentor_id,
        title,
        content,
        created_at,
        mentor_profiles:mentor_id (
          id,
          user_id,
          professional_title,
          previous_company,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url,
            role
          )
        )
      `)
      .in("startup_id", startupIds)
      .order("created_at", { ascending: false });

    if (legacyError || !legacyRecs) {
      return [];
    }

    return legacyRecs.map((r: any): EnrichedBoardRecommendation => {
      const mentorProf = Array.isArray(r.mentor_profiles) ? r.mentor_profiles[0] : r.mentor_profiles;
      const userProf = mentorProf?.profiles ? (Array.isArray(mentorProf.profiles) ? mentorProf.profiles[0] : mentorProf.profiles) : null;

      return {
        id: r.id,
        startup_id: r.startup_id,
        founder_id: founderId,
        author_id: mentorProf?.user_id || r.mentor_id,
        mentor_id: r.mentor_id,
        title: r.title,
        description: r.content,
        status: "proposed",
        created_at: r.created_at,
        updated_at: r.created_at,
        author: userProf
          ? {
              id: userProf.id,
              full_name: userProf.full_name || "Board Advisor",
              email: userProf.email || "",
              avatar_url: userProf.avatar_url || null,
              role: (userProf.role as UserRole) || "mentor",
              professional_title: mentorProf?.professional_title,
              company: mentorProf?.previous_company,
            }
          : undefined,
      };
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Unauthorized")) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "Error fetching board recommendations.";
    console.error("[getBoardRecommendations] Unhandled exception:", msg);
    throw new Error(msg);
  }
}

/**
 * Creates a new board recommendation.
 * Author must be authorized (founder or active board member).
 */
export async function createBoardRecommendation(
  founderId: string,
  authorId: string,
  data: CreateRecommendationInput,
  client?: any
): Promise<EnrichedBoardRecommendation> {
  if (!founderId || !authorId) {
    throw new Error("founderId and authorId are required.");
  }

  const title = (data.title || "").trim();
  if (!title) {
    throw new Error("Recommendation title is required.");
  }

  const description = (data.description || "").trim();
  if (!description) {
    throw new Error("Recommendation description is required.");
  }

  const supabase = client || (await getSupabaseServerClient());

  // 1. Authorize caller
  const auth = await verifyBoardMemberOrFounder(founderId, authorId, supabase);
  if (!auth.isAuthorized) {
    throw new Error(
      auth.error || "Unauthorized: You must be the founder or an active board member to post recommendations."
    );
  }

  // 2. Fetch author mentor profile if available
  let mentorId: string | null = null;
  let mentorInfo: any = null;
  try {
    const { data: mp } = await supabase
      .from("mentor_profiles")
      .select("id, professional_title, previous_company")
      .eq("user_id", authorId)
      .maybeSingle();

    if (mp) {
      mentorId = mp.id;
      mentorInfo = mp;
    }
  } catch {
    // Continue
  }

  // 3. Insert into board_recommendations
  try {
    const insertPayload = {
      founder_id: founderId,
      author_id: authorId,
      mentor_id: mentorId,
      title,
      description,
      status: (data.status as BoardRecommendationStatus) || "proposed",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("board_recommendations")
      .insert(insertPayload)
      .select()
      .single();

    if (!insertError && inserted) {
      let authorProfile = null;
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, role")
          .eq("id", authorId)
          .maybeSingle();
        authorProfile = prof;
      } catch {
        // Fallback
      }

      return {
        id: inserted.id,
        startup_id: inserted.startup_id || null,
        founder_id: inserted.founder_id,
        author_id: inserted.author_id,
        mentor_id: inserted.mentor_id || null,
        title: inserted.title,
        description: inserted.description,
        status: (inserted.status as BoardRecommendationStatus) || "proposed",
        created_at: inserted.created_at,
        updated_at: inserted.updated_at || inserted.created_at,
        author: authorProfile
          ? {
              id: authorProfile.id,
              full_name: authorProfile.full_name || "Board Advisor",
              email: authorProfile.email || "",
              avatar_url: authorProfile.avatar_url || null,
              role: (authorProfile.role as UserRole) || "mentor",
              professional_title: mentorInfo?.professional_title,
              company: mentorInfo?.previous_company,
            }
          : undefined,
      };
    }

    // Fallback: If board_recommendations table fails, insert into legacy recommendations
    const { data: startup } = await supabase
      .from("startups")
      .select("id")
      .eq("founder_id", founderId)
      .maybeSingle();

    if (!startup) {
      throw new Error("No startup found for this founder.");
    }

    if (!mentorId) {
      throw new Error("Only advisors with a mentor profile can author legacy recommendations.");
    }

    const { data: legacyInserted, error: legacyError } = await supabase
      .from("recommendations")
      .insert({
        startup_id: startup.id,
        mentor_id: mentorId,
        title,
        content: description,
      })
      .select()
      .single();

    if (legacyError || !legacyInserted) {
      throw new Error(legacyError?.message || "Failed to create recommendation.");
    }

    return {
      id: legacyInserted.id,
      startup_id: legacyInserted.startup_id,
      founder_id: founderId,
      author_id: authorId,
      mentor_id: mentorId,
      title: legacyInserted.title,
      description: legacyInserted.content,
      status: "proposed",
      created_at: legacyInserted.created_at,
      updated_at: legacyInserted.created_at,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Unauthorized")) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "Failed to create recommendation.";
    console.error("[createBoardRecommendation] Error:", msg);
    throw new Error(msg);
  }
}

/**
 * Updates the status of a board recommendation ('proposed' | 'in_progress' | 'completed').
 * Validates that currentUserId is authorized.
 */
export async function updateBoardRecommendationStatus(
  recommendationId: string,
  currentUserId: string,
  status: "proposed" | "in_progress" | "completed",
  client?: any
): Promise<BoardRecommendationRecord> {
  if (!recommendationId || !currentUserId) {
    throw new Error("recommendationId and currentUserId are required.");
  }

  const validStatuses: BoardRecommendationStatus[] = ["proposed", "in_progress", "completed"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: '${status}'. Must be proposed, in_progress, or completed.`);
  }

  const supabase = client || (await getSupabaseServerClient());

  // 1. Fetch recommendation to verify founder
  let founderId: string | null = null;
  let isLegacy = false;

  const { data: rec } = await supabase
    .from("board_recommendations")
    .select("id, founder_id, status")
    .eq("id", recommendationId)
    .maybeSingle();

  if (rec?.founder_id) {
    founderId = rec.founder_id;
  } else {
    // Check legacy recommendations table
    const { data: legacyRec } = await supabase
      .from("recommendations")
      .select(`
        id,
        startup_id,
        mentor_id,
        title,
        content,
        created_at,
        startups:startup_id (
          founder_id
        )
      `)
      .eq("id", recommendationId)
      .maybeSingle();

    if (legacyRec) {
      isLegacy = true;
      const startup: any = Array.isArray(legacyRec.startups) ? legacyRec.startups[0] : legacyRec.startups;
      founderId = startup?.founder_id || null;
    }
  }

  if (!founderId) {
    throw new Error("Recommendation not found.");
  }

  // 2. Authorize caller
  const auth = await verifyBoardMemberOrFounder(founderId, currentUserId, supabase);
  if (!auth.isAuthorized) {
    throw new Error(
      auth.error || "Unauthorized: You must be the founder or an active board member to update recommendation status."
    );
  }

  // 3. Update status
  if (!isLegacy) {
    const { data: updated, error } = await supabase
      .from("board_recommendations")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recommendationId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || "Failed to update recommendation status.");
    }

    return updated as BoardRecommendationRecord;
  } else {
    // If legacy recommendations table doesn't have status, return synthetic record
    return {
      id: recommendationId,
      founder_id: founderId,
      author_id: currentUserId,
      title: "Recommendation",
      description: "",
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}
