/**
 * BusinessBridge - Gemini AI Startup Roadmap Service
 * Senior Startup Advisory & Prospective Milestone Generation
 * 
 * Generates structured, chronological execution roadmaps using Google Gemini models,
 * with deterministic stage/industry heuristic fallback when Gemini API is unconfigured or unavailable.
 * 
 * STRICT PROSPECTIVE PLANNING:
 * - Generates proposed milestones and actionable tasks for founder review and approval.
 * - Does NOT mark tasks as completed or assume existing progress.
 * - Does NOT automatically write or commit to the database.
 */

import { generateJSON, isGeminiConfigured, getGeminiModel } from "@/lib/gemini";
import {
  RoadmapSuggestionItem,
  MilestonePriority,
  TaskPriority,
} from "@/types/journey-tracker";

export interface GenerateRoadmapInput {
  industry: string;
  stage: string;
  goal: string;
  description: string;
  challenges?: string;
}

interface RawGeminiRoadmapResponse {
  milestones: Array<{
    title: string;
    description: string;
    stage?: string;
    priority?: string;
    suggested_tasks: Array<{
      title: string;
      description?: string;
      priority?: string;
    }>;
  }>;
}

const VALID_PRIORITIES: MilestonePriority[] = ["low", "medium", "high", "critical"];

function normalizeMilestonePriority(val: unknown): MilestonePriority {
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower === "critical" || lower === "urgent") return "critical";
    if (lower === "high") return "high";
    if (lower === "low") return "low";
    if (lower === "medium" || lower === "normal") return "medium";
  }
  return "high";
}

function normalizeTaskPriority(val: unknown): TaskPriority {
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower === "critical" || lower === "urgent") return "critical";
    if (lower === "high") return "high";
    if (lower === "low") return "low";
    if (lower === "medium" || lower === "normal") return "medium";
  }
  return "medium";
}

/**
 * Deterministic roadmap generator based on startup stage and industry.
 * Used when Gemini API is not configured or in case of network/rate-limit failures.
 */
