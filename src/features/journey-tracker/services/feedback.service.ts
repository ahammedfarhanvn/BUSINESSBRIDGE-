/**
 * BusinessBridge - Mentor Feedback Service
 * Phase 4 Business Journey Tracker & Virtual Boardroom Collaboration
 * 
 * Provides authorized mentor and founder feedback tracking for startup projects,
 * milestones, and execution tasks.
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  EnrichedMilestoneFeedback,
  StartupProject,
} from "@/types/journey-tracker";

export interface GetProjectFeedbackOptions {
  milestoneId?: string;
  taskId?: string;
}

export interface SubmitMilestoneFeedbackInput {
  projectId: string;
  milestoneId?: string;
  taskId?: string;
  content: string;
}

export interface UserProjectAccessResult {
  allowed: boolean;
  isFounder: boolean;
  isMentor: boolean;
  project: StartupProject | null;
  error?: string;
}

/**
 * Returns an admin client if SUPABASE_SERVICE_ROLE_KEY is configured,
 * otherwise falls back to the authenticated server client.
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

/**
 * Access Control Helper:
 * Verifies that the user is either the founder of the project, an active board mentor
 * of the project's founder, or an admin.
 */
export async function verifyUserProjectAccess(
  projectId: string,
  userId: string
): Promise<UserProjectAccessResult> {
  if (!projectId || !userId) {
    return {
      allowed: false,
      isFounder: false,
      isMentor: false,
      project: null,
      error: "Missing projectId or userId.",
    };
  }

  const supabase = await getSupabaseClient();

  // 1. Fetch user role to check if admin
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (userProfile?.role === "admin") {
    const { data: project } = await supabase
      .from("startup_projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return {
        allowed: false,
        isFounder: false,
        isMentor: false,
        project: null,
        error: "Project not found.",
      };
    }

    return {
      allowed: true,
      isFounder: true,
      isMentor: false,
      project: project as StartupProject,
    };
  }

  // 2. Fetch the target startup project
  const { data: project, error: pError } = await supabase
    .from("startup_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (pError || !project) {
    return {
      allowed: false,
      isFounder: false,
      isMentor: false,
      project: null,
      error: "Project not found.",
    };
  }

  const typedProject = project as StartupProject;

  // 3. Check if user is the founder of this project
  if (typedProject.founder_id === userId) {
    return {
      allowed: true,
      isFounder: true,
      isMentor: false,
      project: typedProject,
    };
  }

  // 4. Check if user is an active board mentor of the founder
  // Fetch mentor profile for the current user (if exists)
  const { data: mentorProfile } = await supabase
    .from("mentor_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const candidateMentorIds = [userId];
  if (mentorProfile?.id && !candidateMentorIds.includes(mentorProfile.id)) {
    candidateMentorIds.push(mentorProfile.id);
  }

  // Check 4a: Direct active board membership linked to the project's founder_id
  const { data: directMembership } = await supabase
    .from("board_members")
    .select("id")
    .eq("founder_id", typedProject.founder_id)
    .eq("membership_status", "active")
    .in("mentor_id", candidateMentorIds)
    .limit(1)
    .maybeSingle();

  if (directMembership) {
    return {
      allowed: true,
      isFounder: false,
      isMentor: true,
      project: typedProject,
    };
  }

  // Check 4b: Board membership linked via advisory_boards of founder's startups
  const { data: founderStartups } = await supabase
    .from("startups")
    .select("id")
    .eq("founder_id", typedProject.founder_id);

  if (founderStartups && founderStartups.length > 0) {
    const startupIds = founderStartups.map((s) => s.id);
    const { data: boards } = await supabase
      .from("advisory_boards")
      .select("id")
      .in("startup_id", startupIds);

    if (boards && boards.length > 0) {
      const boardIds = boards.map((b) => b.id);
      const { data: boardMembership } = await supabase
        .from("board_members")
        .select("id")
        .in("board_id", boardIds)
        .eq("membership_status", "active")
        .in("mentor_id", candidateMentorIds)
        .limit(1)
        .maybeSingle();

      if (boardMembership) {
        return {
          allowed: true,
          isFounder: false,
          isMentor: true,
          project: typedProject,
        };
      }
    }
  }

  return {
    allowed: false,
    isFounder: false,
    isMentor: false,
    project: typedProject,
    error: "Unauthorized: You are neither the project founder nor an active board mentor for this venture.",
  };
}

