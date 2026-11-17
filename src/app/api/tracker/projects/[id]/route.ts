import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JourneyTrackerService } from "@/services/journey-tracker.service";

/**
 * GET /api/tracker/projects/[id] - Fetch single enriched project with milestones, tasks, feedback, and progress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await JourneyTrackerService.getProject(id, user.id);
    if (!result.project) {
      return NextResponse.json({ error: result.error || "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, project: result.project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load project";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
