"use client";

import React from "react";
import {
  Briefcase,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { MentorDirectoryItem } from "../types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MentorCardProps {
  mentor: MentorDirectoryItem;
  onViewProfile?: (mentor: MentorDirectoryItem) => void;
  onInvite?: (mentor: MentorDirectoryItem) => void;
  className?: string;
}

export function MentorCard({
  mentor,
  onViewProfile,
  onInvite,
  className,
}: MentorCardProps) {
  const getInitials = (name: string) => {
    if (!name) return "EA";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatAvailability = (availability: string) => {
    switch (availability?.toLowerCase()) {
      case "advisory_only":
        return { label: "Advisory Only", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "part_time":
        return { label: "Part-Time", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "full_time":
        return { label: "Full-Time", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "unavailable":
        return { label: "Unavailable", color: "bg-slate-100 text-slate-500 border-slate-200" };
      default:
        return {
          label: availability ? availability.replace(/_/g, " ") : "Advisory",
          color: "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  };

  const availInfo = formatAvailability(mentor.availability);

  const isPending = mentor.invitation_status === "pending";
  const isOnBoard = mentor.is_board_member || mentor.invitation_status === "accepted";

  return (
    <Card
      className={cn(
        "group flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 border-slate-200 bg-white dark:bg-slate-900",
        isOnBoard && "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10",
        className
      )}
    >
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <Avatar className="h-13 w-13 rounded-xl border border-slate-200 shadow-sm ring-2 ring-white dark:ring-slate-900">
              {mentor.avatar_url && (
                <AvatarImage src={mentor.avatar_url} alt={mentor.full_name} className="object-cover" />
              )}
              <AvatarFallback className="bg-slate-800 text-white font-semibold text-sm">
                {getInitials(mentor.full_name)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base leading-tight group-hover:text-blue-600 transition-colors">
                  {mentor.full_name}
                </h3>
                {mentor.verification_status === "verified" && (
                  <span title="Verified Executive Mentor">
                    <UserCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  </span>
                )}
              </div>

              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-1">
                {mentor.professional_title}
              </p>

              {mentor.previous_company && (
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Building className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  <span className="truncate">Ex-{mentor.previous_company}</span>
                </p>
              )}
            </div>
          </div>

          {/* Status / Experience Pill */}
          <div className="flex flex-col items-end gap-1.5">
            {isOnBoard ? (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 gap-1 text-[11px] font-medium py-0.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>On Board</span>
              </Badge>
            ) : isPending ? (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 gap-1 text-[11px] font-medium py-0.5">
                <Clock className="h-3 w-3 text-amber-600" />
                <span>Invited</span>
              </Badge>
            ) : null}

            <Badge
              variant="outline"
              className="text-[11px] font-medium text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60"
            >
              {mentor.years_of_experience}+ yrs exp
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-1 pb-4 space-y-3.5 flex-1">
        {/* Biography Snippet */}
        {mentor.biography && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {mentor.biography}
          </p>
        )}

        {/* Expertise Tags */}
        <div className="space-y-2">
          {mentor.expertise && mentor.expertise.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Core Advisory Domains
              </span>
              <div className="flex flex-wrap gap-1.5">
                {mentor.expertise.slice(0, 3).map((item, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-[11px] font-normal bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-0 py-0.5 px-2"
                  >
                    {item}
                  </Badge>
                ))}
                {mentor.expertise.length > 3 && (
                  <span className="text-[11px] text-slate-500 self-center pl-1 font-medium">
                    +{mentor.expertise.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Industry Focus */}
          {mentor.industry_expertise && mentor.industry_expertise.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mr-1">
                Sectors:
              </span>
              {mentor.industry_expertise.slice(0, 2).map((ind, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-900"
                >
                  {ind}
                </span>
              ))}
              {mentor.industry_expertise.length > 2 && (
                <span className="text-[10px] text-slate-500 font-medium">
                  +{mentor.industry_expertise.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Availability Badge */}
        <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 mt-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Availability:</span>
          </span>
          <span
            className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded border",
              availInfo.color
            )}
          >
            {availInfo.label}
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 gap-2 border-t border-slate-100 dark:border-slate-800 mt-auto bg-slate-50/50 dark:bg-slate-900/40 rounded-b-xl">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => onViewProfile?.(mentor)}
        >
          View Profile
        </Button>

        {isOnBoard ? (
          <Button
            type="button"
            size="sm"
            disabled
            className="flex-1 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 opacity-90 cursor-default shadow-none border border-emerald-300"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            On Board
          </Button>
        ) : isPending ? (
          <Button
            type="button"
            size="sm"
            disabled
            variant="secondary"
            className="flex-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 opacity-90 cursor-default shadow-none"
          >
            <Clock className="h-3.5 w-3.5 mr-1" />
            Invited
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="flex-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
            onClick={() => onInvite?.(mentor)}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Invite to Board
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
