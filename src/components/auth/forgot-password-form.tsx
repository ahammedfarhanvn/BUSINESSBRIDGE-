"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  MailCheck,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
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

export function ForgotPasswordForm() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Please enter your account email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/auth/callback?type=recovery`,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setIsSubmitted(true);
      setResendCooldown(60);

      // Start a countdown timer for resend
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send password reset email.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${origin}/auth/callback?type=recovery`,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setResendCooldown(60);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend reset link.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <MailCheck className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Check Your Email
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2">
            We have sent password reset instructions to{" "}
            <span className="font-semibold text-foreground">{email}</span>.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <div
              className="flex items-start gap-2.5 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="rounded-lg bg-muted/40 p-4 border border-border/50 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Password Reset Guidelines</span>
            </div>
            <p>• The reset link will expire in 60 minutes for your security.</p>
            <p>• If you don&apos;t see the email, please check your spam or promotional folders.</p>
            <p>• Make sure to choose a strong password with letters, numbers, and symbols.</p>
          </div>

          <div className="text-center pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={resendCooldown > 0 || loading}
              onClick={handleResend}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend reset link in ${resendCooldown}s`
              ) : (
                "Didn't receive an email? Click to resend"
              )}
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t border-border/50 pt-4">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login" className="flex items-center justify-center gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Sign In</span>
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-border/60">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Reset Password
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your registered email address to receive a secure recovery link
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div
              className="flex items-start gap-2.5 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20 animate-in fade-in"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reset-email" className="text-xs font-semibold">
              Email Address
            </Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
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
                <span>Sending recovery link...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Send Reset Link</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
