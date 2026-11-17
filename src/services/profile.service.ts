import { createClient, createAdminClient } from "@/lib/supabase/server";
import { UserProfile, FounderProfileData, MentorProfileData } from "@/types/auth";
import { FounderProfile } from "@/types/founder";
import { MentorProfile } from "@/types/mentor";

/**
 * Returns an admin Supabase client if service role key is configured,
 * otherwise falls back to the authenticated server client.
 */
async function getAdminClientOrFallback() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return createAdminClient();
    } catch {
      // Fallback to standard server client
    }
  }
  return await createClient();
}

/**
 * Retrieves a user's core profile by their user ID.
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Retrieves the founder profile details for a given user ID.
 */
export async function getFounderProfile(userId: string): Promise<FounderProfile | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Retrieves the mentor profile details for a given user ID.
 */
export async function getMentorProfile(userId: string): Promise<MentorProfile | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("mentor_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Updates a user's core profile information.
 * Protects against role escalation and unauthorized column mutations.
 */
export async function updateProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    const supabase = await createClient();

    // Whitelist only safe, user-editable fields
    const sanitizedUpdate: {
      full_name?: string;
      phone?: string | null;
      location?: string | null;
      bio?: string | null;
      avatar_url?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (data.full_name !== undefined) sanitizedUpdate.full_name = data.full_name.trim();
    if (data.phone !== undefined) sanitizedUpdate.phone = data.phone;
    if (data.location !== undefined) sanitizedUpdate.location = data.location;
    if (data.bio !== undefined) sanitizedUpdate.bio = data.bio;
    if (data.avatar_url !== undefined) sanitizedUpdate.avatar_url = data.avatar_url;

    const { data: updated, error } = await supabase
      .from("profiles")
      .update(sanitizedUpdate)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile.";
    return { success: false, error: message };
  }
}

/**
 * Updates a founder's profile details.
 */
export async function updateFounderProfile(
  userId: string,
  data: Partial<FounderProfileData>
): Promise<{ success: boolean; data?: FounderProfile; error?: string }> {
  try {
    const supabase = await createClient();

    const sanitizedUpdate: {
      startup_name?: string | null;
      industry?: string | null;
      business_stage?: string | null;
      business_description?: string | null;
      business_goals?: string | null;
      experience_level?: "first_time" | "serial_entrepreneur" | "experienced_executive";
      entrepreneurial_interests?: string[];
      biography?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (data.startup_name !== undefined) sanitizedUpdate.startup_name = data.startup_name;
    if (data.industry !== undefined) sanitizedUpdate.industry = data.industry;
    if (data.business_stage !== undefined) sanitizedUpdate.business_stage = data.business_stage;
    if (data.business_description !== undefined) {
      sanitizedUpdate.business_description = data.business_description;
    }
    if (data.business_goals !== undefined) sanitizedUpdate.business_goals = data.business_goals;
    if (data.experience_level !== undefined) {
      sanitizedUpdate.experience_level = data.experience_level as
        | "first_time"
        | "serial_entrepreneur"
        | "experienced_executive";
    }
    if (data.entrepreneurial_interests !== undefined) {
      sanitizedUpdate.entrepreneurial_interests = data.entrepreneurial_interests;
    }
    if (data.biography !== undefined) sanitizedUpdate.biography = data.biography;

    const { data: updated, error } = await supabase
      .from("founder_profiles")
      .update(sanitizedUpdate)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update founder profile.";
    return { success: false, error: message };
  }
}

/**
 * Updates a mentor's profile details.
 */
export async function updateMentorProfile(
  userId: string,
  data: Partial<MentorProfileData>
): Promise<{ success: boolean; data?: MentorProfile; error?: string }> {
  try {
    const supabase = await createClient();

    const sanitizedUpdate: {
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
      availability?: "full_time" | "part_time" | "advisory_only" | "unavailable";
      mentoring_availability?: string | null;
      mentoring_format?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (data.professional_title !== undefined) {
      sanitizedUpdate.professional_title = data.professional_title;
    }
    if (data.previous_company !== undefined) {
      sanitizedUpdate.previous_company = data.previous_company;
    }
    if (data.previous_designation !== undefined) {
      sanitizedUpdate.previous_designation = data.previous_designation;
    }
    if (data.years_experience !== undefined) {
      sanitizedUpdate.years_experience = data.years_experience;
    }
    if (data.years_of_experience !== undefined) {
      sanitizedUpdate.years_of_experience = data.years_of_experience;
    }
    if (data.industry_expertise !== undefined) {
      sanitizedUpdate.industry_expertise = data.industry_expertise;
    }
    if (data.expertise !== undefined) {
      sanitizedUpdate.expertise = data.expertise;
    }
    if (data.specialization !== undefined) {
      sanitizedUpdate.specialization = data.specialization;
    }
    if (data.achievements !== undefined) {
      sanitizedUpdate.achievements = data.achievements;
    }
    if (data.biography !== undefined) {
      sanitizedUpdate.biography = data.biography;
    }
    if (data.availability !== undefined) {
      sanitizedUpdate.availability = data.availability as
        | "full_time"
        | "part_time"
        | "advisory_only"
        | "unavailable";
    }
    if (data.mentoring_availability !== undefined) {
      sanitizedUpdate.mentoring_availability = data.mentoring_availability;
    }
    if (data.mentoring_format !== undefined) {
      sanitizedUpdate.mentoring_format = data.mentoring_format;
    }

    const { data: updated, error } = await supabase
      .from("mentor_profiles")
      .update(sanitizedUpdate)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update mentor profile.";
    return { success: false, error: message };
  }
}

/**
 * Gathers administrative statistics across all users.
 */
export async function getAdminStats(): Promise<{
  totalUsers: number;
  founderCount: number;
  mentorCount: number;
  pendingMentorVerifications: number;
}> {
  try {
    const client = await getAdminClientOrFallback();

    const [totalUsersRes, founderRes, mentorRes, pendingMentorsRes] =
      await Promise.all([
        client.from("profiles").select("*", { count: "exact", head: true }),
        client
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "founder"),
        client
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "mentor"),
        client
          .from("mentor_profiles")
          .select("*", { count: "exact", head: true })
          .eq("verification_status", "pending"),
      ]);

    return {
      totalUsers: totalUsersRes.count ?? 0,
      founderCount: founderRes.count ?? 0,
      mentorCount: mentorRes.count ?? 0,
      pendingMentorVerifications: pendingMentorsRes.count ?? 0,
    };
  } catch {
    return {
      totalUsers: 0,
      founderCount: 0,
      mentorCount: 0,
      pendingMentorVerifications: 0,
    };
  }
}

