"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Search,
  Building,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BoardroomService } from "@/features/virtual-boardroom/services/boardroom-service";
import {
  MentorDirectoryItem,
  MentorDirectoryFilters,
  BoardroomOverview,
} from "@/features/virtual-boardroom/types";
import { MentorCard } from "@/features/virtual-boardroom/components/mentor-card";
import { MentorFilters } from "@/features/virtual-boardroom/components/mentor-filters";
import { AIMentorSuggestions } from "@/features/virtual-boardroom/components/ai-mentor-suggestions";
import { MentorProfileDialog } from "@/features/virtual-boardroom/components/mentor-profile-dialog";
import { SendInvitationDialog } from "@/features/virtual-boardroom/components/send-invitation-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const INITIAL_FILTERS: MentorDirectoryFilters = {
  searchQuery: "",
  selectedExpertise: "",
  selectedIndustry: "",
  minExperienceYears: 0,
  onlyAvailable: false,
};

export default function FounderMentorsPage() {
  const [mentors, setMentors] = useState<MentorDirectoryItem[]>([]);
  const [boardroom, setBoardroom] = useState<BoardroomOverview | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<MentorDirectoryFilters>(INITIAL_FILTERS);

  // Dialog states
  const [selectedProfileMentor, setSelectedProfileMentor] = useState<MentorDirectoryItem | null>(null);
  const [selectedInviteMentor, setSelectedInviteMentor] = useState<MentorDirectoryItem | null>(null);

  // Load user, boardroom context, and mentor directory
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const uid = user?.id || "";
      setCurrentUserId(uid);

      // Fetch founder boardroom
      let boardId: string | undefined;
      let startupName: string | undefined;

      if (uid) {
        const br = await BoardroomService.getFounderBoardroom(uid);
        setBoardroom(br);
        boardId = br.board?.id;
        startupName = br.startup?.name;
      }

      // Fetch mentors with board context
      const mentorList = await BoardroomService.getMentorDirectory({
        currentUserId: uid,
        boardId,
      });

      setMentors(mentorList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load mentor directory.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute available expertise and industries dynamically from dataset
  const { availableExpertise, availableIndustries } = useMemo(() => {
    const expSet = new Set<string>();
    const indSet = new Set<string>();

    mentors.forEach((m) => {
      m.expertise?.forEach((e) => expSet.add(e));
      m.industry_expertise?.forEach((i) => indSet.add(i));
    });

    return {
      availableExpertise: Array.from(expSet).sort(),
      availableIndustries: Array.from(indSet).sort(),
    };
  }, [mentors]);

  // Client-side filtering
  const filteredMentors = useMemo(() => {
    return mentors.filter((m) => {
      // 1. Search query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesName = m.full_name.toLowerCase().includes(q);
        const matchesTitle = m.professional_title.toLowerCase().includes(q);
        const matchesCompany = m.previous_company.toLowerCase().includes(q);
        const matchesExpertise = m.expertise.some((e) => e.toLowerCase().includes(q));
        const matchesIndustry = m.industry_expertise?.some((i) => i.toLowerCase().includes(q));

        if (!matchesName && !matchesTitle && !matchesCompany && !matchesExpertise && !matchesIndustry) {
          return false;
        }
      }

      // 2. Domain expertise
      if (filters.selectedExpertise) {
        const hasExp = m.expertise.some(
          (e) => e.toLowerCase() === filters.selectedExpertise.toLowerCase()
        );
        if (!hasExp) return false;
      }

      // 3. Industry sector
      if (filters.selectedIndustry) {
        const hasInd = m.industry_expertise?.some(
          (i) => i.toLowerCase() === filters.selectedIndustry.toLowerCase()
        );
        if (!hasInd) return false;
      }

      // 4. Minimum experience
      if (filters.minExperienceYears > 0) {
        if (m.years_of_experience < filters.minExperienceYears) {
          return false;
        }
      }

      // 5. Open availability
      if (filters.onlyAvailable) {
        const avail = m.availability?.toLowerCase();
        if (avail === "unavailable") return false;
      }

      return true;
    });
  }, [mentors, filters]);

  // Handlers for card actions
  const handleViewProfile = (mentor: MentorDirectoryItem) => {
    setSelectedProfileMentor(mentor);
  };

  const handleInvite = (mentor: MentorDirectoryItem) => {
    setSelectedInviteMentor(mentor);
  };

  const handleInviteSuccess = (mentorId: string, invitationId?: string) => {
    // Update local mentor directory state to show 'pending' status immediately
    setMentors((prev) =>
      prev.map((m) => {
        if (m.id === mentorId) {
          return {
            ...m,
            invitation_status: "pending",
            invitation_id: invitationId || m.invitation_id,
          };
        }
        return m;
      })
    );
  };

  const handleClearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            <Users className="h-3.5 w-3.5 text-blue-600" />
            <span>Virtual Boardroom • Advisory Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Executive Mentor Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Discover and appoint vetted retired business executives and veteran operators to guide your startup roadmap, strategic capital planning, and corporate governance.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* AI Recommendations Section */}
      <AIMentorSuggestions
        startupId={boardroom?.startup?.id}
        industry={boardroom?.startup?.industry}
        goals={boardroom?.startup?.description}
        allMentors={mentors}
        onViewProfile={handleViewProfile}
        onInvite={handleInvite}
      />

      {/* Filters Bar */}
      <MentorFilters
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={handleClearFilters}
        availableExpertise={
          availableExpertise.length > 0 ? availableExpertise : undefined
        }
        availableIndustries={
          availableIndustries.length > 0 ? availableIndustries : undefined
        }
        totalResults={filteredMentors.length}
      />

      {/* Loading Skeleton Grid */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 animate-pulse space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
              <div className="h-12 rounded bg-slate-100 dark:bg-slate-800/60" />
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-20 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-9 rounded bg-slate-200 dark:bg-slate-800 mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 dark:bg-rose-950/20 p-6 text-center space-y-3">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-600" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-rose-900 dark:text-rose-100">
              Unable to load mentor directory
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto leading-relaxed">
              {error}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={loadData}
            className="text-xs bg-rose-600 hover:bg-rose-500 text-white"
          >
            Retry Loading
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredMentors.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Compass className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              No executive mentors match your criteria
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Try adjusting your search terms, removing domain filters, or lowering minimum experience requirements.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs font-semibold gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </Button>
        </div>
      )}

      {/* Mentor Cards Grid */}
      {!loading && !error && filteredMentors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
            <MentorCard
              key={mentor.id}
              mentor={mentor}
              onViewProfile={handleViewProfile}
              onInvite={handleInvite}
            />
          ))}
        </div>
      )}

      {/* Mentor Profile Dialog */}
      <MentorProfileDialog
        mentor={selectedProfileMentor}
        open={Boolean(selectedProfileMentor)}
        onOpenChange={(open) => {
          if (!open) setSelectedProfileMentor(null);
        }}
        onInvite={handleInvite}
      />

      {/* Send Invitation Dialog */}
      <SendInvitationDialog
        mentor={selectedInviteMentor}
        boardId={boardroom?.board?.id}
        currentUserId={currentUserId || undefined}
        startupName={boardroom?.startup?.name}
        open={Boolean(selectedInviteMentor)}
        onOpenChange={(open) => {
          if (!open) setSelectedInviteMentor(null);
        }}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}
