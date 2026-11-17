"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Plus,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  RotateCcw,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  Layers,
  Briefcase,
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Shield,
  Lightbulb,
  X,
  Loader2,
  Filter,
  Check,
  ChevronRight,
  Flag,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NextStepRecommendationItem,
  NextStepsResponse,
} from "@/types/ai-intelligence";
import { ProjectMilestoneRecord } from "@/types/journey-tracker";
import { cn } from "@/lib/utils";

// ============================================================================
// Types & Props
// ============================================================================

export interface NextStepRecommendationsProps {
  projectId?: string;
  className?: string;
  initialRecommendations?: NextStepRecommendationItem[];
  onTaskCreated?: (task: any) => void;
  showTitle?: boolean;
}

interface ToastBannerState {
  title: string;
  detail: string;
  taskTitle: string;
  milestoneTitle: string;
}

interface SimpleMilestone {
  id: string;
  title: string;
  project_id?: string;
}

// ============================================================================
// Visual Helpers: Category and Priority styling
// ============================================================================

function getCategoryConfig(category: string) {
  const normalized = category.toLowerCase().trim();

  if (normalized.includes("strat") || normalized.includes("exec")) {
    return {
      label: category,
      icon: Briefcase,
      badgeClass:
        "bg-blue-100/80 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80",
      accentBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    };
  }

  if (normalized.includes("finan") || normalized.includes("money") || normalized.includes("burn") || normalized.includes("cash")) {
    return {
      label: category,
      icon: DollarSign,
      badgeClass:
        "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80",
      accentBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    };
  }

  if (normalized.includes("prod") || normalized.includes("mvp") || normalized.includes("tech") || normalized.includes("dev")) {
    return {
      label: category,
      icon: Target,
      badgeClass:
        "bg-indigo-100/80 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80",
      accentBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    };
  }

  if (normalized.includes("gtm") || normalized.includes("market") || normalized.includes("growth") || normalized.includes("sales")) {
    return {
      label: category,
      icon: TrendingUp,
      badgeClass:
        "bg-purple-100/80 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/80",
      accentBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    };
  }

  if (normalized.includes("board") || normalized.includes("govern") || normalized.includes("mentor") || normalized.includes("advis")) {
    return {
      label: category,
      icon: Users,
      badgeClass:
        "bg-amber-100/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80",
      accentBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    };
  }

  if (normalized.includes("legal") || normalized.includes("compli") || normalized.includes("risk")) {
    return {
      label: category,
      icon: Shield,
      badgeClass:
        "bg-rose-100/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80",
      accentBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    };
  }

  return {
    label: category,
    icon: Layers,
    badgeClass:
      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    accentBg: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  };
}

function getPriorityConfig(priority: string) {
  const p = priority.toLowerCase();
  switch (p) {
    case "high":
    case "critical":
      return {
        label: p === "critical" ? "Critical Priority" : "High Priority",
        badgeClass:
          "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900",
        borderHighlight: "border-l-4 border-l-rose-500",
        dotColor: "bg-rose-500",
      };
    case "medium":
      return {
        label: "Medium Priority",
        badgeClass:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
        borderHighlight: "border-l-4 border-l-amber-500",
        dotColor: "bg-amber-500",
      };
    case "low":
    default:
      return {
        label: "Low Priority",
        badgeClass:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900",
        borderHighlight: "border-l-4 border-l-blue-400",
        dotColor: "bg-blue-400",
      };
  }
}

