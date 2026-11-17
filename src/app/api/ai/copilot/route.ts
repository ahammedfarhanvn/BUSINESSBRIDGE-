import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askBusinessCopilot } from "@/services/gemini-copilot.service";
import { CopilotQueryInput } from "@/types/ai";

/**
 * POST /api/ai/copilot
 * Executive Business Copilot endpoint for startup founders.
 * Provides live contextual advisory synthesizing milestones, task health, and advisory board feedback.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user session via Supabase server client
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Please sign in to consult with the Business Copilot.",
        },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body: Partial<CopilotQueryInput>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON format in request body.",
        },
        { status: 400 }
      );
    }

    const { question, projectId, conversationHistory } = body || {};

    // 3. Reject empty questions (400)
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Question is required and must not be empty.",
        },
        { status: 400 }
      );
    }

    // Validate projectId if provided
    const cleanProjectId =
      typeof projectId === "string" && projectId.trim()
        ? projectId.trim()
        : undefined;

    // Validate conversationHistory if provided
    const cleanHistory = Array.isArray(conversationHistory)
      ? conversationHistory.filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
      : undefined;

    // 4. Call Business Copilot service
    const copilotResponse = await askBusinessCopilot(user.id, {
      question: question.trim(),
      projectId: cleanProjectId,
      conversationHistory: cleanHistory,
    });

    // 5. Handle service level errors & proper HTTP status codes
    if (!copilotResponse.success) {
      const errorMsg = copilotResponse.error || "Failed to process Copilot query.";
      const errorLower = errorMsg.toLowerCase();

      let statusCode = 500;
      if (errorLower.includes("unauthorized") || errorLower.includes("invalid founder")) {
        statusCode = 401;
      } else if (
        errorLower.includes("forbidden") ||
        errorLower.includes("access denied") ||
        errorLower.includes("permission")
      ) {
        statusCode = 403;
      } else if (errorLower.includes("not found")) {
        statusCode = 404;
      } else if (errorLower.includes("required") || errorLower.includes("invalid")) {
        statusCode = 400;
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          answer: copilotResponse.answer,
        },
        { status: statusCode }
      );
    }

    // 6. Return successful structured response
    return NextResponse.json(
      {
        success: true,
        answer: copilotResponse.answer,
        key_takeaways: copilotResponse.key_takeaways,
        referenced_milestones: copilotResponse.referenced_milestones || [],
        referenced_tasks: copilotResponse.referenced_tasks || [],
        referenced_feedback: copilotResponse.referenced_feedback || [],
        suggested_actions: copilotResponse.suggested_actions || [],
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[POST /api/ai/copilot] Server error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error occurred.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
