"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Award,
  Rocket,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
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

interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: "founder" | "mentor" | "admin";
  createdAt: string;
  verificationStatus?: "verified" | "pending" | "rejected";
  active: boolean;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalUsers: 148,
    founderCount: 92,
    mentorCount: 52,
    pendingVerifications: 7,
  });

  const [recentUsers, setRecentUsers] = useState<UserSummary[]>([
    {
      id: "u-1",
      name: "Marcus Vance",
      email: "m.vance@vanguardexec.com",
      role: "mentor",
      createdAt: "2026-11-17T10:30:00Z",
      verificationStatus: "pending",
      active: true,
    },
    {
      id: "u-2",
      name: "Sophia Chen",
      email: "sophia@luminahealth.io",
      role: "founder",
      createdAt: "2026-11-17T09:15:00Z",
      active: true,
    },
    {
      id: "u-3",
      name: "David Sterling",
      email: "david@sterlingadvisors.com",
      role: "mentor",
      createdAt: "2026-11-16T18:45:00Z",
      verificationStatus: "verified",
      active: true,
    },
    {
      id: "u-4",
      name: "Aisha Patel",
      email: "aisha@nexustech.co",
      role: "founder",
      createdAt: "2026-11-16T14:20:00Z",
      active: true,
    },
    {
      id: "u-5",
      name: "Elena Rostova",
      email: "elena@fintechquantum.ai",
      role: "founder",
      createdAt: "2026-11-15T11:00:00Z",
      active: false,
    },
  ]);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const supabase = createClient();
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, created_at");

        const { data: mentorProfiles } = await supabase
          .from("mentor_profiles")
          .select("user_id, verification_status");

        if (profiles && profiles.length > 0) {
          const total = profiles.length;
          const founders = profiles.filter((p) => p.role === "founder").length;
          const mentors = profiles.filter((p) => p.role === "mentor").length;
          const pending = mentorProfiles
            ? mentorProfiles.filter((m) => m.verification_status === "pending").length
            : 0;

          setMetrics({
            totalUsers: total,
            founderCount: founders,
            mentorCount: mentors,
            pendingVerifications: pending,
          });

          const mentorMap = new Map(
            (mentorProfiles || []).map((m) => [m.user_id, m.verification_status])
          );

          const formatted: UserSummary[] = profiles.slice(0, 5).map((p) => ({
            id: p.id,
            name: p.full_name,
            email: p.email,
            role: p.role as UserSummary["role"],
            createdAt: p.created_at,
            verificationStatus: mentorMap.get(p.id) as UserSummary["verificationStatus"],
            active: true,
          }));

          setRecentUsers(formatted);
        }
      } catch {
        // Fallback to initial mock metrics
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "founder":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Founder</Badge>;
      case "mentor":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Mentor</Badge>;
      case "admin":
        return <Badge className="bg-slate-800 text-white">Admin</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome & Admin Banner */}
      <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-gradient-to-r from-slate-950 via-slate-900 to-navy-950 p-6 text-white shadow-md sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>Platform Administration</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              System Governance & User Operations
            </h2>
            <p className="max-w-xl text-sm text-slate-300">
              Audit registered founders, review retired executive mentor applications, and manage platform security.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow"
            >
              <Link href="/admin/users" className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>Manage All Users</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Total Users
            </CardTitle>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.totalUsers}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Registered across all roles
            </p>
          </CardContent>
        </Card>

        {/* Founders Count */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Founders
            </CardTitle>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <Rocket className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.founderCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active startup entrepreneurs
            </p>
          </CardContent>
        </Card>

        {/* Mentors Count */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Mentors
            </CardTitle>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <Award className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.mentorCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Retired executive leaders
            </p>
          </CardContent>
        </Card>

        {/* Pending Verifications */}
        <Card className="shadow-sm border-amber-200 dark:border-amber-900/50 bg-amber-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase">
              Pending Reviews
            </CardTitle>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-200">
              {metrics.pendingVerifications}
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">
              Mentors awaiting credential approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Overview Table of Recent Users */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Recent Registrations</CardTitle>
            <CardDescription className="text-xs">
              Latest members onboarding to the BusinessBridge platform
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="text-xs">
            <Link href="/admin/users" className="flex items-center gap-1">
              <span>View Full Directory</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-medium">User</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Status / Verification</th>
                  <th className="py-3 px-4 font-medium">Registration Date</th>
                  <th className="py-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">{user.name}</div>
                          <div className="text-[11px] text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                    <td className="py-3 px-4">
                      {user.role === "mentor" ? (
                        user.verificationStatus === "verified" ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                            Verified
                          </Badge>
                        ) : user.verificationStatus === "pending" ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                            Review Needed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 text-[10px]">
                            Rejected
                          </Badge>
                        )
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-blue-600 hover:text-blue-700">
                        <Link href="/admin/users">Manage</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
