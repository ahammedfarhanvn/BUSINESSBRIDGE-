"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Briefcase,
  Bell,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { DashboardSidebar } from "./dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types/auth";

interface DashboardLayoutProps {
  role: UserRole;
  children: React.ReactNode;
}

export function DashboardLayout({ role, children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, avatar_url")
            .eq("id", user.id)
            .single();

          if (profile) {
            setUserProfile({
              name: profile.full_name || user.email?.split("@")[0] || "User",
              email: profile.email || user.email || "",
              avatarUrl: profile.avatar_url,
            });
            return;
          }
        }
      } catch {
        // Fallback to role-based mock profile for interactive demo
      }

      // Default mock profile per role if Supabase is unauthenticated
      if (role === "founder") {
        setUserProfile({
          name: "Alex Morgan",
          email: "alex.morgan@novabridge.io",
          avatarUrl: null,
        });
      } else if (role === "mentor") {
        setUserProfile({
          name: "Dr. Eleanor Vance",
          email: "e.vance@executiveadvisors.com",
          avatarUrl: null,
        });
      } else {
        setUserProfile({
          name: "System Administrator",
          email: "admin@businessbridge.app",
          avatarUrl: null,
        });
      }
    }

    loadUserData();
  }, [role]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const getPageTitle = () => {
    if (pathname.includes("/boardroom")) return "Virtual Boardroom";
    if (pathname.includes("/mentors")) return "Executive Mentor Directory";
    if (pathname.includes("/invitations")) return "Advisory Board Invitations";
    if (pathname.includes("/dashboard")) return "Dashboard Overview";
    if (pathname.includes("/profile")) {
      return role === "founder" ? "Startup & Founder Profile" : "Mentor Advisory Profile";
    }
    if (pathname.includes("/users")) return "User Management & Governance";
    return "Portal";
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50 dark:bg-background">
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:z-30">
        <DashboardSidebar
          role={role}
          userName={userProfile?.name}
          userEmail={userProfile?.email}
          userAvatar={userProfile?.avatarUrl}
        />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white dark:bg-card transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative h-full">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3.5 z-10 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <DashboardSidebar
            role={role}
            userName={userProfile?.name}
            userEmail={userProfile?.email}
            userAvatar={userProfile?.avatarUrl}
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-white/90 px-4 backdrop-blur dark:bg-card/90 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 lg:hidden text-foreground"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex flex-col">
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
                {getPageTitle()}
              </h1>
              <span className="hidden sm:inline-block text-[11px] text-muted-foreground">
                BusinessBridge Platform • Phase 02 Role Management
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge
              variant="outline"
              className="hidden sm:inline-flex items-center gap-1.5 py-1 px-2.5 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Session Secure</span>
            </Badge>

            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
            >
              <span className="hidden sm:inline">Back to</span> Home
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
