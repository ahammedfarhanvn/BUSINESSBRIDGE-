"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, ArrowRight, LayoutDashboard, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const [session, setSession] = React.useState<any>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [signingOut, setSigningOut] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        setSession(session);
        if (session?.user) {
          const role =
            session.user.user_metadata?.role ||
            session.user.app_metadata?.role ||
            "founder";
          setUserRole(role);
        }
        setLoading(false);
      }).catch(() => {
        if (isMounted) setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!isMounted) return;
          setSession(session);
          if (session?.user) {
            const role =
              session.user.user_metadata?.role ||
              session.user.app_metadata?.role ||
              "founder";
            setUserRole(role);
          } else {
            setUserRole(null);
          }
        }
      );

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch {
      setLoading(false);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      setSession(null);
      setUserRole(null);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setSigningOut(false);
    }
  };

  const getDashboardHref = () => {
    if (userRole === "admin") return "/admin/dashboard";
    if (userRole === "mentor") return "/mentor/dashboard";
    return "/founder/dashboard";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Briefcase className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Business<span className="text-secondary">Bridge</span>
          </span>
        </Link>

        <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
          <Link
            href="/"
            className="text-foreground transition-colors hover:text-secondary"
          >
            Home
          </Link>
          <Link
            href="/#about"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="/#how-it-works"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
        </nav>

        <div className="flex items-center space-x-3">
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded bg-muted/60" />
          ) : session ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={getDashboardHref()} className="flex items-center gap-1.5">
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <span>Dashboard</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-muted-foreground hover:text-foreground"
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </div>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90" asChild>
                <Link href="/register" className="flex items-center gap-1.5">
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
