import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JourneyTrackerService } from "@/services/journey-tracker.service";

/**
 * GET /api/tracker/progress?projectId=... - Calculate project progress
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

    const result = await JourneyTrackerService.getProjectProgress(projectId, user.id);
    if (!result.progress) {
      return NextResponse.json({ error: result.error || "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, progress: result.progress });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to calculate progress";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
