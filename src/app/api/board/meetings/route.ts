import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getBoardMeetings,
  createBoardMeeting,
  updateBoardMeeting,
} from "@/services/board-collaboration.service";

/**
 * GET /api/board/meetings?founderId=<id>
 * Returns all meetings (upcoming and past) for the specified boardroom.
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
        { error: "Unauthorized. Please log in to view board meetings." },
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

    const meetings = await getBoardMeetings(founderId, user.id);

    return NextResponse.json({ meetings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    const status = message.startsWith("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/board/meetings
 * Schedules a new board meeting.
 * Body: { founderId, title, meetingDate, meetingTime?, agenda? }
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
        { error: "Unauthorized. Please log in to schedule meetings." },
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

    const { founderId, title, meetingDate, meetingTime, agenda } = body || {};

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

    if (!meetingDate) {
      return NextResponse.json(
        { error: "Missing required field: meetingDate" },
        { status: 400 }
      );
    }

    const meeting = await createBoardMeeting(founderId, user.id, {
      founderId,
      title,
      meetingDate,
      meetingTime,
      agenda,
    });

    return NextResponse.json({ meeting }, { status: 201 });
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
 * PATCH /api/board/meetings
 * Updates meeting details, agenda, notes, or status.
 * Body: { meetingId, title?, meetingDate?, meetingTime?, agenda?, meetingNotes?, status? }
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
        { error: "Unauthorized. Please log in to update meetings." },
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

    const { meetingId, ...updates } = body || {};

    if (!meetingId) {
      return NextResponse.json(
        { error: "Missing required field: meetingId" },
        { status: 400 }
      );
    }

    const meeting = await updateBoardMeeting(meetingId, user.id, updates);

    return NextResponse.json({ meeting });
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
