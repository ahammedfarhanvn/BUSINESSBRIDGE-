import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendBoardInvitation,
  getFounderInvitations,
  getMentorInvitations,
  respondToInvitation,
} from "@/services/board-membership.service";
import { SendInvitationInput, RespondInvitationInput } from "@/types/boardroom";

/**
 * GET /api/board/invitations
 * Retrieves invitations for the authenticated user.
 * - If the user is a founder, returns all invitations they have issued.
 * - If the user is a mentor, returns all invitations addressed to them.
 * - Supports ?type=sent|received or ?founderId=... to override.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // Fetch user profile to detect role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "founder";
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type"); // "sent" | "received" | "founder" | "mentor"
    const explicitFounderId = searchParams.get("founderId");

    // If an explicit founder ID is requested and user is admin or that founder
    if (explicitFounderId && (profile?.role === "admin" || explicitFounderId === user.id)) {
      const res = await getFounderInvitations(explicitFounderId);
      return NextResponse.json({
        success: res.success,
        invitations: res.data || [],
        data: res.data || [],
        error: res.error,
      });
    }

    // Role or query parameter routing
    if (typeParam === "received" || typeParam === "mentor" || role === "mentor") {
      const res = await getMentorInvitations(user.id);
      return NextResponse.json({
        success: res.success,
        invitations: res.data || [],
        data: res.data || [],
        error: res.error,
      });
    }

    // Default to founder invitations
    const res = await getFounderInvitations(user.id);
    return NextResponse.json({
      success: res.success,
      invitations: res.data || [],
      data: res.data || [],
      error: res.error,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error fetching invitations.";
    console.error("[API /api/board/invitations GET] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * POST /api/board/invitations
 * Sends a new board invitation.
 * Request body: { mentorId: string, message?: string }
 * Caller must be authenticated and have the 'founder' or 'admin' role.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // Verify user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "founder" && profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only founders can send board invitations." },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = (await req.json()) as SendInvitationInput;
    if (!body || !body.mentorId) {
      return NextResponse.json(
        { error: "Invalid request payload. 'mentorId' is required." },
        { status: 400 }
      );
    }

    const result = await sendBoardInvitation(user.id, body.mentorId, body.message);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send board invitation." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        invitation: result.data,
        data: result.data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error creating invitation.";
    console.error("[API /api/board/invitations POST] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * PATCH /api/board/invitations
 * Accepts or rejects an invitation.
 * Request body: { invitationId: string, decision: 'accepted' | 'rejected' }
 * Caller must be the mentor addressed in the invitation.
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = (await req.json()) as RespondInvitationInput;
    if (!body || !body.invitationId || !body.decision) {
      return NextResponse.json(
        { error: "Invalid request payload. 'invitationId' and 'decision' are required." },
        { status: 400 }
      );
    }

    if (body.decision !== "accepted" && body.decision !== "rejected") {
      return NextResponse.json(
        { error: "Invalid decision. Must be 'accepted' or 'rejected'." },
        { status: 400 }
      );
    }

    const result = await respondToInvitation(user.id, body.invitationId, body.decision);

    if (!result.success) {
      const isForbidden = result.error?.toLowerCase().includes("unauthorized");
      return NextResponse.json(
        { error: result.error || "Failed to update invitation status." },
        { status: isForbidden ? 403 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: result.data,
      data: result.data,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error responding to invitation.";
    console.error("[API /api/board/invitations PATCH] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
