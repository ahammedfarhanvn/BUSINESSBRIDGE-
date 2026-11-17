"use client";

import * as React from "react";
import {
  Building2,
  Calendar,
  ExternalLink,
  Mail,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Inbox,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { BoardroomService } from "@/features/virtual-boardroom/services/boardroom-service";
import { EnrichedInvitation } from "@/features/virtual-boardroom/types";
import { InvitationStatus } from "@/types/startup";

export interface MentorInvitationsListProps {
  initialInvitations?: EnrichedInvitation[];
  activeFilter?: "all" | "pending" | "accepted" | "rejected";
  onInvitationResponded?: (invitationId: string, decision: "accepted" | "rejected") => void;
}

export function MentorInvitationsList({
  initialInvitations = [],
  activeFilter = "all",
  onInvitationResponded,
}: MentorInvitationsListProps) {
  const [invitations, setInvitations] = React.useState<EnrichedInvitation[]>(initialInvitations);
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<{ id: string; message: string } | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<{ id: string; message: string } | null>(null);

  // Sync when initialInvitations updates
  React.useEffect(() => {
    setInvitations(initialInvitations);
  }, [initialInvitations]);

  const handleDecision = async (invitationId: string, decision: "accepted" | "rejected") => {
    if (processingId) return; // Prevent duplicate clicks

    setProcessingId(invitationId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await BoardroomService.respondToInvitation(invitationId, decision);

      if (!res.success) {
        setActionError({
          id: invitationId,
          message: res.error || `Failed to ${decision === "accepted" ? "accept" : "decline"} invitation.`,
        });
        return;
      }

      // Update local state immediately
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitationId
            ? { ...inv, status: decision as InvitationStatus, updated_at: new Date().toISOString() }
            : inv
        )
      );

      setActionSuccess({
        id: invitationId,
        message:
          decision === "accepted"
            ? "Invitation accepted! You are now an advisory board member."
            : "Invitation declined.",
      });

      if (onInvitationResponded) {
        onInvitationResponded(invitationId, decision);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setActionError({ id: invitationId, message: msg });
    } finally {
      setProcessingId(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const formatStage = (stage?: string) => {
    if (!stage) return "Early Stage";
    switch (stage) {
      case "idea":
        return "Idea Phase";
      case "prototype":
        return "Prototype / MVP";
      case "early_traction":
        return "Early Traction";
      case "growth":
        return "Growth";
      case "scaling":
        return "Scaling";
      default:
        return stage.replace(/_/g, " ");
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Filter invitations
  const filteredInvitations = invitations.filter((inv) => {
    if (activeFilter === "all") return true;
    return inv.status === activeFilter;
  });

  if (filteredInvitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-4">
          <Inbox className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {activeFilter === "pending"
            ? "No pending invitations"
            : activeFilter === "accepted"
            ? "No accepted invitations yet"
            : activeFilter === "rejected"
            ? "No declined invitations"
            : "No boardroom invitations found"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          {activeFilter === "pending"
            ? "You have reviewed all incoming boardroom requests. New startup invitations will appear here."
            : "Startups seeking strategic mentorship can invite you to join their advisory board."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {filteredInvitations.map((inv) => {
        const isProcessing = processingId === inv.id;
        const startup = inv.startup;
        const founder = inv.founder;
        const isPending = inv.status === "pending";
        const isAccepted = inv.status === "accepted";
        const isRejected = inv.status === "rejected";

        return (
          <Card
            key={inv.id}
            className="overflow-hidden border-border/80 shadow-sm transition-all hover:shadow-md"
          >
            <CardHeader className="p-5 sm:p-6 pb-3 border-b border-border/40 bg-muted/15">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-base">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-foreground">
                        {startup?.name || "Startup Board Invitation"}
                      </h3>
                      {startup?.website_url && (
                        <a
                          href={startup.website_url.startsWith("http") ? startup.website_url : `https://${startup.website_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Visit startup website"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {startup?.industry && (
                        <span>{startup.industry}</span>
                      )}
                      {startup?.business_stage && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium bg-background">
                            {formatStage(startup.business_stage)}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {isPending && (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-semibold text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3 animate-pulse text-amber-600" />
                      Pending Review
                    </Badge>
                  )}
                  {isAccepted && (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-xs flex items-center gap-1 border-emerald-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Board Member (Accepted)
                    </Badge>
                  )}
                  {isRejected && (
                    <Badge variant="destructive" className="font-semibold text-xs flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Declined
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground hidden sm:inline flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatTimestamp(inv.created_at)}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-4">
              {/* Founder Context */}
              {founder && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3 text-xs">
                  <Avatar className="h-9 w-9 border border-border">
                    {founder.avatar_url && (
                      <AvatarImage src={founder.avatar_url} alt={founder.full_name} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {getInitials(founder.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      Invited by {founder.full_name} (Founder)
                    </p>
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{founder.email}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground sm:hidden">
                    {formatTimestamp(inv.created_at)}
                  </div>
                </div>
              )}

              {/* Startup Overview Description */}
              {startup?.description && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    About the Startup
                  </p>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {startup.description}
                  </p>
                </div>
              )}

              {/* Founder's Personal Message */}
              {inv.message && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-300">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                    <span>Founder Note:</span>
                  </div>
                  <p className="text-xs leading-relaxed text-blue-950/90 dark:text-blue-200/90 italic whitespace-pre-line pl-5">
                    &ldquo;{inv.message}&rdquo;
                  </p>
                </div>
              )}

              {/* Action Error Banner */}
              {actionError?.id === inv.id && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{actionError.message}</span>
                </div>
              )}

              {/* Action Success Banner */}
              {actionSuccess?.id === inv.id && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{actionSuccess.message}</span>
                </div>
              )}
            </CardContent>

            {/* Action Buttons (Only for Pending invitations) */}
            {isPending && (
              <CardFooter className="p-5 sm:p-6 pt-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-border/40 bg-muted/10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => handleDecision(inv.id, "rejected")}
                  className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-input"
                >
                  {isProcessing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="mr-1.5 h-3.5 w-3.5 text-destructive" />
                  )}
                  Decline Invitation
                </Button>

                <Button
                  variant="accent"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => handleDecision(inv.id, "accepted")}
                  className="text-xs font-semibold"
                >
                  {isProcessing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Accept Advisory Seat
                </Button>
              </CardFooter>
            )}
          </Card>
        );
      })}
    </div>
  );
}