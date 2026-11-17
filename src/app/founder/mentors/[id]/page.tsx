"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  Clock,
  Award,
  Send,
  ShieldCheck,
  UserCheck,
  Hourglass,
  Sparkles,
  Briefcase,
  Layers,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BoardroomService } from "@/features/virtual-boardroom/services/boardroom-service";
import { MentorDirectoryItem } from "@/features/virtual-boardroom/types";
import { SendInvitationDialog } from "@/features/virtual-boardroom/components/send-invitation-dialog";
import { createClient } from "@/lib/supabase/client";

export default function MentorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mentorId = params?.id as string;

  const [mentor, setMentor] = React.useState<MentorDirectoryItem | null>(null);
  const [boardId, setBoardId] = React.useState<string | undefined>(undefined);
  const [founderId, setFounderId] = React.useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isNotFound, setIsNotFound] = React.useState(false);
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);

  const fetchMentorData = React.useCallback(async () => {
    if (!mentorId) return;

    try {
      setIsLoading(true);
      setIsNotFound(false);

      // 1. Resolve logged-in founder & boardId if available
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let currentBoardId: string | undefined;
      const currentFounderId = session?.user?.id;
      if (currentFounderId) {
        setFounderId(currentFounderId);
        const overview = await BoardroomService.getFounderBoardroom(currentFounderId);
        if (overview.board?.id) {
          currentBoardId = overview.board.id;
          setBoardId(currentBoardId);
        }
      }

      // 2. Fetch mentor item
      const item = await BoardroomService.getMentorById(mentorId, {
        boardId: currentBoardId,
      });

      if (!item) {
        setIsNotFound(true);
      } else {
        setMentor(item);
      }
    } catch (err) {
      console.error("[MentorDetailPage] Error fetching mentor profile:", err);
      setIsNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [mentorId]);

  React.useEffect(() => {
    fetchMentorData();
  }, [fetchMentorData]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const formatAvailability = (availability: string) => {
    switch (availability) {
      case "full_time":
        return { label: "Full-Time Mentoring", variant: "accent" as const };
      case "part_time":
        return { label: "Part-Time Available", variant: "accent" as const };
      case "advisory_only":
        return { label: "Advisory Board Only", variant: "secondary" as const };
      case "unavailable":
        return { label: "Unavailable", variant: "destructive" as const };
      default:
        return { label: availability.replace(/_/g, " "), variant: "outline" as const };
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl py-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        <div className="h-48 rounded-2xl bg-muted/50 animate-pulse border border-border/50" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
          </div>
          <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />
        </div>
      </div>
    );
  }

  if (isNotFound || !mentor) {
    return (
      <div className="container max-w-3xl py-16 text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Briefcase className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Mentor Profile Not Found
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The requested mentor profile could not be located or may no longer be available in the active directory.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Button variant="outline" onClick={() => router.push("/founder/mentors")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Mentor Directory
          </Button>
          <Button variant="ghost" onClick={() => fetchMentorData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const availInfo = formatAvailability(mentor.availability);

  const renderInvitationAction = () => {
    if (mentor.is_board_member || mentor.invitation_status === "accepted") {
      return (
        <Button
          disabled
          variant="outline"
          className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold"
        >
          <UserCheck className="mr-2 h-4 w-4 text-emerald-600" />
          Active Board Member
        </Button>
      );
    }

    if (mentor.invitation_status === "pending") {
      return (
        <Button
          disabled
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold"
        >
          <Hourglass className="mr-2 h-4 w-4 text-amber-600 animate-pulse" />
          Invitation Pending
        </Button>
      );
    }

    return (
      <Button
        variant="accent"
        size="lg"
        onClick={() => setInviteModalOpen(true)}
        className="font-semibold shadow-md hover:shadow-lg transition-all"
      >
        <Send className="mr-2 h-4 w-4" />
        {mentor.invitation_status === "rejected" ? "Re-invite to Board" : "Invite to Advisory Board"}
      </Button>
    );
  };

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-xs text-muted-foreground">
        <Link
          href="/founder/mentors"
          className="flex items-center hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Mentor Directory
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground truncate font-medium">{mentor.full_name}</span>
      </nav>

      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 sm:p-10 text-white shadow-xl">
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-12 translate-y-[-24px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-24 w-24 border-2 border-white/20 shadow-2xl">
              {mentor.avatar_url && (
                <AvatarImage src={mentor.avatar_url} alt={mentor.full_name} />
              )}
              <AvatarFallback className="bg-white/10 text-white font-bold text-2xl">
                {getInitials(mentor.full_name)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {mentor.full_name}
                </h1>
                {mentor.verification_status === "verified" && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-semibold flex items-center gap-1 py-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified Advisor
                  </Badge>
                )}
              </div>

              <p className="text-base font-medium text-slate-300">
                {mentor.professional_title}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300/90 pt-1">
                <div className="flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-blue-400" />
                  <span>
                    {mentor.previous_designation && mentor.previous_designation !== mentor.professional_title
                      ? `${mentor.previous_designation} at `
                      : "Formerly at "}
                    <strong className="text-white">{mentor.previous_company}</strong>
                  </span>
                </div>

                {mentor.years_of_experience > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    <span>{mentor.years_of_experience}+ Years Experience</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {renderInvitationAction()}
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Biography & Achievements */}
        <div className="md:col-span-2 space-y-6">
          {/* Executive Biography */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Executive Biography
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {mentor.biography ||
                  "A seasoned industry leader with a distinguished career in driving corporate growth, scaling strategic business operations, and advising early-stage ventures."}
              </p>
            </CardContent>
          </Card>

          {/* Career Achievements */}
          {mentor.achievements && (
            <Card className="border-amber-200/70 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-600" />
                  Career Achievements & Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-amber-950/90 dark:text-amber-300/90 whitespace-pre-line">
                  {mentor.achievements}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Core Expertise Areas */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Core Functional Expertise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="px-3 py-1.5 text-xs font-medium"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Quick Stats & Domain Meta */}
        <div className="space-y-6">
          {/* Advisory Parameters */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                Advisory Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Availability</p>
                <Badge variant={availInfo.variant} className="text-xs font-medium">
                  {availInfo.label}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Executive Experience</p>
                <p className="text-sm font-semibold text-foreground">
                  {mentor.years_of_experience} Years in Leadership
                </p>
              </div>

              {mentor.previous_company && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Primary Organization</p>
                  <p className="text-sm font-semibold text-foreground">
                    {mentor.previous_company}
                  </p>
                </div>
              )}

              {mentor.specialization && mentor.specialization.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Specializations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mentor.specialization.map((spec, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-[11px] bg-muted/60"
                      >
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {mentor.industry_expertise && mentor.industry_expertise.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Industry Sectors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mentor.industry_expertise.map((industry, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground font-medium"
                      >
                        <Layers className="h-3 w-3 text-muted-foreground" />
                        {industry}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Callout Card */}
          <Card className="bg-primary/5 border-primary/20 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Sparkles className="h-4 w-4" />
                <span>Virtual Advisory Board</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Appointing vetted mentors to your advisory board unlocks structured governance, milestone guidance, and executive networking for your startup.
              </p>
              <div className="pt-1">
                {renderInvitationAction()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Embedded Send Invitation Dialog */}
      <SendInvitationDialog
        mentor={mentor}
        boardId={boardId}
        founderId={founderId}
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onSuccess={() => {
          fetchMentorData();
        }}
      />
    </div>
  );
}