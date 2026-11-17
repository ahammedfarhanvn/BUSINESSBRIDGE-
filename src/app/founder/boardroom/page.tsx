"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Compass,
  Clock,
  Sparkles,
  ShieldCheck,
  Calendar,
  Lightbulb,
  MessageSquare,
  Building2,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Send,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Target,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { BoardroomService } from "@/features/virtual-boardroom/services/boardroom-service";
import {
  BoardroomOverview,
  EnrichedBoardMember,
  EnrichedInvitation,
} from "@/features/virtual-boardroom/types";
import { Meeting, Recommendation } from "@/types/startup";
import { BoardMemberCard } from "@/features/virtual-boardroom/components/board-member-card";
import { PendingInvitationsCard } from "@/features/virtual-boardroom/components/pending-invitations-card";
import { BoardMeetingsTab } from "@/features/virtual-boardroom/components/board-meetings-tab";
import { BoardRecommendationsTab } from "@/features/virtual-boardroom/components/board-recommendations-tab";

type ActiveTab = "members" | "invitations" | "meetings" | "recommendations" | "chat";

export default function FounderBoardroomPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("members");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [overview, setOverview] = useState<BoardroomOverview>({
    startup: null,
    board: null,
    members: [],
    invitations: [],
    meetings: [],
    recommendations: [],
    isLoading: true,
    error: null,
  });

  const loadBoardroom = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Fallback / Demo preview mode when not logged in
        setCurrentUserId(null);
        setOverview({
          startup: {
            id: "demo-startup",
            founder_id: "demo-founder",
            name: "NovaBridge Analytics",
            industry: "Enterprise AI & SaaS",
            description: "Predictive decision pipeline turning unstructured telemetry into automated board-level recommendations.",
            business_stage: "early_traction",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          board: {
            id: "demo-board",
            startup_id: "demo-startup",
            name: "NovaBridge Executive Advisory Board",
            created_at: new Date().toISOString(),
          },
          members: [
            {
              id: "mem-1",
              board_id: "demo-board",
              mentor_id: "ment-1",
              advisory_role: "Lead Strategic Advisor",
              membership_status: "active",
              joined_at: new Date(Date.now() - 30 * 86400000).toISOString(),
              profile: {
                id: "user-1",
                full_name: "Sarah Jenkins",
                email: "sarah.jenkins@advisor.co",
                avatar_url: null,
              },
              mentor_profile: {
                id: "ment-1",
                professional_title: "Former VP of Growth",
                previous_company: "Stripe",
                years_of_experience: 14,
                expertise: ["GTM Strategy", "SaaS Pricing", "Enterprise Sales"],
                specialization: ["B2B Expansion", "Series A Readiness"],
                availability: "advisory_only",
              },
            },
            {
              id: "mem-2",
              board_id: "demo-board",
              mentor_id: "ment-2",
              advisory_role: "Lead Financial & Capital Advisor",
              membership_status: "active",
              joined_at: new Date(Date.now() - 14 * 86400000).toISOString(),
              profile: {
                id: "user-2",
                full_name: "David Chen",
                email: "david.chen@advisor.co",
                avatar_url: null,
              },
              mentor_profile: {
                id: "ment-2",
                professional_title: "Chief Financial Officer",
                previous_company: "Snowflake",
                years_of_experience: 18,
                expertise: ["Fundraising", "Financial Modeling", "Corporate Governance"],
                specialization: ["Unit Economics", "Venture Debt"],
                availability: "advisory_only",
              },
            },
          ],
          invitations: [
            {
              id: "inv-1",
              board_id: "demo-board",
              mentor_id: "ment-3",
              invited_by: "demo-founder",
              status: "pending",
              message: "Hi Elena, we're building an AI observability suite and would love your guidance on enterprise security architecture.",
              created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
              updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
              mentor: {
                id: "ment-3",
                user_id: "user-3",
                full_name: "Elena Rostova",
                professional_title: "Head of AI Infrastructure",
                previous_company: "Databricks",
                avatar_url: null,
                years_of_experience: 12,
                expertise: ["AI Infrastructure", "Enterprise Security", "Cloud Architecture"],
              },
            },
          ],
          meetings: [
            {
              id: "meet-1",
              board_id: "demo-board",
              title: "Q3 Strategy & Go-To-Market Alignment",
              meeting_date: new Date(Date.now() + 5 * 86400000).toISOString(),
              meeting_notes: "Key discussion points:\n1. Pricing tiers for mid-market tier.\n2. Review of current pipeline conversion rates.\n3. Intro to tier-1 enterprise pilots.",
              created_by: "demo-founder",
              created_at: new Date().toISOString(),
            },
          ],
          recommendations: [
            {
              id: "rec-1",
              startup_id: "demo-startup",
              mentor_id: "ment-2",
              title: "Establish a 14-Month Runway Margin Before Series A Kickoff",
              content: "Given the current venture capital landscape, I strongly advise maintaining at least a 14-month cash runway before formally initiating Series A partner meetings. Prioritize customer-funded expansion where possible and optimize cloud hosting margins by negotiating annual enterprise commitments.",
              created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
            },
          ],
          isLoading: false,
          error: null,
        });
        return;
      }

      setCurrentUserId(user.id);
      const data = await BoardroomService.getFounderBoardroom(user.id);
      setOverview(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load boardroom data.";
      setOverview((prev) => ({ ...prev, error: msg, isLoading: false }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBoardroom();
  }, []);

  // Compute metrics
  const activeMembers = overview.members || [];
  const pendingInvitations = (overview.invitations || []).filter((inv) => inv.status === "pending");

  // Collect unique domain expertise represented across active board members
  const representedDomains = useMemo(() => {
    const domains = new Set<string>();
    activeMembers.forEach((member) => {
      const exp = member.mentor_profile?.expertise || [];
      exp.forEach((d) => domains.add(d));
    });
    return Array.from(domains);
  }, [activeMembers]);

  // Loading state skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-muted/60 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-muted/50 animate-pulse rounded-xl" />
          <div className="h-28 bg-muted/50 animate-pulse rounded-xl" />
          <div className="h-28 bg-muted/50 animate-pulse rounded-xl" />
        </div>
        <div className="h-12 w-full max-w-lg bg-muted/40 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-56 bg-muted/30 animate-pulse rounded-xl" />
          <div className="h-56 bg-muted/30 animate-pulse rounded-xl" />
          <div className="h-56 bg-muted/30 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  // Startup missing state
  if (overview.error && !overview.startup) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-10 max-w-4xl mx-auto flex items-center justify-center">
        <Card className="text-center p-8 border-dashed border-2">
          <CardContent className="space-y-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Building2 className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-bold">No Startup Profile Found</CardTitle>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              To seat an advisory board, please complete your startup registration first with your company name,
              industry, and stage.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link href="/founder/dashboard">
                <Button variant="default" className="gap-2">
                  Complete Startup Profile <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startupName = overview.startup?.name || "Your Startup";
  const boardName = overview.board?.name || `${startupName} Advisory Board`;

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Banner Header */}
      <div className="border-b border-border/70 bg-gradient-to-b from-muted/30 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge
                  variant="outline"
                  className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  Executive Governance
                </Badge>
                {overview.startup?.industry && (
                  <Badge variant="secondary" className="text-xs">
                    {overview.startup.industry}
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {boardName}
              </h1>

              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
                The centralized command center for your appointed mentors, strategic governance memos,
                advisory check-ins, and pending invitations.
              </p>
            </div>

            {/* Header CTAs */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadBoardroom(true)}
                disabled={refreshing}
                className="text-xs gap-1.5 h-9"
                title="Refresh Boardroom Data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Link href="/founder/mentors">
                <Button size="sm" className="gap-1.5 h-9 text-xs font-medium shadow-sm">
                  <UserPlus className="h-3.5 w-3.5" />
                  Find & Invite Mentors
                </Button>
              </Link>
            </div>
          </div>

          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {/* Metric 1: Accepted Board Members */}
            <Card className="border-border/70 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Seated Board Members
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      {activeMembers.length}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      / 3-5 recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 mt-1">
                    {activeMembers.length === 0
                      ? "Board is currently vacant"
                      : `${activeMembers.length} active strategic advisors`}
                  </p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Metric 2: Pending Invitations */}
            <Card className="border-border/70 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pending Invitations
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      {pendingInvitations.length}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      awaiting reply
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 mt-1">
                    {pendingInvitations.length > 0
                      ? "Mentors reviewing seat offers"
                      : "All invitations resolved"}
                  </p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Metric 3: Board Advisory Coverage */}
            <Card className="border-border/70 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Advisory Coverage
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      {representedDomains.length}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      domains covered
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 mt-1 truncate max-w-[200px]">
                    {representedDomains.length > 0
                      ? representedDomains.slice(0, 3).join(", ")
                      : "Invite cross-functional mentors"}
                  </p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border/60 scrollbar-none">
          <button
            onClick={() => setActiveTab("members")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "members"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Board Members</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "members"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {activeMembers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("invitations")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "invitations"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Pending Invitations</span>
            {pendingInvitations.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "invitations"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {pendingInvitations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("meetings")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "meetings"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Meetings</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "meetings"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {(overview.meetings || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("recommendations")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "recommendations"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            <span>Recommendations</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "recommendations"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {(overview.recommendations || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "chat"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Board Chat</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Live
            </span>
          </button>
        </div>

        {/* TAB 1: BOARD MEMBERS */}
        {activeTab === "members" && (
          <div className="space-y-6">
            {activeMembers.length === 0 ? (
              /* Rich Empty State for 0 Board Members */
              <div className="space-y-6">
                <Card className="border-2 border-dashed border-border/80 bg-gradient-to-b from-muted/20 to-background py-10 px-4 text-center">
                  <div className="max-w-xl mx-auto space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
                      <Users className="h-8 w-8" />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        Your Virtual Advisory Board is Empty
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        Startups with active advisory boards raise capital 3.5x faster and scale revenue
                        with fewer missteps. Invite verified industry leaders specializing in Growth,
                        Fundraising, Product, and Enterprise Architecture.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Link href="/founder/mentors">
                        <Button className="gap-2 text-xs h-9 w-full sm:w-auto">
                          <Compass className="h-4 w-4" />
                          Browse Mentor Directory
                        </Button>
                      </Link>

                      {pendingInvitations.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab("invitations")}
                          className="gap-2 text-xs h-9 w-full sm:w-auto"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          View {pendingInvitations.length} Pending Invites
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Onboarding Guide Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-border/60 bg-card p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        1
                      </span>
                      <span>Find the Right Fit</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Filter verified mentors by industry domain, previous corporate experience (e.g., Stripe,
                      Google), and leadership tenure.
                    </p>
                  </Card>

                  <Card className="border-border/60 bg-card p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        2
                      </span>
                      <span>Dispatch Formal Invitation</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Send personalized board invitation notes stating your current business stage, milestones,
                      and advisory expectations.
                    </p>
                  </Card>

                  <Card className="border-border/60 bg-card p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        3
                      </span>
                      <span>Convene & Get Guidance</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Once accepted, schedule regular board syncs and receive formal advisory memos directly into
                      your company governance records.
                    </p>
                  </Card>
                </div>
              </div>
            ) : (
              /* Active Board Members Grid */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Displaying {activeMembers.length} active advisory member{activeMembers.length !== 1 ? "s" : ""}.
                  </p>

                  <Link href="/founder/mentors">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
                      <UserPlus className="h-3.5 w-3.5" />
                      Add Advisor
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeMembers.map((member) => (
                    <BoardMemberCard key={member.id} member={member} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PENDING INVITATIONS */}
        {activeTab === "invitations" && (
          <PendingInvitationsCard
            invitations={overview.invitations || []}
            onRefresh={() => loadBoardroom(true)}
          />
        )}

        {/* TAB 3: MEETINGS */}
        {activeTab === "meetings" && (
          <BoardMeetingsTab
            boardId={overview.board?.id}
            founderId={currentUserId || overview.startup?.founder_id || "demo-founder"}
            initialMeetings={overview.meetings || []}
            boardMemberCount={activeMembers.length}
            onMeetingCreated={(newMeeting) => {
              setOverview((prev) => ({
                ...prev,
                meetings: [newMeeting, ...(prev.meetings || [])],
              }));
            }}
          />
        )}

        {/* TAB 4: RECOMMENDATIONS */}
        {activeTab === "recommendations" && (
          <BoardRecommendationsTab
            recommendations={overview.recommendations || []}
            members={activeMembers}
          />
        )}

        {/* TAB 5: BOARD CHAT / COMMUNICATIONS */}
        {activeTab === "chat" && (
          <div className="space-y-6">
            <Card className="border-border/70 bg-card overflow-hidden">
              <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 via-muted/30 to-background flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      Virtual Boardroom Direct Advisory Channel
                    </h3>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 text-[10px]">
                      Encrypted Channel
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Async communication stream with all seated advisory board members of {startupName}.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2 overflow-hidden">
                    {activeMembers.slice(0, 3).map((m) => (
                      <Avatar key={m.id} className="inline-block h-8 w-8 ring-2 ring-background">
                        <AvatarImage src={m.profile.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {m.profile.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activeMembers.length} Member{activeMembers.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <CardContent className="p-6 space-y-4">
                {activeMembers.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Board Chat Is Locked
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Once at least one advisory board member accepts your invitation, your collaborative
                      board chat room will unlock here.
                    </p>
                    <Link href="/founder/mentors">
                      <Button size="sm" className="text-xs gap-1.5 mt-2">
                        <Compass className="h-3.5 w-3.5" />
                        Explore Mentors
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Simulated discussion threads */}
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            Suggested Board Discussion Prompts
                          </span>
                          <span className="text-[11px] text-muted-foreground">Click to start a topic</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            className="text-left p-2.5 rounded-lg border border-border/60 bg-background hover:border-primary/50 transition-colors text-xs text-foreground/90 font-medium"
                          >
                            📊 Review Q3 Financial Model & Burn Rate
                          </button>
                          <button
                            type="button"
                            className="text-left p-2.5 rounded-lg border border-border/60 bg-background hover:border-primary/50 transition-colors text-xs text-foreground/90 font-medium"
                          >
                            🚀 Enterprise Pricing Strategy vs. Usage-based
                          </button>
                          <button
                            type="button"
                            className="text-left p-2.5 rounded-lg border border-border/60 bg-background hover:border-primary/50 transition-colors text-xs text-foreground/90 font-medium"
                          >
                            🤝 Introduction to Series A Lead Investors
                          </button>
                          <button
                            type="button"
                            className="text-left p-2.5 rounded-lg border border-border/60 bg-background hover:border-primary/50 transition-colors text-xs text-foreground/90 font-medium"
                          >
                            🛡️ SOC-2 Compliance & Security Architecture Review
                          </button>
                        </div>
                      </div>

                      {/* Mocked conversation message */}
                      <div className="p-4 rounded-xl border border-border/40 bg-card space-y-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {activeMembers[0]?.profile.full_name?.slice(0, 2).toUpperCase() || "AM"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {activeMembers[0]?.profile.full_name || "Board Advisor"}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0">
                                {activeMembers[0]?.advisory_role || "Advisor"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">Today at 10:45 AM</span>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                              Welcome everyone to the {startupName} advisory board channel. Looking forward
                              to reviewing the product metrics and preparing for upcoming milestones!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chat Input Field */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="Type a message or question to your board members..."
                        className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <Button size="sm" className="h-10 px-4 text-xs gap-1.5 shrink-0">
                        <Send className="h-3.5 w-3.5" />
                        <span>Send</span>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}