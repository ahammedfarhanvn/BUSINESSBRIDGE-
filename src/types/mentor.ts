export type MentorVerificationStatus = "pending" | "verified" | "rejected";
export type MentoringAvailability =
  | "full_time"
  | "part_time"
  | "advisory_only"
  | "unavailable";
export type MentoringFormat = "virtual" | "in_person" | "hybrid";

export interface MentorProfile {
  id: string;
  user_id: string; // References profiles.id
  professional_title: string;
  previous_company: string;
  years_of_experience: number;
  expertise: string[]; // e.g. ["Finance", "Fundraising", "GTM Strategy"]
  biography: string;
  availability: MentoringAvailability;
  verification_status: MentorVerificationStatus;
  previous_designation?: string | null;
  years_experience?: number | null;
  industry_expertise?: string[];
  specialization?: string[];
  achievements?: string | null;
  mentoring_availability?: MentoringAvailability | string | null;
  mentoring_format?: MentoringFormat | string | null;
  created_at: string;
  updated_at: string;
}
