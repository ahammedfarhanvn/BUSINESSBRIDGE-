import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  generateJSON,
  isGeminiConfigured,
  getGeminiModel,
} from "@/lib/gemini";
import { CopilotQueryInput, CopilotResponse } from "@/types/ai";
import {
  StartupProjectRecord,
  ProjectMilestoneRecord,
  ProjectTaskRecord,
  MilestoneFeedbackRecord,
} from "@/types/journey-tracker";
import { Startup } from "@/types/startup";
import { FounderProfile } from "@/types/founder";

interface CopilotStructuredOutput {
  answer: string;
  key_takeaways: string[];
  referenced_milestones?: string[];
  referenced_tasks?: string[];
  referenced_feedback?: string[];
  suggested_actions?: string[];
}

/**
 * Resolves a Supabase client.
 * Uses createAdminClient if service role key is present; otherwise falls back to createClient.
 */
async function getSupabaseClient() {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

/**
 * Generates an intelligent, deterministic contextual response when Gemini is not configured
 * or when the API call fails or times out. Incorporates actual database context.
 */
function generateDeterministicFallback(params: {
  question: string;
  founderName: string;
  startupName: string;
  industry: string;
  stage: string;
  project: StartupProjectRecord | null;
  milestones: ProjectMilestoneRecord[];
  tasks: ProjectTaskRecord[];
  feedback: MilestoneFeedbackRecord[];
}): CopilotResponse {
  const {
    question,
    founderName,
    startupName,
    industry,
    stage,
    project,
    milestones,
    tasks,
    feedback,
  } = params;

  const todayStr = new Date().toISOString().split("T")[0];

  // Milestone metrics
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === "completed");
  const inProgressMilestones = milestones.filter((m) => m.status === "in_progress");
  const notStartedMilestones = milestones.filter((m) => m.status === "not_started");
  const progressPercent =
    totalMilestones > 0
      ? Math.round((completedMilestones.length / totalMilestones) * 100)
      : 0;

  // Task metrics
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const overdueTasks = pendingTasks.filter(
    (t) => t.due_date && t.due_date < todayStr
  );
  const criticalTasks = pendingTasks.filter(
    (t) => t.priority === "critical" || t.priority === "high"
  );

  // Referenced milestones & tasks
  const referencedMilestones: string[] = [];
  const referencedTasks: string[] = [];
  const referencedFeedback: string[] = [];
  const suggestedActions: string[] = [];

  // Determine current focus milestone
  const currentMilestone =
    inProgressMilestones[0] || notStartedMilestones[0] || milestones[0] || null;

  if (currentMilestone) {
    referencedMilestones.push(currentMilestone.title);
  }
  if (inProgressMilestones.length > 1) {
    referencedMilestones.push(inProgressMilestones[1].title);
  }

  // Populate referenced tasks
  if (overdueTasks.length > 0) {
    overdueTasks.slice(0, 2).forEach((t) => referencedTasks.push(t.title));
  } else if (criticalTasks.length > 0) {
    criticalTasks.slice(0, 2).forEach((t) => referencedTasks.push(t.title));
  } else if (pendingTasks.length > 0) {
    pendingTasks.slice(0, 2).forEach((t) => referencedTasks.push(t.title));
  }

  // Populate referenced feedback
  if (feedback.length > 0) {
    feedback.slice(0, 2).forEach((f) => {
      const authorName = f.author?.full_name || "Board Advisor";
      const snippet = f.content.length > 90 ? `${f.content.slice(0, 87)}...` : f.content;
      referencedFeedback.push(`[${authorName}] "${snippet}"`);
    });
  }

  // Question categorization heuristics
  const qLower = question.toLowerCase();
  const isAskingTasks =
    qLower.includes("task") ||
    qLower.includes("todo") ||
    qLower.includes("overdue") ||
    qLower.includes("priority") ||
    qLower.includes("action") ||
    qLower.includes("block");
  const isAskingMilestones =
    qLower.includes("milestone") ||
    qLower.includes("stage") ||
    qLower.includes("roadmap") ||
    qLower.includes("launch") ||
    qLower.includes("progress") ||
    qLower.includes("schedule");
  const isAskingMentors =
    qLower.includes("mentor") ||
    qLower.includes("board") ||
    qLower.includes("feedback") ||
    qLower.includes("advisor") ||
    qLower.includes("recommend");

  let answer = "";
  const keyTakeaways: string[] = [];

  if (!project) {
    // Founder has no active project registered yet
    answer = `Hello ${founderName}. As your BusinessBridge Executive Copilot, I am ready to advise you on growing **${startupName}** in the **${industry}** sector.\n\n` +
      `Currently, you do not have an active project initialized in the **Business Journey Tracker**. Setting up structured milestones is the foundation for effective execution and meaningful advisory board alignment.\n\n` +
      `### Strategic Recommendations:\n` +
      `1. **Create an Execution Project**: Go to the Journey Tracker and initialize a project representing your current venture stage (${stage.replace(/_/g, " ")}).\n` +
      `2. **Define 3-4 Key Milestones**: Break down your current objectives into measurable milestones (such as Customer Discovery, MVP Readiness, or Go-To-Market).\n` +
      `3. **Engage Your Advisory Board**: Once milestones are defined, invite your mentors to review your targets and provide ongoing strategic feedback.`;

    keyTakeaways.push(
      "No active project detected in Journey Tracker; initialize one to unlock full contextual advisory.",
      `Current venture stage: ${stage.replace(/_/g, " ")}. Focus on structuring measurable execution milestones.`,
      "Align with your Advisory Board mentors once initial milestones and tasks are set."
    );

    suggestedActions.push(
      "Initialize your first project in the Business Journey Tracker",
      "Map out 3 core milestones for your upcoming operating quarter",
      "Connect with assigned mentors to review roadmap viability"
    );

    return {
      success: true,
      answer,
      key_takeaways: keyTakeaways,
      referenced_milestones: [],
      referenced_tasks: [],
      referenced_feedback: [],
      suggested_actions: suggestedActions,
    };
  }

  // Project exists
  if (isAskingTasks) {
    answer = `### Operational Task & Execution Review\n\n` +
      `Reviewing the operational workload for **${project.name}** at the **${stage.replace(/_/g, " ")}** stage:\n\n` +
      `- **Overall Task Completion**: ${completedTasks.length} of ${tasks.length} tasks completed (${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%).\n` +
      `- **Overdue Items**: ${overdueTasks.length > 0 ? `🚨 **${overdueTasks.length} task(s) overdue** requiring immediate founder intervention.` : "✅ No overdue tasks currently recorded."}\n` +
      `- **Critical Items**: ${criticalTasks.length} high/critical priority item(s) pending.\n\n`;

    if (overdueTasks.length > 0) {
      answer += `#### Urgent Attention Needed:\n` +
        overdueTasks.slice(0, 3).map((t) => `- **${t.title}** (Due: ${t.due_date || "Past due"}, Priority: ${t.priority})`).join("\n") +
        `\n\nI recommend resolving these immediate bottlenecks before taking on secondary deliverables.`;
    } else if (currentMilestone) {
      answer += `#### Immediate Focus Milestone: **${currentMilestone.title}**\n` +
        `Prioritize high-impact tasks assigned to this active milestone to maintain delivery momentum.`;
    }

    keyTakeaways.push(
      overdueTasks.length > 0
        ? `${overdueTasks.length} overdue task(s) must be cleared or rescheduled immediately.`
        : "Operational task velocity is on schedule with no overdue items.",
      `Current active milestone: "${currentMilestone?.title || "Operational Planning"}".`,
      `${criticalTasks.length} high/critical priority task(s) currently demand executive focus.`
    );

    if (overdueTasks.length > 0) {
      suggestedActions.push(`Resolve or unblock overdue task: "${overdueTasks[0].title}"`);
    }
    if (criticalTasks.length > 0) {
      suggestedActions.push(`Execute high-priority task: "${criticalTasks[0].title}"`);
    }
    suggestedActions.push(`Review workload allocation in milestone "${currentMilestone?.title || project.name}"`);
  } else if (isAskingMilestones) {
    answer = `### Strategic Milestone & Roadmap Review\n\n` +
      `Here is an executive assessment of **${project.name}**:\n\n` +
      `- **Milestone Progress**: ${completedMilestones.length} of ${totalMilestones} milestones completed (${progressPercent}% overall completion).\n` +
      `- **Current Milestone**: ${currentMilestone ? `**${currentMilestone.title}** (${currentMilestone.status.replace("_", " ")})` : "None active"}.\n` +
      `- **Stage Target**: ${stage.replace(/_/g, " ").toUpperCase()}.\n\n` +
      `To ensure you maintain execution velocity, ensure all tasks tied to **${currentMilestone?.title || "your active milestone"}** are actively assigned and scheduled.`;

    if (notStartedMilestones.length > 0) {
      answer += `\n\nUpcoming queued milestone: **${notStartedMilestones[0].title}**. Begin early stakeholder preparation now to avoid transition delays.`;
    }

    keyTakeaways.push(
      `Project progress is at ${progressPercent}% across ${totalMilestones} defined milestones.`,
      `Primary active milestone: "${currentMilestone?.title || "Initial Stage"}".`,
      overdueTasks.length > 0
        ? `Warning: ${overdueTasks.length} overdue task(s) threaten milestone delivery timeline.`
        : "Execution is running on target with no major timeline slippages."
    );

    suggestedActions.push(
      `Complete open deliverables for "${currentMilestone?.title || "active milestone"}"`,
      `Review target completion dates with your advisory board`,
      `Prepare launch criteria for next milestone "${notStartedMilestones[0]?.title || "next phase"}"`
    );
  } else if (isAskingMentors && feedback.length > 0) {
    answer = `### Advisory Board Feedback Synthesis\n\n` +
      `Your mentors have provided actionable advisory notes on your milestones. Here is the synthesized executive breakdown:\n\n`;

    feedback.slice(0, 3).forEach((f) => {
      const authorName = f.author?.full_name || "Board Advisor";
      const authorRole = f.author?.role ? ` (${f.author.role})` : "";
      answer += `- **${authorName}${authorRole}**: "${f.content}"\n`;
    });

    answer += `\n### Strategic Takeaway:\n` +
      `Incorporate these advisory notes directly into your task backlog for **${currentMilestone?.title || project.name}**. Mentors expect to see feedback translated into concrete action items.`;

    keyTakeaways.push(
      `Recent advisory board guidance emphasizes strategic execution and operational rigor.`,
      `Latest feedback from ${feedback[0]?.author?.full_name || "Mentors"}: "${feedback[0]?.content.slice(0, 80)}..."`,
      `Align upcoming tasks with mentor recommendations to maximize board engagement.`
    );

    suggestedActions.push(
      `Create actionable tasks addressing mentor feedback from ${feedback[0]?.author?.full_name || "advisors"}`,
      `Post an update note on milestone "${currentMilestone?.title || project.name}" for your mentors`,
      `Schedule next board check-in to review milestone progress`
    );
  } else {
    // General Executive Copilot Answer
    answer = `### Executive Advisory Overview\n\n` +
      `Hello ${founderName}. As your AI Business Copilot for **${startupName}** (${industry}), here is your strategic assessment regarding: *"${question}"*:\n\n` +
      `#### Current Venture Position:\n` +
      `- **Project**: ${project.name} (${stage.replace(/_/g, " ")})\n` +
      `- **Milestone Health**: ${completedMilestones.length}/${totalMilestones} completed (${progressPercent}% progress).\n` +
      `- **Operational Velocity**: ${completedTasks.length}/${tasks.length} tasks completed. ${overdueTasks.length > 0 ? `⚠️ **${overdueTasks.length} overdue tasks** require immediate founder attention.` : "Task pipeline is healthy."}\n\n` +
      `#### Strategic Guidance:\n` +
      (currentMilestone
        ? `Focus leadership capital on delivering **${currentMilestone.title}**. Avoid splitting founder attention across too many parallel initiatives at the ${stage.replace(/_/g, " ")} stage.\n\n`
        : `Define clear, measurable deliverables for this operating sprint.\n\n`);

    if (feedback.length > 0) {
      const topFeedback = feedback[0];
      answer += `#### Advisor Insight:\n` +
        `Your board mentor **${topFeedback.author?.full_name || "Advisor"}** recently advised: *"${topFeedback.content}"*. Ensure your team's immediate sprint directly addresses this perspective.\n\n`;
    }

    answer += `#### Next Tactical Steps:\n` +
      `1. Review any blocked or overdue items in your active sprint.\n` +
      `2. Validate that current milestone deliverables align directly with revenue generation or customer validation.\n` +
      `3. Keep your advisory board updated as milestones transition to completed status.`;

    keyTakeaways.push(
      `Current project "${project.name}" stands at ${progressPercent}% milestone completion.`,
      overdueTasks.length > 0
        ? `Immediate operational priority: unblock ${overdueTasks.length} overdue task(s).`
        : `Focus team velocity on completing active milestone: "${currentMilestone?.title || "Current Phase"}".`,
      feedback.length > 0
        ? `Active mentor advice from ${feedback[0]?.author?.full_name || "Board"} should be prioritized.`
        : "Continue driving milestones toward stage-gate completion."
    );

    suggestedActions.push(
      overdueTasks.length > 0
        ? `Clear overdue task: "${overdueTasks[0].title}"`
        : `Advance deliverables for milestone "${currentMilestone?.title || project.name}"`,
      `Update advisory board on progress for stage: ${stage.replace(/_/g, " ")}`,
      `Review next upcoming tasks for resource or dependency blockers`
    );
  }

  return {
    success: true,
    answer,
    key_takeaways: keyTakeaways.slice(0, 4),
    referenced_milestones: referencedMilestones.slice(0, 4),
    referenced_tasks: referencedTasks.slice(0, 4),
    referenced_feedback: referencedFeedback.slice(0, 3),
    suggested_actions: suggestedActions.slice(0, 4),
  };
}

