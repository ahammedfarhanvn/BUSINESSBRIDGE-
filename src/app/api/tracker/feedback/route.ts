import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JourneyTrackerService } from "@/services/journey-tracker.service";

/**
 * GET /api/tracker/feedback?milestoneId=...
 * POST /api/tracker/feedback - Submit mentor feedback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get("milestoneId");

    if (!milestoneId) {
      return NextResponse.json({ error: "milestoneId query parameter required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const feedback = await JourneyTrackerService.getFeedback(milestoneId, user.id);
    return NextResponse.json({ success: true, feedback });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch feedback";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.milestone_id || !body.content) {
      return NextResponse.json(
        { error: "milestone_id and content are required." },
        { status: 400 }
      );
    }

    const result = await JourneyTrackerService.createFeedback(user.id, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, feedback: result.feedback }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit feedback";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
