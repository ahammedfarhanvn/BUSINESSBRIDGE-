"use client";

import React, { useState } from "react";
import Link from "next/link";
import { EnrichedInvitation } from "../types";
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
  Clock,
  Mail,
  UserCheck,
  Building2,
  Calendar,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Inbox,
  AlertCircle,
  XCircle,
  CheckCircle2,
  UserPlus,
} from "lucide-react";

interface PendingInvitationsCardProps {
  invitations: EnrichedInvitation[];
  onRefresh?: () => void;
}

export function PendingInvitationsCard({
  invitations,
  onRefresh,
}: PendingInvitationsCardProps) {
  const [selectedInvitation, setSelectedInvitation] = useState<EnrichedInvitation | null>(null);

  // Filter to pending invitations
  const pendingInvitations = invitations.filter((inv) => inv.status === "pending");
  const pastInvitations = invitations.filter((inv) => inv.status !== "pending");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1.5 font-medium"
          >
            <Clock className="h-3 w-3 animate-spin text-amber-600" />
            Pending Response
          </Badge>
        );
      case "accepted":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1 font-medium"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 flex items-center gap-1 font-medium"
          >
            <XCircle className="h-3 w-3 text-rose-600" />
            Declined
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="text-muted-foreground border-border flex items-center gap-1">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Invitations Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Awaiting Mentor Confirmation ({pendingInvitations.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Mentors receive instant board seat invitations and can accept or schedule an introductory call.
            </p>
          </div>

          <Link href="/founder/mentors">
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Invite More Mentors
            </Button>
          </Link>
        </div>

        {pendingInvitations.length === 0 ? (
          /* Empty State for Pending Invitations */
          <Card className="border-dashed border-2 border-border/80 bg-muted/10 py-10 text-center">
            <CardContent className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Inbox className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">No Pending Invitations</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You have no outstanding advisory invitations. All previous invitations have been responded
                to, or you haven&apos;t invited any mentors to your board yet.
              </p>
              <div className="pt-2">
                <Link href="/founder/mentors">
                  <Button size="sm" className="gap-2 text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    Explore Mentor Directory
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingInvitations.map((inv) => {
              const mentorName = inv.mentor?.full_name || "Executive Advisor";
              const mentorTitle = inv.mentor?.professional_title || "Industry Veteran";
              const mentorCompany = inv.mentor?.previous_company || "";
              const mentorAvatar = inv.mentor?.avatar_url || "";
              const mentorExp = inv.mentor?.years_of_experience || 0;
              const sentDate = new Date(inv.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              const initials = mentorName
                .split(" ")
                .map((n) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase() || "MA";

              return (
                <Card
                  key={inv.id}
                  className="flex flex-col justify-between border-border/70 hover:border-amber-500/40 hover:shadow-sm transition-all bg-card"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 border border-border">
                          <AvatarImage src={mentorAvatar || undefined} alt={mentorName} />
                          <AvatarFallback className="bg-muted text-muted-foreground font-medium text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-sm text-foreground">{mentorName}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground/70" />
                            <span>{mentorTitle}</span>
                            {mentorCompany && <span>• {mentorCompany}</span>}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(inv.status)}
                    </div>
                  </CardHeader>

                  <CardContent className="py-2 space-y-3">
                    {/* Invitation Message Preview */}
                    {inv.message ? (
                      <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground border border-border/40">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/80 mb-1">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span>Your Invitation Note:</span>
                        </div>
                        <p className="line-clamp-2 italic text-foreground/90">
                          &ldquo;{inv.message}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-muted/20 p-2 text-xs text-muted-foreground italic">
                        Standard advisory board invitation sent.
                      </div>
                    )}

                    {/* Expertise preview */}
                    {inv.mentor?.expertise && inv.mentor.expertise.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {inv.mentor.expertise.slice(0, 3).map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-secondary/70 text-secondary-foreground px-2 py-0.5 rounded font-medium"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Dispatched {sentDate}
                      </span>
                      {mentorExp > 0 && <span>{mentorExp} yrs exp</span>}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 pb-3 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedInvitation(inv)}
                      className="w-full text-xs font-medium justify-between text-muted-foreground hover:text-foreground"
                    >
                      <span>View Invitation Details</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Past / Resolved Invitations (Accepted / Declined) */}
      {pastInvitations.length > 0 && (
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Invitation History ({pastInvitations.length})
          </h4>
          <div className="space-y-2">
            {pastInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 text-xs"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={inv.mentor?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {inv.mentor?.full_name?.[0] || "M"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-medium text-foreground">
                      {inv.mentor?.full_name || "Advisor"}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      ({inv.mentor?.professional_title || "Advisor"})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-[11px]">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </span>
                  {getStatusBadge(inv.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invitation Details Dialog */}
      <Dialog
        open={Boolean(selectedInvitation)}
        onOpenChange={(open) => !open && setSelectedInvitation(null)}
      >
        <DialogContent className="max-w-md">
          {selectedInvitation && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center justify-between">
                  <span>Invitation Details</span>
                  {getStatusBadge(selectedInvitation.status)}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Record of official invitation dispatched from your advisory board.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={selectedInvitation.mentor?.avatar_url || undefined}
                      alt={selectedInvitation.mentor?.full_name || "Mentor"}
                    />
                    <AvatarFallback>
                      {selectedInvitation.mentor?.full_name?.[0] || "M"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">
                      {selectedInvitation.mentor?.full_name || "Executive Advisor"}
                    </h4>
                    <p className="text-muted-foreground">
                      {selectedInvitation.mentor?.professional_title || "Strategic Advisor"}
                      {selectedInvitation.mentor?.previous_company &&
                        ` • ${selectedInvitation.mentor.previous_company}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-foreground">Message Sent to Mentor:</span>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-muted-foreground leading-relaxed italic">
                    &ldquo;{selectedInvitation.message || "Standard advisory board invitation."}&rdquo;
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/30">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold">Sent On</span>
                    <span className="font-medium text-foreground">
                      {new Date(selectedInvitation.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold">Current State</span>
                    <span className="font-medium capitalize text-foreground">
                      {selectedInvitation.status}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}