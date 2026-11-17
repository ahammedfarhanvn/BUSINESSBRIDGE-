import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "@/features/journey-tracker/services/project.service";
import { CreateApprovedTaskInput } from "@/types/ai";
import { TaskPriority } from "@/types/journey-tracker";

/**
 * POST /api/ai/create-task
 * Creates an authorized project task directly from an approved AI recommendation.
 * Requires explicit founder confirmation and validates project ownership.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to create tasks." },
        { status: 401 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { error: "Validation failed: Request body must be a valid JSON object." },
        { status: 400 }
      );
    }

    const body = rawBody as Partial<CreateApprovedTaskInput> & {
      milestone_id?: string;
    };

    // 1. Explicit Founder Confirmation Security Check
    if (body.confirmed_by_founder !== true) {
      return NextResponse.json(
        {
          error:
            "Explicit founder confirmation is required to create a task from AI suggestions.",
        },
        { status: 400 }
      );
    }

    // 2. Validate required fields
    const milestoneId = (body.milestoneId || body.milestone_id)?.trim();
    if (!milestoneId) {
      return NextResponse.json(
        { error: "Validation failed: milestoneId is required." },
        { status: 400 }
      );
    }

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json(
        { error: "Validation failed: title is required." },
        { status: 400 }
      );
    }

    // 3. Validate milestone existence and verify project ownership by user
    const { data: milestone, error: milestoneError } = await supabase
      .from("project_milestones")
      .select("id, project_id")
      .eq("id", milestoneId)
      .maybeSingle();

    if (milestoneError) {
      console.error("[POST /api/ai/create-task] Milestone query error:", milestoneError);
      return NextResponse.json(
        { error: `Database error: ${milestoneError.message}` },
        { status: 500 }
      );
    }

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    }

    const { data: project, error: projectError } = await supabase
      .from("startup_projects")
      .select("id, founder_id")
      .eq("id", milestone.project_id)
      .maybeSingle();

    if (projectError) {
      console.error("[POST /api/ai/create-task] Project query error:", projectError);
      return NextResponse.json(
        { error: `Database error: ${projectError.message}` },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json(
        { error: "Associated project not found." },
        { status: 404 }
      );
    }

    if (project.founder_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "Forbidden: You do not own the project associated with this milestone.",
        },
        { status: 403 }
      );
    }

    // 4. Validate Priority
    const validPriorities = new Set<TaskPriority>(["low", "medium", "high", "critical"]);
    const priority: TaskPriority =
      body.priority && validPriorities.has(body.priority as TaskPriority)
        ? (body.priority as TaskPriority)
        : "medium";

    // 5. Create task via Phase 4 project service
    const task = await createTask(milestoneId, user.id, {
      title,
      description: body.description?.trim(),
      priority,
      due_date: body.due_date || undefined,
      assigned_to: body.assigned_to || undefined,
    });

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/ai/create-task] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message.includes("Forbidden") || message.includes("not have access")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