export function generateDeterministicRoadmap(
  input: GenerateRoadmapInput
): RoadmapSuggestionItem[] {
  const normStage = (input.stage || "").toLowerCase().trim();
  const industry = input.industry?.trim() || "Technology";
  const goal = input.goal?.trim() || "achieve market validation and initial scale";

  // Stage 1: Idea / Ideation / Concept
  if (
    normStage.includes("idea") ||
    normStage.includes("concept") ||
    normStage.includes("validation")
  ) {
    return [
      {
        title: `Customer Problem Discovery & ${industry} Validation`,
        description: `Conduct qualitative discovery to validate core acute pain points and willingness to pay within the ${industry} space.`,
        stage: input.stage,
        priority: "critical",
        suggested_tasks: [
          {
            title: `Define ${industry} Ideal Customer Profile (ICP)`,
            description: "Map target persona demographics, budget authority, specific daily friction points, and alternative workarounds.",
            priority: "high",
          },
          {
            title: "Conduct 15-20 Target Customer Discovery Interviews",
            description: "Execute structured non-leading problem interviews with target stakeholders to confirm market urgency.",
            priority: "critical",
          },
          {
            title: "Synthesize Validation Findings & Pain Matrix",
            description: `Document top 3 validated acute problem statements aligned with: "${goal}".`,
            priority: "high",
          },
        ],
      },
      {
        title: "Competitive Landscape & Value Proposition Definition",
        description: `Analyze existing direct and indirect incumbents in ${industry} to carve out an unassailable wedge.`,
        stage: input.stage,
        priority: "high",
        suggested_tasks: [
          {
            title: "Map Top 5 Incumbents & Emergent Competitors",
            description: "Audit competitor feature gaps, pricing models, target segment trade-offs, and customer complaints.",
            priority: "medium",
          },
          {
            title: "Draft Unique Value Proposition (UVP) & Lean Canvas",
            description: "Articulate concise 1-page business model blueprint highlighting distinct defensibility.",
            priority: "high",
          },
          {
            title: "Advisory Board Consultation on Positioning",
            description: "Review value proposition hypothesis with experienced mentor and advisory network.",
            priority: "medium",
          },
        ],
      },
      {
        title: "Solution Prototype & Smoke Test Experimentation",
        description: "Test market resonance using interactive wireframes and a smoke-test landing page before writing heavy code.",
        stage: input.stage,
        priority: "high",
        suggested_tasks: [
          {
            title: "Build Clickable High-Fidelity Prototype",
            description: "Design key core user journey wireframes demonstrating immediate time-to-value.",
            priority: "high",
          },
          {
            title: "Deploy Waitlist Smoke Test Landing Page",
            description: `Launch targeted landing page articulating solution benefits to collect initial qualified waitlist signups.`,
            priority: "critical",
          },
          {
            title: "Run Prototype Usability Walkthroughs",
            description: "Walk 10 interviewees through the clickable prototype to observe friction and gather feedback.",
            priority: "medium",
          },
        ],
      },
      {
        title: "MVP Specification & Technical Architecture Blueprint",
        description: "Define the minimal functional scope required to deliver value and establish the technical implementation plan.",
        stage: input.stage,
        priority: "medium",
        suggested_tasks: [
          {
            title: "Draft Product Requirements Document (PRD)",
            description: "Separate must-have v1 core features from post-launch enhancements.",
            priority: "high",
          },
          {
            title: "Select Tech Stack & Architecture Baseline",
            description: `Establish modern scalable database, security, and cloud framework appropriate for ${industry}.`,
            priority: "medium",
          },
          {
            title: "Set 6-Week MVP Development Milestones",
            description: "Break build phases into discrete bi-weekly sprint deliverables with clear acceptance criteria.",
            priority: "medium",
          },
        ],
      },
    ];
  }

  // Stage 2: Prototype / MVP / Build
  if (
    normStage.includes("proto") ||
    normStage.includes("mvp") ||
    normStage.includes("product") ||
    normStage.includes("build")
  ) {
    return [
      {
        title: "Core Minimum Viable Product (MVP) Engineering",
        description: `Implement the foundational backend, authentication, and core workflow delivering the primary value proposition in ${industry}.`,
        stage: input.stage,
        priority: "critical",
        suggested_tasks: [
          {
            title: "Implement Authentication, Roles & Security Baseline",
            description: "Establish row-level security, session management, and encrypted user credentials.",
            priority: "critical",
          },
          {
            title: "Build Primary User Workflow & Core Engine",
            description: `Develop end-to-end functionality directly supporting the strategic goal: "${goal}".`,
            priority: "critical",
          },
          {
            title: "Integrate Third-Party APIs & Payment / Webhooks",
            description: "Wire up essential external services and infrastructure dependencies.",
            priority: "high",
          },
        ],
      },
      {
        title: "Internal QA & Closed Alpha Testing",
        description: "Subject the prototype to end-to-end stress testing and invite a trusted cohort of design partners.",
        stage: input.stage,
        priority: "high",
        suggested_tasks: [
          {
            title: "Onboard 5-10 Friendly Design Partners",
            description: `Provision test accounts for trusted ${industry} users to exercise core workflows.`,
            priority: "high",
          },
          {
            title: "Instrument Telemetry & Error Tracking",
            description: "Deploy real-time error logging, crash analytics, and user session monitoring.",
            priority: "high",
          },
          {
            title: "Triage & Fix High-Severity Blocking Bugs",
            description: "Resolve all usability blockers and data integrity bugs identified in alpha trials.",
            priority: "critical",
          },
        ],
      },
      {
        title: "Product Iteration & Beta Readiness",
        description: "Incorporate initial tester feedback, refine onboarding UX, and prepare production infrastructure.",
        stage: input.stage,
        priority: "high",
        suggested_tasks: [
          {
            title: "Streamline First-Time Onboarding Experience",
            description: "Reduce time-to-first-value to under 3 minutes for new users.",
            priority: "high",
          },
          {
            title: "Conduct Security & Data Privacy Review",
            description: `Ensure compliance with industry standards and data protection regulations for ${industry}.`,
            priority: "high",
          },
          {
            title: "Prepare Private Beta Rollout Plan",
            description: "Finalize beta invite cadence and schedule weekly founder check-ins with users.",
            priority: "medium",
          },
        ],
      },
      {
        title: "Beta Launch & Early Feedback Loop",
        description: "Release beta to initial waitlist cohort and institute rigorous quantitative and qualitative tracking.",
        stage: input.stage,
        priority: "medium",
        suggested_tasks: [
          {
            title: "Deploy Production Staging Environment",
            description: "Run automated health checks and configure SSL/domain routing.",
            priority: "medium",
          },
          {
            title: "Roll Out Beta Invites to First 50 Users",
            description: "Send personalized onboarding communications and monitor immediate activation.",
            priority: "high",
          },
          {
            title: "Establish Mentor Review Cadence",
            description: "Review weekly active usage metrics and user friction points with advisory board mentors.",
            priority: "medium",
          },
        ],
      },
    ];
  }

  // Stage 3: Early Traction / Launch / Go-To-Market
  if (
    normStage.includes("early") ||
    normStage.includes("traction") ||
    normStage.includes("launch")
  ) {
    return [
      {
        title: `Public Launch & Initial ${industry} Market Entry`,
        description: `Execute coordinated launch campaigns to drive awareness, inbound signups, and initial cohort activation.`,
        stage: input.stage,
        priority: "critical",
        suggested_tasks: [
          {
            title: "Coordinate Multi-Channel Launch",
            description: "Distribute launch across Product Hunt, specialized industry forums, LinkedIn, and developer networks.",
            priority: "critical",
          },
          {
            title: "Monitor Real-Time Onboarding Funnel",
            description: "Track drop-off rates at signup, onboarding, and first value milestone.",
            priority: "high",
          },
          {
            title: "Founder-Led Customer Success & Concierge Support",
            description: "Provide hands-on support to every new team to maximize satisfaction and retention.",
            priority: "high",
          },
        ],
      },
      {
        title: "Product-Market Fit (PMF) Signal Measurement",
        description: "Benchmark user retention cohorts and measure customer sentiment to validate product stickiness.",
        stage: input.stage,
        priority: "critical",
        suggested_tasks: [
          {
            title: "Implement Sean Ellis PMF Survey",
            description: "Survey active users: 'How would you feel if you could no longer use this product?'",
            priority: "high",
          },
          {
            title: "Analyze Weekly Cohort Retention Curves",
            description: "Track D1, D7, and D30 retention to confirm leveling off of user churn.",
            priority: "critical",
          },
          {
            title: "Interview Churned & Power Users",
            description: "Identify key feature drivers among retained users and reasons for drop-off among churned accounts.",
            priority: "high",
          },
        ],
      },
      {
        title: "Monetization & Commercial Viability Validation",
        description: `Validate customer willingness to pay and establish initial sustainable unit economics in ${industry}.`,
        stage: input.stage,
        priority: "high",
        suggested_tasks: [
          {
            title: "Deploy Self-Serve Billing & Pricing Plans",
            description: "Activate payment gateway, subscription tiers, and automated invoice delivery.",
            priority: "critical",
          },
          {
            title: "Close First 10 Paying Customers / Pilot Contracts",
            description: `Convert engaged pilot users into paying annual or monthly contracts aligned with: "${goal}".`,
            priority: "critical",
          },
          {
            title: "Calculate Preliminary CAC & Payback Period",
            description: "Analyze blended customer acquisition cost versus monthly recurring revenue per account.",
            priority: "medium",
          },
        ],
      },
      {
        title: "Go-To-Market Repeatability Engine",
        description: "Identify and double down on the single highest-performing customer acquisition channel.",
        stage: input.stage,
        priority: "medium",
        suggested_tasks: [
          {
            title: "Evaluate Acquisition Channel Efficiencies",
            description: "Compare cost per lead and conversion across organic content, outbound, partnerships, and paid channels.",
            priority: "high",
          },
          {
            title: "Produce 3 In-Depth Case Studies & Testimonials",
            description: `Document ROI achieved by early pilot customers within the ${industry} domain.`,
            priority: "medium",
          },
          {
            title: "Convene Advisory Board for Growth Review",
            description: "Present traction metrics and pipeline velocity to advisory board mentors for strategic input.",
            priority: "medium",
          },
        ],
      },
    ];
  }

  // Stage 4: Growth / Scaling / Expansion (Default fallback)
  return [
    {
      title: `Scalable Acquisition & Funnel Acceleration in ${industry}`,
      description: `Diversify and optimize acquisition channels to systematically scale revenue towards: "${goal}".`,
      stage: input.stage,
      priority: "critical",
      suggested_tasks: [
        {
          title: "Run Conversion Rate Optimization (CRO) Sprints",
          description: "Execute A/B tests on value proposition headlines, pricing page tiering, and registration flow.",
          priority: "high",
        },
        {
          title: "Build Inbound Content & SEO Distribution Flywheel",
          description: `Publish authoritative domain guides and comparison frameworks tailored to ${industry} buyers.`,
          priority: "medium",
        },
        {
          title: "Establish Partner & Ecosystem Channel Strategy",
          description: "Partner with complementary platforms and agencies for co-marketing and integration listings.",
          priority: "high",
        },
      ],
    },
    {
      title: "Retention Optimization & Net Revenue Expansion",
      description: "Drive net revenue retention above 110% through expansion tiers, add-ons, and proactive customer success.",
      stage: input.stage,
      priority: "critical",
      suggested_tasks: [
        {
          title: "Design Customer Health Scoring & Churn Early Warning",
          description: "Automate alerts when user product activity drops below baseline thresholds.",
          priority: "critical",
        },
        {
          title: "Introduce Tiered Enterprise / Pro Capabilities",
          description: "Package advanced analytics, audit logs, and priority SLA into higher tier offerings.",
          priority: "high",
        },
        {
          title: "Formalize Customer Quarterly Business Reviews (QBRs)",
          description: "Deliver strategic value reviews to top accounts to unlock multi-seat annual renewals.",
          priority: "medium",
        },
      ],
    },
    {
      title: "Infrastructure Scalability & Operational Governance",
      description: "Reinforce system architecture, automated test suites, and internal operating rhythm for higher throughput.",
      stage: input.stage,
      priority: "high",
      suggested_tasks: [
        {
          title: "Optimize Database Query Latency & Caching Layers",
          description: "Refactor slow database operations and introduce edge caching for high-frequency reads.",
          priority: "high",
        },
        {
          title: "Implement SOC2 / Compliance & Security Readiness",
          description: `Achieve security posture required to close large enterprise contracts in ${industry}.`,
          priority: "high",
        },
        {
          title: "Establish Team OKRs & Weekly Executive Sync",
          description: "Align engineering, sales, and marketing around quarterly company-wide objectives.",
          priority: "medium",
        },
      ],
    },
    {
      title: "Strategic Advisory & Capital Strategy Alignment",
      description: "Leverage virtual boardroom mentors to prepare for institutional financing or non-dilutive scaling.",
      stage: input.stage,
      priority: "medium",
      suggested_tasks: [
        {
          title: "Build 24-Month Operating Model & Hiring Plan",
          description: "Model headcount additions, gross margins, and burn rate sensitivity across growth scenarios.",
          priority: "high",
        },
        {
          title: "Convene Quarterly Virtual Advisory Board",
          description: "Present comprehensive metrics deck to mentors and solicit guidance on strategic risks.",
          priority: "high",
        },
        {
          title: "Curate Investor / Partner Data Room",
          description: "Organize corporate governance documents, customer contracts, cap table, and financial audit.",
          priority: "medium",
        },
      ],
    },
  ];
}

