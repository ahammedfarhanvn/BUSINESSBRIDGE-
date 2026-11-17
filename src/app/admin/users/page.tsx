"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Award,
  Rocket,
  Shield,
  Eye,
  Power,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types/auth";
import { MentorVerificationStatus } from "@/types/mentor";

interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  avatarUrl?: string | null;
  active: boolean;
  // Mentor-specific properties for review
  mentorData?: {
    professionalTitle: string;
    previousCompany: string;
    yearsOfExperience: number;
    expertise: string[];
    biography: string;
    verificationStatus: MentorVerificationStatus;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([
    {
      id: "u-1",
      name: "Marcus Vance",
      email: "m.vance@vanguardexec.com",
      role: "mentor",
      createdAt: "2026-11-17T10:30:00Z",
      active: true,
      mentorData: {
        professionalTitle: "Former Chief Operating Officer",
        previousCompany: "Vanguard Global Technologies",
        yearsOfExperience: 28,
        expertise: ["Operations Scaling", "Enterprise SaaS", "Corporate Governance"],
        biography: "Led 2 IPO listings and steered 1,400+ employees across international enterprise sales. Offering governance and board leadership.",
        verificationStatus: "pending",
      },
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
      active: true,
      mentorData: {
        professionalTitle: "Former VP of Strategic Finance",
        previousCompany: "Sterling Capital Partners",
        yearsOfExperience: 22,
        expertise: ["FinTech", "Series A/B Fundraising", "Financial Modeling"],
        biography: "Advised 40+ early stage ventures through Series A capitalization and treasury structures.",
        verificationStatus: "verified",
      },
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
    {
      id: "u-6",
      name: "Robert MacIntyre",
      email: "r.macintyre@enterprisecloud.net",
      role: "mentor",
      createdAt: "2026-11-14T08:30:00Z",
      active: true,
      mentorData: {
        professionalTitle: "Chief Technology Officer (Emeritus)",
        previousCompany: "Enterprise Cloud Systems",
        yearsOfExperience: 31,
        expertise: ["Cloud Architecture", "Cybersecurity", "Engineering Org Scale"],
        biography: "30+ years leading mission-critical cloud backbones with $500M+ ARR.",
        verificationStatus: "pending",
      },
    },
    {
      id: "u-7",
      name: "Platform Administrator",
      email: "admin@businessbridge.app",
      role: "admin",
      createdAt: "2026-11-01T00:00:00Z",
      active: true,
    },
  ]);

  const [filterRole, setFilterRole] = useState<"all" | UserRole>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<AdminUserRecord | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        const { data: mentorProfiles } = await supabase
          .from("mentor_profiles")
          .select("*");

        if (profiles && profiles.length > 0) {
          const mentorMap = new Map(
            (mentorProfiles || []).map((m) => [m.user_id, m])
          );

          const fetched: AdminUserRecord[] = profiles.map((p) => {
            const m = mentorMap.get(p.id);
            return {
              id: p.id,
              name: p.full_name,
              email: p.email,
              role: p.role,
              createdAt: p.created_at,
              avatarUrl: p.avatar_url,
              active: true,
              mentorData: m
                ? {
                    professionalTitle: m.professional_title,
                    previousCompany: m.previous_company,
                    yearsOfExperience: m.years_of_experience,
                    expertise: m.expertise || [],
                    biography: m.biography,
                    verificationStatus: m.verification_status,
                  }
                : undefined,
            };
          });

          setUsers(fetched);
        }
      } catch {
        // Fallback
      }
    }

    loadData();
  }, []);

  // Filter & Search Logic
  const filteredUsers = users.filter((user) => {
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // Account Activation Toggle
  const toggleUserActive = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus = !u.active;
          setActionNotice(
            `Account for ${u.name} has been ${newStatus ? "activated" : "suspended"}.`
          );
          return { ...u, active: newStatus };
        }
        return u;
      })
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Mentor Verification Decision
  const handleVerificationDecision = async (
    decision: "verified" | "rejected"
  ) => {
    if (!selectedMentor) return;

    const mentorId = selectedMentor.id;

    // Try Supabase update
    try {
      const supabase = createClient();
      await supabase
        .from("mentor_profiles")
        .update({
          verification_status: decision,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", mentorId);
    } catch {
      // In offline / fallback mode, local state will reflect immediately
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === mentorId && u.mentorData) {
          return {
            ...u,
            mentorData: {
              ...u.mentorData,
              verificationStatus: decision,
            },
          };
        }
        return u;
      })
    );

    setActionNotice(
      `Mentor verification for ${selectedMentor.name} has been ${
        decision === "verified" ? "APPROVED" : "REJECTED"
      }.`
    );
    setReviewModalOpen(false);
    setSelectedMentor(null);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "founder":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Founder</Badge>;
      case "mentor":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Mentor</Badge>;
      case "admin":
        return <Badge className="bg-slate-800 text-white">Admin</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            User Directory & Access Control
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage authenticated platform accounts, review retired mentor verification packets, and govern status.
          </p>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Role Filter Tabs */}
        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setFilterRole("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              filterRole === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole("founder")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              filterRole === "founder"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Founders ({users.filter((u) => u.role === "founder").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole("mentor")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              filterRole === "mentor"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mentors ({users.filter((u) => u.role === "mentor").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole("admin")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              filterRole === "admin"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Admins ({users.filter((u) => u.role === "admin").length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Main Users Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-medium">User Profile</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Registration Date</th>
                  <th className="py-3 px-4 font-medium">Account Status</th>
                  <th className="py-3 px-4 font-medium">Mentor Verification</th>
                  <th className="py-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No users match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {user.avatarUrl ? (
                              <AvatarImage src={user.avatarUrl} alt={user.name} />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground">{user.name}</div>
                            <div className="text-[11px] text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getRoleBadge(user.role)}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            user.active
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.active ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          <span>{user.active ? "Active" : "Suspended"}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {user.role === "mentor" && user.mentorData ? (
                          user.mentorData.verificationStatus === "verified" ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                              Verified
                            </Badge>
                          ) : user.mentorData.verificationStatus === "pending" ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] animate-pulse">
                              Pending Review
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                              Rejected
                            </Badge>
                          )
                        ) : (
                          <span className="text-[11px] text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {user.role === "mentor" && user.mentorData && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                              onClick={() => {
                                setSelectedMentor(user);
                                setReviewModalOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Review
                            </Button>
                          )}

                          {user.role !== "admin" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 text-xs ${
                                user.active
                                  ? "text-rose-600 hover:bg-rose-50"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                              onClick={() => toggleUserActive(user.id)}
                            >
                              <Power className="h-3.5 w-3.5 mr-1" />
                              {user.active ? "Suspend" : "Activate"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mentor Verification Review Dialog Modal */}
      {selectedMentor && selectedMentor.mentorData && (
        <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                <DialogTitle className="text-base font-semibold">
                  Mentor Credential Verification
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Review applicant executive background and verify board advisory eligibility.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Profile Header */}
              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/20">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-sm">
                    {selectedMentor.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">
                    {selectedMentor.name}
                  </h4>
                  <p className="text-muted-foreground">{selectedMentor.email}</p>
                  <p className="text-emerald-600 font-medium mt-0.5">
                    {selectedMentor.mentorData.professionalTitle}
                  </p>
                </div>
              </div>

              {/* Experience Details */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-md border p-2.5 bg-background">
                  <span className="text-[11px] text-muted-foreground">Previous Enterprise</span>
                  <p className="font-semibold text-foreground">
                    {selectedMentor.mentorData.previousCompany}
                  </p>
                </div>
                <div className="rounded-md border p-2.5 bg-background">
                  <span className="text-[11px] text-muted-foreground">Years in Executive Leadership</span>
                  <p className="font-semibold text-foreground">
                    {selectedMentor.mentorData.yearsOfExperience} Years
                  </p>
                </div>
              </div>

              {/* Expertise Sectors */}
              <div>
                <span className="font-semibold text-foreground">Claimed Industry Sectors:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedMentor.mentorData.expertise.map((exp, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-[11px] bg-slate-50 text-slate-800"
                    >
                      {exp}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Executive Biography */}
              <div>
                <span className="font-semibold text-foreground">Applicant Statement:</span>
                <p className="mt-1 rounded-md border p-2.5 text-muted-foreground bg-muted/10 leading-relaxed italic">
                  &ldquo;{selectedMentor.mentorData.biography}&rdquo;
                </p>
              </div>

              {/* Current Status */}
              <div className="flex items-center justify-between rounded-md border p-2.5 bg-muted/20">
                <span className="font-medium text-foreground">Current Verification:</span>
                <Badge
                  variant="outline"
                  className={
                    selectedMentor.mentorData.verificationStatus === "verified"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : selectedMentor.mentorData.verificationStatus === "pending"
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-rose-50 text-rose-800 border-rose-300"
                  }
                >
                  {selectedMentor.mentorData.verificationStatus.toUpperCase()}
                </Badge>
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleVerificationDecision("rejected")}
                className="text-xs"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject Application
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleVerificationDecision("verified")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Approve Verification
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
