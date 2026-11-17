"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Rocket,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Circle,
  ArrowRight,
  TrendingUp,
  Users,
  Calendar,
  Sparkles,
  ShieldCheck,
  Edit3,
  Target,
  Clock,
  Layers,
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

interface FounderData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl: string | null;
  bio: string;
  startupName: string;
  industry: string;
  businessStage: string;
  businessDescription: string;
  businessGoals: string;
}

export default function FounderDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FounderData>({
    fullName: "Alex Morgan",
    email: "alex.morgan@novabridge.io",
    phone: "+1 (415) 890-1234",
    location: "San Francisco, CA",
    avatarUrl: null,
    bio: "Technical founder with 6+ years in cloud infrastructure, passionate about democratizing enterprise real-time intelligence.",
    startupName: "NovaBridge Analytics",
    industry: "Enterprise SaaS & AI",
    businessStage: "early_traction",
    businessDescription: "Predictive decision pipeline helping mid-market enterprises turn unstructured telemetry into automated board-level recommendations.",
    businessGoals: "Close $1.2M seed round, assemble 3-member executive advisory board, and achieve $80K ARR.",
  });

  useEffect(() => {
    async function loadFounderProfile() {
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

          const { data: startup } = await supabase
            .from("startups")
            .select("*")
            .eq("founder_id", user.id)
            .single();

          const { data: founderProfile } = await supabase
            .from("founder_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          setData((prev) => ({
            ...prev,
            fullName: profile?.full_name || prev.fullName,
            email: profile?.email || user.email || prev.email,
            phone: profile?.phone || prev.phone,
            avatarUrl: profile?.avatar_url || prev.avatarUrl,
            bio: founderProfile?.biography || prev.bio,
            startupName: startup?.name || prev.startupName,
            industry: startup?.industry || prev.industry,
            businessStage: startup?.business_stage || prev.businessStage,
            businessDescription: startup?.description || prev.businessDescription,
          }));
        }
      } catch {
        // Fallback to default state
      } finally {
        setLoading(false);
      }
    }

    loadFounderProfile();
  }, []);

  // Compute profile completion percentage and checklist
  const checklist = [
    { label: "Personal profile & contact info", completed: Boolean(data.fullName && data.phone) },
    { label: "Founder biography & experience", completed: Boolean(data.bio && data.bio.length > 20) },
    { label: "Startup identity & industry classification", completed: Boolean(data.startupName && data.industry) },
    { label: "Business stage & description", completed: Boolean(data.businessStage && data.businessDescription) },
    { label: "Key business goals & milestones", completed: Boolean(data.businessGoals) },
  ];

  const completedCount = checklist.filter((item) => item.completed).length;
  const completionPercentage = Math.round((completedCount / checklist.length) * 100);

  const formatStage = (stage: string) => {
    switch (stage) {
      case "idea":
        return "Idea / Concept";
      case "prototype":
        return "Prototype / MVP";
      case "early_traction":
        return "Early Traction";
      case "growth":
        return "Growth";
      case "scaling":
        return "Scaling";
      default:
        return stage;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl border border-blue-200/60 bg-gradient-to-r from-slate-900 via-navy-800 to-blue-900 p-6 text-white shadow-md sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-200 backdrop-blur-sm">
              <Rocket className="h-3.5 w-3.5 text-blue-300" />
              <span>Founder Workspace</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, {data.fullName.split(" ")[0]}!
            </h2>
            <p className="max-w-xl text-sm text-slate-300">
              Your startup <strong className="text-white">{data.startupName}</strong> is positioned at the{" "}
              <span className="font-semibold text-emerald-400">{formatStage(data.businessStage)}</span> stage.
              Explore advisory matching and roadmap progression below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500 shadow"
            >
              <Link href="/founder/profile" className="flex items-center gap-1.5">
                <Edit3 className="h-4 w-4" />
                <span>Edit Profile</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: Profile & Startup Cards + Completion Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Summary Card */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Founder Profile</CardTitle>
              <CardDescription className="text-xs">Your personal credentials</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-medium text-blue-600 bg-blue-50 border-blue-200">
              Verified Founder
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-14 w-14 border border-border">
                {data.avatarUrl ? <AvatarImage src={data.avatarUrl} alt={data.fullName} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                  {data.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <h3 className="font-semibold text-foreground text-sm">{data.fullName}</h3>
                <p className="text-xs text-muted-foreground">{data.email}</p>
                <div className="flex items-center gap-1 pt-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3 text-muted-foreground/70" />
                  <span>{data.location}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground/80" />
                <span>{data.phone}</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed italic line-clamp-3">
                &ldquo;{data.bio}&rdquo;
              </p>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="ghost" size="sm" asChild className="w-full text-xs text-blue-600 hover:text-blue-700">
              <Link href="/founder/profile" className="flex items-center justify-center gap-1">
                <span>Update Contact Information</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Startup Information Card */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">{data.startupName}</CardTitle>
              </div>
              <CardDescription className="text-xs">Venturing in {data.industry}</CardDescription>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-transparent text-xs font-medium">
              {formatStage(data.businessStage)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Business Overview
              </h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {data.businessDescription}
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Target className="h-3.5 w-3.5 text-blue-600" />
                <span>Current Strategic Objectives</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {data.businessGoals}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs sm:grid-cols-3">
              <div className="rounded-md border p-2.5 bg-background">
                <span className="text-[11px] text-muted-foreground">Advisory Board</span>
                <p className="mt-0.5 font-semibold text-foreground">0 Mentors Appointed</p>
              </div>
              <div className="rounded-md border p-2.5 bg-background">
                <span className="text-[11px] text-muted-foreground">Active Milestones</span>
                <p className="mt-0.5 font-semibold text-foreground">Ready for Phase 03</p>
              </div>
              <div className="rounded-md border p-2.5 bg-background col-span-2 sm:col-span-1">
                <span className="text-[11px] text-muted-foreground">Governance Status</span>
                <p className="mt-0.5 font-semibold text-emerald-600">Compliant</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Completion Indicator */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Profile Readiness Score</CardTitle>
              <CardDescription className="text-xs">
                A complete profile increases advisor match compatibility by up to 3x.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">{completionPercentage}%</span>
              <span className="text-xs text-muted-foreground">Complete</span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs rounded-lg border p-2.5 bg-background"
              >
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                )}
                <span
                  className={
                    item.completed
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Business Intelligence & Risk Overview Widget */}
      <Card className="relative overflow-hidden border-border/80 shadow-sm bg-gradient-to-r from-blue-950/10 via-background to-emerald-950/10 border-l-4 border-l-indigo-600">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 translate-y-[-12px] rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent text-[11px] font-semibold gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>AI Business Intelligence</span>
                </Badge>
                <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                  Real-Time Risk Monitoring
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold text-foreground pt-1">
                Executive Copilot & Predictive Risk Analytics
              </CardTitle>
              <CardDescription className="text-xs">
                Gemini AI continuously synthesizes your roadmap velocity, evaluates stage-specific runway friction, and proposes actionable next steps.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 gap-1.5 shadow-sm sm:self-center">
              <Link href="/founder/ai-assistant">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Open AI Assistant</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              href="/founder/ai-assistant"
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/80 p-3 transition-colors hover:border-indigo-400/50 hover:bg-muted/30"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 flex-shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-foreground">AI Business Copilot</h5>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Ask strategic questions on valuation, GTM pricing, and governance.
                </p>
              </div>
            </Link>

            <Link
              href="/founder/ai-assistant"
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/80 p-3 transition-colors hover:border-amber-400/50 hover:bg-muted/30"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300 flex-shrink-0">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-foreground">Risk Radar & Health</h5>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Automated audit of milestone velocity, overdue tasks, and runway.
                </p>
              </div>
            </Link>

            <Link
              href="/founder/ai-assistant"
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/80 p-3 transition-colors hover:border-emerald-400/50 hover:bg-muted/30"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 flex-shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-foreground">Strategic Next Steps</h5>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  One-click conversion of AI recommendations into roadmap tasks.
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Phase 03 Coming Soon Features */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Module A: Virtual Boardroom */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y-[-8px] rounded-full bg-blue-500/10 blur-xl" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                <Users className="h-5 w-5" />
              </div>
              <Badge className="text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
                Module A • Live Now
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold pt-2">Virtual Boardroom</CardTitle>
            <CardDescription className="text-xs">
              Assemble your custom advisory board of vetted retired business executives.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              Discover and invite verified executives, convene strategic advisory meetings, and receive actionable governance recommendations.
            </p>
            <ul className="space-y-1.5 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Executive mentor matching by industry domain</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Board terms and structured invitation workflows</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Formal advisory notes & actionable recommendations</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="border-t border-border/40 bg-muted/20 py-3 flex items-center justify-between gap-2">
            <Button size="sm" variant="outline" asChild className="text-xs">
              <Link href="/founder/mentors">Browse Mentors</Link>
            </Button>
            <Button size="sm" asChild className="text-xs gap-1.5 bg-primary">
              <Link href="/founder/boardroom">
                <span>Go to Boardroom</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Module B: Business Journey Tracker */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y-[-8px] rounded-full bg-emerald-500/10 blur-xl" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs font-semibold text-emerald-600 border-emerald-200">
                Module B • Coming Soon
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold pt-2">Business Journey Tracker</CardTitle>
            <CardDescription className="text-xs">
              Deconstruct ambitious visions into verifiable milestones and measurable progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              In Phase 03, establish strategic milestones, track execution percentage, and assign action items to collaborate with your board members.
            </p>
            <ul className="space-y-1.5 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Milestone roadmaps with due dates and stages</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Task breakdowns with founder & mentor assignments</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Progress percentage tracking with audit trails</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="border-t border-border/40 bg-muted/20 py-3">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Available in next development milestone (Phase 03)</span>
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
