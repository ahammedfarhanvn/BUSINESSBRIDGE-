/**
 * BusinessBridge - Virtual Boardroom Shared Type Contracts
 * Phase 3: Backend, Gemini AI, Invitations & Board Collaboration
 */

import { UserRole } from "./auth";
import { MentoringAvailability, MentorVerificationStatus } from "./mentor";

export type BoardInvitationStatus = "pending" | "accepted" | "rejected" | "cancelled";
export type BoardMembershipStatus = "active" | "inactive" | "resigned";
export type BoardMeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type BoardRecommendationStatus = "proposed" | "in_progress" | "completed";

export interface BoardInvitationRecord {
  id: string;
  board_id?: string | null;
  founder_id: string;
  mentor_id: string;
  status: BoardInvitationStatus;
  message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardMemberRecord {
  id: string;
  board_id?: string | null;
  founder_id: string;
  mentor_id: string;
  advisory_role: string;
  membership_status: BoardMembershipStatus;
  joined_at: string;
  created_at: string;
}

export interface BoardMessageRecord {
  id: string;
  board_id?: string | null;
  founder_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export interface EnrichedBoardMessage extends BoardMessageRecord {
  sender?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: UserRole;
  };
}

export interface BoardMeetingRecord {
  id: string;
  board_id?: string | null;
  founder_id: string;
  title: string;
  meeting_date: string;
  meeting_time?: string | null;
  agenda?: string | null;
  meeting_notes?: string | null;
  status: BoardMeetingStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EnrichedBoardMeeting extends BoardMeetingRecord {
  creator?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: UserRole;
  };
}

export interface BoardRecommendationRecord {
  id: string;
  startup_id?: string | null;
  founder_id: string;
  author_id: string;
  mentor_id?: string | null;
  title: string;
  description: string;
  status: BoardRecommendationStatus;
  created_at: string;
  updated_at: string;
}

export interface EnrichedBoardRecommendation extends BoardRecommendationRecord {
  author?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: UserRole;
    professional_title?: string;
    company?: string;
  };
}

export interface AIMentorRecommendationItem {
  mentor_id: string; // references mentor_profiles.id
  match_score: number; // 0-100 score (AI estimated)
  match_reason: string;
  matching_expertise: string[];
  suggested_advisory_role: string;
  is_ai_generated: boolean;
  mentor?: {
    id: string;
    user_id: string;
    full_name: string;
    professional_title: string;
    previous_company: string;
    years_of_experience: number;
    expertise: string[];
    specialization: string[];
    avatar_url: string | null;
    availability: string;
  };
}

export interface SendInvitationInput {
  mentorId: string;
  message?: string;
}

export interface RespondInvitationInput {
  invitationId: string;
  decision: "accepted" | "rejected";
}

export interface SendMessageInput {
  founderId: string;
  message: string;
}

export interface CreateMeetingInput {
  founderId: string;
  title: string;
  meetingDate: string;
  meetingTime?: string;
  agenda?: string;
}

export interface CreateRecommendationInput {
  founderId: string;
  title: string;
  description: string;
  status?: BoardRecommendationStatus;
}
