export type BusinessStage = "idea" | "prototype" | "early_traction" | "growth" | "scaling";
export type InvitationStatus = "pending" | "accepted" | "rejected" | "cancelled";
export type BoardMemberStatus = "active" | "inactive" | "resigned";
export type MilestoneStatus = "pending" | "in_progress" | "completed" | "delayed";
export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";

export interface Startup {
  id: string;
  founder_id: string; // References profiles.id
  name: string;
  industry: string;
  description: string;
  business_stage: BusinessStage;
  website_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdvisoryBoard {
  id: string;
  startup_id: string; // References startups.id
  name: string;
  created_at: string;
}

export interface BoardMember {
  id: string;
  board_id?: string | null; // References advisory_boards.id
  founder_id?: string | null; // References profiles.id
  mentor_id: string; // References mentor_profiles.id
  advisory_role: string; // e.g. "Lead Financial Advisor", "Marketing Strategist"
  membership_status: BoardMemberStatus;
  joined_at: string;
  created_at?: string;
}

export interface BoardInvitation {
  id: string;
  board_id?: string | null; // References advisory_boards.id
  mentor_id: string; // References mentor_profiles.id
  invited_by?: string | null; // References profiles.id (founder)
  founder_id?: string | null; // References profiles.id (founder)
  status: InvitationStatus;
  message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  startup_id: string; // References startups.id
  title: string;
  description: string;
  status: MilestoneStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  milestone_id: string; // References milestones.id
  assigned_to?: string | null; // References profiles.id
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskUpdate {
  id: string;
  task_id: string; // References tasks.id
  updated_by: string; // References profiles.id
  comment: string;
  progress_percentage: number;
  created_at: string;
}

export interface Meeting {
  id: string;
  board_id: string; // References advisory_boards.id
  title: string;
  meeting_date: string;
  meeting_notes?: string | null;
  created_by: string; // References profiles.id
  created_at: string;
}

export interface Recommendation {
  id: string;
  startup_id: string; // References startups.id
  mentor_id: string; // References mentor_profiles.id
  title: string;
  content: string;
  created_at: string;
}
