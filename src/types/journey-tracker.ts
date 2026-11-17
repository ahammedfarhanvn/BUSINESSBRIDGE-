/**
 * BusinessBridge - Business Journey Tracker Shared Type Contracts
 * Phase 4: Backend, Gemini AI Roadmap, Projects, Milestones, Tasks & Feedback
 */

export type ProjectStatus = "active" | "completed" | "paused";
export type MilestoneStatus = "not_started" | "in_progress" | "completed";
export type TaskStatus = "not_started" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type MilestonePriority = "low" | "medium" | "high" | "critical";

export type StartupStage =
  | "idea_validation"
  | "business_planning"
  | "product_development"
  | "launch_preparation"
  | "business_launch"
  | "growth_scaling";

export interface StartupProjectRecord {
  id: string;
  founder_id: string;
  startup_id?: string | null;
  name: string;
  description?: string | null;
  stage: StartupStage;
  status: ProjectStatus;
  industry?: string | null;
  goal?: string | null;
  target_launch_date?: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface ProjectMilestoneRecord {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: MilestoneStatus;
  stage?: string | null;
  priority?: MilestonePriority | string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface ProjectTaskRecord {
  id: string;
  milestone_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  assigned_profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
}

export interface MilestoneFeedbackRecord {
  id: string;
  milestone_id: string;
  author_id: string;
  content: string;
  feedback_type?: string;
  created_at: string;
  updated_at?: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role: string;
  } | null;
  project_id?: string | null;
  task_id?: string | null;
  status?: string | null;
  milestone_title?: string | null;
  task_title?: string | null;
}

export interface ProjectProgress {
  projectId: string;
  projectName?: string;
  stage?: StartupStage;
  status?: ProjectStatus;
  totalMilestones: number;
  completedMilestones: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks?: number;
  overallProgressPercent?: number;
  progressPercentage?: number;
}

export interface EnrichedMilestone extends ProjectMilestoneRecord {
  tasks: ProjectTaskRecord[];
  feedback: MilestoneFeedbackRecord[];
  progressPercent: number;
}

export interface EnrichedProject extends StartupProjectRecord {
  milestones: EnrichedMilestone[];
  progress: ProjectProgress;
}

export interface AIRoadmapSuggestedTask {
  title: string;
  description?: string;
  priority: TaskPriority;
}

export interface AIRoadmapSuggestedMilestone {
  title: string;
  description: string;
  estimated_weeks?: number;
  suggested_tasks: AIRoadmapSuggestedTask[];
}

export interface AIRoadmapResponse {
  projectId?: string;
  startupName?: string;
  stage: StartupStage;
  overview: string;
  milestones: AIRoadmapSuggestedMilestone[];
  is_ai_generated: boolean;
}

// Input DTOs
export interface CreateProjectInput {
  name: string;
  description?: string;
  stage: StartupStage;
  status?: ProjectStatus;
  startup_id?: string;
}

export interface CreateMilestoneInput {
  project_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status?: MilestoneStatus;
  order_index?: number;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string;
  due_date?: string | null;
  status?: MilestoneStatus;
  order_index?: number;
}

export interface CreateTaskInput {
  milestone_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  order_index?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  order_index?: number;
}

export interface CreateFeedbackInput {
  milestone_id: string;
  content: string;
  feedback_type?: string;
}

export type StartupProject = StartupProjectRecord;
export type ProjectMilestone = ProjectMilestoneRecord;
export type ProjectTask = ProjectTaskRecord;
export type MilestoneFeedback = MilestoneFeedbackRecord;
export type EnrichedMilestoneFeedback = MilestoneFeedbackRecord;
export type EnrichedProjectMilestone = EnrichedMilestone;
export type EnrichedProjectTask = ProjectTaskRecord & {
  assigned_profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
};
export interface RoadmapSuggestionItem {
  title: string;
  description: string;
  stage?: string;
  priority?: string;
  suggestedTasks?: Array<string | { title: string; description?: string; priority?: string | TaskPriority }>;
  suggested_tasks?: Array<string | { title: string; description?: string; priority?: string | TaskPriority }>;
  [key: string]: any;
}


