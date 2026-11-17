"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  MailCheck,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const supabase = createClient();

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    if (!email.trim()) {
      setErrorMessage("Please specify your email address to resend verification.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage("Verification email resent successfully! Please check your inbox.");
        setCooldown(60);

        const timer = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend verification email.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-xl border-border/60">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-primary dark:bg-blue-950 dark:text-blue-300">
          <Mail className="h-7 w-7 text-primary dark:text-blue-400" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Verify Your Email
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          We need to verify your email address to ensure account security and activate your
          advisory workspace.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {email && (
          <div className="rounded-lg bg-muted/50 p-3.5 text-center border border-border/50">
            <span className="text-xs text-muted-foreground block mb-1">
              Verification email sent to:
            </span>
            <span className="text-sm font-semibold text-foreground break-all">{email}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            className="flex items-start gap-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            className="flex items-start gap-2.5 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Helpful Tips Card */}
        <div className="rounded-lg bg-muted/30 p-4 border border-border/50 space-y-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <HelpCircle className="h-4 w-4 text-secondary" />
            <span>Troubleshooting Tips</span>
          </div>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>Check your spam, junk, or promotions folder.</li>
            <li>Verification links remain valid for 24 hours.</li>
            <li>Once verified, you will be redirected straight to your dashboard.</li>
          </ul>
        </div>

        {/* Resend Action */}
        <div className="pt-2 text-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || cooldown > 0}
            onClick={handleResend}
            className="w-full text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Resending verification link...
              </>
            ) : cooldown > 0 ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Resend available in {cooldown}s
              </>
            ) : (
              <>
                <MailCheck className="mr-1.5 h-3.5 w-3.5" />
                Resend Verification Link
              </>
            )}
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-3 border-t border-border/50 pt-4">
        <Button variant="ghost" className="w-full text-xs" asChild>
          <Link href="/login" className="flex items-center justify-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Sign In</span>
          </Link>
        </Button>
        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs" asChild>
          <Link href="/login" className="flex items-center justify-center gap-1.5">
            <span>Already Verified? Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <Suspense
        fallback={
          <Card className="w-full max-w-lg p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </Card>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
