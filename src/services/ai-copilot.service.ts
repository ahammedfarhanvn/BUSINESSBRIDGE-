import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateGeminiContent } from "@/lib/gemini";

export interface AskCopilotParams {
  founderId: string;
  question: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: {
    startupName?: string;
    industry?: string;
    stage?: string;
    description?: string;
    goals?: string;
  };
}

export const AICopilotService = {
  /**
   * Process founder's question through Gemini with rich business context
   */
  async askCopilot(params: AskCopilotParams): Promise<{ answer: string; is_ai_generated: boolean }> {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    // 1. Fetch founder's startup profile if not supplied in context
    let startupName = params.context?.startupName;
    let industry = params.context?.industry;
    let stage = params.context?.stage;
    let goals = params.context?.goals;
    let description = params.context?.description;

    if (!startupName || !industry) {
      const { data: startup } = await supabase
        .from("startups")
        .select("name, industry, business_stage, description")
        .eq("founder_id", params.founderId)
        .maybeSingle();

      if (startup) {
        startupName = startupName || startup.name;
        industry = industry || startup.industry;
        stage = stage || startup.business_stage;
        description = description || startup.description;
      }

      const { data: founderProfile } = await supabase
        .from("founder_profiles")
        .select("business_goals, startup_name, industry, business_stage")
        .eq("user_id", params.founderId)
        .maybeSingle();

      if (founderProfile) {
        startupName = startupName || founderProfile.startup_name;
        industry = industry || founderProfile.industry;
        stage = stage || founderProfile.business_stage;
        goals = goals || founderProfile.business_goals;
      }
    }

    // 2. Build conversation history excerpt (last 4 turns)
    const recentHistory = (params.history || [])
      .slice(-4)
      .map((h) => `${h.role === "user" ? "Founder" : "Copilot"}: ${h.content}`)
      .join("\n");

    const systemPrompt = `You are the BusinessBridge AI Business Copilot, an elite executive business advisor, corporate strategist, and venture partner.
You guide early-stage and growing startup founders using proven business acumen, financial rigor, and executive wisdom.

Founder & Startup Context:
- Venture Name: ${startupName || "Early-stage venture"}
- Industry: ${industry || "Technology & Business"}
- Current Stage: ${stage || "Product Development / Validation"}
- Business Description: ${description || "Building innovative solutions"}
- Strategic Goals: ${goals || "Scale customer traction and prepare for advisory boardroom reviews"}

Formatting Guidelines:
- Write with professional clarity, high strategic density, and constructive executive tone.
- Organize your response with clear sections:
  1. Executive Summary / Core Answer (2-3 sentences)
  2. Strategic Rationale & Key Considerations
  3. Actionable Next Steps (3-4 bullet points)
  4. Boardroom Perspective (how to communicate this to advisors)
- Avoid generic corporate fluff. Give concrete numbers, frameworks, and practical milestones where relevant.`;

    const userPrompt = `${recentHistory ? `Recent Conversation:\n${recentHistory}\n\n` : ""}Founder Question: ${params.question.trim()}

Provide a structured, executive-level response:`;

    try {
      const geminiRes = await generateGeminiContent(userPrompt, {
        systemInstruction: systemPrompt,
      });
      if (geminiRes && geminiRes.trim().length > 0) {
        return {
          answer: geminiRes.trim(),
          is_ai_generated: true,
        };
      }
    } catch (err) {
      console.warn("[AICopilotService] Gemini call failed, using fallback:", err);
    }

    // Deterministic fallback response
    return {
      answer: getFallbackCopilotAnswer(params.question, stage, industry),
      is_ai_generated: false,
    };
  },
};

function getFallbackCopilotAnswer(question: string, stage?: string, industry?: string): string {
  const q = question.toLowerCase();

  if (q.includes("valuation") || q.includes("seed") || q.includes("raise") || q.includes("fundrais")) {
    return `### Executive Advisory: Early-Stage Valuation & Fundraising

**Core Perspective**: At the ${stage || "current"} stage, valuation is primarily driven by team pedigree, market size (TAM), and derisked proof-of-traction rather than discounted cash flow (DCF).

**Strategic Considerations**:
- **Milestone Sizing**: Raise enough capital to achieve 18-24 months of runway plus 6 months buffer to hit the next demonstrable valuation inflection point.
- **Instrument Choice**: Utilize Post-Money SAFEs (Y Combinator standard) or Convertible Notes with a valuation cap to minimize legal expense and friction.
- **Dilution Benchmark**: Target 15-20% equity dilution for a priced seed round.

**Actionable Steps**:
1. Audit unit economics (CAC, LTV, payback period) with your virtual boardroom finance mentor.
2. Build an active pipeline of at least 30 sector-specific angels and pre-seed micro-VCs.
3. Prepare a crisp 10-slide deck focusing on the problem intensity and your proprietary solution advantage.`;
  }

  if (q.includes("board") || q.includes("mentor") || q.includes("meeting") || q.includes("agenda")) {
    return `### Executive Advisory: Board Governance & Advisor Management

**Core Perspective**: Advisory board meetings must focus on high-stakes strategic friction, not routine status recitation. Send pre-reads 48 hours in advance so the live discussion is 80% strategic problem-solving.

**Suggested Agenda (60 Minutes)**:
1. **CEO State of the Union (10 mins)**: Highs, lows, and existential priorities.
2. **Key Metric Deep Dive (15 mins)**: Progress against roadmap milestones, burn rate, and runway.
3. **Core Strategic Dilemma (30 mins)**: One or two major forks in the road (e.g., enterprise vs. self-serve GTM).
4. **Action Items & Accountability (5 mins)**: Document formal recommendations in BusinessBridge.

**Actionable Steps**:
1. Post meeting agendas in the Virtual Boardroom Module at least 2 days prior.
2. Assign follow-up tasks to respective leads directly in the Business Journey Tracker.`;
  }

  return `### Strategic Business Advisory

**Overview**: To effectively address your inquiry regarding *"${question}"*, ensure your operational priorities stay aligned with your startup stage (${stage || "Early Traction"}).

**Strategic Pillars**:
- **Focus on the Bottleneck**: Identify whether your primary constraint is customer acquisition, product velocity, or capital runway.
- **Iterative Validation**: Test assumptions with small pilot cohorts before committing major technical or capital resources.
- **Board Alignment**: Review strategic trade-offs with your retired executive mentors in the Virtual Boardroom.

**Recommended Actions**:
1. Break down this objective into measurable deliverables in the Business Journey Tracker.
2. Schedule a 30-minute advisory review with your domain mentor to evaluate risks.`;
}
