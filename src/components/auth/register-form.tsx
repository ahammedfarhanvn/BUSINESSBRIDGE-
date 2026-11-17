"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Rocket,
  Award,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  Briefcase,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordStrengthMeter, getPasswordStrength } from "./password-strength";
import { completeRegistrationProfile } from "@/app/actions/auth";

type AllowedRole = "founder" | "mentor";

const FOUNDER_INDUSTRIES = [
  "Tech",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Education",
  "Other",
];

const BUSINESS_STAGES = [
  "Idea",
  "Prototype",
  "Early Traction",
  "Growth",
  "Scaling",
];

const MENTOR_AVAILABILITY_OPTIONS = [
  "Advisory only",
  "2-5 hrs/week",
  "5-10 hrs/week",
  "Flexible",
];

const MENTORING_FORMAT_OPTIONS = ["Virtual", "Hybrid", "In-Person"];

export function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();

  // Role state (Admin role is strictly barred from selection)
  const [role, setRole] = useState<AllowedRole>("founder");

  // Common Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Founder Specific Fields
  const [startupName, setStartupName] = useState("");
  const [industry, setIndustry] = useState("Tech");
  const [businessStage, setBusinessStage] = useState("Idea");
  const [businessGoals, setBusinessGoals] = useState("");

  // Mentor Specific Fields
  const [mentorTitle, setMentorTitle] = useState("");
  const [mentorCompany, setMentorCompany] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [industryExpertise, setIndustryExpertise] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [mentoringAvailability, setMentoringAvailability] = useState("Advisory only");
  const [mentoringFormat, setMentoringFormat] = useState("Virtual");

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Validate form fields
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    // Common validations
    if (!fullName.trim()) {
      errs.fullName = "Full name is required.";
    } else if (fullName.trim().length < 2) {
      errs.fullName = "Full name must be at least 2 characters.";
    }

    if (!email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    if (!password) {
      errs.password = "Password is required.";
    } else {
      const strength = getPasswordStrength(password);
      if (!strength.isStrong) {
        errs.password =
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
      }
    }

    if (!confirmPassword) {
      errs.confirmPassword = "Confirm password is required.";
    } else if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    // Role-specific validations
    if (role === "mentor") {
      if (!mentorTitle.trim()) {
        errs.mentorTitle = "Previous designation / executive title is required.";
      }
      if (!mentorCompany.trim()) {
        errs.mentorCompany = "Previous company is required.";
      }
      if (!yearsOfExperience.trim()) {
        errs.yearsOfExperience = "Years of experience is required.";
      } else {
        const yrs = Number(yearsOfExperience);
        if (isNaN(yrs) || yrs < 5) {
          errs.yearsOfExperience = "Retired mentors must have at least 5 years of experience.";
        }
      }
      if (!industryExpertise.trim()) {
        errs.industryExpertise = "Please provide your industry expertise (e.g., Finance, Strategy).";
      }
      if (!specialization.trim()) {
        errs.specialization = "Please provide areas of specialization (e.g., M&A, Scaling).";
      }
    }

    // Explicit safeguard against admin role
    if ((role as string) === "admin") {
      errs.general = "Administrative role registration is forbidden.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Guard against unauthorized admin role
    if ((role as string) === "admin") {
      setServerError("Unauthorized role selection.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Parse tags
      const parsedExpertise = industryExpertise
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedSpecialization = specialization
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role,
            phone: phone.trim() || null,
            startup_name: startupName.trim() || null,
            industry: industry,
            business_stage: businessStage.toLowerCase(),
            business_goals: businessGoals.trim() || null,
            previous_designation: mentorTitle.trim() || null,
            professional_title: mentorTitle.trim() || null,
            previous_company: mentorCompany.trim() || null,
            years_experience: Number(yearsOfExperience) || 5,
            years_of_experience: Number(yearsOfExperience) || 5,
            industry_expertise: parsedExpertise,
            expertise: parsedExpertise,
            specialization: parsedSpecialization,
            mentoring_availability: mentoringAvailability,
            availability: mentoringAvailability,
            mentoring_format: mentoringFormat,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          setServerError("An account with this email already exists. Please sign in instead.");
        } else {
          setServerError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setServerError("Failed to create user account. Please try again.");
        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      // Persist additional founder or mentor profile records via Server Action
      await completeRegistrationProfile({
        userId,
        role,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        startupName: startupName.trim() || undefined,
        industry: industry,
        businessStage: businessStage,
        businessGoals: businessGoals.trim() || undefined,
        professionalTitle: mentorTitle.trim() || undefined,
        previousCompany: mentorCompany.trim() || undefined,
        yearsOfExperience: Number(yearsOfExperience) || 5,
        industryExpertise: parsedExpertise,
        areasOfSpecialization: parsedSpecialization,
        mentoringAvailability: mentoringAvailability,
        mentoringFormat: mentoringFormat,
      });

      // Check if session was granted immediately (email confirmation off)
      if (authData.session) {
        // Direct route to respective dashboard
        const destination = role === "founder" ? "/founder/dashboard" : "/mentor/dashboard";
        router.push(destination);
      } else {
        // Email verification is required
        setRegisteredEmail(email.trim());
        setVerificationPending(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // If email verification is pending, display the friendly confirmation state
  if (verificationPending) {
    return (
      <Card className="w-full max-w-xl shadow-lg border-border/60">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Account Created Successfully!
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            We have sent a verification link to{" "}
            <span className="font-semibold text-foreground">{registeredEmail}</span>.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          <div className="rounded-lg bg-muted/50 p-4 text-left border border-border/50 text-sm text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Next Steps</span>
            </div>
            <p>1. Open your email inbox and click the verification link.</p>
            <p>
              2. Once verified, you will be automatically redirected to your{" "}
              <strong className="text-foreground">
                {role === "founder" ? "Founder Dashboard" : "Mentor Workspace"}
              </strong>
              .
            </p>
            <p className="text-xs text-muted-foreground/80 pt-1">
              Check your spam or junk folder if the email does not arrive within 2 minutes.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/verify-email?email=${encodeURIComponent(registeredEmail)}`)}
          >
            Email Verification Help
          </Button>
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => router.push("/login")}
          >
            Go to Sign In
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl shadow-xl border-border/60">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Briefcase className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Join BusinessBridge
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Experience meets Ambition. Select your path to get started.
        </CardDescription>

        {/* Role Selection Tabs */}
        <div
          role="tablist"
          aria-label="Select your registration role"
          className="grid grid-cols-2 gap-3 pt-5"
        >
          {/* Founder Option */}
          <button
            type="button"
            role="tab"
            aria-selected={role === "founder"}
            onClick={() => setRole("founder")}
            className={`flex flex-col items-start p-3.5 rounded-lg border-2 text-left transition-all ${
              role === "founder"
                ? "border-primary bg-primary/5 dark:bg-primary/20 text-foreground shadow-sm ring-1 ring-primary"
                : "border-border hover:border-border/80 bg-background text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`p-1.5 rounded-md ${
                  role === "founder"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Rocket className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm text-foreground">
                Register as Founder
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              For entrepreneurs seeking seasoned executive advisory boards to scale.
            </p>
          </button>

          {/* Mentor Option */}
          <button
            type="button"
            role="tab"
            aria-selected={role === "mentor"}
            onClick={() => setRole("mentor")}
            className={`flex flex-col items-start p-3.5 rounded-lg border-2 text-left transition-all ${
              role === "mentor"
                ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-foreground shadow-sm ring-1 ring-emerald-600"
                : "border-border hover:border-border/80 bg-background text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`p-1.5 rounded-md ${
                  role === "mentor"
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Award className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm text-foreground">
                Retired Business Mentor
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              For senior executives sharing decades of leadership wisdom.
            </p>
          </button>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Server Error Alert Banner */}
          {serverError && (
            <div
              className="flex items-start gap-2.5 rounded-lg bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20 animate-in fade-in"
              role="alert"
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Registration Error</span>
                <span>{serverError}</span>
              </div>
            </div>
          )}

          {/* Section: Account Credentials (Common) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span>1. Account Credentials</span>
              <span className="h-px flex-1 bg-border" />
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fullName" className="text-xs font-semibold">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="e.g. Eleanor Vance"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
                  }}
                  aria-invalid={!!errors.fullName}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  className={errors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.fullName && (
                  <p id="fullName-error" className="text-xs text-destructive font-medium">
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && (
                  <p id="email-error" className="text-xs text-destructive font-medium">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters with upper, lower, number, symbol"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className={`pr-10 ${
                      errors.password ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs text-destructive font-medium">
                    {errors.password}
                  </p>
                )}

                {/* Password Strength Meter */}
                <PasswordStrengthMeter password={password} />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword)
                        setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }}
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                    className={`pr-10 ${
                      errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="text-xs text-destructive font-medium">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Phone (Optional) */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  Phone Number <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section: Role-Specific Details */}
          {role === "founder" ? (
            /* ================= FOUNDER SPECIFIC FIELDS ================= */
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                <span>2. Startup & Venture Details</span>
                <span className="h-px flex-1 bg-border" />
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Startup Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="startupName" className="text-xs font-semibold">
                    Startup or Business Name{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="startupName"
                    placeholder="e.g. NextGen Robotics"
                    value={startupName}
                    onChange={(e) => setStartupName(e.target.value)}
                  />
                </div>

                {/* Industry */}
                <div className="space-y-1.5">
                  <Label htmlFor="industry" className="text-xs font-semibold">
                    Industry
                  </Label>
                  <Select value={industry} onValueChange={(val) => setIndustry(val)}>
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOUNDER_INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>
                          {ind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Business Stage */}
                <div className="space-y-1.5">
                  <Label htmlFor="businessStage" className="text-xs font-semibold">
                    Business Stage
                  </Label>
                  <Select value={businessStage} onValueChange={(val) => setBusinessStage(val)}>
                    <SelectTrigger id="businessStage">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_STAGES.map((stg) => (
                        <SelectItem key={stg} value={stg}>
                          {stg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Business Goals / Description */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="businessGoals" className="text-xs font-semibold">
                    Short Business Goals / Description{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="businessGoals"
                    placeholder="Briefly describe what your venture does and what strategic guidance you seek from retired mentors..."
                    rows={3}
                    value={businessGoals}
                    onChange={(e) => setBusinessGoals(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ================= MENTOR SPECIFIC FIELDS ================= */
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Award className="h-3.5 w-3.5" />
                <span>2. Executive Experience & Mentoring Preferences</span>
                <span className="h-px flex-1 bg-border" />
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Previous Designation / Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="mentorTitle" className="text-xs font-semibold">
                    Previous Designation / Executive Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mentorTitle"
                    placeholder="e.g. Former VP of Engineering"
                    value={mentorTitle}
                    onChange={(e) => {
                      setMentorTitle(e.target.value);
                      if (errors.mentorTitle) setErrors((prev) => ({ ...prev, mentorTitle: "" }));
                    }}
                    aria-invalid={!!errors.mentorTitle}
                    className={errors.mentorTitle ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.mentorTitle && (
                    <p className="text-xs text-destructive font-medium">{errors.mentorTitle}</p>
                  )}
                </div>

                {/* Previous Company */}
                <div className="space-y-1.5">
                  <Label htmlFor="mentorCompany" className="text-xs font-semibold">
                    Previous Company <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mentorCompany"
                    placeholder="e.g. Acme Corporation"
                    value={mentorCompany}
                    onChange={(e) => {
                      setMentorCompany(e.target.value);
                      if (errors.mentorCompany) setErrors((prev) => ({ ...prev, mentorCompany: "" }));
                    }}
                    aria-invalid={!!errors.mentorCompany}
                    className={errors.mentorCompany ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.mentorCompany && (
                    <p className="text-xs text-destructive font-medium">{errors.mentorCompany}</p>
                  )}
                </div>

                {/* Years of Experience */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="yearsOfExperience" className="text-xs font-semibold">
                    Years of Professional Experience <span className="text-destructive">*</span>{" "}
                    <span className="text-muted-foreground font-normal">(min 5 years)</span>
                  </Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    min="5"
                    max="60"
                    placeholder="e.g. 25"
                    value={yearsOfExperience}
                    onChange={(e) => {
                      setYearsOfExperience(e.target.value);
                      if (errors.yearsOfExperience)
                        setErrors((prev) => ({ ...prev, yearsOfExperience: "" }));
                    }}
                    aria-invalid={!!errors.yearsOfExperience}
                    className={errors.yearsOfExperience ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.yearsOfExperience && (
                    <p className="text-xs text-destructive font-medium">{errors.yearsOfExperience}</p>
                  )}
                </div>

                {/* Industry Expertise */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="industryExpertise" className="text-xs font-semibold">
                    Industry Expertise <span className="text-destructive">*</span>{" "}
                    <span className="text-muted-foreground font-normal">(comma-separated)</span>
                  </Label>
                  <Input
                    id="industryExpertise"
                    placeholder="e.g. Finance, Enterprise SaaS, Healthcare, Supply Chain"
                    value={industryExpertise}
                    onChange={(e) => {
                      setIndustryExpertise(e.target.value);
                      if (errors.industryExpertise)
                        setErrors((prev) => ({ ...prev, industryExpertise: "" }));
                    }}
                    aria-invalid={!!errors.industryExpertise}
                    className={errors.industryExpertise ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.industryExpertise && (
                    <p className="text-xs text-destructive font-medium">{errors.industryExpertise}</p>
                  )}
                </div>

                {/* Areas of Specialization */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="specialization" className="text-xs font-semibold">
                    Areas of Specialization <span className="text-destructive">*</span>{" "}
                    <span className="text-muted-foreground font-normal">(comma-separated)</span>
                  </Label>
                  <Input
                    id="specialization"
                    placeholder="e.g. Capital Raising, M&A, Scaling Sales Teams, Board Governance"
                    value={specialization}
                    onChange={(e) => {
                      setSpecialization(e.target.value);
                      if (errors.specialization)
                        setErrors((prev) => ({ ...prev, specialization: "" }));
                    }}
                    aria-invalid={!!errors.specialization}
                    className={errors.specialization ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.specialization && (
                    <p className="text-xs text-destructive font-medium">{errors.specialization}</p>
                  )}
                </div>

                {/* Mentoring Availability */}
                <div className="space-y-1.5">
                  <Label htmlFor="mentoringAvailability" className="text-xs font-semibold">
                    Mentoring Availability
                  </Label>
                  <Select
                    value={mentoringAvailability}
                    onValueChange={(val) => setMentoringAvailability(val)}
                  >
                    <SelectTrigger id="mentoringAvailability">
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent>
                      {MENTOR_AVAILABILITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mentoring Format */}
                <div className="space-y-1.5">
                  <Label htmlFor="mentoringFormat" className="text-xs font-semibold">
                    Preferred Format
                  </Label>
                  <Select
                    value={mentoringFormat}
                    onValueChange={(val) => setMentoringFormat(val)}
                  >
                    <SelectTrigger id="mentoringFormat">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {MENTORING_FORMAT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-5">
          <Button
            type="submit"
            disabled={loading}
            className={`w-full font-semibold transition-all ${
              role === "mentor"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
            size="lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating your account...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>
                  {role === "founder" ? "Create Founder Account" : "Apply as Retired Mentor"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-secondary hover:underline underline-offset-4"
            >
              Sign In
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
