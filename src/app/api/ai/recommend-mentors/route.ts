import { NextRequest } from "next/server";
import { POST as handleMentorRecommendations } from "../mentor-recommendations/route";

/**
 * POST /api/ai/recommend-mentors
 * Alias route handler for seamless frontend integration with Virtual Boardroom components.
 * Delegates directly to the primary mentor recommendations controller.
 */
export async function POST(req: NextRequest) {
  return handleMentorRecommendations(req);
}