function getFutureDate(days = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return "Flexible due date";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function NextStepRecommendations({
  projectId,
  className,
  initialRecommendations,
  onTaskCreated,
  showTitle = true,
}: NextStepRecommendationsProps) {
  // Main data states
  const [recommendations, setRecommendations] = useState<NextStepRecommendationItem[]>(
    initialRecommendations || []
  );
  const [convertedIds, setConvertedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    initialRecommendations?.forEach((r) => {
      if (r.alreadyConverted) set.add(r.id);
    });
    return set;
  });
  const [loading, setLoading] = useState<boolean>(!initialRecommendations);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(true);

  // User project & milestone state
  const [milestones, setMilestones] = useState<SimpleMilestone[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(projectId);
  const [hasNoProjects, setHasNoProjects] = useState<boolean>(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Toast / Banner state
  const [toastBanner, setToastBanner] = useState<ToastBannerState | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [activeItem, setActiveItem] = useState<NextStepRecommendationItem | null>(null);
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [taskMilestoneId, setTaskMilestoneId] = useState<string>("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "critical">("high");
  const [taskDueDate, setTaskDueDate] = useState<string>("");
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Auto-dismiss toast banner after 6 seconds
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!toastBanner) return;
    const timer = setTimeout(() => {
      setToastBanner(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toastBanner]);

  // --------------------------------------------------------------------------
  // Fetch available milestones for dropdown selection
  // --------------------------------------------------------------------------
  const fetchMilestones = useCallback(async (projId?: string) => {
    try {
      let targetProjectId = projId;

      // If no project ID is provided, query the user's projects to obtain the active one
      if (!targetProjectId) {
        const projRes = await fetch("/api/tracker/projects");
        if (projRes.ok) {
          const projData = await projRes.json();
          if (Array.isArray(projData.projects) && projData.projects.length > 0) {
            targetProjectId = projData.projects[0].id;
            setActiveProjectId(targetProjectId);
          } else {
            setHasNoProjects(true);
            return;
          }
        }
      }

      if (!targetProjectId) return;

      const res = await fetch(`/api/tracker/milestones?projectId=${targetProjectId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.milestones)) {
          const mapped: SimpleMilestone[] = data.milestones.map((m: ProjectMilestoneRecord) => ({
            id: m.id,
            title: m.title,
            project_id: m.project_id,
          }));
          setMilestones(mapped);
        }
      }
    } catch (err) {
      console.warn("[NextStepRecommendations] Could not load milestones:", err);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Fetch recommendations from /api/ai/next-steps
  // --------------------------------------------------------------------------
  const fetchRecommendations = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await fetch("/api/ai/next-steps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activeProjectId ? { projectId: activeProjectId } : {}),
        });

        if (!res.ok) {
          // If POST fails, attempt GET fallback
          const getRes = await fetch(
            `/api/ai/next-steps${activeProjectId ? `?projectId=${activeProjectId}` : ""}`
          );
          if (!getRes.ok) {
            throw new Error(`Failed to load recommendations: status ${res.status}`);
          }
          const getData: NextStepsResponse = await getRes.json();
          handleResponseData(getData);
          return;
        }

        const data: NextStepsResponse = await res.json();
        handleResponseData(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error fetching recommendations";
        console.error("[NextStepRecommendations]", err);
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeProjectId]
  );

  const handleResponseData = (data: NextStepsResponse) => {
    if (Array.isArray(data.recommendations)) {
      setRecommendations(data.recommendations);
      setIsAiGenerated(Boolean(data.is_ai_generated));

      // Sync already converted items
      setConvertedIds((prev) => {
        const next = new Set(prev);
        data.recommendations.forEach((r) => {
          if (r.alreadyConverted) next.add(r.id);
        });
        return next;
      });

      // Update milestone options if items carry milestone info
      const foundMilestones: SimpleMilestone[] = [];
      data.recommendations.forEach((r) => {
        if (r.milestone_id && r.milestone_title) {
          if (!foundMilestones.some((m) => m.id === r.milestone_id)) {
            foundMilestones.push({ id: r.milestone_id, title: r.milestone_title });
          }
        }
      });

      if (foundMilestones.length > 0) {
        setMilestones((existing) => {
          const combined = [...existing];
          foundMilestones.forEach((fm) => {
            if (!combined.some((c) => c.id === fm.id)) {
              combined.push(fm);
            }
          });
          return combined;
        });
      }
    } else {
      setRecommendations([]);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMilestones(projectId);
    fetchRecommendations(false);
  }, [projectId, fetchMilestones, fetchRecommendations]);

  // --------------------------------------------------------------------------
  // Filter Options & Derived State
  // --------------------------------------------------------------------------
  const categories = useMemo(() => {
    const set = new Set<string>();
    recommendations.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [recommendations]);

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      if (priorityFilter !== "all" && item.priority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [recommendations, categoryFilter, priorityFilter]);

  const stats = useMemo(() => {
    const total = recommendations.length;
    const high = recommendations.filter((r) => r.priority === "high").length;
    const converted = recommendations.filter(
      (r) => convertedIds.has(r.id) || r.alreadyConverted
    ).length;
    return { total, high, converted };
  }, [recommendations, convertedIds]);

  // --------------------------------------------------------------------------
  // Open Convert Dialog
  // --------------------------------------------------------------------------
  const handleOpenConvertDialog = (item: NextStepRecommendationItem) => {
    setActiveItem(item);
    setTaskTitle(item.title);

    // Build default rich task description
    const descParts: string[] = [];
    if (item.whySuggested) {
      descParts.push(`Strategic Rationale:\n${item.whySuggested}`);
    }
    if (item.category) {
      descParts.push(`Category: ${item.category}`);
    }
    if (item.estimatedHours) {
      descParts.push(`Estimated Effort: ~${item.estimatedHours} hours`);
    }
    setTaskDescription(descParts.join("\n\n"));

    // Find destination milestone: prefer item's milestone_id, then first available milestone
    let initialMilestoneId = item.milestone_id || "";
    if (!initialMilestoneId && milestones.length > 0) {
      initialMilestoneId = milestones[0].id;
    }
    setTaskMilestoneId(initialMilestoneId);

    // Priority
    const validPriorities = ["low", "medium", "high", "critical"];
    setTaskPriority(
      validPriorities.includes(item.priority)
        ? (item.priority as "low" | "medium" | "high" | "critical")
        : "high"
    );

    // Due Date: prefer suggestedDueDate, or default 7 days from now
    setTaskDueDate(item.suggestedDueDate || getFutureDate(7));

    setDialogError(null);
    setIsDialogOpen(true);
  };

  // --------------------------------------------------------------------------
  // Confirm and Create Task
  // --------------------------------------------------------------------------
  const handleConfirmCreateTask = async () => {
    if (!activeItem) return;

    if (!taskTitle.trim()) {
      setDialogError("Please enter a task title.");
      return;
    }

    // Determine target milestone
    let finalMilestoneId = taskMilestoneId;
    if (!finalMilestoneId) {
      if (milestones.length > 0) {
        finalMilestoneId = milestones[0].id;
      } else {
        setDialogError("Please select a destination milestone for this task.");
        return;
      }
    }

    setIsCreatingTask(true);
    setDialogError(null);

    try {
      const payload = {
        milestone_id: finalMilestoneId,
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        priority: taskPriority,
        due_date: taskDueDate || undefined,
      };

      const res = await fetch("/api/tracker/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to create task in Journey Tracker.");
      }

      // Mark recommendation as converted
      const itemId = activeItem.id;
      setConvertedIds((prev) => new Set(prev).add(itemId));
      setRecommendations((prev) =>
        prev.map((r) => (r.id === itemId ? { ...r, alreadyConverted: true } : r))
      );

      // Determine milestone title for display in banner
      const matchedMilestone = milestones.find((m) => m.id === finalMilestoneId);
      const destinationTitle = matchedMilestone?.title || activeItem.milestone_title || "Journey Roadmap";

      // Trigger Toast / Banner
      setToastBanner({
        title: "Task created in Journey Tracker!",
        detail: `Successfully linked to ${destinationTitle}.`,
        taskTitle: taskTitle.trim(),
        milestoneTitle: destinationTitle,
      });

      // Notify parent callback if provided
      if (onTaskCreated) {
        onTaskCreated(resData.task);
      }

      // Close dialog
      setIsDialogOpen(false);
      setActiveItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create task";
      setDialogError(msg);
    } finally {
      setIsCreatingTask(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={cn("space-y-6", className)}>
      {/* -------------------------------------------------------------------- */}
      {/* 1. Header Section */}
      {/* -------------------------------------------------------------------- */}
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                AI Strategic Next Steps
              </h2>
              {isAiGenerated ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-50/70 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[11px] gap-1 font-medium"
                >
                  <Sparkles className="h-3 w-3" />
                  Gemini AI Synthesized
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] text-muted-foreground">
                  Curated Roadmap
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
              High-leverage action items prioritized by AI based on your business stage, active
              milestones, and advisory board momentum. Convert any item directly into an actionable task.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRecommendations(true)}
              disabled={loading || refreshing}
              className="gap-2 text-xs font-medium shadow-sm hover:bg-muted"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5 text-muted-foreground", {
                  "animate-spin": refreshing,
                })}
              />
              {refreshing ? "Refreshing..." : "Refresh Suggestions"}
            </Button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 2. Success Banner / Toast Notification */}
      {/* -------------------------------------------------------------------- */}
      {toastBanner && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl border border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/40 p-4 shadow-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                {toastBanner.title}
              </h4>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-200/90">
                <span className="font-medium text-emerald-950 dark:text-emerald-50">
                  "{toastBanner.taskTitle}"
                </span>{" "}
                was added to{" "}
                <span className="font-medium text-emerald-950 dark:text-emerald-50">
                  {toastBanner.milestoneTitle}
                </span>
                .
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/founder/dashboard"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200 underline underline-offset-4"
            >
              View in Journey Tracker
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setToastBanner(null)}
              className="h-7 w-7 text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-100 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 rounded-full"
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Close alert</span>
            </Button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 3. Filter Bar & Quick Stats */}
      {/* -------------------------------------------------------------------- */}
      {!loading && recommendations.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/80 rounded-xl p-3 shadow-xs">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Category:
            </span>
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                categoryFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              All ({stats.total})
            </button>
            {categories.map((cat) => {
              const count = recommendations.filter((r) => r.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    categoryFilter === cat
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {stats.high > 0 && (
              <Badge
                variant="outline"
                className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 text-[11px]"
              >
                {stats.high} High Priority
              </Badge>
            )}
            {stats.converted > 0 && (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 text-[11px] gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                {stats.converted} Converted
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 4. Loading Skeleton */}
      {/* -------------------------------------------------------------------- */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-border/80">
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 bg-muted rounded" />
                  <div className="h-5 w-16 bg-muted rounded" />
                </div>
                <div className="h-6 w-3/4 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="h-16 bg-muted/60 rounded-lg" />
                <div className="flex gap-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t border-border/50 flex justify-between">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-8 w-32 bg-muted rounded" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 5. Error State */}
      {/* -------------------------------------------------------------------- */}
      {error && !loading && (
        <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Unable to load recommendations
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRecommendations(true)}
              className="mt-2 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Retry Analysis
            </Button>
          </div>
        </Card>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 6. Honest Empty States */}
      {/* -------------------------------------------------------------------- */}
      {!loading && !error && recommendations.length === 0 && (
        <Card className="border-dashed border-border p-8 text-center bg-card">
          <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                {hasNoProjects
                  ? "No Active Startup Projects Found"
                  : "All Strategic Recommendations Addressed!"}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                {hasNoProjects
                  ? "Initialize your startup roadmap in the Journey Tracker to unlock dynamic, AI-guided strategic next steps."
                  : "Every recommended next step has been converted into active roadmap tasks or completed for your current milestone sprint."}
              </p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              {hasNoProjects ? (
                <Button asChild size="sm" className="text-xs">
                  <Link href="/founder/dashboard">
                    Go to Journey Tracker <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchRecommendations(true)}
                  className="text-xs gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Request Fresh AI Analysis
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Empty State when filter matches nothing */}
      {!loading && !error && recommendations.length > 0 && filteredRecommendations.length === 0 && (
        <Card className="border-border/80 p-8 text-center bg-card">
          <div className="flex flex-col items-center justify-center space-y-2">
            <Layers className="h-8 w-8 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold text-foreground">
              No recommendations match selected filters
            </h3>
            <p className="text-xs text-muted-foreground">
              Try clearing your category or priority filter to view all strategic recommendations.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategoryFilter("all");
                setPriorityFilter("all");
              }}
              className="mt-2 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        </Card>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 7. Recommendations List / Cards Grid */}
      {/* -------------------------------------------------------------------- */}
      {!loading && !error && filteredRecommendations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRecommendations.map((item) => {
            const isConverted = convertedIds.has(item.id) || item.alreadyConverted;
            const categoryMeta = getCategoryConfig(item.category);
            const priorityMeta = getPriorityConfig(item.priority);
            const CategoryIcon = categoryMeta.icon;

            return (
              <Card
                key={item.id}
                className={cn(
                  "relative flex flex-col justify-between transition-all duration-200 border bg-card shadow-xs hover:shadow-md",
                  priorityMeta.borderHighlight,
                  isConverted &&
                    "opacity-85 border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/10"
                )}
              >
                <div>
                  {/* Card Header: Category Tag & Priority Badge */}
                  <CardHeader className="pb-3 pt-5 px-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Category Badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-semibold gap-1 px-2 py-0.5",
                            categoryMeta.badgeClass
                          )}
                        >
                          <CategoryIcon className="h-3 w-3" />
                          {categoryMeta.label}
                        </Badge>

                        {/* Priority Badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-medium gap-1 px-2 py-0.5",
                            priorityMeta.badgeClass
                          )}
                        >
                          <span
                            className={cn("h-1.5 w-1.5 rounded-full", priorityMeta.dotColor)}
                          />
                          {priorityMeta.label}
                        </Badge>
                      </div>

                      {/* Converted indicator chip */}
                      {isConverted && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[11px] gap-1 font-semibold"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          Converted
                        </Badge>
                      )}
                    </div>

                    {/* Recommendation Title */}
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground leading-snug">
                      {item.title}
                    </CardTitle>
                  </CardHeader>

                  {/* Card Content: Strategic Rationale Box & Metadata */}
                  <CardContent className="space-y-3.5 px-5 pb-4">
                    {/* "Why this is recommended" Callout Box */}
                    <div className="rounded-lg bg-muted/60 dark:bg-muted/30 border border-border/80 p-3.5 transition-colors">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary/90 dark:text-primary-foreground mb-1">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>Why this is recommended</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.whySuggested}
                      </p>
                    </div>

                    {/* Milestone & Effort Metadata Tags */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground pt-0.5">
                      {/* Milestone Link Tag */}
                      <div className="flex items-center gap-1.5 font-medium text-foreground/80 bg-background/80 px-2 py-1 rounded border border-border/60">
                        <Flag className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate max-w-[200px]" title={item.milestone_title}>
                          {item.milestone_title
                            ? `Linked to: ${item.milestone_title}`
                            : "Linked to: Active Milestone"}
                        </span>
                      </div>

                      {/* Estimated Effort */}
                      {Boolean(item.estimatedHours) && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>~{item.estimatedHours}h effort</span>
                        </div>
                      )}

                      {/* Recommended Due Date */}
                      {Boolean(item.suggestedDueDate) && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>Target: {formatDateDisplay(item.suggestedDueDate)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer: Convert Action Button */}
                <CardFooter className="pt-3 pb-4 px-5 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    {isConverted
                      ? "Task active in Journey Tracker"
                      : "Ready to assign to roadmap"}
                  </span>

                  <div className="ml-auto">
                    {isConverted ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="h-8 gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 font-medium cursor-default opacity-90"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        Added to Tasks
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleOpenConvertDialog(item)}
                        className="h-8 gap-1.5 text-xs font-semibold shadow-xs hover:shadow transition-all"
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        Convert to Task
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 8. Convert to Task Confirmation Dialog */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <CheckSquare className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-bold">
                Convert Recommendation to Task
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Review and customize task details before publishing it directly to your Business Journey Tracker roadmap.
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Task Title */}
            <div className="space-y-1.5">
              <Label htmlFor="task-title" className="text-xs font-semibold text-foreground">
                Task Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Schedule Q4 Advisory Boardroom Review"
                className="text-sm font-medium"
                disabled={isCreatingTask}
              />
            </div>

            {/* Destination Milestone */}
            <div className="space-y-1.5">
              <Label htmlFor="task-milestone" className="text-xs font-semibold text-foreground">
                Destination Milestone <span className="text-rose-500">*</span>
              </Label>
              {milestones.length > 0 ? (
                <Select
                  value={taskMilestoneId}
                  onValueChange={setTaskMilestoneId}
                  disabled={isCreatingTask}
                >
                  <SelectTrigger id="task-milestone" className="text-sm">
                    <SelectValue placeholder="Select target milestone" />
                  </SelectTrigger>
                  <SelectContent>
                    {milestones.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-input bg-muted/40 p-2.5 text-xs text-muted-foreground flex items-center justify-between">
                  <span>
                    {activeItem?.milestone_title || "Default Roadmap Milestone"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Auto-associated
                  </Badge>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Associating this task with a milestone keeps progress metrics accurate in the Journey Tracker.
              </p>
            </div>

            {/* Two Column Row: Priority & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Priority Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="task-priority" className="text-xs font-semibold text-foreground">
                  Priority
                </Label>
                <Select
                  value={taskPriority}
                  onValueChange={(val) =>
                    setTaskPriority(val as "low" | "medium" | "high" | "critical")
                  }
                  disabled={isCreatingTask}
                >
                  <SelectTrigger id="task-priority" className="text-sm">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high" className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        High Priority
                      </span>
                    </SelectItem>
                    <SelectItem value="critical" className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-600" />
                        Critical Priority
                      </span>
                    </SelectItem>
                    <SelectItem value="medium" className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Medium Priority
                      </span>
                    </SelectItem>
                    <SelectItem value="low" className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-400" />
                        Low Priority
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recommended Due Date */}
              <div className="space-y-1.5">
                <Label htmlFor="task-due-date" className="text-xs font-semibold text-foreground">
                  Target Due Date
                </Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="text-sm"
                  disabled={isCreatingTask}
                />
              </div>
            </div>

            {/* Strategic Description / Rationale */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="task-desc" className="text-xs font-semibold text-foreground">
                  Strategic Context & Instructions
                </Label>
                <span className="text-[11px] text-muted-foreground">Optional notes</span>
              </div>
              <Textarea
                id="task-desc"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Include key execution instructions or rationale..."
                rows={4}
                className="text-xs leading-relaxed"
                disabled={isCreatingTask}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              disabled={isCreatingTask}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleConfirmCreateTask}
              disabled={isCreatingTask || !taskTitle.trim()}
              className="text-xs gap-1.5 font-semibold"
            >
              {isCreatingTask ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating Task...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Confirm & Create Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default NextStepRecommendations;
