import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JourneyTrackerService } from "@/services/journey-tracker.service";

/**
 * GET /api/tracker/tasks?milestoneId=...
 * POST /api/tracker/tasks - Create task
 * PATCH /api/tracker/tasks - Update task
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

    const tasks = await JourneyTrackerService.getTasks(milestoneId, user.id);
    return NextResponse.json({ success: true, tasks });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch tasks";
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
    if (!body.milestone_id || !body.title) {
      return NextResponse.json(
        { error: "milestone_id and title are required." },
        { status: 400 }
      );
    }

    const result = await JourneyTrackerService.createTask(user.id, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, task: result.task }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create task";
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
      return NextResponse.json({ error: "Task id is required." }, { status: 400 });
    }

    const result = await JourneyTrackerService.updateTask(id, user.id, updates);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update task";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
