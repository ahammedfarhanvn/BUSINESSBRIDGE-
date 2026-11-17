export type UserRole = "founder" | "mentor" | "admin";

export interface UserProfile {
  id: string; // References auth.users.id
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

// Backward-compatible alias
export type Profile = UserProfile;

export interface UserSession {
  user: {
    id: string;
    email: string;
    role: UserRole;
  } | null;
  profile: UserProfile | null;
}

export interface FounderProfileData {
  id?: string;
  user_id?: string;
  experience_level?: "first_time" | "serial_entrepreneur" | "experienced_executive" | string;
  entrepreneurial_interests?: string[];
  biography?: string;
  startup_name?: string | null;
  industry?: string | null;
  business_stage?: string | null;
  business_description?: string | null;
  business_goals?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MentorProfileData {
  id?: string;
  user_id?: string;
  professional_title?: string;
  previous_company?: string;
  previous_designation?: string | null;
  years_experience?: number | null;
  years_of_experience?: number;
  industry_expertise?: string[];
  expertise?: string[];
  specialization?: string[];
  achievements?: string | null;
  biography?: string;
  availability?: "full_time" | "part_time" | "advisory_only" | "unavailable" | string;
  mentoring_availability?: string | null;
  mentoring_format?: "virtual" | "in_person" | "hybrid" | string | null;
  verification_status?: "pending" | "verified" | "rejected";
  created_at?: string;
  updated_at?: string;
}

export interface RegistrationInput {
  email: string;
  password: string;
  full_name: string;
  role: "founder" | "mentor"; // strictly founder or mentor, no public admin
  phone?: string;
  location?: string;
  bio?: string;
  // Founder-specific metadata
  startup_name?: string;
  industry?: string;
  business_stage?: string;
  business_description?: string;
  business_goals?: string;
  experience_level?: "first_time" | "serial_entrepreneur" | "experienced_executive";
  entrepreneurial_interests?: string[];
  // Mentor-specific metadata
  previous_designation?: string;
  professional_title?: string;
  previous_company?: string;
  years_experience?: number;
  years_of_experience?: number;
  industry_expertise?: string[];
  expertise?: string[];
  specialization?: string[];
  achievements?: string;
  mentoring_availability?: "full_time" | "part_time" | "advisory_only" | "unavailable";
  mentoring_format?: "virtual" | "in_person" | "hybrid";
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
  } | null;
  user?: {
    id: string;
    email: string;
    role: UserRole;
  } | null;
  profile?: UserProfile | null;
  redirectTo?: string;
}

export interface PasswordResetInput {
  email: string;
  redirectUrl?: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}
