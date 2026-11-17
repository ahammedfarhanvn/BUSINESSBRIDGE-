import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRoadmap } from "@/services/gemini-roadmap.service";

/**
 * POST /api/ai/generate-roadmap
 * Generates an AI-powered execution roadmap for the authenticated founder.
 * 
 * Prospective Suggestions Only:
 * Milestones and tasks are returned for founder review and approval.
 * They are NOT automatically inserted into the database.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to generate a roadmap." },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const industry = typeof body.industry === "string" ? body.industry.trim() : "";
    const stage = typeof body.stage === "string" ? body.stage.trim() : "";
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const challenges = typeof body.challenges === "string" ? body.challenges.trim() : undefined;

    if (!industry) {
      return NextResponse.json(
        { error: "Industry is required to generate a tailored roadmap." },
        { status: 400 }
      );
    }

    if (!stage) {
      return NextResponse.json(
        { error: "Startup stage is required to generate milestone recommendations." },
        { status: 400 }
      );
    }

    if (!goal) {
      return NextResponse.json(
        { error: "Primary strategic goal is required to generate milestone recommendations." },
        { status: 400 }
      );
    }

    // 3. Call Gemini Roadmap Generation service
    const milestones = await generateRoadmap({
      industry,
      stage,
      goal,
      description,
      challenges,
    });

    // 4. Return generated prospective milestones
    return NextResponse.json({
      success: true,
      milestones,
      industry,
      stage,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate roadmap.";
    console.error("[API /api/ai/generate-roadmap] Unhandled error:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
