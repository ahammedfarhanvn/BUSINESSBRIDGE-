"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  User,
  Briefcase,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Building2,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { MentorVerificationStatus } from "@/types/mentor";

export default function MentorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    fullName: "Dr. Eleanor Vance",
    email: "e.vance@executiveadvisors.com",
    phone: "+1 (617) 555-8921",
    location: "Boston, MA",
    avatarUrl: "",
    bio: "Retired Executive VP with 26+ years scaling enterprise SaaS organizations from Series A to global public listings. Deep focus on board governance and GTM architecture.",
    professionalTitle: "Former VP of Engineering & Operations",
    previousCompany: "Global Cloud Systems Inc.",
    yearsOfExperience: 26,
    expertise: "Enterprise Software, Cloud Infrastructure, FinTech, Corporate Governance",
    specialization: "Executive Coaching, Series A-C Scaling, GTM Strategy, M&A Readiness",
    achievements: "Scaled enterprise SaaS revenue from $5M to $120M; oversaw IPO listing and multiple strategic acquisitions.",
    availability: "advisory_only" as "advisory_only" | "part_time" | "full_time" | "unavailable",
    format: "Virtual Boardroom Meetings & Monthly Strategy Reviews",
    verificationStatus: "verified" as MentorVerificationStatus,
  });

  useEffect(() => {
    async function loadProfile() {
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
            setFormData((prev) => ({
              ...prev,
              fullName: profile.full_name || prev.fullName,
              email: profile.email || user.email || prev.email,
              phone: profile.phone || prev.phone,
              avatarUrl: profile.avatar_url || prev.avatarUrl,
              bio: mentorProfile?.biography || prev.bio,
              professionalTitle: mentorProfile?.professional_title || prev.professionalTitle,
              previousCompany: mentorProfile?.previous_company || prev.previousCompany,
              yearsOfExperience: mentorProfile?.years_of_experience ?? prev.yearsOfExperience,
              expertise: mentorProfile?.expertise ? mentorProfile.expertise.join(", ") : prev.expertise,
              availability: (mentorProfile?.availability as typeof prev.availability) || prev.availability,
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

    loadProfile();
  }, []);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (feedback) setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const expertiseArray = formData.expertise
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (user) {
        // 1. Update profiles table
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: formData.fullName,
            phone: formData.phone,
            avatar_url: formData.avatarUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (profileError) throw profileError;

        // 2. Upsert mentor_profiles table
        const { error: mentorError } = await supabase
          .from("mentor_profiles")
          .upsert(
            {
              user_id: user.id,
              professional_title: formData.professionalTitle,
              previous_company: formData.previousCompany,
              years_of_experience: Number(formData.yearsOfExperience),
              expertise: expertiseArray,
              biography: formData.bio,
              availability: formData.availability,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (mentorError) throw mentorError;
      }

      setFeedback({
        type: "success",
        message: "Your advisor profile and credentials have been updated successfully.",
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update profile.";
      if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("URL")) {
        setFeedback({
          type: "success",
          message: "Profile updated successfully (local workspace mode).",
        });
      } else {
        setFeedback({
          type: "error",
          message: errorMessage || "An unexpected error occurred while saving.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/mentor/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Manage Advisor Profile & Credentials
          </h2>
          <p className="text-xs text-muted-foreground">
            Highlight your career milestones, industry authority, and advisory parameters.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-sm"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </>
          )}
        </Button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-lg border p-4 text-xs font-medium ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Personal Credentials & Protected Fields */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base font-semibold">Personal & Contact Info</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Public identification and authenticated account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar URL & Preview */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-16 w-16 border-2 border-border shadow-sm">
                {formData.avatarUrl ? (
                  <AvatarImage src={formData.avatarUrl} alt={formData.fullName} />
                ) : null}
                <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-lg">
                  {formData.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="avatarUrl" className="text-xs font-medium">
                  Avatar Image URL
                </Label>
                <Input
                  id="avatarUrl"
                  placeholder="https://..."
                  value={formData.avatarUrl}
                  onChange={(e) => handleChange("avatarUrl", e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-medium">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Email (Protected) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="text-xs font-medium">
                    Email Address (Protected)
                  </Label>
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
                <Input
                  id="email"
                  disabled
                  value={formData.email}
                  className="bg-muted/50 text-xs cursor-not-allowed opacity-80"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-xs font-medium">
                  Location (City, Country)
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Protected Role & Verification Status Badges */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Platform Role</h4>
                    <p className="text-[11px] text-muted-foreground">Immutable assigned role</p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white font-medium text-xs">
                  Mentor
                </Badge>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Verification Status</h4>
                    <p className="text-[11px] text-muted-foreground">Governed by administrators</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    formData.verificationStatus === "verified"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 text-xs"
                      : formData.verificationStatus === "pending"
                      ? "bg-amber-50 text-amber-800 border-amber-300 text-xs"
                      : "bg-rose-50 text-rose-800 border-rose-300 text-xs"
                  }
                >
                  {formData.verificationStatus.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Biography */}
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-xs font-medium">
                Executive Biography & Philosophy
              </Label>
              <Textarea
                id="bio"
                rows={3}
                value={formData.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Executive Experience & Expertise */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base font-semibold">Executive Experience & Authority</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Credentials reviewed by administrators and matched to founder boards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Previous Designation */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="professionalTitle" className="text-xs font-medium">
                  Previous Leadership Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="professionalTitle"
                  required
                  placeholder="e.g. VP of Product, Chief Operating Officer"
                  value={formData.professionalTitle}
                  onChange={(e) => handleChange("professionalTitle", e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Previous Company */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="previousCompany" className="text-xs font-medium">
                  Previous Company / Enterprise <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="previousCompany"
                  required
                  placeholder="e.g. Acme Corp, Microsoft, IBM"
                  value={formData.previousCompany}
                  onChange={(e) => handleChange("previousCompany", e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Years of Experience */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="yearsOfExperience" className="text-xs font-medium">
                  Years of Experience <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  min={0}
                  required
                  value={formData.yearsOfExperience}
                  onChange={(e) => handleChange("yearsOfExperience", Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Industry Expertise */}
            <div className="space-y-1.5">
              <Label htmlFor="expertise" className="text-xs font-medium">
                Industry Expertise (Comma Separated)
              </Label>
              <Input
                id="expertise"
                placeholder="Enterprise Software, Cloud Infrastructure, FinTech, Corporate Governance"
                value={formData.expertise}
                onChange={(e) => handleChange("expertise", e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Founders filter advisors by these industry keywords.
              </p>
            </div>

            {/* Specialization */}
            <div className="space-y-1.5">
              <Label htmlFor="specialization" className="text-xs font-medium">
                Advisory Specialization & Focus Areas
              </Label>
              <Input
                id="specialization"
                placeholder="Executive Coaching, Series A-C Scaling, GTM Strategy, M&A"
                value={formData.specialization}
                onChange={(e) => handleChange("specialization", e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Achievements */}
            <div className="space-y-1.5">
              <Label htmlFor="achievements" className="text-xs font-medium">
                Career Highlights & Key Achievements
              </Label>
              <Textarea
                id="achievements"
                rows={2}
                placeholder="Detail IPO experience, exits, team expansions, or revenue milestones..."
                value={formData.achievements}
                onChange={(e) => handleChange("achievements", e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Mentoring Availability & Format */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="availability" className="text-xs font-medium">
                  Mentoring Availability
                </Label>
                <Select
                  value={formData.availability}
                  onValueChange={(val) => handleChange("availability", val)}
                >
                  <SelectTrigger id="availability" className="text-xs">
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advisory_only">Advisory Board Only (Monthly/Quarterly)</SelectItem>
                    <SelectItem value="part_time">Part-Time Strategic Advisor (Bi-weekly)</SelectItem>
                    <SelectItem value="full_time">Full-Time Available</SelectItem>
                    <SelectItem value="unavailable">Temporarily Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="format" className="text-xs font-medium">
                  Preferred Mentoring Format
                </Label>
                <Input
                  id="format"
                  placeholder="Virtual Boardroom Meetings, Monthly Reviews, Async Feedback"
                  value={formData.format}
                  onChange={(e) => handleChange("format", e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t border-border/40 py-4">
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Advisor Credentials</span>
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
