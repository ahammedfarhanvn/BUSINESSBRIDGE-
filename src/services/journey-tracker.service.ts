import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  StartupProjectRecord,
  ProjectMilestoneRecord,
  ProjectTaskRecord,
  MilestoneFeedbackRecord,
  ProjectProgress,
  EnrichedMilestone,
  EnrichedProject,
  AIRoadmapResponse,
  StartupStage,
  CreateProjectInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateFeedbackInput,
} from "@/types/journey-tracker";
import { generateGeminiContent } from "@/lib/gemini";

/**
 * Access Control Helper: Check if user is founder or active board member for a project
 */
export async function canUserAccessProject(
  projectId: string,
  userId: string
): Promise<{ allowed: boolean; isFounder: boolean; isMentor: boolean; founderId?: string }> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  // 1. Check if user is admin
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (userProfile?.role === "admin") {
    return { allowed: true, isFounder: true, isMentor: false };
  }

  // 2. Fetch project
  const { data: project } = await supabase
    .from("startup_projects")
    .select("founder_id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return { allowed: false, isFounder: false, isMentor: false };
  }

  if (project.founder_id === userId) {
    return { allowed: true, isFounder: true, isMentor: false, founderId: project.founder_id };
  }

  // 3. Check active board membership
  const { data: member } = await supabase
    .from("board_members")
    .select("id")
    .eq("founder_id", project.founder_id)
    .eq("membership_status", "active")
    .eq("mentor_id", userId)
    .maybeSingle();

  if (member) {
    return { allowed: true, isFounder: false, isMentor: true, founderId: project.founder_id };
  }

  // Also check if user is mentor via mentor_profiles
  const { data: mentorProfile } = await supabase
    .from("mentor_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (mentorProfile) {
    const { data: memberByMentorId } = await supabase
      .from("board_members")
      .select("id")
      .eq("founder_id", project.founder_id)
      .eq("membership_status", "active")
      .eq("mentor_id", mentorProfile.id)
      .maybeSingle();

    if (memberByMentorId) {
      return { allowed: true, isFounder: false, isMentor: true, founderId: project.founder_id };
    }
  }

  return { allowed: false, isFounder: false, isMentor: false, founderId: project.founder_id };
}