/**
 * Retrieves feedback for a project, optionally filtered by milestone or task.
 * Verifies that the requester is the founder or an active board mentor.
 * Joins author profile (full_name, avatar_url, role) and milestone/task titles.
 */
export async function getProjectFeedback(
  projectId: string,
  userId: string,
  options?: GetProjectFeedbackOptions
): Promise<EnrichedMilestoneFeedback[]> {
  const access = await verifyUserProjectAccess(projectId, userId);
  if (!access.allowed) {
    throw new Error(access.error || "Unauthorized access to project feedback.");
  }

  const supabase = await getSupabaseClient();

  // 1. Query feedback items for this project
  let query = supabase
    .from("milestone_feedback")
    .select(`
      id,
      project_id,
      milestone_id,
      task_id,
      author_id,
      content,
      status,
      created_at
    `)
    .eq("project_id", projectId);

  if (options?.milestoneId) {
    query = query.eq("milestone_id", options.milestoneId);
  }

  if (options?.taskId) {
    query = query.eq("task_id", options.taskId);
  }

  const { data: feedbackRows, error: feedbackError } = await query.order(
    "created_at",
    { ascending: false }
  );

  if (feedbackError) {
    console.error("[FeedbackService] Error fetching feedback records:", feedbackError);
    throw new Error(`Failed to load feedback: ${feedbackError.message}`);
  }

  if (!feedbackRows || feedbackRows.length === 0) {
    return [];
  }

  // 2. Collect unique author, milestone, and task IDs for enrichment
  const authorIds = Array.from(new Set(feedbackRows.map((f) => f.author_id).filter(Boolean)));
  const milestoneIds = Array.from(
    new Set(feedbackRows.map((f) => f.milestone_id).filter(Boolean) as string[])
  );
  const taskIds = Array.from(
    new Set(feedbackRows.map((f) => f.task_id).filter(Boolean) as string[])
  );

  // 3. Batch query author profiles
  const authorMap = new Map<
    string,
    { id: string; full_name: string; avatar_url: string | null; role: string }
  >();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .in("id", authorIds);

    if (profiles) {
      profiles.forEach((p) => authorMap.set(p.id, p));
    }
  }

  // 4. Batch query milestone titles
  const milestoneMap = new Map<string, string>();
  if (milestoneIds.length > 0) {
    const { data: milestones } = await supabase
      .from("project_milestones")
      .select("id, title")
      .in("id", milestoneIds);

    if (milestones) {
      milestones.forEach((m) => milestoneMap.set(m.id, m.title));
    }
  }

  // 5. Batch query task titles
  const taskMap = new Map<string, string>();
  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from("project_tasks")
      .select("id, title")
      .in("id", taskIds);

    if (tasks) {
      tasks.forEach((t) => taskMap.set(t.id, t.title));
    }
  }

  // 6. Enrich feedback records
  const enriched: EnrichedMilestoneFeedback[] = feedbackRows.map((f) => {
    const authorProfile = authorMap.get(f.author_id);
    const milestoneTitle = f.milestone_id ? milestoneMap.get(f.milestone_id) || null : null;
    const taskTitle = f.task_id ? taskMap.get(f.task_id) || null : null;

    return {
      id: f.id,
      project_id: f.project_id,
      milestone_id: f.milestone_id,
      task_id: f.task_id,
      author_id: f.author_id,
      content: f.content,
      status: f.status,
      created_at: f.created_at,
      updated_at: (f as any).updated_at || f.created_at,
      author: authorProfile
        ? {
            id: authorProfile.id,
            full_name: authorProfile.full_name || "Board Advisor",
            avatar_url: authorProfile.avatar_url || null,
            role: authorProfile.role || "mentor",
          }
        : null,
      milestone_title: milestoneTitle,
      task_title: taskTitle,
    };
  });

  return enriched;
}