/**
 * AI Business Copilot Service
 * Consults Gemini with structured context regarding a founder's startup,
 * projects, milestones, tasks, and mentor feedback.
 */
export async function askBusinessCopilot(
  founderUserId: string,
  input: CopilotQueryInput
): Promise<CopilotResponse> {
  // 1. Authenticate that founderUserId is valid
  if (!founderUserId || typeof founderUserId !== "string" || !founderUserId.trim()) {
    return {
      success: false,
      answer: "Authentication error: founder user ID is required.",
      key_takeaways: [],
      error: "Unauthorized: Invalid founder user ID",
    };
  }

  const cleanFounderId = founderUserId.trim();
  const cleanQuestion = input?.question?.trim();

  if (!cleanQuestion) {
    return {
      success: false,
      answer: "Please provide a valid question or topic for the Business Copilot.",
      key_takeaways: [],
      error: "Question is required and must not be empty.",
    };
  }

  const supabase = await getSupabaseClient();

  try {
    // 2. Fetch founder profile info
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", cleanFounderId)
      .maybeSingle();

    const founderName = profile?.full_name || "Founder";

    // Fetch founder_profiles
    const { data: founderProfileData } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", cleanFounderId)
      .maybeSingle();

    const founderProfile = (founderProfileData || null) as FounderProfile | null;

    // 3. Resolve founder's startup project context
    let project: StartupProjectRecord | null = null;

    if (input.projectId && input.projectId.trim()) {
      const cleanProjectId = input.projectId.trim();

      const { data: projData, error: projErr } = await supabase
        .from("startup_projects")
        .select("*")
        .eq("id", cleanProjectId)
        .maybeSingle();

      if (projErr || !projData) {
        return {
          success: false,
          answer: "The requested project could not be found.",
          key_takeaways: [],
          error: "Project not found",
        };
      }

      // Security check: verify project belongs to the requesting founder
      if (projData.founder_id !== cleanFounderId) {
        return {
          success: false,
          answer: "Access denied: You do not have permission to access this project.",
          key_takeaways: [],
          error: "Forbidden: Access denied to project",
        };
      }

      project = projData as StartupProjectRecord;
    } else {
      // Fetch founder's active startup_projects (order by updated_at desc limit 1)
      const { data: activeProjects } = await supabase
        .from("startup_projects")
        .select("*")
        .eq("founder_id", cleanFounderId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (activeProjects && activeProjects.length > 0) {
        project = activeProjects[0] as StartupProjectRecord;
      } else {
        // Fallback: any latest project for this founder
        const { data: anyProjects } = await supabase
          .from("startup_projects")
          .select("*")
          .eq("founder_id", cleanFounderId)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (anyProjects && anyProjects.length > 0) {
          project = anyProjects[0] as StartupProjectRecord;
        }
      }
    }

    // 4. Fetch startup details from startups table
    let startup: Startup | null = null;
    if (project?.startup_id) {
      const { data: sData } = await supabase
        .from("startups")
        .select("*")
        .eq("id", project.startup_id)
        .maybeSingle();
      if (sData) startup = sData as Startup;
    }

    if (!startup) {
      const { data: sData } = await supabase
        .from("startups")
        .select("*")
        .eq("founder_id", cleanFounderId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sData) startup = sData as Startup;
    }

    // 5. Fetch project milestones, tasks, and mentor feedback
    let milestones: ProjectMilestoneRecord[] = [];
    let tasks: ProjectTaskRecord[] = [];
    let feedback: MilestoneFeedbackRecord[] = [];

    if (project) {
      const { data: mData } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", project.id)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });

      milestones = (mData || []) as ProjectMilestoneRecord[];
      const milestoneIds = milestones.map((m) => m.id);

      if (milestoneIds.length > 0) {
        // Fetch tasks
        const { data: tData } = await supabase
          .from("project_tasks")
          .select(`
            *,
            assigned_profile:assigned_to (
              id,
              full_name,
              email
            )
          `)
          .in("milestone_id", milestoneIds)
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true });

        tasks = (tData || []) as ProjectTaskRecord[];

        // Fetch mentor feedback joined with profiles
        const { data: fData } = await supabase
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
          .order("created_at", { ascending: false });

        feedback = (fData || []) as MilestoneFeedbackRecord[];
      }
    }

    // Context attributes
    const startupName =
      startup?.name ||
      founderProfile?.startup_name ||
      project?.name ||
      "My Startup";
    const industry =
      startup?.industry ||
      founderProfile?.industry ||
      "General Business & Technology";
    const stage =
      project?.stage ||
      startup?.business_stage ||
      founderProfile?.business_stage ||
      "idea_validation";
    const description =
      project?.description ||
      startup?.description ||
      founderProfile?.business_description ||
      "Innovative business venture.";
    const businessGoals =
      founderProfile?.business_goals ||
      "Build market traction, hit execution milestones, and expand sustainably.";
    const experienceLevel =
      founderProfile?.experience_level || "First-time Entrepreneur";

    // 6. Check if Gemini AI is configured
    if (!isGeminiConfigured()) {
      console.warn(
        "[GeminiCopilot] GEMINI_API_KEY is not configured. Utilizing deterministic contextual copilot engine."
      );
      return generateDeterministicFallback({
        question: cleanQuestion,
        founderName,
        startupName,
        industry,
        stage,
        project,
        milestones,
        tasks,
        feedback,
      });
    }

    // 7. Compact context representation to prevent token overflow
    const todayStr = new Date().toISOString().split("T")[0];

    // Compact Milestones (limit to 8)
    const milestoneSummary = milestones.slice(0, 8).map((m) => {
      const mTasks = tasks.filter((t) => t.milestone_id === m.id);
      const mCompleted = mTasks.filter((t) => t.status === "completed").length;
      return `- Milestone: "${m.title}" | Status: ${m.status} | Due: ${m.due_date || "None"} | Tasks: ${mCompleted}/${mTasks.length} completed`;
    }).join("\n");

    // Compact Overdue & Critical Tasks (limit to 10)
    const overdueTasks = tasks.filter(
      (t) => t.status !== "completed" && t.due_date && t.due_date < todayStr
    );
    const criticalTasks = tasks.filter(
      (t) =>
        t.status !== "completed" &&
        (t.priority === "critical" || t.priority === "high") &&
        (!t.due_date || t.due_date >= todayStr)
    );
    const inProgressTasks = tasks.filter(
      (t) =>
        t.status === "in_progress" &&
        t.priority !== "critical" &&
        t.priority !== "high" &&
        (!t.due_date || t.due_date >= todayStr)
    );

    const taskItems = [
      ...overdueTasks.map((t) => `- [OVERDUE] "${t.title}" (Priority: ${t.priority}, Due: ${t.due_date})`),
      ...criticalTasks.slice(0, 5).map((t) => `- [HIGH/CRITICAL] "${t.title}" (Status: ${t.status}, Due: ${t.due_date || "Unscheduled"})`),
      ...inProgressTasks.slice(0, 3).map((t) => `- [IN PROGRESS] "${t.title}" (Priority: ${t.priority})`),
    ].slice(0, 10);

    const tasksSummary = taskItems.length > 0 ? taskItems.join("\n") : "No overdue or high-priority pending tasks.";

    // Compact Mentor Feedback (limit to 6 recent items)
    const feedbackSummary = feedback.slice(0, 6).map((f) => {
      const authorName = f.author?.full_name || "Board Advisor";
      const authorRole = f.author?.role || "Mentor";
      const snippet = f.content.length > 160 ? `${f.content.slice(0, 157)}...` : f.content;
      return `- Mentor ${authorName} (${authorRole}): "${snippet}"`;
    }).join("\n");

    // Conversation History (limit to 6 recent messages)
    const recentHistory = (input.conversationHistory || [])
      .filter((m) => m && typeof m.content === "string" && m.content.trim())
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Founder" : "Copilot"}: ${m.content.trim()}`)
      .join("\n");

    // 8. Construct System Instruction & Prompt
    const systemInstruction = `You are the BusinessBridge AI Executive Business Copilot - an elite venture strategist, veteran startup operator, and executive advisor.
Your mission is to provide high-impact, practical, and contextual counsel to early-stage and growth founders.

Core Guidelines:
1. Ground your advice directly in the founder's live venture context, milestone progress, task backlog, and mentor feedback.
2. Directly reference specific milestones by their exact titles and tasks by their exact titles when relevant to the advice.
3. Proactively call out critical operational risks (e.g., overdue tasks, bottlenecked milestones, unaddressed mentor advice) with constructive solutions.
4. Maintain a supportive, highly strategic, yet execution-oriented tone.
5. Provide actionable takeaways and concrete next steps.
6. Strictly avoid referencing any fictional or external user data.

Output Format:
You MUST respond with a valid JSON object matching this schema:
{
  "answer": "Detailed, practical, executive-level advice formatted cleanly in markdown with clear headings/bullet points.",
  "key_takeaways": ["2 to 4 high-level strategic takeaways"],
  "referenced_milestones": ["Milestone Title 1", ...],
  "referenced_tasks": ["Task Title 1", ...],
  "referenced_feedback": ["Mentor feedback point considered", ...],
  "suggested_actions": ["2 to 4 concrete, prioritized next steps for the founder"]
}`;

    const prompt = `VENTURE CONTEXT:
- Founder: ${founderName} (Experience: ${experienceLevel})
- Startup: ${startupName} (Industry: ${industry})
- Venture Stage: ${stage}
- Venture Description: ${description}
- Strategic Goals: ${businessGoals}

PROJECT & MILESTONES:
- Project Name: ${project?.name || "Active Project"} (Status: ${project?.status || "active"})
- Total Milestones: ${milestones.length}
${milestoneSummary || "No milestones recorded yet."}

OPERATIONAL TASKS & BOTTLENECKS:
- Total Tasks: ${tasks.length} (Completed: ${tasks.filter((t) => t.status === "completed").length})
${tasksSummary}

ADVISORY BOARD & MENTOR FEEDBACK:
${feedbackSummary || "No mentor feedback recorded yet."}

${recentHistory ? `CONVERSATION HISTORY:\n${recentHistory}\n` : ""}
FOUNDER'S INQUIRY:
"${cleanQuestion}"

Provide your structured executive advisory response now. Return ONLY the requested JSON object.`;

    try {
      const geminiResult = await generateJSON<CopilotStructuredOutput>(prompt, {
        systemInstruction,
        temperature: 0.3,
        model: getGeminiModel(),
      });

      if (geminiResult && typeof geminiResult.answer === "string" && geminiResult.answer.trim()) {
        return {
          success: true,
          answer: geminiResult.answer.trim(),
          key_takeaways: Array.isArray(geminiResult.key_takeaways)
            ? geminiResult.key_takeaways.map((s) => String(s)).slice(0, 4)
            : [],
          referenced_milestones: Array.isArray(geminiResult.referenced_milestones)
            ? geminiResult.referenced_milestones.map((s) => String(s))
            : [],
          referenced_tasks: Array.isArray(geminiResult.referenced_tasks)
            ? geminiResult.referenced_tasks.map((s) => String(s))
            : [],
          referenced_feedback: Array.isArray(geminiResult.referenced_feedback)
            ? geminiResult.referenced_feedback.map((s) => String(s))
            : [],
          suggested_actions: Array.isArray(geminiResult.suggested_actions)
            ? geminiResult.suggested_actions.map((s) => String(s)).slice(0, 4)
            : [],
        };
      }
    } catch (aiError: any) {
      console.warn(
        `[GeminiCopilot] Gemini API call failed (${aiError?.message || "error"}). Seamlessly falling back to deterministic engine.`
      );
    }

    // Fallback if Gemini returned invalid format or failed
    return generateDeterministicFallback({
      question: cleanQuestion,
      founderName,
      startupName,
      industry,
      stage,
      project,
      milestones,
      tasks,
      feedback,
    });
  } catch (err: unknown) {
    console.error("[GeminiCopilot] Unexpected error in askBusinessCopilot:", err);
    const msg = err instanceof Error ? err.message : "Internal service error occurred.";
    return {
      success: false,
      answer: "An error occurred while analyzing your venture context. Please try again shortly.",
      key_takeaways: [],
      error: msg,
    };
  }
}

export const GeminiCopilotService = {
  askBusinessCopilot,
};