/**
 * Retrieves all registered users with their verification status and role details for Admin view.
 */
export async function getAllUsersForAdmin(): Promise<
  Array<
    UserProfile & {
      verification_status?: string;
      details?: Record<string, unknown>;
    }
  >
> {
  try {
    const client = await getAdminClientOrFallback();

    const { data: profiles, error } = await client
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !profiles) {
      return [];
    }

    // Fetch mentor details to link verification status
    const { data: mentorProfiles } = await client
      .from("mentor_profiles")
      .select(
        "user_id, verification_status, professional_title, previous_designation, previous_company, years_of_experience, years_experience"
      );

    // Fetch founder details
    const { data: founderProfiles } = await client
      .from("founder_profiles")
      .select("user_id, startup_name, industry, business_stage");

    const mentorMap = new Map(mentorProfiles?.map((m) => [m.user_id, m]) || []);
    const founderMap = new Map(founderProfiles?.map((f) => [f.user_id, f]) || []);

    return profiles.map((p) => {
      const mentorInfo = mentorMap.get(p.id);
      const founderInfo = founderMap.get(p.id);

      return {
        ...p,
        verification_status: mentorInfo?.verification_status,
        details: (mentorInfo || founderInfo) as Record<string, unknown> | undefined,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Approves or rejects a mentor's application.
 */
export async function verifyMentor(
  mentorId: string,
  status: "verified" | "rejected"
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getAdminClientOrFallback();

    // Try updating by mentor_profiles.id
    const { data, error } = await client
      .from("mentor_profiles")
      .update({
        verification_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mentorId)
      .select("id");

    if (error) {
      return { success: false, error: error.message };
    }

    // If no row matched by id, attempt updating by user_id
    if (!data || data.length === 0) {
      const { error: userError } = await client
        .from("mentor_profiles")
        .update({
          verification_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", mentorId);

      if (userError) {
        return { success: false, error: userError.message };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify mentor.";
    return { success: false, error: message };
  }
}

/**
 * Toggles a user's active status.
 */
export async function toggleUserStatus(
  userId: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getAdminClientOrFallback();

    const { error: profileError } = await client
      .from("profiles")
      .update({
        is_active: active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // If service role key is available, adjust ban duration in Supabase Auth
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminClient = createAdminClient();
        await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: active ? "none" : "876600h",
        });
      } catch {
        // Silently continue if service role does not have admin permissions
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle user status.";
    return { success: false, error: message };
  }
}
