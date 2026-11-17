"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  Briefcase,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Edit3,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  Layers,
  BookOpen,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { MentorVerificationStatus } from "@/types/mentor";

interface MentorData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl: string | null;
  bio: string;
  professionalTitle: string;
  previousCompany: string;
  yearsOfExperience: number;
  expertise: string[];
  specializations: string[];
  availability: "advisory_only" | "part_time" | "full_time" | "unavailable";
  format: string;
  verificationStatus: MentorVerificationStatus;
}

export default function MentorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MentorData>({
    fullName: "Dr. Eleanor Vance",
    email: "e.vance@executiveadvisors.com",
    phone: "+1 (617) 555-8921",
    location: "Boston, MA",
    avatarUrl: null,
    bio: "Retired Executive VP with 26+ years scaling enterprise SaaS organizations from Series A to global public listings. Deep focus on board governance and GTM architecture.",
    professionalTitle: "Former VP of Engineering & Operations",
    previousCompany: "Global Cloud Systems Inc.",
    yearsOfExperience: 26,
    expertise: ["Enterprise Software", "Cloud Infrastructure", "FinTech", "Corporate Governance"],
    specializations: ["Executive Coaching", "Series A-C Scaling", "GTM Strategy", "M&A Readiness"],
    availability: "advisory_only",
    format: "Virtual Boardroom Meetings & Monthly Strategy Reviews",
    verificationStatus: "verified",
  });

  useEffect(() => {
    async function loadMentorProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          const { data: mentorProfile } = await supabase
            .from("mentor_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (profile) {
            setData((prev) => ({
              ...prev,
              fullName: profile.full_name || prev.fullName,
              email: profile.email || user.email || prev.email,
              phone: profile.phone || prev.phone,
              avatarUrl: profile.avatar_url || prev.avatarUrl,
              bio: mentorProfile?.biography || prev.bio,
              professionalTitle: mentorProfile?.professional_title || prev.professionalTitle,
              previousCompany: mentorProfile?.previous_company || prev.previousCompany,
              yearsOfExperience: mentorProfile?.years_of_experience ?? prev.yearsOfExperience,
              expertise: mentorProfile?.expertise && mentorProfile.expertise.length > 0 ? mentorProfile.expertise : prev.expertise,
              availability: (mentorProfile?.availability as MentorData["availability"]) || prev.availability,
              verificationStatus: mentorProfile?.verification_status || prev.verificationStatus,
            }));
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    loadMentorProfile();
  }, []);

  const getStatusBadge = (status: MentorVerificationStatus) => {
    switch (status) {
      case "verified":
        return {
          label: "Verified Advisor",
          className: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
          icon: ShieldCheck,
          text: "Your executive credentials and background have been verified by platform administrators. You are eligible to receive and accept invitations to Virtual Boardrooms.",
        };
      case "pending":
        return {
          label: "Verification Pending",
          className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
          icon: Clock,
          text: "Your profile is under review by our administrative team. Verification typically completes within 24 to 48 business hours.",
        };
      case "rejected":
        return {
          label: "Application Rejected",
          className: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300",
          icon: XCircle,
          text: "Your credentials could not be verified. Please review and update your executive history in your profile or reach out to support.",
        };
    }
  };

  const statusInfo = getStatusBadge(data.verificationStatus);
  const StatusIcon = statusInfo.icon;

  const formatAvailability = (avail: string) => {
    switch (avail) {
      case "advisory_only":
        return "Advisory Board Only (Monthly/Quarterly)";
      case "part_time":
        return "Part-Time Strategic Advisor";
      case "full_time":
        return "Full-Time Mentorship";
      case "unavailable":
        return "Currently Unavailable";
      default:
        return avail;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl border border-emerald-200/60 bg-gradient-to-r from-slate-900 via-navy-800 to-emerald-950 p-6 text-white shadow-md sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-200 backdrop-blur-sm">
              <Award className="h-3.5 w-3.5 text-emerald-300" />
              <span>Executive Mentor Portal</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, {data.fullName}!
            </h2>
            <p className="max-w-xl text-sm text-slate-300">
              {data.professionalTitle} • {data.yearsOfExperience}+ Years of leadership experience. Ready to guide ambitious startup founders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500 shadow"
            >
              <Link href="/mentor/profile" className="flex items-center gap-1.5">
                <Edit3 className="h-4 w-4" />
                <span>Manage Advisor Profile</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Verification Status Card */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg p-2 bg-muted">
              <StatusIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Verification Status
                </h3>
                <Badge className={`text-xs font-medium border ${statusInfo.className}`}>
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {statusInfo.text}
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" asChild className="text-xs self-start sm:self-center">
            <Link href="/mentor/profile">Review Credentials</Link>
          </Button>
        </div>
      </div>

      {/* Profile & Experience Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Professional Summary */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Profile Overview</CardTitle>
            <CardDescription className="text-xs">Your advisor profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-14 w-14 border border-border">
                {data.avatarUrl ? <AvatarImage src={data.avatarUrl} alt={data.fullName} /> : null}
                <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-base">
                  {data.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <h4 className="font-semibold text-foreground text-sm">{data.fullName}</h4>
                <p className="text-xs text-emerald-600 font-medium">{data.professionalTitle}</p>
                <div className="flex items-center gap-1 pt-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3 text-muted-foreground/70" />
                  <span>{data.location}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground/80" />
                <span className="truncate">{data.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground/80" />
                <span>{data.phone}</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed italic line-clamp-3 pt-1">
                &ldquo;{data.bio}&rdquo;
              </p>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="ghost" size="sm" asChild className="w-full text-xs text-emerald-600 hover:text-emerald-700">
              <Link href="/mentor/profile" className="flex items-center justify-center gap-1">
                <span>Edit Executive Profile</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Experience & Domain Expertise */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Executive Experience & Expertise</CardTitle>
              <Badge variant="outline" className="text-xs font-semibold text-emerald-600 border-emerald-200">
                {data.yearsOfExperience} Years Leadership
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Domain expertise and career highlights evaluated by founders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            {/* Experience Card */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3.5 bg-background">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Previous Leadership Title</span>
                </div>
                <p className="mt-1 font-semibold text-foreground text-sm">
                  {data.professionalTitle}
                </p>
              </div>

              <div className="rounded-lg border p-3.5 bg-background">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Executive Company</span>
                </div>
                <p className="mt-1 font-semibold text-foreground text-sm">
                  {data.previousCompany}
                </p>
              </div>
            </div>

            {/* Industry Expertise Chips */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                Industry Sectors
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.expertise.map((item, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-border"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Specialization Chips */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                Strategic Advisory Specializations
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.specializations.map((item, idx) => (
                  <Badge
                    key={idx}
                    className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mentoring Availability & Format Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Mentoring Availability & Engagement Format</CardTitle>
          <CardDescription className="text-xs">
            How and when founders can convene advisory sessions with you
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3.5 bg-muted/20">
            <span className="text-xs font-medium text-muted-foreground">Current Availability</span>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatAvailability(data.availability)}
            </p>
          </div>

          <div className="rounded-lg border p-3.5 bg-muted/20">
            <span className="text-xs font-medium text-muted-foreground">Advisory Format</span>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {data.format}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Virtual Boardroom Active Card */}
      <Card className="relative overflow-hidden border-border/80 shadow-sm">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y-[-8px] rounded-full bg-emerald-500/10 blur-xl" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <Users className="h-5 w-5" />
            </div>
            <Badge className="text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
              Module A • Live Now
            </Badge>
          </div>
          <CardTitle className="text-lg font-bold pt-2">Virtual Boardroom Workspace</CardTitle>
          <CardDescription className="text-xs">
            Review invitations from promising startups, convene strategic board meetings, and provide actionable counsel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>
            Startup founders can discover your executive profile and invite you to join their formal advisory boards.
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
            <div className="rounded-md border p-3 bg-background">
              <span className="font-semibold text-foreground">Board Invitations</span>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Accept or decline advisory board seats with defined equity or advisory terms.
              </p>
            </div>
            <div className="rounded-md border p-3 bg-background">
              <span className="font-semibold text-foreground">Strategic Agendas</span>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Participate in structured advisory calls and log minutes.
              </p>
            </div>
            <div className="rounded-md border p-3 bg-background">
              <span className="font-semibold text-foreground">Recommendations</span>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Publish formal strategic recommendations tied directly to milestones.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/40 bg-muted/20 py-3 flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Board invitations live in Phase 03</span>
          </span>
          <Button size="sm" asChild className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/mentor/invitations">
              <span>View Invitations</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function Building2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
