import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JourneyTrackerService } from "@/services/journey-tracker.service";

/**
 * GET /api/tracker/milestones?projectId=...
 * POST /api/tracker/milestones - Create milestone
 * PATCH /api/tracker/milestones - Update milestone
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId query parameter required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const milestones = await JourneyTrackerService.getMilestones(projectId, user.id);
    return NextResponse.json({ success: true, milestones });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch milestones";
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
    if (!body.project_id || !body.title) {
      return NextResponse.json(
        { error: "project_id and title are required." },
        { status: 400 }
      );
    }

    const result = await JourneyTrackerService.createMilestone(user.id, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, milestone: result.milestone }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create milestone";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Milestone id is required." }, { status: 400 });
    }

    const result = await JourneyTrackerService.updateMilestone(id, user.id, updates);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update milestone";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
