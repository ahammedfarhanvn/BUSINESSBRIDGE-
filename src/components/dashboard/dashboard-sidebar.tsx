"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  LayoutDashboard,
  User,
  Users,
  Compass,
  Award,
  TrendingUp,
  ShieldCheck,
  LogOut,
  ExternalLink,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  MailCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types/auth";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
}

interface DashboardSidebarProps {
  role: UserRole;
  userName?: string;
  userEmail?: string;
  userAvatar?: string | null;
  onNavigate?: () => void;
}

export function DashboardSidebar({
  role,
  userName = "User",
  userEmail = "user@businessbridge.app",
  userAvatar,
  onNavigate,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore if supabase client unconfigured
    }
    router.push("/login");
  };

  const getRoleConfig = () => {
    switch (role) {
      case "founder":
        return {
          title: "Founder Portal",
          badgeVariant: "default" as const,
          badgeClass: "bg-blue-600 text-white hover:bg-blue-600",
          accentColor: "text-blue-600",
          items: [
            {
              title: "Dashboard",
              href: "/founder/dashboard",
              icon: LayoutDashboard,
            },
            {
              title: "Virtual Boardroom",
              href: "/founder/boardroom",
              icon: Users,
            },
            {
              title: "Mentor Directory",
              href: "/founder/mentors",
              icon: Compass,
            },
            {
              title: "Startup & Profile",
              href: "/founder/profile",
              icon: User,
            },
            {
              title: "AI Business Assistant",
              href: "/founder/ai-assistant",
              icon: Sparkles,
              badge: "AI",
            },
            {
              title: "Journey Tracker",
              href: "#",
              icon: TrendingUp,
              badge: "Module B",
              disabled: true,
            },
          ] as NavItem[],
        };
      case "mentor":
        return {
          title: "Mentor Portal",
          badgeVariant: "accent" as const,
          badgeClass: "bg-emerald-600 text-white hover:bg-emerald-600",
          accentColor: "text-emerald-600",
          items: [
            {
              title: "Dashboard",
              href: "/mentor/dashboard",
              icon: LayoutDashboard,
            },
            {
              title: "Advisor Profile",
              href: "/mentor/profile",
              icon: Award,
            },
            {
              title: "Board Invitations",
              href: "/mentor/invitations",
              icon: MailCheck,
            },
            {
              title: "Advisory Reviews",
              href: "#",
              icon: CheckCircle2,
              badge: "Module B",
              disabled: true,
            },
          ] as NavItem[],
        };
      case "admin":
        return {
          title: "Admin Console",
          badgeVariant: "secondary" as const,
          badgeClass: "bg-slate-800 text-white hover:bg-slate-800",
          accentColor: "text-slate-800",
          items: [
            {
              title: "Overview",
              href: "/admin/dashboard",
              icon: LayoutDashboard,
            },
            {
              title: "User Management",
              href: "/admin/users",
              icon: Users,
            },
            {
              title: "Mentor Verification",
              href: "/admin/users?filter=pending",
              icon: ShieldCheck,
            },
          ] as NavItem[],
        };
    }
  };

  const roleConfig = getRoleConfig();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-border/60 bg-white dark:bg-card">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-border/40 px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          onClick={onNavigate}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold leading-tight tracking-tight text-foreground">
              Business<span className="text-secondary">Bridge</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Advisory Network
            </span>
          </div>
        </Link>
      </div>

      {/* Role Pill */}
      <div className="border-b border-border/30 bg-muted/20 px-6 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Workspace
          </span>
          <Badge className={`text-[11px] font-medium py-0.5 px-2 ${roleConfig.badgeClass}`}>
            {roleConfig.title}
          </Badge>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {roleConfig.items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.title}
                className="group flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground/60 opacity-80"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span>{item.title}</span>
              </div>
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${
                  isActive ? "text-primary-foreground opacity-90" : "opacity-0 group-hover:opacity-60"
                }`}
              />
            </Link>
          );
        })}

        {/* Informational Callout */}
        <div className="mt-8 rounded-lg border border-border/60 bg-muted/20 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Phase 03 Active</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Virtual Boardrooms & Mentor Discovery live. Build your executive advisory council.
          </p>
        </div>
      </nav>

      {/* User Profile & Logout Footer */}
      <div className="border-t border-border/40 bg-muted/10 p-3.5">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border/60">
            {userAvatar ? (
              <AvatarImage src={userAvatar} alt={userName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 font-semibold text-xs text-primary">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-xs font-semibold text-foreground">
              {userName}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {userEmail}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <span>Public Site</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
          <span className="capitalize text-muted-foreground/80 font-medium">
            {role}
          </span>
        </div>
      </div>
    </aside>
  );
}
