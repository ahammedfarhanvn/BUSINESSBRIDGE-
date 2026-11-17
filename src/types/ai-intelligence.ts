/**
 * BusinessBridge - AI Business Intelligence & Copilot Types
 * Phase 5: AI Frontend & Founder Experience
 */

import { StartupStage } from "./journey-tracker";

export interface AICopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sections?: {
    heading?: string;
    points?: string[];
    actionItems?: string[];
  }[];
}

export type RiskSeverity = "high" | "medium" | "low";
export type RiskCategory = "market" | "financial" | "execution" | "legal" | "operational";

export interface BusinessRiskItem {
  id: string;
  title: string;
  category: RiskCategory;
  severity: RiskSeverity;
  explanation: string;
  mitigation: string;
  associatedMilestoneTitle?: string;
}

export interface BusinessInsightsResponse {
  summary: string;
  keyStrengths: string[];
  immediatePriorities: string[];
  risks: BusinessRiskItem[];
  metrics: {
    overallProgressPercent: number;
    completedMilestones: number;
    pendingMilestones: number;
    overdueTasks: number;
    upcomingDeadlinesCount: number;
    activeBoardMentorsCount: number;
  };
  is_ai_generated: boolean;
}

export interface NextStepRecommendationItem {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  whySuggested: string;
  category: string;
  milestone_id?: string;
  milestone_title?: string;
  suggestedDueDate?: string;
  estimatedHours?: number;
  alreadyConverted?: boolean;
}

export interface NextStepsResponse {
  recommendations: NextStepRecommendationItem[];
  is_ai_generated: boolean;
}
