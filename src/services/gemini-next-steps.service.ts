import { createClient } from "@/lib/supabase/server";
import { generateJSON, isGeminiConfigured } from "@/lib/gemini";
import { NextStepsResponse, NextStepSuggestion } from "@/types/ai";
import {
  StartupProjectRecord,
  ProjectMilestoneRecord,
  ProjectTaskRecord,
  MilestoneFeedbackRecord,
} from "@/types/journey-tracker";

interface GeminiSuggestionPayload {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  milestone_id?: string | null;
  milestone_title?: string | null;
  explanation: string;
  estimated_impact: string;
}

interface GeminiNextStepsResult {
  suggestions: GeminiSuggestionPayload[];
}

/**
 * Deterministic suggestion generator used when Gemini AI is not configured or fails.
 * Produces 3-5 high-leverage, contextual recommendations directly from existing project state.
 */
function generateDeterministicNextSteps(
  project: StartupProjectRecord,
  milestones: ProjectMilestoneRecord[],
  tasks: ProjectTaskRecord[],
  feedback: MilestoneFeedbackRecord[]
): NextStepSuggestion[] {
  const suggestions: NextStepSuggestion[] = [];
  const now = new Date();

  // Milestone lookup map
  const milestoneMap = new Map<string, ProjectMilestoneRecord>();
  milestones.forEach((m) => milestoneMap.set(m.id, m));

  // 1. Identify overdue tasks
  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now && t.status !== "completed"
  );

  if (overdueTasks.length > 0) {
    const overdueTask = overdueTasks[0];
    const parentMilestone = milestoneMap.get(overdueTask.milestone_id);
    suggestions.push({
      id: `fallback-${crypto.randomUUID()}`,
      title: `Resolve Overdue Task: "${overdueTask.title}"`,
      description: overdueTask.description
        ? `Unblock and complete: ${overdueTask.description}`
        : `Focus immediate effort on completing "${overdueTask.title}" to prevent downstream project delays.`,
      priority: "critical",
      milestone_id: parentMilestone ? parentMilestone.id : null,
      milestone_title: parentMilestone ? parentMilestone.title : null,
      explanation: `This task was due on ${new Date(overdueTask.due_date!).toLocaleDateString()} and is currently blocking milestone progress.`,
      estimated_impact: "Recovers project velocity and realigns execution with target milestone dates.",
    });
  }

  // 2. Identify critical or high priority pending tasks
  const urgentPendingTasks = tasks.filter(
    (t) =>
      (t.priority === "critical" || t.priority === "high") &&
      t.status !== "completed" &&
      (!overdueTasks.length || t.id !== overdueTasks[0].id)
  );

  if (urgentPendingTasks.length > 0) {
    const urgentTask = urgentPendingTasks[0];
    const parentMilestone = milestoneMap.get(urgentTask.milestone_id);
    suggestions.push({
      id: `fallback-${crypto.randomUUID()}`,
      title: `Execute High-Priority Task: "${urgentTask.title}"`,
      description: urgentTask.description
        ? `Deliver on requirement: ${urgentTask.description}`
        : `Complete high-priority deliverable "${urgentTask.title}" to advance current milestone completion.`,
      priority: "high",
      milestone_id: parentMilestone ? parentMilestone.id : null,
      milestone_title: parentMilestone ? parentMilestone.title : null,
      explanation: `High-priority item flagged for milestone "${parentMilestone?.title || "Active Work"}".`,
      estimated_impact: "Ensures core deliverable standards are met before moving to subsequent phases.",
    });
  }

  // 3. Address recent mentor feedback if available
  if (feedback.length > 0) {
    const latestFeedback = feedback[0];
    const targetMilestone = milestoneMap.get(latestFeedback.milestone_id);
    const feedbackSnippet =
      latestFeedback.content.length > 80
        ? `${latestFeedback.content.substring(0, 77)}...`
        : latestFeedback.content;

    suggestions.push({
      id: `fallback-${crypto.randomUUID()}`,
      title: `Incorporate Advisor Feedback on "${targetMilestone?.title || "Milestone"}"`,
      description: `Review and implement mentor recommendation: "${feedbackSnippet}"`,
      priority: "high",
      milestone_id: targetMilestone ? targetMilestone.id : null,
      milestone_title: targetMilestone ? targetMilestone.title : null,
      explanation: "Direct guidance from advisory board members highlights areas needing attention.",
      estimated_impact: "Validates strategic direction and improves execution quality based on advisor expertise.",
    });
  }

  // 4. Incomplete milestone progression or milestone creation
  const activeMilestone =
    milestones.find((m) => m.status === "in_progress") ||
    milestones.find((m) => m.status !== "completed");

  if (activeMilestone) {
    const milestoneTasks = tasks.filter((t) => t.milestone_id === activeMilestone.id);
    const incompleteCount = milestoneTasks.filter((t) => t.status !== "completed").length;

    if (milestoneTasks.length === 0) {
      suggestions.push({
        id: `fallback-${crypto.randomUUID()}`,
        title: `Define Actionable Tasks for "${activeMilestone.title}"`,
        description: `Break down milestone "${activeMilestone.title}" into 3-5 concrete daily tasks with assigned priorities and due dates.`,
        priority: "high",
        milestone_id: activeMilestone.id,
        milestone_title: activeMilestone.title,
        explanation: `Milestone "${activeMilestone.title}" has no sub-tasks defined yet. Clear sub-tasks are necessary for tracking progress.`,
        estimated_impact: "Creates clear accountability and actionable execution steps for the team.",
      });
    } else if (suggestions.length < 3) {
      suggestions.push({
        id: `fallback-${crypto.randomUUID()}`,
        title: `Advance Active Milestone: "${activeMilestone.title}"`,
        description: `Complete the remaining ${incompleteCount} task(s) to finalize this milestone's deliverables.`,
        priority: "medium",
        milestone_id: activeMilestone.id,
        milestone_title: activeMilestone.title,
        explanation: `Current active milestone is in progress with ${incompleteCount} outstanding work item(s).`,
        estimated_impact: "Brings the startup closer to milestone completion and next stage validation.",
      });
    }
  } else if (milestones.length === 0) {
    suggestions.push({
      id: `fallback-${crypto.randomUUID()}`,
      title: `Establish Core Roadmap Milestones for ${project.name}`,
      description: "Define sequential milestones for validation, development, and launch preparation with target deadlines.",
      priority: "critical",
      milestone_id: null,
      milestone_title: null,
      explanation: "No roadmap milestones have been created yet. Clear milestones are required to track startup trajectory.",
      estimated_impact: "Provides the foundational roadmap structure for investor updates and team alignment.",
    });
  }

  // 5. Stage-specific cross-cutting recommendation
  const stageSpecificAction: Record<
    string,
    { title: string; description: string; priority: "critical" | "high" | "medium" | "low"; impact: string }
  > = {
    idea_validation: {
      title: "Conduct 5 Customer Problem Interviews",
      description: "Engage target users to validate problem urgency, current workarounds, and willingness to pay.",
      priority: "high",
      impact: "Prevents building features that users do not need or value.",
    },
    business_planning: {
      title: "Model Unit Economics & Pricing Tiers",
      description: "Map customer acquisition cost (CAC) assumptions against projected lifetime value (LTV).",
      priority: "high",
      impact: "Demonstrates business model viability to advisors and prospective investors.",
    },
    product_development: {
      title: "Conduct End-to-End User Flow Walkthrough",
      description: "Test the core onboarding and value proposition workflow to identify friction points and bugs.",
      priority: "medium",
      impact: "Ensures high product quality before external user onboarding.",
    },
    launch_preparation: {
      title: "Assemble Beta Launch Outreach List",
      description: "Compile and segment the initial 50 early-access prospects for direct launch outreach.",
      priority: "high",
      impact: "Guarantees day-one engagement and feedback upon product release.",
    },
    business_launch: {
      title: "Monitor First-Week Activation and Retention Funnel",
      description: "Track user signups, onboarding completions, and 48-hour retention metrics.",
      priority: "high",
      impact: "Quickly diagnoses drop-offs in early user onboarding.",
    },
    growth_scaling: {
      title: "Analyze Acquisition Channels by Conversion Efficiency",
      description: "Evaluate top user acquisition channels to double down on high-ROI channels.",
      priority: "medium",
      impact: "Optimizes marketing and sales spend efficiency.",
    },
  };

  const defaultStageAction = stageSpecificAction[project.stage] || {
    title: "Align Weekly Goals with Target Launch Date",
    description: "Review current team pacing against target launch deliverables and adjust timelines as needed.",
    priority: "medium",
    impact: "Maintains operational discipline and predictable delivery cadence.",
  };

  if (suggestions.length < 5) {
    suggestions.push({
      id: `fallback-${crypto.randomUUID()}`,
      title: defaultStageAction.title,
      description: defaultStageAction.description,
      priority: defaultStageAction.priority,
      milestone_id: null,
      milestone_title: null,
      explanation: `Recommended cross-cutting strategic focus for startups in the "${project.stage || "current"}" stage.`,
      estimated_impact: defaultStageAction.impact,
    });
  }

  return suggestions.slice(0, 5);
}

