/**
 * BusinessBridge - Gemini AI Mentor Recommendation Service
 * Virtual Boardroom Advisory Intelligence System
 * 
 * Provides AI-powered mentor-founder matching using Google Gemini models,
 * with deterministic heuristic fallback when Gemini API is unconfigured or unavailable.
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateJSON, isGeminiConfigured, getGeminiModel } from "@/lib/gemini";
import { AIMentorRecommendationItem } from "@/types/boardroom";

export interface GetAIMentorRecommendationsOptions {
  startupId?: string;
  industry?: string;
  goals?: string;
  limit?: number;
}

interface RawGeminiOutput {
  recommendations: Array<{
    mentor_id: string;
    match_score: number;
    match_reason: string;
    matching_expertise: string[];
    suggested_advisory_role: string;
  }>;
}

/**
 * Returns an admin client if service role key is configured,
 * otherwise falls back to the authenticated server client.
 */
async function getSupabaseClient() {
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
 * Computes deterministic heuristic rankings for candidate mentors
 * based on industry alignment, business stage fit, years of experience, and goal keywords.
 */
function computeHeuristicRecommendations(
  candidatesWithDetails: Array<{ candidate: any; mentorRecord: any }>,
  startupIndustry: string,
  businessStage: string,
  goals: string,
  limit: number
): AIMentorRecommendationItem[] {
  const normIndustry = (startupIndustry || "").toLowerCase().trim();
  const normStage = (businessStage || "").toLowerCase().trim();
  const goalWords = (goals || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const scored = candidatesWithDetails.map(({ mentorRecord }) => {
    let score = 10; // Baseline base score
    const matchingExpertise: string[] = [];

    // 1. Exact or partial match of startup industry in mentor expertise or industry_expertise (+40 pts)
    const allExpertise: string[] = [
      ...(Array.isArray(mentorRecord.expertise) ? mentorRecord.expertise : []),
      ...(Array.isArray(mentorRecord.industry_expertise) ? mentorRecord.industry_expertise : []),
    ];

    let industryMatched = false;
    if (normIndustry) {
      for (const exp of allExpertise) {
        const normExp = String(exp).toLowerCase();
        if (
          normExp === normIndustry ||
          normExp.includes(normIndustry) ||
          normIndustry.includes(normExp)
        ) {
          industryMatched = true;
          if (!matchingExpertise.includes(exp)) {
            matchingExpertise.push(exp);
          }
        }
      }
    }

    if (industryMatched) {
      score += 40;
    }

    // 2. Business stage alignment (+20 pts)
    const stageKeywordsMap: Record<string, string[]> = {
      idea: ["ideation", "concept", "product strategy", "mvp", "early stage", "seed", "prototyping"],
      prototype: ["mvp", "product", "prototype", "beta", "early stage", "architecture", "validation"],
      early_traction: ["go-to-market", "gtm", "traction", "sales", "seed", "pmf", "product-market fit"],
      growth: ["growth", "scaling", "series a", "expansion", "marketing", "revenue", "enterprise"],
      scaling: ["scaling", "scale", "international", "operations", "m&a", "late stage", "ipo"],
    };
    const targetKeywords = stageKeywordsMap[normStage] || ["growth", "strategy", "scaling"];
    const mentorBioNorm = (mentorRecord.biography || "").toLowerCase();

    let stageAligned = false;
    for (const kw of targetKeywords) {
      if (allExpertise.some((e) => String(e).toLowerCase().includes(kw)) || mentorBioNorm.includes(kw)) {
        stageAligned = true;
        break;
      }
    }

    if (stageAligned || (Number(mentorRecord.years_of_experience) || 0) >= 8) {
      score += 20;
    }

    // 3. Years of experience score (+2 pts per year up to +20 pts)
    const yearsExp = Number(mentorRecord.years_of_experience) || 0;
    const expPoints = Math.min(20, Math.max(0, yearsExp * 2));
    score += expPoints;

    // 4. Keyword overlap between goals and mentor bio (+10 pts)
    let goalOverlap = false;
    if (goalWords.length > 0 && mentorBioNorm) {
      for (const word of goalWords) {
        if (mentorBioNorm.includes(word)) {
          goalOverlap = true;
          break;
        }
      }
    }
    if (goalOverlap) {
      score += 10;
    }

    // Clamp score 0 to 100
    const clampedScore = Math.max(0, Math.min(100, score));

    // Ensure at least 1-2 expertise tags
    if (matchingExpertise.length === 0 && allExpertise.length > 0) {
      matchingExpertise.push(...allExpertise.slice(0, 3));
    }

    // Determine tailored suggested advisory role
    const primarySkill = matchingExpertise[0] || mentorRecord.professional_title || "Advisory Lead";
    const suggestedRole =
      primarySkill.toLowerCase().includes("advisor") || primarySkill.toLowerCase().includes("lead")
        ? primarySkill
        : `Lead ${primarySkill} Advisor`;

    const rationale = industryMatched
      ? `Deterministic match based on verified domain depth in ${normIndustry || "your market"} and ${yearsExp}+ years of executive leadership.`
      : `Recommended for ${businessStage || "current"} stage guidance with specialized background in ${matchingExpertise.slice(0, 2).join(", ") || "enterprise growth"}.`;

    const profile = Array.isArray(mentorRecord.profiles)
      ? mentorRecord.profiles[0]
      : mentorRecord.profiles;

    const item: AIMentorRecommendationItem = {
      mentor_id: mentorRecord.id,
      match_score: clampedScore,
      match_reason: rationale,
      matching_expertise: matchingExpertise.slice(0, 4),
      suggested_advisory_role: suggestedRole,
      is_ai_generated: false,
      mentor: {
        id: mentorRecord.id,
        user_id: mentorRecord.user_id,
        full_name: profile?.full_name || "Executive Advisor",
        professional_title: mentorRecord.professional_title || "Executive Advisor",
        previous_company: mentorRecord.previous_company || "Corporate Leader",
        years_of_experience: yearsExp,
        expertise: Array.isArray(mentorRecord.expertise) ? mentorRecord.expertise : [],
        specialization: Array.isArray(mentorRecord.specialization) ? mentorRecord.specialization : [],
        avatar_url: profile?.avatar_url || null,
        availability: mentorRecord.availability || "advisory_only",
      },
      ...({
        match_percentage: clampedScore,
        match_label: clampedScore >= 85 ? "Strategic Fit" : "Recommended Advisor",
        reason: rationale,
      } as any),
    };

    return { item, score: clampedScore };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Main service method to retrieve AI mentor recommendations for a founder.
 * Authenticates, fetches candidate pool, filters out invalid candidates,
 * calls Gemini AI, validates output against real candidates, and falls back to heuristics if needed.
 */
export async function getAIMentorRecommendations(
  founderUserId: string,
  options?: GetAIMentorRecommendationsOptions
): Promise<AIMentorRecommendationItem[]> {
  if (!founderUserId) {
    return [];
  }

  const limit = Math.max(1, Math.min(15, options?.limit ?? 5));
  const supabase = await getSupabaseClient();

  // 1. Authenticate & retrieve founder's startup profile and goals from Supabase
  let startupData: any = null;
  try {
    let startupQuery = supabase.from("startups").select("*");
    if (options?.startupId) {
      startupQuery = startupQuery.eq("id", options.startupId);
    } else {
      startupQuery = startupQuery.eq("founder_id", founderUserId);
    }
    const { data } = await startupQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
    startupData = data;
  } catch (err) {
    console.warn("[GeminiRecommendation] Error fetching startup:", err);
  }

  let founderProfile: any = null;
  try {
    const { data } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", founderUserId)
      .maybeSingle();
    founderProfile = data;
  } catch (err) {
    console.warn("[GeminiRecommendation] Error fetching founder profile:", err);
  }

  // Synthesize startup context
  const startupName =
    startupData?.name || founderProfile?.startup_name || "Innovative Startup";
  const startupIndustry =
    options?.industry || startupData?.industry || founderProfile?.industry || "Technology";
  const businessStage =
    startupData?.business_stage || founderProfile?.business_stage || "growth";
  const businessDescription =
    startupData?.description || founderProfile?.business_description || "";
  const businessGoals =
    options?.goals ||
    founderProfile?.business_goals ||
    "Establish strategic advisory board, accelerate customer acquisition, and scale revenue.";
  const resolvedStartupId = startupData?.id || options?.startupId || null;

  // 2. Query real verified mentors from mentor_profiles (joined with profiles)
  const { data: rawMentors, error: mentorsError } = await supabase
    .from("mentor_profiles")
    .select(`
      id,
      user_id,
      professional_title,
      previous_company,
      years_of_experience,
      expertise,
      biography,
      availability,
      verification_status,
      previous_designation,
      industry_expertise,
      specialization,
      achievements,
      profiles:user_id (
        id,
        full_name,
        email,
        avatar_url,
        role
      )
    `)
    .eq("verification_status", "verified")
    .neq("availability", "unavailable")
    .order("years_of_experience", { ascending: false });

  if (mentorsError) {
    console.error("[GeminiRecommendation] Database error querying mentor profiles:", mentorsError);
    return [];
  }

  if (!rawMentors || rawMentors.length === 0) {
    return [];
  }

  // 3. Exclude:
  //    - The founder's own user ID.
  //    - Inactive or suspended mentor profiles.
  //    - Unavailable mentors.
  //    - Mentors who are already active board members for this founder.
  const activeBoardMentorIds = new Set<string>();

  try {
    // Collect all startups belonging to this founder
    const { data: founderStartups } = await supabase
      .from("startups")
      .select("id")
      .eq("founder_id", founderUserId);

    const relevantStartupIds = (founderStartups || []).map((s) => s.id);
    if (resolvedStartupId && !relevantStartupIds.includes(resolvedStartupId)) {
      relevantStartupIds.push(resolvedStartupId);
    }

    if (relevantStartupIds.length > 0) {
      const { data: boards } = await supabase
        .from("advisory_boards")
        .select("id")
        .in("startup_id", relevantStartupIds);

      const boardIds = (boards || []).map((b) => b.id);
      if (boardIds.length > 0) {
        const { data: activeMembers } = await supabase
          .from("board_members")
          .select("mentor_id")
          .in("board_id", boardIds)
          .eq("membership_status", "active");

        if (activeMembers) {
          activeMembers.forEach((m) => activeBoardMentorIds.add(m.mentor_id));
        }
      }
    }
  } catch (activeErr) {
    console.warn("[GeminiRecommendation] Warning querying active board members:", activeErr);
  }

  const candidateMentorMap = new Map<string, (typeof rawMentors)[0]>();
  const candidatesWithDetails: Array<{ candidate: any; mentorRecord: any }> = [];

  for (const mentor of rawMentors) {
    // Exclude founder's own user ID
    if (mentor.user_id === founderUserId) {
      continue;
    }

    // Exclude inactive / suspended profiles
    if ((mentor as any).is_active === false || (mentor as any).status === "suspended") {
      continue;
    }

    // Exclude unavailable mentors
    if (mentor.availability === "unavailable") {
      continue;
    }

    // Exclude existing active board members
    if (activeBoardMentorIds.has(mentor.id)) {
      continue;
    }

    const profile = Array.isArray(mentor.profiles) ? mentor.profiles[0] : mentor.profiles;
    const candidateCompact = {
      id: mentor.id,
      name: profile?.full_name || "Executive Advisor",
      title: mentor.professional_title || "Advisor",
      company: mentor.previous_company || "Corporate Leader",
      years_exp: mentor.years_of_experience || 0,
      expertise: Array.isArray(mentor.expertise) ? mentor.expertise : [],
      bio: mentor.biography || "",
    };

    candidateMentorMap.set(mentor.id, mentor);
    candidatesWithDetails.push({
      candidate: candidateCompact,
      mentorRecord: mentor,
    });
  }

  // 5. If candidates list is empty, return empty array immediately
  if (candidatesWithDetails.length === 0) {
    return [];
  }

  // Extract clean candidate list for Gemini
  const candidates = candidatesWithDetails.map((c) => c.candidate);

  // 6. Check if Gemini API is configured; if not, immediately use deterministic fallback
  if (!isGeminiConfigured()) {
    console.info("[GeminiRecommendation] GEMINI_API_KEY not configured. Using deterministic heuristic matching.");
    return computeHeuristicRecommendations(
      candidatesWithDetails,
      startupIndustry,
      businessStage,
      businessGoals,
      limit
    );
  }

  // 7. Construct Gemini prompt and call AI
  try {
    const systemInstruction = `You are an elite Silicon Valley executive board formation advisor and talent matching strategist.
Analyze startup business context, industry nuances, business stage, and strategic goals against candidate mentor profiles.
Return ONLY valid JSON matching the exact requested schema. Never invent or hallucinate mentor IDs.`;

    const prompt = `STARTUP CONTEXT:
- Name: ${startupName}
- Industry: ${startupIndustry}
- Current Business Stage: ${businessStage}
- Business Description: ${businessDescription || "High-growth venture seeking strategic advisory guidance."}
- Strategic Goals & Advisory Gaps: ${businessGoals}

CANDIDATE MENTORS LIST (${candidates.length} candidate profiles):
${JSON.stringify(candidates, null, 2)}

TASK:
1. Analyze each mentor's strategic fit, domain relevance, stage experience, and executive background relative to the startup's current challenges and goals.
2. Select up to ${limit} of the most suitable mentors (highest strategic synergy).
3. For each recommended mentor, determine:
   - mentor_id: MUST be the exact 'id' from the candidate mentors list above.
   - match_score: An integer between 0 and 100 based on strategic alignment, industry depth, and stage relevance.
   - match_reason: 1-2 concise, high-value sentences explaining specifically why this mentor's background directly solves the founder's challenges.
   - matching_expertise: Array of 2 to 4 key expertise areas from their profile.
   - suggested_advisory_role: A tailored boardroom role title (e.g., "Fractional CFO & Finance Lead", "Enterprise GTM Lead", "Chief Product & Architecture Advisor").

OUTPUT FORMAT:
Return strictly a valid JSON object matching this schema:
{
  "recommendations": [
    {
      "mentor_id": "actual-uuid-from-candidates",
      "match_score": 92,
      "match_reason": "Specific rationale connecting mentor's previous experience to founder's current challenges",
      "matching_expertise": ["Finance", "GTM"],
      "suggested_advisory_role": "Fractional CFO & Finance Lead"
    }
  ]
}`;

    const geminiOutput = await generateJSON<RawGeminiOutput>(prompt, {
      model: getGeminiModel(),
      systemInstruction,
      temperature: 0.2,
    });

    if (!geminiOutput || !Array.isArray(geminiOutput.recommendations)) {
      throw new Error("Gemini response missing 'recommendations' array.");
    }

    // 8. CRITICAL VALIDATION:
    //    - Validate every mentor_id returned by Gemini against real candidate IDs. Discard any fabricated UUIDs!
    //    - Clamp match_score to 0-100.
    //    - Combine with actual mentor details from database.
    const validRecommendations: AIMentorRecommendationItem[] = [];
    const seenMentorIds = new Set<string>();

    for (const rawRec of geminiOutput.recommendations) {
      if (!rawRec || typeof rawRec.mentor_id !== "string") {
        continue;
      }

      const mentorRecord = candidateMentorMap.get(rawRec.mentor_id);
      // Discard fabricated or duplicate UUIDs
      if (!mentorRecord || seenMentorIds.has(rawRec.mentor_id)) {
        continue;
      }
      seenMentorIds.add(rawRec.mentor_id);

      const clampedScore = Math.max(0, Math.min(100, Math.round(Number(rawRec.match_score) || 50)));
      const profile = Array.isArray(mentorRecord.profiles)
        ? mentorRecord.profiles[0]
        : mentorRecord.profiles;

      const item: AIMentorRecommendationItem = {
        mentor_id: mentorRecord.id,
        match_score: clampedScore,
        match_reason:
          typeof rawRec.match_reason === "string" && rawRec.match_reason.trim()
            ? rawRec.match_reason.trim()
            : `Strong strategic alignment for ${startupIndustry} growth and board governance.`,
        matching_expertise:
          Array.isArray(rawRec.matching_expertise) && rawRec.matching_expertise.length > 0
            ? rawRec.matching_expertise.map(String)
            : Array.isArray(mentorRecord.expertise)
            ? mentorRecord.expertise.slice(0, 3)
            : [],
        suggested_advisory_role:
          typeof rawRec.suggested_advisory_role === "string" && rawRec.suggested_advisory_role.trim()
            ? rawRec.suggested_advisory_role.trim()
            : "Strategic Board Advisor",
        is_ai_generated: true,
        mentor: {
          id: mentorRecord.id,
          user_id: mentorRecord.user_id,
          full_name: profile?.full_name || "Executive Advisor",
          professional_title: mentorRecord.professional_title || "Executive Advisor",
          previous_company: mentorRecord.previous_company || "Corporate Leader",
          years_of_experience: Number(mentorRecord.years_of_experience) || 0,
          expertise: Array.isArray(mentorRecord.expertise) ? mentorRecord.expertise : [],
          specialization: Array.isArray(mentorRecord.specialization) ? mentorRecord.specialization : [],
          avatar_url: profile?.avatar_url || null,
          availability: mentorRecord.availability || "advisory_only",
        },
        ...({
          match_percentage: clampedScore,
          match_label:
            clampedScore >= 90
              ? "Excellent Strategic Match"
              : clampedScore >= 75
              ? "Strong Strategic Fit"
              : "Recommended Fit",
          reason: typeof rawRec.match_reason === "string" ? rawRec.match_reason.trim() : "",
        } as any),
      };

      validRecommendations.push(item);
      if (validRecommendations.length >= limit) {
        break;
      }
    }

    // If Gemini provided valid recommendations, return them
    if (validRecommendations.length > 0) {
      return validRecommendations;
    }

    // If Gemini returned an empty list or all IDs were invalid, fall back to heuristic
    console.warn("[GeminiRecommendation] No valid candidate matches in Gemini output. Applying heuristic fallback.");
    return computeHeuristicRecommendations(
      candidatesWithDetails,
      startupIndustry,
      businessStage,
      businessGoals,
      limit
    );
  } catch (geminiError: any) {
    // 9. DETERMINISTIC FALLBACK on API error, rate limit, network failure, or JSON parsing error
    console.warn("[GeminiRecommendation] Gemini AI call failed, falling back to deterministic heuristic:", geminiError?.message);
    return computeHeuristicRecommendations(
      candidatesWithDetails,
      startupIndustry,
      businessStage,
      businessGoals,
      limit
    );
  }
}

export const GeminiRecommendationService = {
  getAIMentorRecommendations,
};