export const JourneyTrackerService = {
  /**
   * Fetch all projects accessible to the user
   */
  async getProjects(userId: string): Promise<StartupProjectRecord[]> {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    // 1. Check user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profile?.role === "admin") {
      const { data } = await supabase
        .from("startup_projects")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as StartupProjectRecord[];
    }

    if (profile?.role === "founder") {
      const { data } = await supabase
        .from("startup_projects")
        .select("*")
        .eq("founder_id", userId)
        .order("created_at", { ascending: false });
      return (data || []) as StartupProjectRecord[];
    }

    // Mentor: find founderIds where mentor is active board member
    const { data: mentorProfile } = await supabase
      .from("mentor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const mentorIdToMatch = mentorProfile?.id || userId;

    const { data: memberships } = await supabase
      .from("board_members")
      .select("founder_id")
      .eq("mentor_id", mentorIdToMatch)
      .eq("membership_status", "active");

    const founderIds = (memberships || [])
      .map((m) => m.founder_id)
      .filter(Boolean);

    if (founderIds.length === 0) {
      return [];
    }

    const { data: projects } = await supabase
      .from("startup_projects")
      .select("*")
      .in("founder_id", founderIds)
      .order("created_at", { ascending: false });

    return (projects || []) as StartupProjectRecord[];
  },

  /**
   * Create a new project (Founders only)
   */
  async createProject(
    founderId: string,
    data: CreateProjectInput
  ): Promise<{ success: boolean; project?: StartupProjectRecord; error?: string }> {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    try {
      // If startup_id not provided, try to find founder's registered startup
      let startupId = data.startup_id;
      if (!startupId) {
        const { data: startup } = await supabase
          .from("startups")
          .select("id")
          .eq("founder_id", founderId)
          .maybeSingle();
        startupId = startup?.id;
      }

      const { data: newProject, error } = await supabase
        .from("startup_projects")
        .insert({
          founder_id: founderId,
          startup_id: startupId || null,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          stage: data.stage,
          status: data.status || "active",
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, project: newProject as StartupProjectRecord };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create project.";
      return { success: false, error: msg };
    }
  },

  /**
   * Fetch complete enriched project with milestones, tasks, feedback, and progress
   */
  async getProject(
    projectId: string,
    userId: string
  ): Promise<{ project: EnrichedProject | null; error?: string }> {
    const access = await canUserAccessProject(projectId, userId);
    if (!access.allowed) {
      return { project: null, error: "Unauthorized access to this project." };
    }

    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    try {
      // 1. Fetch project
      const { data: project, error: pError } = await supabase
        .from("startup_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (pError || !project) {
        return { project: null, error: "Project not found." };
      }

      // 2. Fetch milestones
      const { data: rawMilestones } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });

      const milestoneIds = (rawMilestones || []).map((m) => m.id);

      // 3. Fetch tasks for these milestones
      let allTasks: ProjectTaskRecord[] = [];
      if (milestoneIds.length > 0) {
        const { data: tasks } = await supabase
          .from("project_tasks")
          .select(`
            *,
            assigned_profile:assigned_to (
              id,
              full_name,
              email,
              avatar_url
            )
          `)
          .in("milestone_id", milestoneIds)
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true });

        allTasks = (tasks || []) as ProjectTaskRecord[];
      }

      // 4. Fetch feedback for these milestones
      let allFeedback: MilestoneFeedbackRecord[] = [];
      if (milestoneIds.length > 0) {
        const { data: feedback } = await supabase
          .from("milestone_feedback")
          .select(`
            *,
            author:author_id (
              id,
              full_name,
              avatar_url,
              role
            )
          `)
          .in("milestone_id", milestoneIds)
          .order("created_at", { ascending: true });

        allFeedback = (feedback || []) as MilestoneFeedbackRecord[];
      }

      // 5. Structure enriched milestones
      let totalTasksCount = 0;
      let completedTasksCount = 0;

      const enrichedMilestones: EnrichedMilestone[] = (rawMilestones || []).map((m) => {
        const mTasks = allTasks.filter((t) => t.milestone_id === m.id);
        const mFeedback = allFeedback.filter((f) => f.milestone_id === m.id);

        const mCompletedTasks = mTasks.filter((t) => t.status === "completed").length;
        totalTasksCount += mTasks.length;
        completedTasksCount += mCompletedTasks;

        const progressPercent =
          m.status === "completed"
            ? 100
            : mTasks.length > 0
            ? Math.round((mCompletedTasks / mTasks.length) * 100)
            : m.status === "in_progress"
            ? 50
            : 0;

        return {
          ...m,
          tasks: mTasks,
          feedback: mFeedback,
          progressPercent,
        };
      });

      const totalMilestonesCount = enrichedMilestones.length;
      const completedMilestonesCount = enrichedMilestones.filter(
        (m) => m.status === "completed"
      ).length;

      const overallProgressPercent =
        totalMilestonesCount > 0
          ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100)
          : 0;

      const progress: ProjectProgress = {
        projectId: project.id,
        projectName: project.name,
        stage: project.stage as StartupStage,
        status: project.status,
        totalMilestones: totalMilestonesCount,
        completedMilestones: completedMilestonesCount,
        totalTasks: totalTasksCount,
        completedTasks: completedTasksCount,
        overallProgressPercent,
      };

      return {
        project: {
          ...project,
          milestones: enrichedMilestones,
          progress,
        } as EnrichedProject,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load project.";
      return { project: null, error: msg };
    }
  },

  /**
   * Fetch milestones for a project
   */
  async getMilestones(projectId: string, userId: string): Promise<ProjectMilestoneRecord[]> {
    const access = await canUserAccessProject(projectId, userId);
    if (!access.allowed) return [];

    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    return (data || []) as ProjectMilestoneRecord[];
  },

  /**
   * Create milestone (Founders only)
   */
  async createMilestone(
    userId: string,
    data: CreateMilestoneInput
  ): Promise<{ success: boolean; milestone?: ProjectMilestoneRecord; error?: string }> {
    const access = await canUserAccessProject(data.project_id, userId);
    if (!access.allowed || !access.isFounder) {
      return { success: false, error: "Only the startup founder can create milestones." };
    }

    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    try {
      const { data: newMilestone, error } = await supabase
        .from("project_milestones")
        .insert({
          project_id: data.project_id,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          due_date: data.due_date || null,
          status: data.status || "not_started",
          order_index: data.order_index ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, milestone: newMilestone as ProjectMilestoneRecord };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create milestone.";
      return { success: false, error: msg };
    }
  },

  /**
   * Update milestone (Founders only)
   */
  async updateMilestone(
    milestoneId: string,
    userId: string,
    data: UpdateMilestoneInput
  ): Promise<{ success: boolean; error?: string }> {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data: milestone } = await supabase
      .from("project_milestones")
      .select("project_id")
      .eq("id", milestoneId)
      .single();

    if (!milestone) return { success: false, error: "Milestone not found." };

    const access = await canUserAccessProject(milestone.project_id, userId);
    if (!access.allowed || !access.isFounder) {
      return { success: false, error: "Only the startup founder can update milestones." };
    }

    try {
      const { error } = await supabase
        .from("project_milestones")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", milestoneId);

      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update milestone.";
      return { success: false, error: msg };
    }
  },

  /**
   * Fetch tasks for a milestone
   */
  async getTasks(milestoneId: string, userId: string): Promise<ProjectTaskRecord[]> {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data: milestone } = await supabase
      .from("project_milestones")
      .select("project_id")
      .eq("id", milestoneId)
      .single();

    if (!milestone) return [];

    const access = await canUserAccessProject(milestone.project_id, userId);
    if (!access.allowed) return [];

    const { data } = await supabase
      .from("project_tasks")
      .select(`
        *,
        assigned_profile:assigned_to (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("milestone_id", milestoneId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    return (data || []) as ProjectTaskRecord[];
  },

  /**
   * Create task (Founders or active board mentors)
   */
  async createTask(
    userId: string,
    data: CreateTaskInput
  ): Promise<{ success: boolean; task?: ProjectTaskRecord; error?: string }> {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data: milestone } = await supabase
      .from("project_milestones")
      .select("project_id")
      .eq("id", data.milestone_id)
      .single();

    if (!milestone) return { success: false, error: "Milestone not found." };

    const access = await canUserAccessProject(milestone.project_id, userId);
    if (!access.allowed) {
      return { success: false, error: "Unauthorized: only authorized board members can create tasks." };
    }

    try {
      const { data: newTask, error } = await supabase
        .from("project_tasks")
        .insert({
          milestone_id: data.milestone_id,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          status: data.status || "not_started",
          priority: data.priority || "medium",
          assigned_to: data.assigned_to || null,
          due_date: data.due_date || null,
          order_index: data.order_index ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, task: newTask as ProjectTaskRecord };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create task.";
      return { success: false, error: msg };
    }
  },

  /**
   * Update task (Founders or assigned mentors)
   */
  async updateTask(
    taskId: string,
    userId: string,
    data: UpdateTaskInput
  ): Promise<{ success: boolean; error?: string }> {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data: task } = await supabase
      .from("project_tasks")
      .select("milestone_id, assigned_to")
      .eq("id", taskId)
      .single();

    if (!task) return { success: false, error: "Task not found." };

    const { data: milestone } = await supabase
      .from("project_milestones")
      .select("project_id")
      .eq("id", task.milestone_id)
      .single();

    if (!milestone) return { success: false, error: "Milestone not found." };

    const access = await canUserAccessProject(milestone.project_id, userId);
    if (!access.allowed) {
      return { success: false, error: "Unauthorized access to update this task." };
    }

    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update task.";
      return { success: false, error: msg };
    }
  },

  /**
   * Calculate project progress metrics
   */
  async getProjectProgress(
    projectId: string,
    userId: string
  ): Promise<{ progress: ProjectProgress | null; error?: string }> {
    const projectRes = await this.getProject(projectId, userId);
    if (projectRes.error || !projectRes.project) {
      return { progress: null, error: projectRes.error || "Project not found." };
    }

    return { progress: projectRes.project.progress };
  },

  /**
   * Fetch feedback for a milestone
   */
  async getFeedback(milestoneId: string, userId: string): Promise<MilestoneFeedbackRecord[]> {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data: milestone } = await supabase
      .from("project_milestones")
      .select("project_id")
      .eq("id", milestoneId)
      .single();

    if (!milestone) return [];

    const access = await canUserAccessProject(milestone.project_id, userId);
    if (!access.allowed) return [];

    const { data } = await supabase
      .from("milestone_feedback")
      .select(`
        *,
        author:author_id (
          id,
          full_name,
          avatar_url,
          role
        )
      `)
      .eq("milestone_id", milestoneId)
      .order("created_at", { ascending: true });

    return (data || []) as MilestoneFeedbackRecord[];
  },

  /**
   * Submit mentor feedback on a milestone
   */
  async createFeedback(
    userId: string,
    data: CreateFeedbackInput
  ): Promise<{ success: boolean; feedback?: MilestoneFeedbackRecord; error?: string }> {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data: milestone } = await supabase
      .from("project_milestones")
      .select("project_id")
      .eq("id", data.milestone_id)
      .single();

    if (!milestone) return { success: false, error: "Milestone not found." };

    const access = await canUserAccessProject(milestone.project_id, userId);
    if (!access.allowed) {
      return { success: false, error: "Unauthorized: only authorized board members can submit feedback." };
    }

    try {
      const { data: newFeedback, error } = await supabase
        .from("milestone_feedback")
        .insert({
          milestone_id: data.milestone_id,
          author_id: userId,
          content: data.content.trim(),
          feedback_type: data.feedback_type || "general",
        })
        .select(`
          *,
          author:author_id (
            id,
            full_name,
            avatar_url,
            role
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, feedback: newFeedback as MilestoneFeedbackRecord };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit feedback.";
      return { success: false, error: msg };
    }
  },

  /**
   * Generate an AI roadmap using Gemini
   * Note: Founder approves before database insertion!
   */
  async generateRoadmap(params: {
    projectId?: string;
    startupName?: string;
    stage: StartupStage;
    description?: string;
    goals?: string;
  }): Promise<AIRoadmapResponse> {
    const stageTitles: Record<StartupStage, string> = {
      idea_validation: "Idea Validation & Problem-Solution Fit",
      business_planning: "Business Model & Financial Planning",
      product_development: "MVP Build & Technical Execution",
      launch_preparation: "Go-to-Market & Launch Readiness",
      business_launch: "Public Launch & Initial Customer Acquisition",
      growth_scaling: "Growth Acceleration & Scale Optimization",
    };

    const prompt = `You are a world-class venture partner and startup incubator director at BusinessBridge.
Generate a structured, actionable execution roadmap for a startup at the "${params.stage}" stage (${stageTitles[params.stage] || params.stage}).

Startup Context:
- Startup Name: ${params.startupName || "Startup Venture"}
- Stage: ${params.stage}
- Description: ${params.description || "Early stage entrepreneurial venture"}
- Strategic Goals: ${params.goals || "Validate market demand, execute milestones, and scale"}

Generate 3-4 strategic milestones. Each milestone must have 2-4 concrete, high-priority tasks.
Respond ONLY with a valid JSON object matching this schema:
{
  "overview": "Summary of strategic focus for this stage",
  "milestones": [
    {
      "title": "Milestone title",
      "description": "Clear explanation of what needs to be achieved",
      "estimated_weeks": 2,
      "suggested_tasks": [
        {
          "title": "Task title",
          "description": "Actionable task instructions",
          "priority": "high" // must be "high", "medium", or "low"
        }
      ]
    }
  ]
}`;

    try {
      const geminiRes = await generateGeminiContent(prompt);
      if (geminiRes) {
        const parsed = JSON.parse(geminiRes);
        if (Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
          return {
            projectId: params.projectId,
            startupName: params.startupName,
            stage: params.stage,
            overview: parsed.overview || `Tailored execution roadmap for ${params.stage}`,
            milestones: parsed.milestones.map((m: any) => ({
              title: String(m.title || "Strategic Milestone"),
              description: String(m.description || ""),
              estimated_weeks: Number(m.estimated_weeks) || 2,
              suggested_tasks: Array.isArray(m.suggested_tasks)
                ? m.suggested_tasks.map((t: any) => ({
                    title: String(t.title || "Action Item"),
                    description: t.description ? String(t.description) : undefined,
                    priority: (["low", "medium", "high"].includes(t.priority) ? t.priority : "medium") as any,
                  }))
                : [],
            })),
            is_ai_generated: true,
          };
        }
      }
    } catch (err) {
      console.warn("[JourneyTracker] Gemini generation failed, using deterministic fallback:", err);
    }

    // Deterministic fallback roadmap based on stage
    return getFallbackRoadmap(params.stage, params.startupName, params.projectId);
  },
};

