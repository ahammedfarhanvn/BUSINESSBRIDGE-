import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  updateTask,
  deleteTask,
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

export async function PATCH(request: Request, props: RouteParams) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to update task" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Validation failed: Request body is required" },
        { status: 400 }
      );
    }

    const updated = await updateTask(id, user.id, body);
    return NextResponse.json({ task: updated }, { status: 200 });
  } catch (error: unknown) {
    console.error("[PATCH /api/tasks/:id] Error:", error);
    return mapErrorToResponse(error);
  }
}

export async function DELETE(request: Request, props: RouteParams) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to delete task" },
        { status: 401 }
      );
    }

    await deleteTask(id, user.id);
    return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 });
  } catch (error: unknown) {
    console.error("[DELETE /api/tasks/:id] Error:", error);
    return mapErrorToResponse(error);
  }
}
