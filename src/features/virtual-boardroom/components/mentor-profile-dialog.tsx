"use client";

import React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MentorDirectoryItem } from "../types";
import {
  Building,
  UserCheck,
  Send,
  CheckCircle2,
  Clock,
  Award,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SendInvitationDialog } from "./send-invitation-dialog";

export interface MentorProfileDialogProps {
  mentor: MentorDirectoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite?: (mentor: MentorDirectoryItem) => void;
  boardId?: string;
  founderId?: string;
  onInvitationSuccess?: () => void;
}

export function MentorProfileDialog({
  mentor,
  open,
  onOpenChange,
  onInvite,
  boardId,
  founderId,
  onInvitationSuccess,
}: MentorProfileDialogProps) {
  const [internalInviteOpen, setInternalInviteOpen] = React.useState(false);

  if (!mentor) return null;

  const getInitials = (name: string) => {
    if (!name) return "EA";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isPending = mentor.invitation_status === "pending";
  const isOnBoard = mentor.is_board_member || mentor.invitation_status === "accepted";

  const handleInviteClick = () => {
    if (onInvite) {
      onOpenChange(false);
      onInvite(mentor);
    } else {
      setInternalInviteOpen(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-slate-200 dark:border-slate-800">
          {/* Header Hero Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="h-18 w-18 border-2 border-white/20 shadow-lg">
                {mentor.avatar_url && (
                  <AvatarImage
                    src={mentor.avatar_url}
                    alt={mentor.full_name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-slate-800 text-white font-bold text-lg">
                  {getInitials(mentor.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl font-bold tracking-tight text-white">
                    {mentor.full_name}
                  </DialogTitle>
                  {mentor.verification_status === "verified" && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 gap-1 text-[11px] py-0">
                      <ShieldCheck className="h-3 w-3" />
                      Verified Leader
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-slate-300 font-medium">
                  {mentor.professional_title}
                </p>

                {mentor.previous_company && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <Building className="h-3.5 w-3.5 text-blue-400" />
                    <span>
                      {mentor.previous_designation &&
                      mentor.previous_designation !== mentor.professional_title
                        ? `${mentor.previous_designation} at `
                        : "Formerly at "}
                      <strong className="text-slate-200">{mentor.previous_company}</strong>
                    </span>
                  </p>
                )}
              </div>

              <Badge className="bg-white/10 text-white border-white/20 text-xs py-1 px-2.5 shrink-0 self-start sm:self-auto">
                {mentor.years_of_experience}+ Years Leadership
              </Badge>
            </div>

            <DialogDescription className="sr-only">
              Detailed mentor profile for {mentor.full_name}
            </DialogDescription>
          </div>

          {/* Quick Details Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-6 py-2.5 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>
                Availability:{" "}
                <strong className="capitalize text-slate-900 dark:text-slate-100">
                  {mentor.availability?.replace(/_/g, " ") || "Advisory Only"}
                </strong>
              </span>
            </div>

            <Link
              href={`/founder/mentors/${mentor.id}`}
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <span>View Full Page</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-5">
            {/* Executive Biography */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                Executive Biography & Background
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {mentor.biography ||
                  "A distinguished executive leader with proven expertise in governance, organizational scale, and strategic advisory."}
              </p>
            </div>

            {/* Key Achievements */}
            {mentor.achievements && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 space-y-1.5">
                <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-600" />
                  Key Career Accomplishments
                </h4>
                <p className="text-xs text-amber-950/90 dark:text-amber-300/90 leading-relaxed whitespace-pre-line">
                  {mentor.achievements}
                </p>
              </div>
            )}

            {/* Core Functional Expertise */}
            {mentor.expertise && mentor.expertise.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  Core Advisory Domains
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {mentor.expertise.map((exp, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 py-1 px-2.5 font-medium"
                    >
                      {exp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Industry Focus & Strategic Specialization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {mentor.industry_expertise && mentor.industry_expertise.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Industry Sectors
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {mentor.industry_expertise.map((ind, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900 font-medium"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {mentor.specialization && mentor.specialization.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Specialized Advisory Focus
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {mentor.specialization.map((spec, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-900 font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Bar */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto text-xs"
              >
                Close
              </Button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {isOnBoard ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled
                    className="w-full sm:w-auto text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 font-medium"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    Active Board Member
                  </Button>
                ) : isPending ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled
                    variant="secondary"
                    className="w-full sm:w-auto text-xs bg-amber-50 text-amber-800 border border-amber-300 font-medium"
                  >
                    <Clock className="h-3.5 w-3.5 mr-1 text-amber-600 animate-pulse" />
                    Invitation Pending
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                    onClick={handleInviteClick}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {mentor.invitation_status === "rejected"
                      ? "Re-invite to Board"
                      : "Invite to Board"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Internal Send Invitation Dialog if onInvite is not handled externally */}
      {!onInvite && (
        <SendInvitationDialog
          mentor={mentor}
          boardId={boardId}
          founderId={founderId}
          open={internalInviteOpen}
          onOpenChange={setInternalInviteOpen}
          onSuccess={() => {
            if (onInvitationSuccess) onInvitationSuccess();
          }}
        />
      )}
    </>
  );
}