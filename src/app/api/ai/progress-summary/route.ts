import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateProgressSummary,
  AnalysisServiceError,
} from "@/services/gemini-analysis.service";

/**
 * GET /api/ai/progress-summary
 *
 * Generates an executive progress summary for a startup project.
 * Authenticates user, extracts optional projectId from search params,
 * and calls GeminiAnalysisService.generateProgressSummary.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawProjectId = searchParams.get("projectId")?.trim();
    const projectId = rawProjectId && rawProjectId.length > 0 ? rawProjectId : undefined;

    const summaryResponse = await generateProgressSummary(user.id, projectId);
    return NextResponse.json(summaryResponse, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AnalysisServiceError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }

    const errorMessage =
      err instanceof Error ? err.message : "Failed to generate progress summary";
    console.error("[API] GET /api/ai/progress-summary error:", err);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