/**
 * Generates 3-5 concrete, high-leverage next-step recommendations for a founder.
 * Pulls real project data (goals, milestones, tasks, mentor feedback), consults Gemini AI,
 * validates milestone associations against actual database IDs, and provides a deterministic fallback.
 *
 * @param founderUserId - ID of the authenticated founder user
 * @param projectId - Optional specific project ID. If omitted, resolves founder's latest active project.
 */
export async function generateNextSteps(
  founderUserId: string,
  projectId?: string
): Promise<NextStepsResponse> {
  const supabase = await createClient();

  // 1. Resolve and authorize project
  let project: StartupProjectRecord | null = null;

  if (projectId && projectId.trim()) {
    const { data: foundProject, error: fetchError } = await supabase
      .from("startup_projects")
      .select("*")
      .eq("id", projectId.trim())
      .maybeSingle();

    if (fetchError) {
      console.error("[gemini-next-steps] Error fetching project by ID:", fetchError);
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!foundProject) {
      throw new Error("Project not found");
    }

    if (foundProject.founder_id !== founderUserId) {
      throw new Error("Forbidden: You do not have access to this project");
    }

    project = foundProject;
  } else {
    // Resolve founder's latest active project
    const { data: founderProjects, error: listError } = await supabase
      .from("startup_projects")
      .select("*")
      .eq("founder_id", founderUserId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (listError) {
      console.error("[gemini-next-steps] Error fetching founder projects:", listError);
      throw new Error(`Database error: ${listError.message}`);
    }

    if (!founderProjects || founderProjects.length === 0) {
      throw new Error("No startup project found for this founder. Please create a project first.");
    }

    project = founderProjects[0];
  }

  if (!project) {
    throw new Error("Project not found");
  }

  // 2. Fetch project milestones
  const { data: milestonesData, error: milestonesError } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (milestonesError) {
    console.error("[gemini-next-steps] Error fetching milestones:", milestonesError);
    throw new Error(`Database error: ${milestonesError.message}`);
  }

  const milestones: ProjectMilestoneRecord[] = milestonesData || [];
  const milestoneIds = milestones.map((m) => m.id);

  // 3. Fetch project tasks and mentor feedback
  let tasks: ProjectTaskRecord[] = [];
  let feedback: MilestoneFeedbackRecord[] = [];

  if (milestoneIds.length > 0) {
    const [tasksRes, feedbackRes] = await Promise.all([
      supabase
        .from("project_tasks")
        .select("*")
        .in("milestone_id", milestoneIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("milestone_feedback")
        .select("id, milestone_id, author_id, content, feedback_type, created_at")
        .in("milestone_id", milestoneIds)
        .order("created_at", { ascending: false }),
    ]);

    if (tasksRes.error) {
      console.warn("[gemini-next-steps] Warning fetching tasks:", tasksRes.error.message);
    } else if (tasksRes.data) {
      tasks = tasksRes.data;
    }

    if (feedbackRes.error) {
      console.warn("[gemini-next-steps] Warning fetching feedback:", feedbackRes.error.message);
    } else if (feedbackRes.data) {
      feedback = feedbackRes.data;
    }
  }

  // Map for milestone validation
  const milestoneMap = new Map<string, ProjectMilestoneRecord>();
  milestones.forEach((m) => milestoneMap.set(m.id, m));

  // 4. Check if Gemini AI is configured
  if (!isGeminiConfigured()) {
    console.info("[gemini-next-steps] Gemini AI not configured. Returning deterministic next steps.");
    const deterministicSuggestions = generateDeterministicNextSteps(
      project,
      milestones,
      tasks,
      feedback
    );
    return {
      success: true,
      project_id: project.id,
      suggestions: deterministicSuggestions,
    };
  }

  // 5. Build prompt for Gemini AI
  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now && t.status !== "completed"
  );
  const pendingTasks = tasks.filter((t) => t.status !== "completed");

  const milestonesSummary = milestones.map((m) => ({
    id: m.id,
    title: m.title,
    stage: m.stage || "N/A",
    status: m.status,
    priority: m.priority || "medium",
    due_date: m.due_date || "No deadline",
  }));

  const tasksSummary = pendingTasks.map((t) => {
    const m = milestoneMap.get(t.milestone_id);
    const isOverdue = t.due_date ? new Date(t.due_date) < now : false;
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date || "None",
      is_overdue: isOverdue,
      milestone_id: t.milestone_id,
      milestone_title: m?.title || "Unknown",
    };
  });

  const feedbackSummary = feedback.slice(0, 5).map((f) => {
    const m = milestoneMap.get(f.milestone_id);
    return {
      milestone_title: m?.title || "Unknown",
      feedback_type: f.feedback_type || "general",
      content: f.content,
      created_at: f.created_at,
    };
  });

  const prompt = `You are a world-class Startup Operations Advisor and Execution Strategist.
Analyze the current state of this startup project and formulate 3 to 5 concrete, high-leverage next action items for the founder to execute immediately.

=== STARTUP CONTEXT ===
Project Name: ${project.name}
Description: ${project.description || "None provided"}
Industry: ${project.industry || "General Tech"}
Current Stage: ${project.stage}
Core Startup Goal: ${project.goal || "None provided"}
Target Launch Date: ${project.target_launch_date || "Not set"}

=== EXISTING MILESTONES (${milestones.length}) ===
${JSON.stringify(milestonesSummary, null, 2)}

=== PENDING & OVERDUE TASKS (${pendingTasks.length} pending, ${overdueTasks.length} overdue) ===
${JSON.stringify(tasksSummary, null, 2)}

=== RECENT MENTOR & ADVISOR FEEDBACK (${feedback.length}) ===
${JSON.stringify(feedbackSummary, null, 2)}

=== INSTRUCTIONS ===
1. Formulate between 3 and 5 concrete, actionable, high-leverage next action items.
2. If an action directly supports an existing milestone, MUST use that milestone's exact "id" in "milestone_id" and its exact "title" in "milestone_title".
3. If an action is a cross-cutting strategic initiative (e.g. founder customer discovery, legal, KPI setup), set "milestone_id" to null and "milestone_title" to null.
4. CRITICAL SECURITY / INTEGRITY RULE: NEVER hallucinate or invent new UUIDs for milestone_id. It must either match one of the exact milestone IDs above or be null.
5. Prioritize resolving overdue tasks, unblocking delayed milestones, and addressing critical advisor feedback.
6. Provide a clear "explanation" of why this action is essential right now, and an "estimated_impact" detailing tangible business or execution impact.

Output strictly valid JSON with this exact schema:
{
  "suggestions": [
    {
      "title": "Action title (concise, verb-led)",
      "description": "Specific detail on what needs to be done and how",
      "priority": "critical" | "high" | "medium" | "low",
      "milestone_id": "Exact milestone UUID from above or null",
      "milestone_title": "Exact milestone title from above or null",
      "explanation": "Why this is critical right now",
      "estimated_impact": "Direct tangible business or project impact"
    }
  ]
}`;

  try {
    const aiResponse = await generateJSON<GeminiNextStepsResult>(prompt, {
      systemInstruction:
        "You are an expert startup advisor specializing in lean execution, sprint pacing, and founder task prioritization. Always output strict JSON.",
      temperature: 0.2,
      timeoutMs: 25000,
    });

    if (!aiResponse || !Array.isArray(aiResponse.suggestions) || aiResponse.suggestions.length === 0) {
      throw new Error("Gemini AI returned empty or invalid suggestions array.");
    }

    const validPriorities = new Set<"low" | "medium" | "high" | "critical">([
      "low",
      "medium",
      "high",
      "critical",
    ]);

    // Validate and sanitize suggestions
    const sanitizedSuggestions: NextStepSuggestion[] = aiResponse.suggestions
      .slice(0, 5)
      .map((item, idx) => {
        let milestoneId: string | null = null;
        let milestoneTitle: string | null = null;

        // Strict verification of milestone ID
        if (item.milestone_id && milestoneMap.has(item.milestone_id)) {
          const verified = milestoneMap.get(item.milestone_id)!;
          milestoneId = verified.id;
          milestoneTitle = verified.title;
        } else if (item.milestone_title) {
          // If Gemini returned matching title with altered or missing UUID
          const matchedByTitle = milestones.find(
            (m) => m.title.trim().toLowerCase() === item.milestone_title?.trim().toLowerCase()
          );
          if (matchedByTitle) {
            milestoneId = matchedByTitle.id;
            milestoneTitle = matchedByTitle.title;
          }
        }

        const priority = validPriorities.has(item.priority) ? item.priority : "medium";

        return {
          id: `step-${idx + 1}-${crypto.randomUUID()}`,
          title: item.title?.trim() || `Priority Action Item ${idx + 1}`,
          description: item.description?.trim() || "",
          priority,
          milestone_id: milestoneId,
          milestone_title: milestoneTitle,
          explanation:
            item.explanation?.trim() ||
            "Identified as a high-leverage immediate action based on your startup's current trajectory.",
          estimated_impact:
            item.estimated_impact?.trim() ||
            "Accelerates milestone completion and enhances execution quality.",
        };
      });

    return {
      success: true,
      project_id: project.id,
      suggestions: sanitizedSuggestions,
    };
  } catch (geminiError: unknown) {
    console.warn(
      "[gemini-next-steps] Gemini AI generation encountered an issue, falling back to deterministic suggestions:",
      geminiError instanceof Error ? geminiError.message : geminiError
    );

    const fallbackSuggestions = generateDeterministicNextSteps(
      project,
      milestones,
      tasks,
      feedback
    );

    return {
      success: true,
      project_id: project.id,
      suggestions: fallbackSuggestions,
    };
  }
}
