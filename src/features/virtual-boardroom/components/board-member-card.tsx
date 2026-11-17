"use client";

import React, { useState } from "react";
import { EnrichedBoardMember } from "../types";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
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
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

interface BoardMemberCardProps {
  member: EnrichedBoardMember;
  onSelectMember?: (member: EnrichedBoardMember) => void;
}

export function BoardMemberCard({ member, onSelectMember }: BoardMemberCardProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  const { profile, mentor_profile, advisory_role, joined_at } = member;
  const fullName = profile?.full_name || "Advisory Member";
  const avatarUrl = profile?.avatar_url || "";
  const title = mentor_profile?.professional_title || "Executive Advisor";
  const company = mentor_profile?.previous_company || "Industry Leader";
  const yearsExp = mentor_profile?.years_of_experience || 0;
  const expertise = Array.isArray(mentor_profile?.expertise) ? mentor_profile.expertise : [];
  const specializations = Array.isArray(mentor_profile?.specialization)
    ? mentor_profile.specialization
    : [];

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AM";

  const formattedJoinDate = joined_at
    ? new Date(joined_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "Recently joined";

  const handleOpenProfile = () => {
    setProfileOpen(true);
    if (onSelectMember) {
      onSelectMember(member);
    }
  };

  return (
    <>
      <Card className="group relative flex flex-col justify-between overflow-hidden border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 opacity-80" />

        <CardHeader className="pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-emerald-500/20 shadow-sm">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="font-semibold text-base text-foreground leading-snug group-hover:text-primary transition-colors">
                  {fullName}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 inline text-muted-foreground/70" />
                  <span>{title}</span>
                  {company && (
                    <>
                      <span className="text-muted-foreground/40">•</span>
                      <span>{company}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Active Status Indicator */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              title="Verified active advisory seat"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Active
            </div>
          </div>

          {/* Advisory Role Tag */}
          <div className="mt-3">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/15">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>{advisory_role || "Strategic Advisor"}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="py-2 space-y-3">
          {/* Experience stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border/40">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{yearsExp} years leadership</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Seated {formattedJoinDate}</span>
            </span>
          </div>

          {/* Domain Badges */}
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
              Advisory Expertise
            </p>
            <div className="flex flex-wrap gap-1.5">
              {expertise.slice(0, 3).map((item, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-[11px] font-medium py-0.5 px-2 bg-secondary/60 text-secondary-foreground"
                >
                  {item}
                </Badge>
              ))}
              {expertise.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-[11px] py-0.5 px-1.5 text-muted-foreground"
                >
                  +{expertise.length - 3} more
                </Badge>
              )}
              {expertise.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                  General Strategic Guidance
                </span>
              )}
            </div>
          </div>

          {/* Specializations (if available) */}
          {specializations.length > 0 && (
            <div className="pt-0.5">
              <div className="flex flex-wrap gap-1">
                {specializations.slice(0, 2).map((spec, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-[10px] text-muted-foreground/80 bg-background border px-1.5 py-0.5 rounded"
                  >
                    ✦ {spec}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3 pb-4 border-t border-border/40 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenProfile}
            className="w-full text-xs font-medium hover:bg-primary/5 hover:text-primary transition-colors"
          >
            <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            View Full Profile
          </Button>
        </CardFooter>
      </Card>

      {/* Member Profile Modal */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg font-bold">{fullName}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {title} • {company}
                </DialogDescription>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Active Board Member</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="bg-muted/40 rounded-lg p-3 space-y-2 border border-border/50">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Board Advisory Role</span>
                <span className="font-semibold text-primary">{advisory_role}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Executive Experience</span>
                <span className="font-semibold text-foreground">{yearsExp} Years</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Appointment Date</span>
                <span className="font-semibold text-foreground">{formattedJoinDate}</span>
              </div>
              {profile?.email && (
                <div className="flex justify-between items-center text-xs pt-1 border-t border-border/30">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Direct Contact
                  </span>
                  <span className="font-mono text-muted-foreground select-all">{profile.email}</span>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Core Domains of Expertise
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {expertise.map((item, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs font-normal">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            {specializations.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Specialized Advisory Focus
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {specializations.map((spec, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs font-normal">
                      ✦ {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}