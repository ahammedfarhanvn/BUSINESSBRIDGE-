"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Send,
  Building,
  CheckCircle2,
  Clock,
  Compass,
  ArrowRight,
} from "lucide-react";
import { AIMentorRecommendation, MentorDirectoryItem } from "../types";
import { BoardroomService } from "../services/boardroom-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface AIMentorSuggestionsProps {
  startupId?: string;
  industry?: string;
  goals?: string;
  allMentors?: MentorDirectoryItem[];
  onViewProfile?: (mentor: MentorDirectoryItem) => void;
  onInvite?: (mentor: MentorDirectoryItem) => void;
  className?: string;
}

export function AIMentorSuggestions({
  startupId,
  industry,
  goals,
  allMentors = [],
  onViewProfile,
  onInvite,
  className,
}: AIMentorSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AIMentorRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    setIsOpen(true);
    setHasSearched(true);

    try {
      const result = await BoardroomService.getAIMentorRecommendations({
        startupId,
        industry,
        goals,
      });

      if (result.error && result.recommendations.length === 0) {
        setError(result.error);
        setRecommendations([]);
      } else {
        // Hydrate mentors from allMentors list if mentor object isn't attached
        const hydrated = result.recommendations.map((rec) => {
          if (!rec.mentor && allMentors.length > 0) {
            const found = allMentors.find((m) => m.id === rec.mentor_id);
            if (found) {
              return { ...rec, mentor: found };
            }
          }
          return rec;
        });

        setRecommendations(hydrated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load AI recommendations.";
      setError(msg);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "EA";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/50 via-slate-50 to-blue-50/40 dark:from-indigo-950/20 dark:via-slate-900 dark:to-blue-950/20 shadow-sm overflow-hidden transition-all",
        className
      )}
    >
      {/* AI Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                AI Strategic Mentor Matching
              </h3>
              <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 text-[10px] font-semibold py-0">
                Gemini 2.5 Advisory Intelligence
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Analyze your startup industry, current stage, and advisory gaps to recommend vetted board leaders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {hasSearched && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="text-xs text-slate-600 dark:text-slate-400 h-9 px-2.5"
            >
              {isOpen ? (
                <>
                  <span>Collapse</span>
                  <ChevronUp className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  <span>View Suggestions ({recommendations.length})</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            onClick={fetchRecommendations}
            disabled={loading}
            className="h-9 px-4 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-sm gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Analyzing Board Fits...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>{hasSearched ? "Refresh Recommendations" : "Find My Best Mentors"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Suggestions Section */}
      {isOpen && (
        <div className="border-t border-indigo-100 dark:border-indigo-950/80 p-4 sm:p-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm space-y-4">
          {/* Loading Skeleton State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 animate-pulse space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-3 w-44 rounded bg-slate-200 dark:bg-slate-800" />
                      </div>
                    </div>
                    <div className="h-6 w-20 rounded-full bg-indigo-100 dark:bg-indigo-950" />
                  </div>
                  <div className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800/60 p-2" />
                  <div className="flex gap-2">
                    <div className="h-7 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-7 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                  AI Recommendation Notice
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                  {error}
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fetchRecommendations}
                    className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-100"
                  >
                    Retry Analysis
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && hasSearched && recommendations.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center space-y-3">
              <div className="mx-auto h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
                <Compass className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No direct AI matches found
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  We could not find an exact match for your current startup stage and industry. You can explore our full mentor directory below or update your startup industry profile.
                </p>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {!loading && recommendations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Top Recommended Executive Matches ({recommendations.length})
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Ranked by Strategic Synergy
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec, idx) => {
                  const mentor = rec.mentor;
                  const matchScore = rec.match_percentage;
                  const isOnBoard = mentor?.is_board_member || mentor?.invitation_status === "accepted";
                  const isPending = mentor?.invitation_status === "pending";

                  return (
                    <Card
                      key={rec.mentor_id || idx}
                      className="border border-indigo-100 dark:border-indigo-950 shadow-sm bg-white dark:bg-slate-900 flex flex-col justify-between"
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-11 w-11 rounded-lg border border-slate-200 shadow-sm">
                              {mentor?.avatar_url && (
                                <AvatarImage src={mentor.avatar_url} alt={mentor.full_name} />
                              )}
                              <AvatarFallback className="bg-indigo-900 text-white font-bold text-xs">
                                {mentor ? getInitials(mentor.full_name) : "EA"}
                              </AvatarFallback>
                            </Avatar>

                            <div className="space-y-0.5">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                                {mentor?.full_name || "Executive Board Advisor"}
                              </h4>
                              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                                {mentor?.professional_title || "Strategic Enterprise Advisor"}
                              </p>
                              {mentor?.previous_company && (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  <span>Ex-{mentor.previous_company}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Match Score or Match Label from Backend */}
                          <div className="flex flex-col items-end gap-1">
                            {typeof matchScore === "number" ? (
                              <Badge
                                className={cn(
                                  "text-xs font-bold px-2 py-0.5 border shadow-none",
                                  matchScore >= 90
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300"
                                )}
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                {matchScore}% Match
                              </Badge>
                            ) : rec.match_label ? (
                              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold px-2 py-0.5 border shadow-none">
                                <Sparkles className="h-3 w-3 mr-1" />
                                {rec.match_label}
                              </Badge>
                            ) : (
                              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold px-2 py-0.5 border shadow-none">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Recommended Fit
                              </Badge>
                            )}
                            {typeof matchScore === "number" && rec.match_label && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                {rec.match_label}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-1 pb-3 space-y-3 flex-1">
                        {/* Why Recommended AI Box */}
                        <div className="rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 p-2.5 space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Bot className="h-3 w-3" /> Why this mentor is recommended
                          </span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                            &ldquo;{rec.reason}&rdquo;
                          </p>
                        </div>

                        {/* Matching Expertise Badges */}
                        {rec.matching_expertise && rec.matching_expertise.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              Synergistic Skills
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {rec.matching_expertise.map((tag, tIdx) => (
                                <Badge
                                  key={tIdx}
                                  variant="secondary"
                                  className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-0"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>

                      {/* Card Actions */}
                      {mentor && (
                        <div className="p-3 pt-0 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 mt-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-8 border-slate-200 dark:border-slate-700"
                            onClick={() => onViewProfile?.(mentor)}
                          >
                            View Profile
                          </Button>

                          {isOnBoard ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled
                              className="flex-1 text-xs h-8 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 opacity-90 cursor-default shadow-none border border-emerald-300"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              On Board
                            </Button>
                          ) : isPending ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled
                              variant="secondary"
                              className="flex-1 text-xs h-8 bg-amber-50 text-amber-700 border border-amber-200 opacity-90 cursor-default shadow-none"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Invited
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              className="flex-1 text-xs h-8 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                              onClick={() => onInvite?.(mentor)}
                            >
                              <Send className="h-3 w-3 mr-1.5" />
                              Invite
                            </Button>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
