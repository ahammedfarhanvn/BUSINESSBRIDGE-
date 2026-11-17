"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Loader2,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Users,
  Calendar,
  Sparkles,
  Info,
  Lightbulb,
  Zap,
  DollarSign,
  Scale,
  Briefcase,
  Flag,
  ArrowRight,
  Layers,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BusinessInsightsResponse,
  BusinessRiskItem,
  RiskCategory,
  RiskSeverity,
} from "@/types/ai-intelligence";

export interface BusinessRiskDashboardProps {
  projectId?: string;
  startupId?: string;
  initialData?: BusinessInsightsResponse | null;
  className?: string;
  showTitle?: boolean;
  onRefresh?: () => void;
}

type SeverityFilter = "all" | RiskSeverity;

export function BusinessRiskDashboard({
  projectId,
  startupId,
  initialData = null,
  className,
  showTitle = true,
  onRefresh,
}: BusinessRiskDashboardProps) {
  const [insights, setInsights] = useState<BusinessInsightsResponse | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(
    initialData ? new Date() : null
  );

  const fetchInsights = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await fetch("/api/ai/business-insights", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: projectId || undefined,
            startupId: startupId || undefined,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}: Failed to fetch insights`);
        }

        const data = await res.json();
        if (data.insights) {
          setInsights(data.insights);
          setLastRefreshedAt(new Date());
          if (onRefresh) onRefresh();
        } else {
          throw new Error("No insights returned from API");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load business insights";
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId, startupId, onRefresh]
  );

  useEffect(() => {
    if (!initialData) {
      fetchInsights(false);
    } else {
      setInsights(initialData);
      setLastRefreshedAt(new Date());
      setLoading(false);
    }
  }, [projectId, startupId, initialData, fetchInsights]);

  // Filtered risks
  const filteredRisks = useMemo(() => {
    if (!insights?.risks) return [];
    if (severityFilter === "all") return insights.risks;
    return insights.risks.filter(
      (r) => r.severity?.toLowerCase() === severityFilter.toLowerCase()
    );
  }, [insights?.risks, severityFilter]);

  // Counts by severity
  const severityCounts = useMemo(() => {
    const counts = { all: 0, high: 0, medium: 0, low: 0 };
    if (!insights?.risks) return counts;
    counts.all = insights.risks.length;
    insights.risks.forEach((r) => {
      const sev = r.severity?.toLowerCase();
      if (sev === "high") counts.high += 1;
      else if (sev === "medium") counts.medium += 1;
      else if (sev === "low") counts.low += 1;
    });
    return counts;
  }, [insights?.risks]);

  // Check if project exists or is completely empty
  const hasNoProjects = useMemo(() => {
    if (!insights) return false;
    const m = insights.metrics;
    return (
      m.completedMilestones === 0 &&
      m.pendingMilestones === 0 &&
      m.overallProgressPercent === 0 &&
      insights.risks.length === 0 &&
      insights.summary?.toLowerCase().includes("no active projects found")
    );
  }, [insights]);

  // Helper for category tag rendering
  const renderCategoryBadge = (category: RiskCategory) => {
    const cat = category?.toLowerCase();
    switch (cat) {
      case "market":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800"
          >
            <TrendingUp className="h-3 w-3" />
            Market
          </Badge>
        );
      case "financial":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
          >
            <DollarSign className="h-3 w-3" />
            Financial
          </Badge>
        );
      case "execution":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
          >
            <Zap className="h-3 w-3" />
            Execution
          </Badge>
        );
      case "legal":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800"
          >
            <Scale className="h-3 w-3" />
            Legal
          </Badge>
        );
      case "operational":
      default:
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 font-medium bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
          >
            <Briefcase className="h-3 w-3" />
            Operational
          </Badge>
        );
    }
  };

  // Helper for severity badge rendering
  const renderSeverityBadge = (severity: RiskSeverity) => {
    const sev = severity?.toLowerCase();
    switch (sev) {
      case "high":
        return (
          <Badge
            variant="destructive"
            className="flex items-center gap-1 bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 font-semibold shadow-xs"
          >
            <AlertTriangle className="h-3 w-3" />
            High Severity
          </Badge>
        );
      case "medium":
        return (
          <Badge
            className="flex items-center gap-1 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-semibold shadow-xs"
          >
            <Clock className="h-3 w-3" />
            Medium Severity
          </Badge>
        );
      case "low":
      default:
        return (
          <Badge
            className="flex items-center gap-1 bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 font-semibold shadow-xs"
          >
            <Info className="h-3 w-3" />
            Low Severity
          </Badge>
        );
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header bar */}
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Business Health & Risk Matrix
              </h2>
              {insights?.is_ai_generated && (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 flex items-center gap-1 text-xs py-0.5">
                  <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  Live AI Audit
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Operational velocity tracking, milestone risk synthesis, and actionable board mitigation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastRefreshedAt && (
              <span className="text-xs text-muted-foreground hidden md:inline-block">
                Updated {lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchInsights(true)}
              disabled={loading || refreshing}
              className="border-slate-300 dark:border-slate-700 hover:bg-muted font-medium transition-colors"
            >
              {refreshing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-emerald-600" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  Refresh Insights
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Unable to load business insights
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{error}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchInsights(true)}
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state skeleton */}
      {loading && !insights && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-5 animate-pulse">
                <div className="h-4 w-24 bg-muted rounded mb-3" />
                <div className="h-8 w-16 bg-muted rounded mb-2" />
                <div className="h-2 w-full bg-muted rounded" />
              </Card>
            ))}
          </div>
          <Card className="p-6 animate-pulse">
            <div className="h-5 w-48 bg-muted rounded mb-4" />
            <div className="h-4 w-full bg-muted rounded mb-2" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </Card>
        </div>
      )}

      {/* Main Content when insights loaded */}
      {insights && (
        <>
          {/* Honest Empty State: No active projects */}
          {hasNoProjects ? (
            <Card className="border-dashed border-2 border-slate-300 dark:border-slate-800 p-8 sm:p-12 text-center bg-card">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No Active Projects Initialized</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 mb-6">
                Create a project in the Business Journey Tracker to activate AI risk monitoring, milestone velocity calculations, and board oversight.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/founder/tracker">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                    Open Journey Tracker
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => fetchInsights(true)} disabled={refreshing}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Check Again
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* 1. Metric Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Overall Project Progress */}
                <Card className="border shadow-xs hover:shadow-sm transition-shadow">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Overall Velocity
                    </span>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-3xl font-extrabold text-foreground tracking-tight">
                        {insights.metrics.overallProgressPercent}%
                      </span>
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {insights.metrics.overallProgressPercent >= 75
                          ? "Accelerating"
                          : insights.metrics.overallProgressPercent >= 40
                          ? "In Progress"
                          : insights.metrics.overallProgressPercent > 0
                          ? "Early Phase"
                          : "Planning"}
                      </span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-600 to-teal-500 h-2.5 rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.min(100, Math.max(0, insights.metrics.overallProgressPercent))}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Milestone delivery completion score
                    </p>
                  </CardContent>
                </Card>

                {/* Card 2: Completed vs. Pending Milestones */}
                <Card className="border shadow-xs hover:shadow-sm transition-shadow">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Milestones
                    </span>
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="flex items-baseline gap-1.5 mb-1.5">
                      <span className="text-3xl font-extrabold text-foreground tracking-tight">
                        {insights.metrics.completedMilestones}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">
                        / {insights.metrics.completedMilestones + insights.metrics.pendingMilestones} Done
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-transparent py-0"
                      >
                        {insights.metrics.completedMilestones} Completed
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-transparent py-0"
                      >
                        {insights.metrics.pendingMilestones} Pending
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Current roadmap execution balance
                    </p>
                  </CardContent>
                </Card>

                {/* Card 3: Overdue Tasks with warning indicator */}
                <Card className="border shadow-xs hover:shadow-sm transition-shadow">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Task Deadlines
                    </span>
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        insights.metrics.overdueTasks > 0
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {insights.metrics.overdueTasks > 0 ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="flex items-baseline gap-1.5 mb-1.5">
                      <span
                        className={cn(
                          "text-3xl font-extrabold tracking-tight",
                          insights.metrics.overdueTasks > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-foreground"
                        )}
                      >
                        {insights.metrics.overdueTasks}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">Overdue</span>
                    </div>

                    <div className="mt-2">
                      {insights.metrics.overdueTasks > 0 ? (
                        <span className="inline-flex items-center text-[11px] font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Requires Triage
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Schedule Synchronized
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {insights.metrics.overdueTasks > 0
                        ? "Items past their committed completion target"
                        : "All committed deliverables on schedule"}
                    </p>
                  </CardContent>
                </Card>

                {/* Card 4: Upcoming Deadlines & Active Board Mentors */}
                <Card className="border shadow-xs hover:shadow-sm transition-shadow">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Advisory & Pipeline
                    </span>
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Users className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="flex items-baseline gap-1.5 mb-1.5">
                      <span className="text-3xl font-extrabold text-foreground tracking-tight">
                        {insights.metrics.activeBoardMentorsCount}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">Board Mentors</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                        <Calendar className="h-3 w-3 mr-1" />
                        {insights.metrics.upcomingDeadlinesCount} Upcoming Deadlines
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {insights.metrics.activeBoardMentorsCount > 0
                        ? "Active boardroom governance established"
                        : "No mentors inducted to boardroom"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* 2. AI-Generated Executive Summary Card */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900/[0.02] via-card to-emerald-950/[0.04] dark:from-slate-900/40 dark:via-card dark:to-emerald-950/20 shadow-sm overflow-hidden">
                <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Executive Velocity & Synthesis
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Gemini portfolio reasoning applied to real-time project telemetry
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {insights.is_ai_generated ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs font-semibold py-1">
                        <Sparkles className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                        AI Strategic Intelligence
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground py-1">
                        <Info className="h-3 w-3 mr-1" />
                        Heuristic Progress Synthesis
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-5 sm:p-6 space-y-6">
                  {/* Summary prose */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Portfolio Analysis
                    </h4>
                    <p className="text-sm text-foreground/90 leading-relaxed font-normal bg-card/60 p-4 rounded-lg border border-border/50">
                      {insights.summary}
                    </p>
                  </div>

                  {/* Strengths and Immediate Priorities 2-column grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                    {/* Key Strengths */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Key Operational Strengths ({insights.keyStrengths?.length || 0})</span>
                      </div>
                      {insights.keyStrengths && insights.keyStrengths.length > 0 ? (
                        <ul className="space-y-2">
                          {insights.keyStrengths.map((str, idx) => (
                            <li
                              key={idx}
                              className="text-xs sm:text-sm text-foreground/90 flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-500/[0.04] dark:bg-emerald-950/20 border border-emerald-500/15"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">{str}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No distinct operational strengths registered yet.
                        </p>
                      )}
                    </div>

                    {/* Immediate Priorities */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                        <Zap className="h-4 w-4 text-indigo-600" />
                        <span>Immediate Strategic Priorities ({insights.immediatePriorities?.length || 0})</span>
                      </div>
                      {insights.immediatePriorities && insights.immediatePriorities.length > 0 ? (
                        <ul className="space-y-2">
                          {insights.immediatePriorities.map((prio, idx) => (
                            <li
                              key={idx}
                              className="text-xs sm:text-sm text-foreground/90 flex items-start gap-2.5 p-2.5 rounded-lg bg-indigo-500/[0.04] dark:bg-indigo-950/20 border border-indigo-500/15"
                            >
                              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="leading-snug">{prio}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No immediate strategic priorities flagged.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Business Risks Matrix */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">
                        Detected Business Risks & Vulnerabilities
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {insights.risks?.length || 0} Total
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Proactively detect runway hazards, execution friction, and governance gaps.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/40 rounded-lg border border-border">
                    <Button
                      variant={severityFilter === "all" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSeverityFilter("all")}
                      className={cn(
                        "h-7 px-2.5 text-xs font-medium rounded-md",
                        severityFilter === "all"
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All ({severityCounts.all})
                    </Button>
                    <Button
                      variant={severityFilter === "high" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSeverityFilter("high")}
                      className={cn(
                        "h-7 px-2.5 text-xs font-medium rounded-md",
                        severityFilter === "high"
                          ? "bg-red-600 text-white hover:bg-red-700 shadow-xs"
                          : "text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      )}
                    >
                      High ({severityCounts.high})
                    </Button>
                    <Button
                      variant={severityFilter === "medium" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSeverityFilter("medium")}
                      className={cn(
                        "h-7 px-2.5 text-xs font-medium rounded-md",
                        severityFilter === "medium"
                          ? "bg-amber-600 text-white hover:bg-amber-700 shadow-xs"
                          : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      )}
                    >
                      Medium ({severityCounts.medium})
                    </Button>
                    <Button
                      variant={severityFilter === "low" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSeverityFilter("low")}
                      className={cn(
                        "h-7 px-2.5 text-xs font-medium rounded-md",
                        severityFilter === "low"
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                          : "text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      )}
                    >
                      Low ({severityCounts.low})
                    </Button>
                  </div>
                </div>

                {/* Risks List */}
                {filteredRisks.length > 0 ? (
                  <div className="space-y-3">
                    {filteredRisks.map((risk) => {
                      const sev = risk.severity?.toLowerCase();
                      const isHigh = sev === "high";
                      const isMedium = sev === "medium";

                      return (
                        <Card
                          key={risk.id}
                          className={cn(
                            "border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-sm",
                            isHigh
                              ? "border-l-4 border-l-red-500 bg-red-500/[0.02] dark:bg-red-950/10"
                              : isMedium
                              ? "border-l-4 border-l-amber-500 bg-amber-500/[0.02] dark:bg-amber-950/10"
                              : "border-l-4 border-l-blue-500 bg-blue-500/[0.02] dark:bg-blue-950/10"
                          )}
                        >
                          <CardContent className="p-4 sm:p-5">
                            {/* Top metadata line */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {renderSeverityBadge(risk.severity)}
                                {renderCategoryBadge(risk.category)}
                                {risk.associatedMilestoneTitle && (
                                  <Badge
                                    variant="secondary"
                                    className="flex items-center gap-1 text-xs font-normal bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                                  >
                                    <Flag className="h-3 w-3" />
                                    <span>Milestone: {risk.associatedMilestoneTitle}</span>
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Risk Title */}
                            <h4 className="text-base font-bold text-foreground tracking-tight">
                              {risk.title}
                            </h4>

                            {/* Risk Explanation */}
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                              {risk.explanation}
                            </p>

                            {/* Mitigation Callout */}
                            {risk.mitigation && (
                              <div className="mt-3.5 p-3 sm:p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                                <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                                  <Lightbulb className="h-4 w-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                    Actionable Mitigation Strategy
                                  </div>
                                  <div className="text-xs text-foreground/90 font-normal leading-relaxed">
                                    {risk.mitigation}
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  /* Empty state for filtered risks */
                  <Card className="p-8 text-center border-dashed border bg-muted/20">
                    <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">
                      {severityFilter === "all"
                        ? "No Critical Risks Detected"
                        : `No ${severityFilter.toUpperCase()} Severity Risks`}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                      {severityFilter === "all"
                        ? "Your project milestones and operational execution are currently on a stable path."
                        : `No risks currently match the ${severityFilter} severity filter.`}
                    </p>
                    {severityFilter !== "all" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSeverityFilter("all")}
                        className="text-xs"
                      >
                        Show All Risks ({severityCounts.all})
                      </Button>
                    )}
                  </Card>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
