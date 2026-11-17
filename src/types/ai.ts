export interface CopilotQueryInput {
  question: string;
  projectId?: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface CopilotResponse {
  success: boolean;
  answer: string;
  key_takeaways: string[];
  referenced_milestones?: string[];
  referenced_tasks?: string[];
  referenced_feedback?: string[];
  suggested_actions?: string[];
  error?: string;
}

export interface ProgressSummaryResponse {
  success: boolean;
  project_id: string;
  project_name: string;
  summary: string;
  stats: {
    total_milestones: number;
    completed_milestones: number;
    total_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
    pending_tasks: number;
    progress_percentage: number;
  };
  upcoming_deadlines: Array<{
    type: "milestone" | "task";
    id: string;
    title: string;
    due_date: string;
    priority: string;
  }>;
  recent_mentor_feedback: Array<{
    id: string;
    author_name: string;
    content: string;
    created_at: string;
  }>;
  key_accomplishments: string[];
  immediate_focuses: string[];
  error?: string;
}

export interface RiskItem {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  category:
    | "overdue_milestone"
    | "incomplete_critical_task"
    | "launch_delay"
    | "unaddressed_feedback"
    | "operational";
  supporting_references: Array<{
    type: "milestone" | "task" | "feedback" | "project";
    id: string;
    title: string;
  }>;
  suggested_mitigation: string;
}

export interface RiskAnalysisResponse {
  success: boolean;
  project_id: string;
  project_name: string;
  overall_risk_level: "low" | "medium" | "high";
  is_ai_assessment: true;
  assessment_disclaimer: string;
  risks: RiskItem[];
  launch_delay_risk: {
    target_launch_date: string | null;
    is_at_risk: boolean;
    projected_delay_days?: number;
    rationale: string;
  };
  error?: string;
}

export interface NextStepSuggestion {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  milestone_id: string | null;
  milestone_title: string | null;
  explanation: string;
  estimated_impact: string;
}

export interface NextStepsResponse {
  success: boolean;
  project_id: string;
  suggestions: NextStepSuggestion[];
  error?: string;
}

export interface CreateApprovedTaskInput {
  milestoneId: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  due_date?: string;
  assigned_to?: string;
  confirmed_by_founder: boolean;
}
