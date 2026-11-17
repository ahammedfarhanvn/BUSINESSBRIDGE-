import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getBoardRecommendations,
  createBoardRecommendation,
  updateBoardRecommendationStatus,
} from "@/services/board-collaboration.service";
import { BoardRecommendationStatus } from "@/types/boardroom";

/**
 * GET /api/board/recommendations?founderId=<id>
 * Returns all formal strategic board recommendations for the specified founder's boardroom.
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
        { error: "Unauthorized. Please log in to view board recommendations." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const founderId = searchParams.get("founderId");

    if (!founderId) {
      return NextResponse.json(
        { error: "Missing required query parameter: founderId" },
        { status: 400 }
      );
    }

    const recommendations = await getBoardRecommendations(founderId, user.id);

    return NextResponse.json({ recommendations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    const status = message.startsWith("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/board/recommendations
 * Creates a new formal strategic board recommendation.
 * Body: { founderId, title, description, status? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to create board recommendations." },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { founderId, title, description, status } = body || {};

    if (!founderId) {
      return NextResponse.json(
        { error: "Missing required field: founderId" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Missing required field: title" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { error: "Missing required field: description" },
        { status: 400 }
      );
    }

    const recommendation = await createBoardRecommendation(founderId, user.id, {
      founderId,
      title,
      description,
      status: (status as BoardRecommendationStatus) || "proposed",
    });

    return NextResponse.json({ recommendation }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    let status = 500;
    if (message.startsWith("Unauthorized")) {
      status = 403;
    } else if (message.includes("required") || message.includes("Invalid")) {
      status = 400;
    }
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PATCH /api/board/recommendations
 * Updates the execution status of a recommendation.
 * Body: { recommendationId, status: 'proposed' | 'in_progress' | 'completed' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to update recommendation status." },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { recommendationId, status } = body || {};

    if (!recommendationId) {
      return NextResponse.json(
        { error: "Missing required field: recommendationId" },
        { status: 400 }
      );
    }

    if (!status || !["proposed", "in_progress", "completed"].includes(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid or missing status. Allowed values: 'proposed', 'in_progress', 'completed'.",
        },
        { status: 400 }
      );
    }

    const recommendation = await updateBoardRecommendationStatus(
      recommendationId,
      user.id,
      status
    );

    return NextResponse.json({ recommendation });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    let status = 500;
    if (message.startsWith("Unauthorized")) {
      status = 403;
    } else if (message.includes("not found")) {
      status = 404;
    } else if (message.includes("required") || message.includes("Invalid")) {
      status = 400;
    }
    return NextResponse.json({ error: message }, { status });
  }
}
