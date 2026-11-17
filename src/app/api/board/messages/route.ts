import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBoardMessages, sendBoardMessage } from "@/services/board-chat.service";

/**
 * GET /api/board/messages?founderId=<id>&limit=<n>&before=<timestamp>
 * Fetches chronological messages for a founder's boardroom chat channel.
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
        { error: "Unauthorized. Please log in to view board messages." },
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

    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const before = searchParams.get("before") || undefined;

    const messages = await getBoardMessages(founderId, user.id, {
      limit: limit && !isNaN(limit) ? limit : undefined,
      before,
    });

    return NextResponse.json({ messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    const status = message.startsWith("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/board/messages
 * Sends a message into the founder's boardroom chat channel.
 * Request body: { founderId: string, message: string }
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
        { error: "Unauthorized. Please log in to send board messages." },
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

    const { founderId, message } = body || {};

    if (!founderId) {
      return NextResponse.json(
        { error: "Missing required field: founderId." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message cannot be empty." },
        { status: 400 }
      );
    }

    const createdMessage = await sendBoardMessage(founderId, user.id, message);

    return NextResponse.json({ message: createdMessage }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    let status = 500;
    if (message.startsWith("Unauthorized")) {
      status = 403;
    } else if (
      message.includes("cannot be empty") ||
      message.includes("cannot exceed") ||
      message.includes("required")
    ) {
      status = 400;
    }
    return NextResponse.json({ error: message }, { status });
  }
}
