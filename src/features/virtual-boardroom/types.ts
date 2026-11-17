import { MentorProfile, MentoringAvailability, MentorVerificationStatus } from "@/types/mentor";
import { UserProfile } from "@/types/auth";
import {
  Startup,
  AdvisoryBoard,
  BoardMember,
  BoardInvitation,
  InvitationStatus,
  BoardMemberStatus,
  Meeting,
  Recommendation,
} from "@/types/startup";

/**
 * Enriched mentor profile item for directory listings and cards
 */
export interface MentorDirectoryItem {
  id: string; // mentor_profiles.id
  user_id: string; // profiles.id
  full_name: string;
  email: string;
  avatar_url: string | null;
  professional_title: string;
  previous_company: string;
  previous_designation?: string | null;
  years_of_experience: number;
  expertise: string[];
  industry_expertise?: string[];
  specialization?: string[];
  achievements?: string | null;
  biography: string;
  availability: MentoringAvailability | string;
  verification_status: MentorVerificationStatus;
  invitation_status?: InvitationStatus | "none";
  invitation_id?: string;
  is_board_member?: boolean;
}

/**
 * AI-generated mentor recommendation contract
 */
export interface AIMentorRecommendation {
  mentor_id: string; // mentor_profiles.id
  match_percentage?: number; // e.g., 94
  match_label?: string; // e.g., "Excellent Strategic Match"
  reason: string; // Explanation of why this mentor is recommended
  matching_expertise: string[];
  relevant_experience?: string;
  mentor?: MentorDirectoryItem;
}

/**
 * Filter state for mentor directory search and filtering
 */
export interface MentorDirectoryFilters {
  searchQuery: string;
  selectedExpertise: string;
  selectedIndustry: string;
  minExperienceYears: number; // 0 = all
  onlyAvailable: boolean;
}

/**
 * Enriched board member for the founder dashboard
 */
export interface EnrichedBoardMember {
  id: string; // board_members.id
  board_id: string;
  mentor_id: string;
  advisory_role: string;
  membership_status: BoardMemberStatus;
  joined_at: string;
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  mentor_profile: {
    id: string;
    professional_title: string;
    previous_company: string;
    years_of_experience: number;
    expertise: string[];
    specialization?: string[];
    availability: string;
  };
}

/**
 * Board invitation with joined startup, founder, and mentor details
 */
export interface EnrichedInvitation {
  id: string; // board_invitations.id
  board_id: string;
  mentor_id: string;
  invited_by: string;
  status: InvitationStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  startup?: {
    id: string;
    name: string;
    industry: string;
    description: string;
    business_stage: string;
    website_url?: string | null;
  };
  founder?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  mentor?: {
    id: string;
    user_id: string;
    full_name: string;
    professional_title: string;
    previous_company: string;
    avatar_url?: string | null;
    years_of_experience: number;
    expertise: string[];
  };
}

/**
 * Virtual Boardroom overview state for a founder
 */
export interface BoardroomOverview {
  startup: Startup | null;
  board: AdvisoryBoard | null;
  members: EnrichedBoardMember[];
  invitations: EnrichedInvitation[];
  meetings: Meeting[];
  recommendations: Recommendation[];
  isLoading: boolean;
  error: string | null;
}
