import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIMentorRecommendations } from "@/services/gemini-recommendation.service";

/**
 * POST /api/ai/mentor-recommendations
 * Generates AI-powered executive mentor recommendations for the authenticated founder.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized. You must be signed in to request AI mentor recommendations.",
          recommendations: [],
        },
        { status: 401 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Empty or non-JSON request body is acceptable; defaults to founder profile
    }

    const { startupId, industry, goals, limit } = body || {};

    const recommendations = await getAIMentorRecommendations(user.id, {
      startupId: typeof startupId === "string" ? startupId : undefined,
      industry: typeof industry === "string" ? industry : undefined,
      goals: typeof goals === "string" ? goals : undefined,
      limit: typeof limit === "number" ? limit : undefined,
    });

    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate mentor recommendations.";
    console.error("[API/mentor-recommendations] Unhandled error:", message);

    return NextResponse.json(
      {
        error: message,
        recommendations: [],
      },
      { status: 500 }
    );
  }
}
