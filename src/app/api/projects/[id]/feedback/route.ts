import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProjectFeedback,
  submitMilestoneFeedback,
} from "@/features/journey-tracker/services/feedback.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/feedback
 * Retrieves feedback for a project, optionally filtered by milestoneId or taskId.
 * Verifies that the authenticated user is either the founder or an active board mentor.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required." },
        { status: 400 }
      );
    }

    // 1. Authenticate user session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view project feedback." },
        { status: 401 }
      );
    }

    // 2. Extract query filters
    const { searchParams } = new URL(req.url);
    const milestoneId = searchParams.get("milestoneId") || undefined;
    const taskId = searchParams.get("taskId") || undefined;

    // 3. Fetch enriched feedback
    const feedback = await getProjectFeedback(projectId, user.id, {
      milestoneId,
      taskId,
    });

    return NextResponse.json({
      success: true,
      feedback,
      count: feedback.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load project feedback.";
    console.error("[API /api/projects/[id]/feedback GET] Error:", message);

    if (message.toLowerCase().includes("unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.toLowerCase().includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/feedback
 * Submits mentor or founder feedback on a project milestone or task.
 * Verifies that the authenticated user is an active board mentor or the founder.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required." },
        { status: 400 }
      );
    }

    // 1. Authenticate user session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to submit feedback." },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const content = typeof body.content === "string" ? body.content.trim() : "";
    const milestoneId =
      typeof body.milestoneId === "string" && body.milestoneId.trim()
        ? body.milestoneId.trim()
        : undefined;
    const taskId =
      typeof body.taskId === "string" && body.taskId.trim()
        ? body.taskId.trim()
        : undefined;

    if (!content) {
      return NextResponse.json(
        { error: "Feedback content is required." },
        { status: 400 }
      );
    }

    // 3. Submit feedback via service
    const feedback = await submitMilestoneFeedback(user.id, {
      projectId,
      milestoneId,
      taskId,
      content,
    });

    return NextResponse.json(
      {
        success: true,
        feedback,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to submit feedback.";
    console.error("[API /api/projects/[id]/feedback POST] Error:", message);

    if (message.toLowerCase().includes("unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (
      message.toLowerCase().includes("not exist") ||
      message.toLowerCase().includes("not found")
    ) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.toLowerCase().includes("does not belong")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
