"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BoardroomService } from "@/features/virtual-boardroom/services/boardroom-service";
import { EnrichedInvitation } from "@/features/virtual-boardroom/types";
import { MentorInvitationsList } from "@/features/virtual-boardroom/components/mentor-invitations-list";
import { createClient } from "@/lib/supabase/client";

export default function MentorInvitationsPage() {
  const [invitations, setInvitations] = React.useState<EnrichedInvitation[]>([]);
  const [activeTab, setActiveTab] = React.useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchInvitations = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setError("Please sign in to view your incoming boardroom invitations.");
        setIsLoading(false);
        return;
      }

      const list = await BoardroomService.getMentorInvitations(session.user.id);
      setInvitations(list);
    } catch (err: unknown) {
      console.error("[MentorInvitationsPage] Error fetching invitations:", err);
      const msg = err instanceof Error ? err.message : "Failed to load advisory invitations.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Counts for tabs
  const pendingCount = invitations.filter((i) => i.status === "pending").length;
  const acceptedCount = invitations.filter((i) => i.status === "accepted").length;
  const rejectedCount = invitations.filter((i) => i.status === "rejected").length;
  const totalCount = invitations.length;

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Advisory Board Invitations
            </h1>
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 font-bold">
                {pendingCount} Pending
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review invitations from ambitious startup founders inviting you to join their advisory board.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchInvitations}
          disabled={isLoading}
          className="self-start sm:self-center"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card
          onClick={() => setActiveTab("all")}
          className={`cursor-pointer transition-all hover:border-primary/50 ${
            activeTab === "all" ? "border-primary bg-primary/5 shadow-sm" : "border-border/80"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">All Requests</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{totalCount}</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveTab("pending")}
          className={`cursor-pointer transition-all hover:border-amber-400 ${
            activeTab === "pending"
              ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm"
              : "border-border/80"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Pending Review</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">
              {pendingCount}
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveTab("accepted")}
          className={`cursor-pointer transition-all hover:border-emerald-400 ${
            activeTab === "accepted"
              ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm"
              : "border-border/80"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Active Boards</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
              {acceptedCount}
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveTab("rejected")}
          className={`cursor-pointer transition-all hover:border-destructive/40 ${
            activeTab === "rejected"
              ? "border-destructive/50 bg-destructive/5 shadow-sm"
              : "border-border/80"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Declined</span>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-muted-foreground">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span>All</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "pending"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span>Pending</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("accepted")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "accepted"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span>Accepted</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
            {acceptedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rejected")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "rejected"
              ? "bg-slate-700 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span>Declined</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
            {rejectedCount}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-44 rounded-xl bg-muted/40 animate-pulse border border-border/40" />
          <div className="h-44 rounded-xl bg-muted/40 animate-pulse border border-border/40" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchInvitations}>
            Retry Loading
          </Button>
        </div>
      ) : totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 py-16 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            You have not received any boardroom invitations yet
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
            When startup founders discover your executive expertise and send an advisory invitation, it will appear here with full startup context and personal notes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/mentor/profile">Update Advisor Profile</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/mentor/dashboard" className="flex items-center gap-1.5">
                <span>View Mentor Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <MentorInvitationsList
          initialInvitations={invitations}
          activeFilter={activeTab}
          onInvitationResponded={() => {
            // Refetch or update counts
            fetchInvitations();
          }}
        />
      )}
    </div>
  );
}