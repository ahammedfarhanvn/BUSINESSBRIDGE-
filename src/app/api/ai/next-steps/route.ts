import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateNextSteps } from "@/services/gemini-next-steps.service";

/**
 * GET /api/ai/next-steps
 * Returns 3-5 concrete, prioritized next action items for the authenticated founder.
 * Supports optional ?projectId= query parameter; otherwise resolves founder's active project.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to access next-step recommendations." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId =
      searchParams.get("projectId") ||
      searchParams.get("project_id") ||
      undefined;

    const result = await generateNextSteps(user.id, projectId);

    return NextResponse.json(
      {
        success: true,
        project_id: result.project_id,
        suggestions: result.suggestions,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[GET /api/ai/next-steps] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message.includes("Forbidden") || message.includes("not have access")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes("not found") || message.includes("No startup project found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
