import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getStartupProjects,
  createStartupProject,
} from "@/features/journey-tracker/services/project.service";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to access projects" },
        { status: 401 }
      );
    }

    const projects = await getStartupProjects(user.id);
    return NextResponse.json({ projects }, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/projects] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to create a project" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Validation failed: Project name is required" },
        { status: 400 }
      );
    }

    const project = await createStartupProject(user.id, {
      name: body.name,
      description: body.description,
      industry: body.industry,
      stage: body.stage,
      goal: body.goal,
      target_launch_date: body.target_launch_date,
      status: body.status,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/projects] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