/**
 * Submits mentor or founder feedback on a project, milestone, or task.
 * Verifies that the author is an active board mentor or the founder.
 * Inserts record into public.milestone_feedback and returns enriched item.
 */
export async function submitMilestoneFeedback(
  authorId: string,
  input: SubmitMilestoneFeedbackInput
): Promise<EnrichedMilestoneFeedback> {
  if (!input.content || !input.content.trim()) {
    throw new Error("Feedback content is required.");
  }

  if (!input.projectId) {
    throw new Error("Project ID is required.");
  }

  // 1. Verify author has access to this project
  const access = await verifyUserProjectAccess(input.projectId, authorId);
  if (!access.allowed) {
    throw new Error(
      access.error || "Unauthorized: Only the project founder or active board mentors can submit feedback."
    );
  }

  const supabase = await getSupabaseClient();

  // 2. Validate milestone association if provided
  let milestoneTitle: string | null = null;
  if (input.milestoneId) {
    const { data: milestone, error: mError } = await supabase
      .from("project_milestones")
      .select("id, title, project_id")
      .eq("id", input.milestoneId)
      .maybeSingle();

    if (mError || !milestone) {
      throw new Error("Specified milestone does not exist.");
    }

    if (milestone.project_id !== input.projectId) {
      throw new Error("Specified milestone does not belong to this project.");
    }

    milestoneTitle = milestone.title;
  }

  // 3. Validate task association if provided
  let taskTitle: string | null = null;
  if (input.taskId) {
    const { data: task, error: tError } = await supabase
      .from("project_tasks")
      .select("id, title, milestone_id")
      .eq("id", input.taskId)
      .maybeSingle();

    if (tError || !task) {
      throw new Error("Specified task does not exist.");
    }

    if (input.milestoneId && task.milestone_id !== input.milestoneId) {
      throw new Error("Specified task does not belong to the selected milestone.");
    }

    taskTitle = task.title;

    // If milestoneId wasn't explicitly provided, lookup title from task's parent milestone
    if (!milestoneTitle && task.milestone_id) {
      const { data: parentM } = await supabase
        .from("project_milestones")
        .select("title")
        .eq("id", task.milestone_id)
        .maybeSingle();
      if (parentM) {
        milestoneTitle = parentM.title;
      }
    }
  }

  // 4. Insert new feedback row into milestone_feedback
  const { data: inserted, error: insertError } = await supabase
    .from("milestone_feedback")
    .insert({
      project_id: input.projectId,
      milestone_id: input.milestoneId || null,
      task_id: input.taskId || null,
      author_id: authorId,
      content: input.content.trim(),
      status: "active",
    })
    .select(`
      id,
      project_id,
      milestone_id,
      task_id,
      author_id,
      content,
      status,
      created_at
    `)
    .single();

  if (insertError || !inserted) {
    console.error("[FeedbackService] Insert error:", insertError);
    throw new Error(`Failed to submit feedback: ${insertError?.message || "Database insert failed"}`);
  }

  // 5. Query author details for immediate enriched return
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", authorId)
    .maybeSingle();

  const enrichedItem: EnrichedMilestoneFeedback = {
    id: inserted.id,
    project_id: inserted.project_id,
    milestone_id: inserted.milestone_id,
    task_id: inserted.task_id,
    author_id: inserted.author_id,
    content: inserted.content,
    status: inserted.status,
    created_at: inserted.created_at,
    updated_at: (inserted as any).updated_at || inserted.created_at,
    author: authorProfile
      ? {
          id: authorProfile.id,
          full_name: authorProfile.full_name || "Board Advisor",
          avatar_url: authorProfile.avatar_url || null,
          role: authorProfile.role || "mentor",
        }
      : undefined,
    milestone_title: milestoneTitle,
    task_title: taskTitle,
  };

  return enrichedItem;
}

export const FeedbackService = {
  getProjectFeedback,
  submitMilestoneFeedback,
  verifyUserProjectAccess,
};
