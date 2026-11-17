"use client";

import React, { useState } from "react";
import { Recommendation } from "@/types/startup";
import { EnrichedBoardMember } from "../types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Lightbulb,
  Sparkles,
  Calendar,
  User,
  ShieldCheck,
  ChevronRight,
  FileText,
  BookmarkCheck,
  ExternalLink,
  MessageSquareQuote,
  Building2,
} from "lucide-react";

interface BoardRecommendationsTabProps {
  recommendations: Recommendation[];
  members: EnrichedBoardMember[];
}

export function BoardRecommendationsTab({
  recommendations,
  members,
}: BoardRecommendationsTabProps) {
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(
    null
  );

  // Map mentor_id to mentor details for display
  const mentorMap = new Map<string, EnrichedBoardMember>();
  members.forEach((m) => {
    mentorMap.set(m.mentor_id, m);
  });

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Formal Board Recommendations ({recommendations.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Strategic guidance, governance directives, and advisory memos authored by your board members.
          </p>
        </div>
      </div>

      {/* Empty State */}
      {recommendations.length === 0 ? (
        <Card className="border-dashed border-2 border-border/80 bg-muted/10 py-12 text-center">
          <CardContent className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Lightbulb className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No Recommendations Submitted Yet</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When your appointed advisors review your startup&apos;s metrics, financial models, or strategic
              milestones, their formal memos and strategic recommendations will be archived here.
            </p>
            <div className="rounded-lg bg-muted/30 border border-border/40 p-3 text-left w-full mt-2 text-xs space-y-1.5">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                How to gather board input:
              </p>
              <ul className="list-disc list-inside text-muted-foreground text-[11px] space-y-1">
                <li>Schedule a board sync to align on Q3 goals or fundraising targets.</li>
                <li>Invite advisors specializing in your growth bottlenecks.</li>
                <li>Request formal review of pitch decks or unit economics.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => {
            const author = mentorMap.get(rec.mentor_id);
            const authorName = author?.profile?.full_name || "Board Advisor";
            const authorRole = author?.advisory_role || "Advisory Board Member";
            const authorAvatar = author?.profile?.avatar_url || "";
            const authorCompany = author?.mentor_profile?.previous_company || "";
            const dateStr = new Date(rec.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            const initials = authorName
              .split(" ")
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase() || "BA";

            return (
              <Card
                key={rec.id}
                className="flex flex-col justify-between border-border/70 hover:border-primary/40 hover:shadow-sm transition-all bg-card"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={authorAvatar || undefined} alt={authorName} />
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-xs text-foreground">{authorName}</h4>
                        <p className="text-[11px] text-muted-foreground">
                          {authorRole} {authorCompany && `• ${authorCompany}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {dateStr}
                    </Badge>
                  </div>

                  <CardTitle className="text-sm font-bold text-foreground mt-2 leading-snug">
                    {rec.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="py-1">
                  <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground border border-border/30 line-clamp-4 leading-relaxed">
                    {rec.content}
                  </div>
                </CardContent>

                <CardFooter className="pt-3 pb-3 border-t border-border/30 flex justify-between items-center text-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRecommendation(rec)}
                    className="w-full text-xs font-medium justify-between text-muted-foreground hover:text-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Read Full Directive
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recommendation Memo Modal */}
      <Dialog
        open={Boolean(selectedRecommendation)}
        onOpenChange={(open) => !open && setSelectedRecommendation(null)}
      >
        <DialogContent className="max-w-lg">
          {selectedRecommendation && (
            <>
              {(() => {
                const author = mentorMap.get(selectedRecommendation.mentor_id);
                const authorName = author?.profile?.full_name || "Board Advisor";
                const authorRole = author?.advisory_role || "Advisory Board Member";
                const authorAvatar = author?.profile?.avatar_url || "";
                const authorCompany = author?.mentor_profile?.previous_company || "";
                const dateStr = new Date(selectedRecommendation.created_at).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }
                );

                return (
                  <>
                    <DialogHeader>
                      <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                        <Avatar className="h-11 w-11 border border-border">
                          <AvatarImage src={authorAvatar || undefined} alt={authorName} />
                          <AvatarFallback>
                            {authorName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-sm text-foreground">{authorName}</h4>
                          <p className="text-xs text-muted-foreground">
                            {authorRole} {authorCompany && `• ${authorCompany}`}
                          </p>
                          <p className="text-[11px] text-muted-foreground/80 mt-0.5">{dateStr}</p>
                        </div>
                      </div>

                      <DialogTitle className="text-base font-bold text-foreground pt-3">
                        {selectedRecommendation.title}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-foreground text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedRecommendation.content}
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 text-primary border border-primary/20 text-xs">
                        <BookmarkCheck className="h-4 w-4 shrink-0" />
                        <span>Formal advisory memorandum archived to company governance records.</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}