/**
 * Deterministic Fallback Roadmap Generator for when Gemini is unavailable
 */
function getFallbackRoadmap(stage: StartupStage, startupName?: string, projectId?: string): AIRoadmapResponse {
  const fallbacks: Record<StartupStage, { overview: string; milestones: any[] }> = {
    idea_validation: {
      overview: "Focus on problem validation, customer discovery interviews, and competitive moat definition.",
      milestones: [
        {
          title: "Customer Discovery & Problem Interviews",
          description: "Conduct 15-20 qualitative interviews with target decision-makers to validate acute pain points.",
          estimated_weeks: 2,
          suggested_tasks: [
            { title: "Define ideal customer profile (ICP)", description: "Document demographics, budget authority, and pain criteria", priority: "high" },
            { title: "Draft structured interview questionnaire", description: "Design non-leading open questions focused on current workflow", priority: "high" },
            { title: "Conduct customer discovery calls", description: "Interview at least 15 target users and record transcript notes", priority: "medium" },
          ],
        },
        {
          title: "Value Proposition & Concept Testing",
          description: "Test market willingness to pay and validate solution messaging with prototype landing page.",
          estimated_weeks: 2,
          suggested_tasks: [
            { title: "Build smoke-test landing page", description: "Setup headline, key benefits, and waitlist email capture", priority: "high" },
            { title: "Measure conversion & user feedback", description: "Analyze signup rate and interview waitlist respondents", priority: "medium" },
          ],
        },
      ],
    },
    business_planning: {
      overview: "Formulate unit economics, pricing models, legal structure, and advisory board charter.",
      milestones: [
        {
          title: "Financial Model & Unit Economics",
          description: "Establish CAC, LTV, pricing tiers, and 18-month burn rate projections.",
          estimated_weeks: 3,
          suggested_tasks: [
            { title: "Build 3-year bottom-up revenue model", description: "Model customer cohorts and subscription retention", priority: "high" },
            { title: "Finalize pricing strategy with mentors", description: "Review tiering structure with advisory board finance lead", priority: "high" },
          ],
        },
      ],
    },
    product_development: {
      overview: "Scope core MVP features, design clickable prototypes, and execute sprint-based engineering.",
      milestones: [
        {
          title: "Core MVP Specification & Architecture",
          description: "Define minimal feature set required to deliver core value to initial users.",
          estimated_weeks: 4,
          suggested_tasks: [
            { title: "Write PRD & user story map", description: "Document must-have vs nice-to-have features", priority: "high" },
            { title: "Complete UI/UX wireframes", description: "Design high-fidelity user workflows in Figma", priority: "medium" },
            { title: "Setup core production database schema", description: "Deploy initial Supabase tables with RLS", priority: "high" },
          ],
        },
      ],
    },
    launch_preparation: {
      overview: "Establish marketing channels, beta onboarding, telemetry, and launch day checklist.",
      milestones: [
        {
          title: "Beta Testing & Cohort Onboarding",
          description: "Onboard initial 10 pilot customers and eliminate critical usability friction.",
          estimated_weeks: 3,
          suggested_tasks: [
            { title: "Deploy beta environment with monitoring", description: "Verify error tracking and telemetry", priority: "high" },
            { title: "Gather qualitative feedback from pilot cohort", description: "Resolve top 3 blocking user UX bottlenecks", priority: "high" },
          ],
        },
      ],
    },
    business_launch: {
      overview: "Execute multi-channel launch, activate PR/ProductHunt, and monitor server capacity.",
      milestones: [
        {
          title: "Public Launch Execution",
          description: "Drive public launch across tech communities and initiate outbound pipeline.",
          estimated_weeks: 2,
          suggested_tasks: [
            { title: "Launch on ProductHunt & tech forums", description: "Coordinate community support and founder AMA", priority: "high" },
            { title: "Track first-week activation metrics", description: "Analyze user signup-to-activation conversion rate", priority: "high" },
          ],
        },
      ],
    },
    growth_scaling: {
      overview: "Optimize conversion funnels, expand distribution channels, and scale team capacity.",
      milestones: [
        {
          title: "Growth Channel Optimization",
          description: "Identify and scale the primary customer acquisition channel with positive payback period.",
          estimated_weeks: 4,
          suggested_tasks: [
            { title: "Run A/B tests on conversion funnels", description: "Optimize onboarding drop-off points", priority: "high" },
            { title: "Present quarterly growth review to advisory board", description: "Convene virtual boardroom for strategic scaling advice", priority: "medium" },
          ],
        },
      ],
    },
  };

  const selected = fallbacks[stage] || fallbacks.idea_validation;
  return {
    projectId,
    startupName: startupName || "Startup Venture",
    stage,
    overview: selected.overview,
    milestones: selected.milestones,
    is_ai_generated: false,
  };
}
