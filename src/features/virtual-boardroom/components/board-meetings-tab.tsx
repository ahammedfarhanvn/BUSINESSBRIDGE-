"use client";

import React, { useState } from "react";
import { Meeting } from "@/types/startup";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Video,
  Plus,
  FileText,
  CalendarCheck,
  CalendarX,
  ExternalLink,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface BoardMeetingsTabProps {
  boardId?: string;
  founderId?: string;
  initialMeetings: Meeting[];
  boardMemberCount: number;
  onMeetingCreated?: (newMeeting: Meeting) => void;
}

export function BoardMeetingsTab({
  boardId,
  founderId,
  initialMeetings,
  boardMemberCount,
  onMeetingCreated,
}: BoardMeetingsTabProps) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedMeetingNotes, setSelectedMeetingNotes] = useState<Meeting | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Group meetings by upcoming vs. past
  const now = new Date();
  const sortedMeetings = [...meetings].sort(
    (a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
  );

  const upcomingMeetings = sortedMeetings.filter(
    (m) => new Date(m.meeting_date).getTime() >= now.getTime()
  );
  const pastMeetings = sortedMeetings.filter(
    (m) => new Date(m.meeting_date).getTime() < now.getTime()
  );

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !meetingDate) {
      setFormError("Please enter a meeting title and date.");
      return;
    }

    if (!boardId || !founderId) {
      setFormError("Board information is missing. Please refresh the page.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const combinedDateTime = new Date(`${meetingDate}T${meetingTime || "10:00"}:00`).toISOString();
      const supabase = createClient();

      const { data, error } = await supabase
        .from("meetings")
        .insert({
          board_id: boardId,
          title: title.trim(),
          meeting_date: combinedDateTime,
          meeting_notes: meetingNotes.trim() || null,
          created_by: founderId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const newMeeting: Meeting = data as Meeting;
        setMeetings((prev) => [newMeeting, ...prev]);
        if (onMeetingCreated) {
          onMeetingCreated(newMeeting);
        }
      }

      // Reset and close
      setTitle("");
      setMeetingDate("");
      setMeetingNotes("");
      setIsScheduleOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to schedule board meeting.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Virtual Boardroom Sessions</h3>
          <p className="text-xs text-muted-foreground">
            Synchronous advisory check-ins, strategic steering calls, and quarterly board reviews.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setFormError(null);
            setIsScheduleOpen(true);
          }}
          className="gap-1.5 self-start sm:self-auto text-xs"
        >
          <Plus className="h-4 w-4" />
          Schedule Board Meeting
        </Button>
      </div>

      {/* When 0 meetings exist */}
      {meetings.length === 0 ? (
        <Card className="border-dashed border-2 border-border/80 bg-muted/10 py-12 text-center">
          <CardContent className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CalendarX className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No Meetings Scheduled Yet</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Assemble your board members for recurring strategy check-ins, milestone deep-dives, or investor
              readiness reviews. Keep organized meeting notes and action items in one place.
            </p>
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => setIsScheduleOpen(true)}
                className="gap-2 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Schedule First Meeting
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Upcoming Meetings ({upcomingMeetings.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingMeetings.map((m) => {
                  const mDate = new Date(m.meeting_date);
                  return (
                    <Card
                      key={m.id}
                      className="border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5 shadow-sm hover:border-emerald-500/60 transition-all"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 mb-1.5 text-[10px]"
                            >
                              Upcoming Session
                            </Badge>
                            <CardTitle className="text-sm font-bold text-foreground">
                              {m.title}
                            </CardTitle>
                          </div>
                          <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                            <Video className="h-4 w-4" />
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="py-1 text-xs space-y-2">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            {mDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            {mDate.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {m.meeting_notes && (
                          <div className="p-2.5 rounded-lg bg-background/80 border border-border/50 text-muted-foreground text-[11px] line-clamp-2">
                            <span className="font-semibold text-foreground/80 block mb-0.5">
                              Agenda / Objectives:
                            </span>
                            {m.meeting_notes}
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="pt-3 pb-3 border-t border-border/40 flex justify-between items-center text-xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMeetingNotes(m)}
                          className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          View Agenda & Notes
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Meetings */}
          {pastMeetings.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Past Meeting Records ({pastMeetings.length})
              </h4>

              <div className="space-y-2">
                {pastMeetings.map((m) => {
                  const mDate = new Date(m.meeting_date);
                  return (
                    <div
                      key={m.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors gap-2 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          <CalendarCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{m.title}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>
                              {mDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span>•</span>
                            <span>
                              {mDate.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {m.meeting_notes && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedMeetingNotes(m)}
                            className="text-xs h-7 px-2.5"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Notes
                          </Button>
                        )}
                        <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">
                          Completed
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleScheduleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Schedule Board Meeting
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set up an official sync session with your advisory board members.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {formError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Meeting Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Strategic Advisory Review & Roadmap Sync"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Time</label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Agenda & Discussion Notes</label>
                <textarea
                  rows={4}
                  placeholder="Share key topics, questions for the board, or links to slides/decks..."
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsScheduleOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Scheduling..." : "Confirm & Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Meeting Notes Detail Modal */}
      <Dialog
        open={Boolean(selectedMeetingNotes)}
        onOpenChange={(open) => !open && setSelectedMeetingNotes(null)}
      >
        <DialogContent className="max-w-md">
          {selectedMeetingNotes && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold">
                  {selectedMeetingNotes.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(selectedMeetingNotes.meeting_date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="space-y-1.5">
                  <span className="font-semibold text-foreground">Agenda & Minutes:</span>
                  <div className="p-3.5 rounded-lg bg-muted/40 border border-border/40 text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedMeetingNotes.meeting_notes || "No notes documented for this session."}
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