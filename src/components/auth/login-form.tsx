"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isUnconfirmedEmail, setIsUnconfirmedEmail] = useState(false);

  // Check URL query parameters for feedback messages
  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setInfoMessage("Your password has been successfully reset. Please sign in with your new password.");
    } else if (searchParams.get("verified") === "true") {
      setInfoMessage("Email successfully verified! You may now sign in to your account.");
    } else if (searchParams.get("error") === "auth-code-error") {
      setErrorMessage("The authentication link was invalid or has expired. Please sign in or request a new link.");
    }

    // Load saved email if remember me was previously used
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("bb_remember_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsUnconfirmedEmail(false);
    setResendSuccess(false);

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // Remember me handling
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("bb_remember_email", cleanEmail);
        } else {
          localStorage.removeItem("bb_remember_email");
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        const errorLower = error.message.toLowerCase();
        if (errorLower.includes("email not confirmed") || error.code === "email_not_confirmed") {
          setIsUnconfirmedEmail(true);
          setErrorMessage(
            "Your email has not been verified yet. Please check your inbox or click below to resend the confirmation email."
          );
        } else if (
          errorLower.includes("invalid login credentials") ||
          errorLower.includes("invalid_grant") ||
          errorLower.includes("wrong password")
        ) {
          setErrorMessage("Incorrect email or password. Please verify your credentials and try again.");
        } else {
          setErrorMessage(error.message);
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMessage("Unable to authenticate user. Please try again.");
        setLoading(false);
        return;
      }

      // Query user role from public.profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      const userRole = profile?.role || (data.user.user_metadata?.role as string) || "founder";

      // Trigger router refresh to ensure session cookies are synced
      router.refresh();

      // Route based on verified role
      if (userRole === "admin") {
        router.push("/admin/dashboard");
      } else if (userRole === "mentor") {
        router.push("/mentor/dashboard");
      } else {
        router.push("/founder/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during sign in.";
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setErrorMessage("Please provide an email address to resend verification.");
      return;
    }

    setResending(true);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setResendSuccess(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend confirmation email.";
      setErrorMessage(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-border/60">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Briefcase className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Sign in to access your BusinessBridge advisory workspace
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Info Banner (e.g. from password reset) */}
          {infoMessage && (
            <div
              className="flex items-start gap-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
              role="status"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error Alert Banner */}
          {errorMessage && (
            <div
              className="flex items-start gap-2.5 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20 animate-in fade-in"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p>{errorMessage}</p>

                {/* Resend confirmation button if email is unconfirmed */}
                {isUnconfirmedEmail && (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendConfirmation}
                      disabled={resending}
                      className="h-7 text-xs border-destructive/30 hover:bg-destructive/10"
                    >
                      {resending ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Resending link...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-1.5 h-3.5 w-3.5" />
                          Resend Verification Email
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resend success banner */}
          {resendSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Verification email sent! Please check your inbox.</span>
            </div>
          )}

          {/* Email Address */}
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs font-semibold">
              Email Address
            </Label>
            <Input
              id="login-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-xs font-semibold">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-secondary hover:underline underline-offset-4 font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
                className="pr-10"
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
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <Label
              htmlFor="rememberMe"
              className="text-xs font-normal text-muted-foreground cursor-pointer select-none"
            >
              Remember me on this device
            </Label>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-5">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            size="lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-secondary hover:underline underline-offset-4"
            >
              Register here
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
