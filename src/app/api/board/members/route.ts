import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getBoardMembers,
  isUserBoardMemberOrFounder,
} from "@/services/board-membership.service";

/**
 * GET /api/board/members
 * Retrieves board members for a given founder's advisory board.
 * Query Parameters:
 * - founderId: (optional) UUID of founder. If omitted and caller is a founder, defaults to caller.id.
 * Caller must be authenticated and authorized (founder, active board member, or admin).
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

    const { searchParams } = new URL(req.url);
    let targetFounderId = searchParams.get("founderId");

    // If founderId is omitted, check user's role to determine default
    if (!targetFounderId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "founder") {
        targetFounderId = user.id;
      } else {
        return NextResponse.json(
          { error: "Bad Request: 'founderId' query parameter is required." },
          { status: 400 }
        );
      }
    }

    // Authorization check: Verify caller has access to this boardroom
    const hasAccess = await isUserBoardMemberOrFounder(user.id, targetFounderId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this advisory board's members." },
        { status: 403 }
      );
    }

    const result = await getBoardMembers(targetFounderId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to retrieve board members." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      members: result.data || [],
      data: result.data || [],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error fetching board members.";
    console.error("[API /api/board/members GET] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
