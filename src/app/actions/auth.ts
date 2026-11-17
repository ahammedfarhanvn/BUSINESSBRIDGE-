"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";

export interface CompleteRegistrationParams {
  userId: string;
  role: "founder" | "mentor";
  fullName: string;
  email: string;
  phone?: string | null;
  // Founder specific
  startupName?: string;
  industry?: string;
  businessStage?: string;
  businessGoals?: string;
  // Mentor specific
  professionalTitle?: string;
  previousCompany?: string;
  yearsOfExperience?: number;
  industryExpertise?: string[];
  areasOfSpecialization?: string[];
  mentoringAvailability?: string;
  mentoringFormat?: string;
}

export async function completeRegistrationProfile(params: CompleteRegistrationParams) {
  // Reject any attempt to register admin
  if ((params.role as string) === "admin") {
    return { success: false, error: "Unauthorized role assignment." };
  }

  try {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      // Fallback to standard server client if admin client isn't available
      supabase = await createClient();
    }

    // Ensure profile row exists and has phone updated
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: params.userId,
          full_name: params.fullName,
          email: params.email,
          role: params.role,
          phone: params.phone || null,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.warn("Could not upsert profile:", profileError.message);
    }

    if (params.role === "founder") {
      // Map business stage to schema enum
      const stageMap: Record<string, "idea" | "prototype" | "early_traction" | "growth" | "scaling"> = {
        Idea: "idea",
        Prototype: "prototype",
        "Early Traction": "early_traction",
        Growth: "growth",
        Scaling: "scaling",
      };
      const businessStage = params.businessStage ? stageMap[params.businessStage] || "idea" : "idea";

      // 1. Insert or update founder profile
      await supabase.from("founder_profiles").upsert(
        {
          user_id: params.userId,
          experience_level: "first_time",
          entrepreneurial_interests: params.industry ? [params.industry] : ["Tech"],
          biography:
            params.businessGoals?.trim() ||
            `Founder of ${params.startupName?.trim() || "a new venture"}. Focusing on ${params.industry || "General Industry"}.`,
          startup_name: params.startupName || null,
          industry: params.industry || null,
          business_stage: businessStage,
          business_description: params.businessGoals || null,
          business_goals: params.businessGoals || null,
        },
        { onConflict: "user_id" }
      );

      // 2. If startup name provided or default to new venture
      const startupName = params.startupName?.trim();
      if (startupName) {
        await supabase.from("startups").insert({
          founder_id: params.userId,
          name: startupName,
          industry: params.industry || "Other",
          description:
            params.businessGoals?.trim() ||
            `${startupName} - Startup venture founded by ${params.fullName}`,
          business_stage: businessStage,
        });
      }
    } else if (params.role === "mentor") {
      // Format biography
      const bioParts = [
        `${params.professionalTitle || "Executive"} with ${params.yearsOfExperience || 5}+ years of leadership experience at ${params.previousCompany || "leading firms"}.`,
      ];
      if (params.areasOfSpecialization && params.areasOfSpecialization.length > 0) {
        bioParts.push(`Specializations: ${params.areasOfSpecialization.join(", ")}.`);
      }
      if (params.mentoringFormat) {
        bioParts.push(`Preferred mentoring format: ${params.mentoringFormat}.`);
      }

      const availabilityMap: Record<string, "full_time" | "part_time" | "advisory_only" | "unavailable"> = {
        "Advisory only": "advisory_only",
        "2-5 hrs/week": "part_time",
        "5-10 hrs/week": "part_time",
        Flexible: "advisory_only",
      };
      const cleanAvailability = params.mentoringAvailability
        ? availabilityMap[params.mentoringAvailability] || "advisory_only"
        : "advisory_only";

      await supabase.from("mentor_profiles").upsert(
        {
          user_id: params.userId,
          professional_title: params.professionalTitle || "Executive Mentor",
          previous_company: params.previousCompany || "Independent",
          previous_designation: params.professionalTitle || "Executive Mentor",
          years_of_experience: Number(params.yearsOfExperience) || 5,
          years_experience: Number(params.yearsOfExperience) || 5,
          expertise: params.industryExpertise || ["Strategy"],
          industry_expertise: params.industryExpertise || ["Strategy"],
          specialization: params.areasOfSpecialization || [],
          biography: bioParts.join(" "),
          achievements: bioParts.join(" "),
          availability: cleanAvailability,
          mentoring_availability: params.mentoringAvailability || cleanAvailability,
          mentoring_format: params.mentoringFormat || "virtual",
          verification_status: "pending",
        },
        { onConflict: "user_id" }
      );
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("completeRegistrationProfile error:", errorMsg);
    return { success: false, error: errorMsg };
  }
}
