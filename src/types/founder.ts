export type FounderExperienceLevel =
  | "first_time"
  | "serial_entrepreneur"
  | "experienced_executive";

export interface FounderProfile {
  id: string;
  user_id: string; // References profiles.id
  experience_level: FounderExperienceLevel;
  entrepreneurial_interests: string[];
  biography: string;
  startup_name?: string | null;
  industry?: string | null;
  business_stage?: string | null;
  business_description?: string | null;
  business_goals?: string | null;
  created_at: string;
  updated_at: string;
}
