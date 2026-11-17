"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MentorDirectoryItem } from "../types";
import { BoardroomService } from "../services/boardroom-service";
import { Send, AlertCircle, CheckCircle2, Building, RefreshCw } from "lucide-react";

export interface SendInvitationDialogProps {
  mentor: MentorDirectoryItem | null;
  boardId?: string;
  currentUserId?: string;
  founderId?: string;
  startupName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (mentorId: string, invitationId?: string) => void;
}

export function SendInvitationDialog({
  mentor,
  boardId,
  currentUserId,
  founderId,
  startupName = "our startup",
  open,
  onOpenChange,
  onSuccess,
}: SendInvitationDialogProps) {
  const effectiveUserId = currentUserId || founderId;
  const [message, setMessage] = useState(
    `We would be honored to invite you to join the advisory board for ${startupName}. Your executive background and domain expertise would be invaluable in guiding our strategic milestones.`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!mentor) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId || !effectiveUserId) {
      setError("Active advisory board or founder credentials not loaded.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await BoardroomService.sendBoardInvitation({
        boardId,
        mentorId: mentor.id,
        invitedBy: effectiveUserId,
        message: message.trim(),
      });

      if (!res.success) {
        setError(res.error || "Failed to send boardroom invitation.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.(mentor.id, res.invitationId);
          onOpenChange(false);
          setSuccess(false);
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send invitation.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "EA";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 border-slate-200 dark:border-slate-800">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-600" />
            <span>Invite to Advisory Board</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Send a formal executive board invitation with an optional tailored message.
          </DialogDescription>
        </DialogHeader>

        {/* Mentor Preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-2">
          <Avatar className="h-11 w-11 rounded-lg border">
            {mentor.avatar_url && (
              <AvatarImage src={mentor.avatar_url} alt={mentor.full_name} />
            )}
            <AvatarFallback className="bg-slate-800 text-white font-bold text-xs">
              {getInitials(mentor.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5 min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {mentor.full_name}
            </h4>
            <p className="text-xs text-slate-500 truncate">{mentor.professional_title}</p>
            {mentor.previous_company && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Building className="h-3 w-3" />
                <span>Ex-{mentor.previous_company}</span>
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-semibold">Invitation dispatched successfully!</span>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Personal Note / Advisory Scope
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Outline what strategic guidance you are seeking from this mentor..."
              className="text-xs leading-relaxed resize-none border-slate-200 dark:border-slate-800"
              disabled={isSubmitting || success}
            />
            <p className="text-[11px] text-slate-400">
              The mentor will receive this invitation along with your startup profile and stage.
            </p>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || success}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || success || !message.trim()}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Board Invitation</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
