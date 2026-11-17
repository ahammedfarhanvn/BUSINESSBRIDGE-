import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getStartupProjectById,
  updateStartupProject,
  deleteStartupProject,
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
        { error: "Unauthorized: Please sign in to view this project" },
        { status: 401 }
      );
    }

    const details = await getStartupProjectById(id, user.id);
    return NextResponse.json(details, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/projects/:id] Error:", error);
    return mapErrorToResponse(error);
  }
}

export async function PATCH(request: Request, props: RouteParams) {
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
        { error: "Unauthorized: Please sign in to update this project" },
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

    const updated = await updateStartupProject(id, user.id, body);
    return NextResponse.json({ project: updated }, { status: 200 });
  } catch (error: unknown) {
    console.error("[PATCH /api/projects/:id] Error:", error);
    return mapErrorToResponse(error);
  }
}

export async function DELETE(request: Request, props: RouteParams) {
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
        { error: "Unauthorized: Please sign in to delete this project" },
        { status: 401 }
      );
    }

    await deleteStartupProject(id, user.id);
    return NextResponse.json({ message: "Project deleted successfully" }, { status: 200 });
  } catch (error: unknown) {
    console.error("[DELETE /api/projects/:id] Error:", error);
    return mapErrorToResponse(error);
  }
}
