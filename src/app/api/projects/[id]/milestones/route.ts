import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getMilestones,
  createMilestone,
} from "@/features/journey-tracker/services/project.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function mapErrorToResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";
  if (message.includes("Forbidden") || message.includes("access denied")) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (message.includes("not found") || message.includes("Not found")) {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  if (message.includes("Unauthorized")) {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  if (message.includes("Validation") || message.includes("required")) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(request: Request, props: RouteParams) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to view milestones" },
        { status: 401 }
      );
    }

    const milestones = await getMilestones(id, user.id);
    return NextResponse.json({ milestones }, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/projects/:id/milestones] Error:", error);
    return mapErrorToResponse(error);
  }
}

export async function POST(request: Request, props: RouteParams) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to create a milestone" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Validation failed: Milestone title is required" },
        { status: 400 }
      );
    }

    const milestone = await createMilestone(id, user.id, {
      title: body.title,
      description: body.description,
      stage: body.stage,
      start_date: body.start_date,
      due_date: body.due_date,
      priority: body.priority,
      sort_order: body.sort_order,
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/projects/:id/milestones] Error:", error);
    return mapErrorToResponse(error);
  }
}