/**
 * Validates and sanitizes raw roadmap output from Gemini or heuristics.
 * Enforces prospective milestone and task schema.
 */
function sanitizeMilestones(
  rawList: unknown,
  fallbackStage: string
): RoadmapSuggestionItem[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return [];
  }

  const validMilestones: RoadmapSuggestionItem[] = [];

  for (const raw of rawList) {
    if (!raw || typeof raw !== "object") continue;

    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    if (!title) continue;

    const stage = typeof raw.stage === "string" && raw.stage.trim() ? raw.stage.trim() : fallbackStage;
    const priority = normalizeMilestonePriority(raw.priority);

    const suggested_tasks: Array<{ title: string; description: string; priority: TaskPriority }> = [];
    if (Array.isArray(raw.suggested_tasks)) {
      for (const t of raw.suggested_tasks) {
        if (!t || typeof t !== "object") continue;
        const taskTitle = typeof t.title === "string" ? t.title.trim() : "";
        if (!taskTitle) continue;
        const taskDesc = typeof t.description === "string" ? t.description.trim() : "";
        const taskPriority = normalizeTaskPriority(t.priority);

        suggested_tasks.push({
          title: taskTitle,
          description: taskDesc,
          priority: taskPriority,
        });
      }
    }

    // Ensure at least 1-2 suggested tasks exist per milestone
    if (suggested_tasks.length === 0) {
      suggested_tasks.push({
        title: `Execute initial deliverables for ${title}`,
        description: `Detailed task breakdown and milestone execution plan for ${title}.`,
        priority: "medium",
      });
    }

    validMilestones.push({
      title,
      description,
      stage,
      priority,
      suggested_tasks,
    });
  }

  return validMilestones;
}

