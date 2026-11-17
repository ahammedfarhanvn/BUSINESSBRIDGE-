import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateGeminiContent } from "@/lib/gemini";
import {
  BusinessInsightsResponse,
  BusinessRiskItem,
  NextStepsResponse,
  NextStepRecommendationItem,
} from "@/types/ai-intelligence";

export const AIInsightsService = {
  /**
   * Synthesize real business metrics, progress summary, and detect risks
   */
  async getBusinessInsights(
    founderId: string,
    projectId?: string
  ): Promise<BusinessInsightsResponse> {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    // 1. Fetch founder's startup and projects
    let projectQuery = supabase
      .from("startup_projects")
      .select("*")
      .eq("founder_id", founderId);

    if (projectId) {
      projectQuery = projectQuery.eq("id", projectId);
    }

    const { data: projects } = await projectQuery.order("created_at", { ascending: false });
    const primaryProject = (projects && projects.length > 0) ? projects[0] : null;

    // 2. Fetch milestones
    let milestones: any[] = [];
    if (primaryProject) {
      const { data: mData } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", primaryProject.id)
        .order("order_index", { ascending: true });
      milestones = mData || [];
    }

    const milestoneIds = milestones.map((m) => m.id);

    // 3. Fetch tasks
    let tasks: any[] = [];
    if (milestoneIds.length > 0) {
      const { data: tData } = await supabase
        .from("project_tasks")
        .select("*")
        .in("milestone_id", milestoneIds);
      tasks = tData || [];
    }

    // 4. Fetch board members count
    const { count: mentorCount } = await supabase
      .from("board_members")
      .select("id", { count: "exact", head: true })
      .eq("founder_id", founderId)
      .eq("membership_status", "active");

    // 5. Compute real operational metrics
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter((m) => m.status === "completed").length;
    const pendingMilestones = totalMilestones - completedMilestones;

    const todayStr = new Date().toISOString().split("T")[0];
    const overdueTasks = tasks.filter((t) => {
      if (t.status === "completed") return false;
      if (!t.due_date) return false;
      return t.due_date < todayStr;
    }).length;

    const upcomingDeadlinesCount = tasks.filter((t) => {
      if (t.status === "completed") return false;
      if (!t.due_date) return false;
      return t.due_date >= todayStr;
    }).length;

    const overallProgressPercent =
      totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const metrics = {
      overallProgressPercent,
      completedMilestones,
      pendingMilestones,
      overdueTasks,
      upcomingDeadlinesCount,
      activeBoardMentorsCount: mentorCount || 0,
    };

    // If no projects exist, return clean empty state
    if (!primaryProject) {
      return {
        summary: "No active projects found. Create a project in the Business Journey Tracker to activate AI risk monitoring and progress synthesis.",
        keyStrengths: ["Clean foundation ready for milestone setup", "Virtual Boardroom active for mentor advisory"],
        immediatePriorities: ["Create your initial startup project", "Assemble strategic milestones"],
        risks: [],
        metrics,
        is_ai_generated: false,
      };
    }

    // 6. Gemini Synthesis Prompt
    const prompt = `You are a venture capital portfolio monitoring partner at BusinessBridge analyzing the real-time operational health of a startup.

Project Context:
- Project Name: ${primaryProject.name}
- Stage: ${primaryProject.stage}
- Status: ${primaryProject.status}
- Progress: ${overallProgressPercent}% (${completedMilestones} completed, ${pendingMilestones} pending milestones)
- Overdue Tasks: ${overdueTasks}
- Upcoming Deadlines: ${upcomingDeadlinesCount}
- Active Advisory Board Mentors: ${mentorCount || 0}
- Current Incomplete Milestones: ${milestones
      .filter((m) => m.status !== "completed")
      .map((m) => m.title)
      .join("; ") || "None"}

Perform a rigorous risk audit and strategic synthesis. Identify 2-4 critical business risks based on their stage (${primaryProject.stage}) and overdue execution items.
Respond ONLY with a valid JSON object matching this schema:
{
  "summary": "2-3 sentence executive synthesis of progress and operational velocity",
  "keyStrengths": ["Strength 1", "Strength 2"],
  "immediatePriorities": ["Priority 1", "Priority 2", "Priority 3"],
  "risks": [
    {
      "id": "risk-1",
      "title": "Clear concise risk name",
      "category": "market", // "market" | "financial" | "execution" | "legal" | "operational"
      "severity": "high", // "high" | "medium" | "low"
      "explanation": "Detailed explanation of why this risk threatens progress",
      "mitigation": "Concrete action founder and board should execute to mitigate"
    }
  ]
}`;

    try {
      const geminiRes = await generateGeminiContent(prompt);
      if (geminiRes) {
        const parsed = JSON.parse(geminiRes);
        return {
          summary: parsed.summary || "Executive analysis completed.",
          keyStrengths: Array.isArray(parsed.keyStrengths) ? parsed.keyStrengths : [],
          immediatePriorities: Array.isArray(parsed.immediatePriorities) ? parsed.immediatePriorities : [],
          risks: Array.isArray(parsed.risks)
            ? parsed.risks.map((r: any, idx: number) => ({
                id: r.id || `risk-${idx + 1}`,
                title: String(r.title || "Business Risk"),
                category: (["market", "financial", "execution", "legal", "operational"].includes(r.category)
                  ? r.category
                  : "execution") as any,
                severity: (["high", "medium", "low"].includes(r.severity) ? r.severity : "medium") as any,
                explanation: String(r.explanation || ""),
                mitigation: String(r.mitigation || ""),
              }))
            : [],
          metrics,
          is_ai_generated: true,
        };
      }
    } catch (err) {
      console.warn("[AIInsightsService] Gemini analysis failed, using deterministic fallback:", err);
    }

    // Deterministic fallback risks based on stage and overdue items
    const fallbackRisks: BusinessRiskItem[] = [];
    if (overdueTasks > 0) {
      fallbackRisks.push({
        id: "risk-overdue-velocity",
        title: "Execution Velocity Lag",
        category: "execution",
        severity: overdueTasks > 2 ? "high" : "medium",
        explanation: `${overdueTasks} critical task(s) have passed their scheduled completion date, which could delay upcoming milestone delivery.`,
        mitigation: "Reallocate tasks or schedule an advisory check-in with your board mentor to unblock bottlenecks.",
      });
    }

    if (metrics.activeBoardMentorsCount === 0) {
      fallbackRisks.push({
        id: "risk-unmentored-board",
        title: "Unsupervised Strategic Blindspots",
        category: "operational",
        severity: "medium",
        explanation: "No verified mentors have been inducted into your Virtual Boardroom yet, increasing risk of avoidable missteps.",
        mitigation: "Invite at least 2 domain-experienced mentors from the BusinessBridge Mentor Directory.",
      });
    }

    fallbackRisks.push({
      id: "risk-stage-alignment",
      title: "Stage-Specific Runway Friction",
      category: "financial",
      severity: "low",
      explanation: `During the ${primaryProject.stage} stage, balancing development speed against burn rate is essential.`,
      mitigation: "Review 6-month budget runway and set weekly progress check-ins with your board.",
    });

    return {
      summary: `Project "${primaryProject.name}" is currently in ${primaryProject.stage} with ${overallProgressPercent}% milestone completion. Ongoing focus is needed on milestone delivery and advisory oversight.`,
      keyStrengths: [
        "Structured milestone architecture deployed",
        "Clear stage alignment in Business Journey Tracker",
      ],
      immediatePriorities: [
        overdueTasks > 0 ? "Resolve outstanding overdue tasks" : "Maintain milestone sprint cadence",
        "Convene monthly advisory board review",
      ],
      risks: fallbackRisks,
      metrics,
      is_ai_generated: false,
    };
  },

  /**
   * Generate actionable strategic next-step recommendations
   */
  async getNextStepRecommendations(
    founderId: string,
    projectId?: string
  ): Promise<NextStepsResponse> {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    let projectQuery = supabase
      .from("startup_projects")
      .select("*")
      .eq("founder_id", founderId);

    if (projectId) {
      projectQuery = projectQuery.eq("id", projectId);
    }

    const { data: projects } = await projectQuery.order("created_at", { ascending: false });
    const primaryProject = (projects && projects.length > 0) ? projects[0] : null;

    if (!primaryProject) {
      return { recommendations: [], is_ai_generated: false };
    }

    const { data: milestones } = await supabase
      .from("project_milestones")
      .select("id, title, status")
      .eq("project_id", primaryProject.id)
      .eq("status", "in_progress")
      .limit(3);

    const activeMilestone = (milestones && milestones.length > 0) ? milestones[0] : null;

    const prompt = `You are a startup execution coach at BusinessBridge.
Given this startup:
- Name: ${primaryProject.name}
- Stage: ${primaryProject.stage}
- Incomplete Milestone: ${activeMilestone?.title || "Product Validation"}

Propose 3-4 concrete, highly actionable NEXT STEPS that the founder should convert into tasks right now.
Respond ONLY with JSON matching:
{
  "recommendations": [
    {
      "id": "step-1",
      "title": "Actionable task title",
      "priority": "high", // "high" | "medium" | "low"
      "whySuggested": "Clear explanation of why this must be done now",
      "category": "Product", // e.g. "Strategy", "Finance", "Product", "GTM", "Board"
      "suggestedDueDate": "2026-11-25",
      "estimatedHours": 6
    }
  ]
}`;

    try {
      const geminiRes = await generateGeminiContent(prompt);
      if (geminiRes) {
        const parsed = JSON.parse(geminiRes);
        if (Array.isArray(parsed.recommendations)) {
          return {
            recommendations: parsed.recommendations.map((r: any, idx: number) => ({
              id: r.id || `step-${idx + 1}`,
              title: String(r.title || "Next Step Action"),
              priority: (["high", "medium", "low"].includes(r.priority) ? r.priority : "high") as any,
              whySuggested: String(r.whySuggested || "Recommended for current startup stage."),
              category: String(r.category || "Execution"),
              milestone_id: activeMilestone?.id,
              milestone_title: activeMilestone?.title,
              suggestedDueDate: r.suggestedDueDate,
              estimatedHours: Number(r.estimatedHours) || 4,
            })),
            is_ai_generated: true,
          };
        }
      }
    } catch (err) {
      console.warn("[AIInsightsService] Gemini next-steps failed, using fallback:", err);
    }

    // Deterministic fallback
    return {
      recommendations: [
        {
          id: "step-fb-1",
          title: "Schedule Q4 Advisory Boardroom Review",
          priority: "high",
          whySuggested: "Ensure board mentors validate milestone completion and review roadmap risks.",
          category: "Board",
          milestone_id: activeMilestone?.id,
          milestone_title: activeMilestone?.title || "Board Governance",
          estimatedHours: 2,
        },
        {
          id: "step-fb-2",
          title: "Audit Monthly Cash Burn & Unit Economics",
          priority: "high",
          whySuggested: "Maintains financial visibility and prevents cash runway surprises.",
          category: "Finance",
          milestone_id: activeMilestone?.id,
          milestone_title: activeMilestone?.title || "Financial Planning",
          estimatedHours: 4,
        },
        {
          id: "step-fb-3",
          title: "Conduct 5 Customer Discovery Feedback Calls",
          priority: "medium",
          whySuggested: "Direct qualitative user feedback guarantees problem-solution alignment.",
          category: "Product",
          milestone_id: activeMilestone?.id,
          milestone_title: activeMilestone?.title || "Customer Validation",
          estimatedHours: 5,
        },
      ],
      is_ai_generated: false,
    };
  },
};
