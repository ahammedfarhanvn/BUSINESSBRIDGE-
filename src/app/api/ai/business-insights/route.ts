import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIInsightsService } from "@/services/ai-insights.service";

/**
 * POST & GET /api/ai/business-insights - Get real operational progress metrics & AI business risks
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const insights = await AIInsightsService.getBusinessInsights(user.id, projectId);
    return NextResponse.json({ success: true, insights });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch business insights";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const insights = await AIInsightsService.getBusinessInsights(user.id, body.projectId);
    return NextResponse.json({ success: true, insights });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch business insights";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