/**
 * Generates an AI-powered execution roadmap for founders.
 * 
 * Flow:
 * 1. Checks if Gemini AI is configured via `isGeminiConfigured()`.
 *    If unconfigured, immediately uses deterministic stage/industry generator.
 * 2. If configured, prompts Gemini to act as a senior startup advisor and venture builder.
 * 3. Calls `generateJSON` with schema constraints.
 * 4. Strictly validates returned schema (prospective milestones with suggested tasks).
 * 5. Returns suggestion items for founder review. (DOES NOT persist to database).
 * 6. Gracefully falls back to deterministic generator on any API, network, or parse failure.
 */
export async function generateRoadmap(
  input: GenerateRoadmapInput
): Promise<RoadmapSuggestionItem[]> {
  const sanitizedInput: GenerateRoadmapInput = {
    industry: (input.industry || "").trim() || "Technology",
    stage: (input.stage || "").trim() || "idea",
    goal: (input.goal || "").trim() || "Launch product and validate market demand",
    description: (input.description || "").trim() || "Innovative entrepreneurial startup venture",
    challenges: input.challenges?.trim(),
  };

  // 1. Check if Gemini API is configured
  if (!isGeminiConfigured()) {
    console.info(
      "[GeminiRoadmap] GEMINI_API_KEY not configured. Using deterministic roadmap generator."
    );
    return generateDeterministicRoadmap(sanitizedInput);
  }

  // 2. Call Gemini AI with structured prompt
  try {
    const systemInstruction = `You are a senior startup advisor, venture builder, and former Y Combinator managing partner.
You specialize in translating startup vision into rigorous, pragmatic, chronological execution roadmaps.
Every milestone and task you recommend must be strictly prospective (proposals for future work).
Never assume tasks are already completed or report historical progress.
Return ONLY valid JSON matching the exact schema requested.`;

    const prompt = `STARTUP DETAILS:
- Industry: ${sanitizedInput.industry}
- Current Stage: ${sanitizedInput.stage}
- Primary Strategic Goal: ${sanitizedInput.goal}
- Business Description: ${sanitizedInput.description}
${sanitizedInput.challenges ? `- Key Challenges / Blockers: ${sanitizedInput.challenges}` : ""}

TASK:
Develop a prospective 3 to 5 milestone execution roadmap tailored specifically to this startup's industry, stage, and primary goal.
For each milestone:
1. Provide a concise, professional title.
2. Provide a 1-2 sentence description explaining the milestone's strategic purpose and measurable definition of done.
3. Assign an appropriate priority ("critical", "high", "medium", or "low").
4. Formulate 3 to 5 concrete, prospective, actionable tasks (each with title, description, and priority).
   - Tasks must be prospective action items for the founder/team to execute.
   - Address any stated challenges and industry requirements (e.g. compliance, distribution, tech architecture).

OUTPUT SCHEMA (Return strictly JSON):
{
  "milestones": [
    {
      "title": "Milestone Title",
      "description": "Clear explanation of target outcome and business impact",
      "stage": "${sanitizedInput.stage}",
      "priority": "critical",
      "suggested_tasks": [
        {
          "title": "Actionable task name",
          "description": "Specific execution instructions or criteria",
          "priority": "high"
        }
      ]
    }
  ]
}`;

    const geminiOutput = await generateJSON<RawGeminiRoadmapResponse>(prompt, {
      model: getGeminiModel(),
      systemInstruction,
      temperature: 0.25,
      timeoutMs: 25000,
    });

    if (geminiOutput && Array.isArray(geminiOutput.milestones) && geminiOutput.milestones.length > 0) {
      const sanitized = sanitizeMilestones(geminiOutput.milestones, sanitizedInput.stage);
      if (sanitized.length > 0) {
        return sanitized;
      }
    }

    console.warn(
      "[GeminiRoadmap] Gemini returned empty or malformed roadmap. Falling back to deterministic generator."
    );
    return generateDeterministicRoadmap(sanitizedInput);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `[GeminiRoadmap] Gemini roadmap generation failed (${message}). Falling back to deterministic generator.`
    );
    return generateDeterministicRoadmap(sanitizedInput);
  }
}

export const GeminiRoadmapService = {
  generateRoadmap,
  generateDeterministicRoadmap,
};
