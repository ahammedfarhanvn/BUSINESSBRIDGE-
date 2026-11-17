import Link from "next/link";
import {
  Users,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Database,
  Lock,
  Layers,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-background via-muted/20 to-background py-20 md:py-32">
          <div className="container max-w-5xl px-4 text-center sm:px-8">
            <Badge
              variant="accent"
              className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 font-medium"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Phase 01 Technical Foundation Ready</span>
            </Badge>

            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl">
              Experience Meets{" "}
              <span className="bg-gradient-to-r from-slate-900 via-blue-700 to-emerald-600 bg-clip-text text-transparent dark:from-slate-100 dark:via-blue-400 dark:to-emerald-400">
                Ambition.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Connecting experienced business leaders with the next generation of
              entrepreneurs. Get strategic advisory, validate business milestones,
              and build enduring ventures.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="h-12 px-8 text-base shadow-md" asChild>
                <Link href="/register">Get Started</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base"
                asChild
              >
                <Link href="#how-it-works">Explore How It Works</Link>
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Executive Mentorship</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Milestone-Driven Tracking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Supabase Protected RLS</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Preview Cards */}
        <section id="features" className="py-20">
          <div className="container max-w-6xl px-4 sm:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Two Core Pillars. One Unified Platform.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Architected to accelerate early-stage founders with structured veteran guidance.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Pillar 1: Virtual Boardroom */}
              <Card className="relative overflow-hidden border-border/80 transition-shadow hover:shadow-lg">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y-[-8px] rounded-full bg-blue-500/10 blur-2xl" />
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Users className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="w-fit text-xs font-semibold text-blue-600">
                    Module A
                  </Badge>
                  <CardTitle className="text-2xl font-bold">Virtual Boardroom</CardTitle>
                  <CardDescription className="text-base text-foreground/80">
                    Build your own advisory board with experienced business professionals.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Assemble vetted retired executives across finance, marketing, operations, and governance. Convene advisory meetings, document board minutes, and receive strategic recommendations.
                  </p>
                  <ul className="space-y-1.5 pt-2 text-xs">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Domain-specific mentor matching
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Structured board invitations & terms
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Advisory notes & formal recommendations
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Pillar 2: Business Journey Tracker */}
              <Card className="relative overflow-hidden border-border/80 transition-shadow hover:shadow-lg">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y-[-8px] rounded-full bg-emerald-500/10 blur-2xl" />
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="w-fit text-xs font-semibold text-emerald-600">
                    Module B
                  </Badge>
                  <CardTitle className="text-2xl font-bold">Business Journey Tracker</CardTitle>
                  <CardDescription className="text-base text-foreground/80">
                    Transform your business idea into measurable milestones and real progress.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Collaboratively map out strategic milestones, break them down into actionable tasks, and review progress updates with your board in real time.
                  </p>
                  <ul className="space-y-1.5 pt-2 text-xs">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Milestone lifecycle & progress percent tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Collaborative founder-mentor task assignments
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Audit trail of milestones and task updates
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Phase 01 Architecture & Readiness Overview */}
        <section id="architecture" className="border-t border-border/40 bg-muted/20 py-16">
          <div className="container max-w-5xl px-4 sm:px-8">
            <div className="mb-8 text-center">
              <Badge variant="outline" className="text-xs font-medium">
                Phase 01 Status
              </Badge>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">
                Architectural Readiness Checklist
              </h3>
              <p className="text-sm text-muted-foreground">
                All foundational technical requirements established and verified.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>Frontend Core</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Next.js App Router, TypeScript strict mode, Tailwind CSS design tokens, and shadcn/ui components.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Configured & Validated</span>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Database className="h-4 w-4 text-emerald-600" />
                  <span>Supabase Schema</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  12 PostgreSQL tables, foreign key constraints, indexes, triggers, and comprehensive Row Level Security policies.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Migration SQL Generated</span>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>SSR Auth & Security</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  @supabase/ssr browser & server client abstractions, cookie session handlers, and non-blocking fallback verification.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Integrated</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
