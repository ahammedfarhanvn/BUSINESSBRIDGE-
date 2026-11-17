"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  AlertTriangle,
  CheckSquare,
  ArrowLeft,
  Activity,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AICopilot,
  BusinessRiskDashboard,
  NextStepRecommendations,
} from "@/features/ai-intelligence";

type AssistantTab = "copilot" | "risks" | "next-steps";

export default function FounderAIAssistantPage() {
  const [activeTab, setActiveTab] = React.useState<AssistantTab>("copilot");

  return (
    <div className="container max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/founder/dashboard"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Founder Dashboard
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span className="font-medium text-foreground">AI Business Intelligence</span>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                AI Business Assistant
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Executive business copilot, real-time risk synthesis, and actionable roadmap acceleration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1.5 py-1 px-3"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Gemini Intelligence Active</span>
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/80 bg-background">
        <div className="flex space-x-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("copilot")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === "copilot"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>AI Business Copilot</span>
          </button>

          <button
            onClick={() => setActiveTab("risks")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === "risks"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Progress & Risk Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("next-steps")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === "next-steps"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>Strategic Next Steps</span>
          </button>
        </div>
      </div>

      {/* Active Tab Panel */}
      <div className="pt-2">
        {activeTab === "copilot" && <AICopilot />}
        {activeTab === "risks" && <BusinessRiskDashboard />}
        {activeTab === "next-steps" && <NextStepRecommendations />}
      </div>
    </div>
  );
}
