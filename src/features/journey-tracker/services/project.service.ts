import { createClient } from "@/lib/supabase/server";
import {
  StartupProject,
  ProjectMilestone,
  ProjectTask,
  MilestonePriority,
  TaskPriority,
  TaskStatus,
  ProjectProgress,
  EnrichedProjectMilestone,
  EnrichedProjectTask,
  ProjectStatus,
} from "@/types/journey-tracker";

export interface CreateProjectInput {
  name: string;
  description?: string;
  industry?: string;
  stage?: string;
  goal?: string;
  target_launch_date?: string;
  status?: ProjectStatus;
}

export interface CreateMilestoneInput {
  title: string;
  description?: string;
  stage?: string;
  start_date?: string;
  due_date?: string;
  priority?: MilestonePriority;
  sort_order?: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  priority?: TaskPriority;
}

export interface StartupProjectDetails extends StartupProject {
  project: StartupProject;
  milestones: EnrichedProjectMilestone[];
  progress: ProjectProgress;
}

/**
 * Helper to check whether a user is an active board member (mentor) for the given founder.
 */
async function checkMentorBoardAccess(userId: string, founderId: string): Promise<boolean> {
  const supabase = await createClient();

  // Find mentor profile for this user
  const { data: mentorProfile } = await supabase
    .from("mentor_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!mentorProfile) {
    return false;
  }

  // Check active board memberships
  const { data: memberships } = await supabase
    .from("board_members")
    .select("id, founder_id, board_id")
    .eq("mentor_id", mentorProfile.id)
    .eq("membership_status", "active");

  if (!memberships || memberships.length === 0) {
    return false;
  }

  // 1. Direct founder_id check
  if (memberships.some((m) => m.founder_id === founderId)) {
    return true;
  }

  // 2. Via board_id -> advisory_boards -> startups -> founder_id
  const boardIds = memberships
    .map((m) => m.board_id)
    .filter((id): id is string => Boolean(id));

  if (boardIds.length > 0) {
    const { data: boards } = await supabase
      .from("advisory_boards")
      .select("id, startup_id")
      .in("id", boardIds);

    if (boards && boards.length > 0) {
      const startupIds = boards.map((b) => b.startup_id);
      const { data: startups } = await supabase
        .from("startups")
        .select("id, founder_id")
        .in("id", startupIds);

      if (startups && startups.some((s) => s.founder_id === founderId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Verifies if a user has access to a project (as owner, active mentor board member, or admin).
 */
export async function verifyProjectAccess(
  projectId: string,
  userId: string
): Promise<{ project: StartupProject; isOwner: boolean }> {
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("startup_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(`Database error: ${projectError.message}`);
  }

  if (!project) {
    throw new Error("Project not found");
  }

  // Direct owner
  if (project.founder_id === userId) {
    return { project, isOwner: true };
  }

  // Check if admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === "admin") {
    return { project, isOwner: false };
  }

  // Check if user is a mentor with active board membership for this project's founder
  const isMentor = await checkMentorBoardAccess(userId, project.founder_id);
  if (isMentor) {
    return { project, isOwner: false };
  }

  throw new Error("Forbidden: You do not have access to this project");
}

/**
 * 1. Create a new startup project
 */
export async function createStartupProject(
  userId: string,
  data: CreateProjectInput
): Promise<StartupProject> {
  const supabase = await createClient();

  if (!data.name || !data.name.trim()) {
    throw new Error("Project name is required");
  }

  const { data: project, error } = await supabase
    .from("startup_projects")
    .insert({
      founder_id: userId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      industry: data.industry?.trim() || null,
      stage: data.stage?.trim() || null,
      goal: data.goal?.trim() || null,
      target_launch_date: data.target_launch_date || null,
      status: data.status || "planning",
    })
    .select()
    .single();

  if (error || !project) {
    console.error("[project.service] createStartupProject error:", error);
    throw new Error(`Failed to create startup project: ${error?.message || "Unknown error"}`);
  }

  return project;
}

/**
 * 2. Get all projects accessible to the user
 * Returns projects owned by the founder or projects of startups where the mentor is an active board member.
 */
export async function getStartupProjects(userId: string): Promise<StartupProject[]> {
  const supabase = await createClient();

  // 1. Projects where user is founder
  const { data: ownedProjects, error: ownedError } = await supabase
    .from("startup_projects")
    .select("*")
    .eq("founder_id", userId)
    .order("created_at", { ascending: false });

  if (ownedError) {
    console.error("[project.service] Error fetching owned projects:", ownedError);
    throw new Error(`Failed to fetch projects: ${ownedError.message}`);
  }

  const projectsMap = new Map<string, StartupProject>();
  (ownedProjects || []).forEach((p) => projectsMap.set(p.id, p));

  // 2. Check if user is a mentor with active board memberships
  const { data: mentorProfile } = await supabase
    .from("mentor_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (mentorProfile) {
    const { data: memberships } = await supabase
      .from("board_members")
      .select("founder_id, board_id")
      .eq("mentor_id", mentorProfile.id)
      .eq("membership_status", "active");

    if (memberships && memberships.length > 0) {
      const founderIds = new Set<string>();

      memberships.forEach((m) => {
        if (m.founder_id) founderIds.add(m.founder_id);
      });

      const boardIds = memberships
        .map((m) => m.board_id)
        .filter((id): id is string => Boolean(id));

      if (boardIds.length > 0) {
        const { data: boards } = await supabase
          .from("advisory_boards")
          .select("startup_id")
          .in("id", boardIds);

        if (boards && boards.length > 0) {
          const startupIds = boards.map((b) => b.startup_id);
          const { data: startups } = await supabase
            .from("startups")
            .select("founder_id")
            .in("id", startupIds);

          if (startups) {
            startups.forEach((s) => {
              if (s.founder_id) founderIds.add(s.founder_id);
            });
          }
        }
      }

      if (founderIds.size > 0) {
        const { data: mentoredProjects } = await supabase
          .from("startup_projects")
          .select("*")
          .in("founder_id", Array.from(founderIds))
          .order("created_at", { ascending: false });

        if (mentoredProjects) {
          mentoredProjects.forEach((p) => projectsMap.set(p.id, p));
        }
      }
    }
  }

  return Array.from(projectsMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * 3. Get single project by ID with milestones, task counts, and progress summary
 */
export async function getStartupProjectById(
  projectId: string,
  userId: string
): Promise<StartupProjectDetails> {
  const { project } = await verifyProjectAccess(projectId, userId);
  const milestones = await getMilestones(projectId, userId);
  const progress = await getProjectProgress(projectId, userId);

  return {
    ...project,
    project,
    milestones,
    progress,
  };
}

/**
 * 4. Update startup project details
 */
export async function updateStartupProject(
  projectId: string,
  userId: string,
  updates: Partial<StartupProject>
): Promise<StartupProject> {
  await verifyProjectAccess(projectId, userId);
  const supabase = await createClient();

  const { id, founder_id, created_at, ...cleanUpdates } = updates;

  const { data: updated, error } = await supabase
    .from("startup_projects")
    .update({
      ...cleanUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select()
    .single();

  if (error || !updated) {
    console.error("[project.service] updateStartupProject error:", error);
    throw new Error(`Failed to update project: ${error?.message || "Unknown error"}`);
  }

  return updated;
}

/**
 * 5. Delete startup project (founder owner only)
 */
export async function deleteStartupProject(
  projectId: string,
  userId: string
): Promise<{ success: boolean }> {
  const { project, isOwner } = await verifyProjectAccess(projectId, userId);
  const supabase = await createClient();

  if (!isOwner && project.founder_id !== userId) {
    throw new Error("Forbidden: Only the project owner can delete this project");
  }

  // 1. Fetch milestone IDs to delete associated tasks
  const { data: milestones } = await supabase
    .from("project_milestones")
    .select("id")
    .eq("project_id", projectId);

  if (milestones && milestones.length > 0) {
    const milestoneIds = milestones.map((m) => m.id);
    await supabase.from("project_tasks").delete().in("milestone_id", milestoneIds);
    await supabase.from("milestone_feedback").delete().in("milestone_id", milestoneIds);
  }

  // 2. Delete milestones
  await supabase.from("project_milestones").delete().eq("project_id", projectId);

  // 3. Delete project
  const { error } = await supabase
    .from("startup_projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    console.error("[project.service] deleteStartupProject error:", error);
    throw new Error(`Failed to delete project: ${error.message}`);
  }

  return { success: true };
}

/**
 * 6. Create milestone for project
 */
export async function createMilestone(
  projectId: string,
  userId: string,
  data: CreateMilestoneInput
): Promise<ProjectMilestone> {
  await verifyProjectAccess(projectId, userId);
  const supabase = await createClient();

  if (!data.title || !data.title.trim()) {
    throw new Error("Milestone title is required");
  }

  let sortOrder = data.sort_order;
  if (sortOrder === undefined) {
    const { data: existing } = await supabase
      .from("project_milestones")
      .select("sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false })
      .limit(1);

    sortOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0;
  }

  const { data: milestone, error } = await supabase
    .from("project_milestones")
    .insert({
      project_id: projectId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      stage: data.stage?.trim() || null,
      start_date: data.start_date || null,
      due_date: data.due_date || null,
      priority: data.priority || "medium",
      status: "pending",
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error || !milestone) {
    console.error("[project.service] createMilestone error:", error);
    throw new Error(`Failed to create milestone: ${error?.message || "Unknown error"}`);
  }

  return milestone;
}

/**
 * 7. Update milestone
 */
export async function updateMilestone(
  milestoneId: string,
  userId: string,
  updates: Partial<ProjectMilestone>
): Promise<ProjectMilestone> {
  const supabase = await createClient();

  const { data: milestone, error: fetchError } = await supabase
    .from("project_milestones")
    .select("project_id")
    .eq("id", milestoneId)
    .maybeSingle();

  if (fetchError || !milestone) {
    throw new Error("Milestone not found");
  }

  await verifyProjectAccess(milestone.project_id, userId);

  const { id, project_id, created_at, ...cleanUpdates } = updates;

  const { data: updated, error } = await supabase
    .from("project_milestones")
    .update(cleanUpdates)
    .eq("id", milestoneId)
    .select()
    .single();

  if (error || !updated) {
    console.error("[project.service] updateMilestone error:", error);
    throw new Error(`Failed to update milestone: ${error?.message || "Unknown error"}`);
  }

  return updated;
}

/**
 * 8. Delete milestone
 */
export async function deleteMilestone(
  milestoneId: string,
  userId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { data: milestone, error: fetchError } = await supabase
    .from("project_milestones")
    .select("project_id")
    .eq("id", milestoneId)
    .maybeSingle();

  if (fetchError || !milestone) {
    throw new Error("Milestone not found");
  }

  await verifyProjectAccess(milestone.project_id, userId);

  // Delete tasks belonging to this milestone first
  await supabase.from("project_tasks").delete().eq("milestone_id", milestoneId);
  await supabase.from("milestone_feedback").delete().eq("milestone_id", milestoneId);

  const { error } = await supabase
    .from("project_milestones")
    .delete()
    .eq("id", milestoneId);

  if (error) {
    console.error("[project.service] deleteMilestone error:", error);
    throw new Error(`Failed to delete milestone: ${error.message}`);
  }

  return { success: true };
}

/**
 * 9. Get all milestones for a project with task counts and enriched status
 */
export async function getMilestones(
  projectId: string,
  userId: string
): Promise<EnrichedProjectMilestone[]> {
  await verifyProjectAccess(projectId, userId);
  const supabase = await createClient();

  const { data: milestones, error: milestonesError } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (milestonesError) {
    console.error("[project.service] getMilestones error:", milestonesError);
    throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
  }

  if (!milestones || milestones.length === 0) {
    return [];
  }

  const milestoneIds = milestones.map((m) => m.id);

  // Fetch tasks for all milestones
  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("*")
    .in("milestone_id", milestoneIds);

  const tasksByMilestone = new Map<string, ProjectTask[]>();
  (tasks || []).forEach((t) => {
    const list = tasksByMilestone.get(t.milestone_id) || [];
    list.push(t);
    tasksByMilestone.set(t.milestone_id, list);
  });

  // Fetch feedback counts
  const { data: feedbacks } = await supabase
    .from("milestone_feedback")
    .select("milestone_id")
    .in("milestone_id", milestoneIds);

  const feedbackByMilestone = new Map<string, number>();
  (feedbacks || []).forEach((f) => {
    if (f.milestone_id) {
      feedbackByMilestone.set(
        f.milestone_id,
        (feedbackByMilestone.get(f.milestone_id) || 0) + 1
      );
    }
  });

  const now = new Date();

  return milestones.map((m) => {
    const mTasks = tasksByMilestone.get(m.id) || [];
    const taskCount = mTasks.length;
    const completedTaskCount = mTasks.filter((t) => t.status === "completed").length;
    const feedbackCount = feedbackByMilestone.get(m.id) || 0;

    let enrichedStatus = m.status;
    if (m.due_date && new Date(m.due_date) < now && m.status !== "completed") {
      enrichedStatus = "delayed";
    }

    return {
      ...m,
      status: enrichedStatus,
      task_count: taskCount,
      completed_task_count: completedTaskCount,
      feedback_count: feedbackCount,
    };
  });
}

/**
 * 10. Create a task under a milestone
 */
export async function createTask(
  milestoneId: string,
  userId: string,
  data: CreateTaskInput
): Promise<ProjectTask> {
  const supabase = await createClient();

  if (!data.title || !data.title.trim()) {
    throw new Error("Task title is required");
  }

  const { data: milestone, error: milestoneError } = await supabase
    .from("project_milestones")
    .select("project_id")
    .eq("id", milestoneId)
    .maybeSingle();

  if (milestoneError || !milestone) {
    throw new Error("Milestone not found");
  }

  await verifyProjectAccess(milestone.project_id, userId);

  const { data: task, error } = await supabase
    .from("project_tasks")
    .insert({
      milestone_id: milestoneId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      assigned_to: data.assigned_to || null,
      due_date: data.due_date || null,
      priority: data.priority || "medium",
      status: "pending",
      completed_at: null,
    })
    .select()
    .single();

  if (error || !task) {
    console.error("[project.service] createTask error:", error);
    throw new Error(`Failed to create task: ${error?.message || "Unknown error"}`);
  }

  return task;
}

/**
 * 11. Update a task
 */
export async function updateTask(
  taskId: string,
  userId: string,
  updates: Partial<ProjectTask>
): Promise<ProjectTask> {
  const supabase = await createClient();

  const { data: task, error: fetchError } = await supabase
    .from("project_tasks")
    .select("milestone_id")
    .eq("id", taskId)
    .maybeSingle();

  if (fetchError || !task) {
    throw new Error("Task not found");
  }

  const { data: milestone, error: milestoneError } = await supabase
    .from("project_milestones")
    .select("project_id")
    .eq("id", task.milestone_id)
    .maybeSingle();

  if (milestoneError || !milestone) {
    throw new Error("Milestone not found");
  }

  await verifyProjectAccess(milestone.project_id, userId);

  const { id, milestone_id, created_at, ...cleanUpdates } = updates;

  // Handle status and completed_at transition logic
  if (cleanUpdates.status !== undefined) {
    if (cleanUpdates.status === "completed") {
      cleanUpdates.completed_at = cleanUpdates.completed_at || new Date().toISOString();
    } else {
      cleanUpdates.completed_at = null;
    }
  }

  const { data: updated, error } = await supabase
    .from("project_tasks")
    .update({
      ...cleanUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error || !updated) {
    console.error("[project.service] updateTask error:", error);
    throw new Error(`Failed to update task: ${error?.message || "Unknown error"}`);
  }

  return updated;
}

/**
 * 12. Delete a task
 */
export async function deleteTask(
  taskId: string,
  userId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { data: task, error: fetchError } = await supabase
    .from("project_tasks")
    .select("milestone_id")
    .eq("id", taskId)
    .maybeSingle();

  if (fetchError || !task) {
    throw new Error("Task not found");
  }

  const { data: milestone, error: milestoneError } = await supabase
    .from("project_milestones")
    .select("project_id")
    .eq("id", task.milestone_id)
    .maybeSingle();

  if (milestoneError || !milestone) {
    throw new Error("Milestone not found");
  }

  await verifyProjectAccess(milestone.project_id, userId);

  const { error } = await supabase
    .from("project_tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    console.error("[project.service] deleteTask error:", error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }

  return { success: true };
}

/**
 * 13. Update task status with automatic completed_at timestamp handling
 */
export async function updateTaskStatus(
  taskId: string,
  userId: string,
  status: TaskStatus
): Promise<ProjectTask> {
  const completedAt = status === "completed" ? new Date().toISOString() : null;
  return updateTask(taskId, userId, { status, completed_at: completedAt });
}

/**
 * 14. Get all tasks for a milestone with assignee profiles and is_overdue flag
 */
export async function getMilestoneTasks(
  milestoneId: string,
  userId: string
): Promise<EnrichedProjectTask[]> {
  const supabase = await createClient();

  const { data: milestone, error: milestoneError } = await supabase
    .from("project_milestones")
    .select("project_id")
    .eq("id", milestoneId)
    .maybeSingle();

  if (milestoneError || !milestone) {
    throw new Error("Milestone not found");
  }

  await verifyProjectAccess(milestone.project_id, userId);

  const { data: tasks, error: tasksError } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("milestone_id", milestoneId)
    .order("created_at", { ascending: true });

  if (tasksError) {
    console.error("[project.service] getMilestoneTasks error:", tasksError);
    throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
  }

  if (!tasks || tasks.length === 0) {
    return [];
  }

  const assigneeIds = Array.from(
    new Set(tasks.map((t) => t.assigned_to).filter((id): id is string => Boolean(id)))
  );

  const profilesMap = new Map<
    string,
    { id: string; full_name: string; email: string; avatar_url: string | null; role: string }
  >();

  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role")
      .in("id", assigneeIds);

    (profiles || []).forEach((p) => {
      profilesMap.set(p.id, {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url || null,
        role: p.role,
      });
    });
  }

  const now = new Date();

  return tasks.map((task) => {
    const isOverdue = Boolean(
      task.due_date && new Date(task.due_date) < now && task.status !== "completed"
    );
    const assignee = task.assigned_to ? profilesMap.get(task.assigned_to) || null : null;

    return {
      ...task,
      assignee,
      is_overdue: isOverdue,
    };
  });
}

/**
 * 15. Calculate overall progress for a project
 */
export async function getProjectProgress(
  projectId: string,
  userId: string
): Promise<ProjectProgress> {
  await verifyProjectAccess(projectId, userId);
  const supabase = await createClient();

  // Fetch milestones
  const { data: milestones, error: milestonesError } = await supabase
    .from("project_milestones")
    .select("id, status")
    .eq("project_id", projectId);

  if (milestonesError) {
    console.error("[project.service] getProjectProgress milestones error:", milestonesError);
    throw new Error(`Failed to calculate progress: ${milestonesError.message}`);
  }

  const totalMilestones = milestones?.length || 0;
  const completedMilestones =
    milestones?.filter((m) => m.status === "completed").length || 0;

  const milestoneIds = (milestones || []).map((m) => m.id);

  let totalTasks = 0;
  let completedTasks = 0;
  let overdueTasks = 0;

  if (milestoneIds.length > 0) {
    const { data: tasks, error: tasksError } = await supabase
      .from("project_tasks")
      .select("id, status, due_date")
      .in("milestone_id", milestoneIds);

    if (tasksError) {
      console.error("[project.service] getProjectProgress tasks error:", tasksError);
      throw new Error(`Failed to calculate progress tasks: ${tasksError.message}`);
    }

    if (tasks) {
      totalTasks = tasks.length;
      completedTasks = tasks.filter((t) => t.status === "completed").length;
      const now = new Date();
      overdueTasks = tasks.filter(
        (t) => t.due_date && new Date(t.due_date) < now && t.status !== "completed"
      ).length;
    }
  }

  const progressPercentage =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

  return {
    projectId,
    totalMilestones,
    completedMilestones,
    totalTasks,
    completedTasks,
    overdueTasks,
    progressPercentage,
  };
}

export const ProjectService = {
  createStartupProject,
  getStartupProjects,
  getStartupProjectById,
  updateStartupProject,
  deleteStartupProject,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getMilestones,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getMilestoneTasks,
  getProjectProgress,
  verifyProjectAccess,
};
