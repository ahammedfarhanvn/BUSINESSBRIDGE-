"use client";

import React from "react";
import { Search, X, SlidersHorizontal, RotateCcw, Check } from "lucide-react";
import { MentorDirectoryFilters } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface MentorFiltersProps {
  filters: MentorDirectoryFilters;
  onFilterChange: (newFilters: MentorDirectoryFilters) => void;
  onClearFilters: () => void;
  availableExpertise?: string[];
  availableIndustries?: string[];
  totalResults?: number;
  className?: string;
}

const DEFAULT_EXPERTISE_OPTIONS = [
  "Finance & Accounting",
  "Fundraising & Capital",
  "Marketing & Growth",
  "Sales & GTM Strategy",
  "Tech & Engineering",
  "Operations & Scaling",
  "Legal & Corporate Governance",
  "Product Strategy",
  "Talent & HR",
];

const DEFAULT_INDUSTRY_OPTIONS = [
  "SaaS / Enterprise",
  "FinTech & Banking",
  "HealthTech & Bio",
  "E-Commerce & Retail",
  "AI & DeepTech",
  "CleanTech & Energy",
  "EdTech",
  "Logistics & Supply Chain",
];

const EXPERIENCE_RANGES = [
  { label: "All Experience", value: 0 },
  { label: "10+ Years", value: 10 },
  { label: "15+ Years", value: 15 },
  { label: "20+ Years", value: 20 },
  { label: "25+ Years", value: 25 },
];

export function MentorFilters({
  filters,
  onFilterChange,
  onClearFilters,
  availableExpertise = DEFAULT_EXPERTISE_OPTIONS,
  availableIndustries = DEFAULT_INDUSTRY_OPTIONS,
  totalResults,
  className,
}: MentorFiltersProps) {
  // Count how many active filters there are
  const activeFilterCount =
    (filters.searchQuery.trim() ? 1 : 0) +
    (filters.selectedExpertise ? 1 : 0) +
    (filters.selectedIndustry ? 1 : 0) +
    (filters.minExperienceYears > 0 ? 1 : 0) +
    (filters.onlyAvailable ? 1 : 0);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      searchQuery: e.target.value,
    });
  };

  const handleExpertiseChange = (value: string) => {
    onFilterChange({
      ...filters,
      selectedExpertise: value === "ALL_EXPERTISE" ? "" : value,
    });
  };

  const handleIndustryChange = (value: string) => {
    onFilterChange({
      ...filters,
      selectedIndustry: value === "ALL_INDUSTRIES" ? "" : value,
    });
  };

  const handleExperienceChange = (value: string) => {
    onFilterChange({
      ...filters,
      minExperienceYears: Number(value),
    });
  };

  const toggleAvailability = () => {
    onFilterChange({
      ...filters,
      onlyAvailable: !filters.onlyAvailable,
    });
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4",
        className
      )}
    >
      {/* Top row: Search input & summary */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by mentor name, past company, or specific keyword..."
            value={filters.searchQuery}
            onChange={handleSearchChange}
            className="pl-9 pr-9 h-10 text-sm bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, searchQuery: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Result Counter & Clear */}
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          {typeof totalResults === "number" && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Found <strong className="text-slate-900 dark:text-slate-100">{totalResults}</strong>{" "}
              {totalResults === 1 ? "mentor" : "mentors"}
            </span>
          )}

          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 font-medium"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
              <Badge
                variant="secondary"
                className="ml-1 h-4 px-1.5 text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold"
              >
                {activeFilterCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Bottom row: Filter selectors & Availability Toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
        {/* Domain Expertise Select */}
        <div>
          <Select
            value={filters.selectedExpertise || "ALL_EXPERTISE"}
            onValueChange={handleExpertiseChange}
          >
            <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Domain Expertise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_EXPERTISE">All Domains</SelectItem>
              {availableExpertise.map((domain) => (
                <SelectItem key={domain} value={domain} className="text-xs">
                  {domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Industry Sector Select */}
        <div>
          <Select
            value={filters.selectedIndustry || "ALL_INDUSTRIES"}
            onValueChange={handleIndustryChange}
          >
            <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Industry Sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_INDUSTRIES">All Industries</SelectItem>
              {availableIndustries.map((ind) => (
                <SelectItem key={ind} value={ind} className="text-xs">
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Experience Range Select */}
        <div>
          <Select
            value={String(filters.minExperienceYears)}
            onValueChange={handleExperienceChange}
          >
            <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Years of Experience" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_RANGES.map((range) => (
                <SelectItem key={range.value} value={String(range.value)} className="text-xs">
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Availability Toggle Button */}
        <div>
          <button
            type="button"
            onClick={toggleAvailability}
            className={cn(
              "w-full h-9 flex items-center justify-between px-3 rounded-md text-xs font-medium border transition-colors",
              filters.onlyAvailable
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
            )}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  filters.onlyAvailable ? "bg-emerald-500" : "bg-slate-300"
                )}
              />
              <span>Available Now</span>
            </span>
            {filters.onlyAvailable && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          </button>
        </div>
      </div>

      {/* Active filter pill badges if any */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Active:</span>

          {filters.searchQuery && (
            <Badge
              variant="secondary"
              className="gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal pr-1"
            >
              <span>Keyword: &quot;{filters.searchQuery}&quot;</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, searchQuery: "" })}
                className="hover:text-slate-900 dark:hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.selectedExpertise && (
            <Badge
              variant="secondary"
              className="gap-1 text-[11px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900 font-normal pr-1"
            >
              <span>Domain: {filters.selectedExpertise}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, selectedExpertise: "" })}
                className="hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.selectedIndustry && (
            <Badge
              variant="secondary"
              className="gap-1 text-[11px] bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900 font-normal pr-1"
            >
              <span>Sector: {filters.selectedIndustry}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, selectedIndustry: "" })}
                className="hover:text-purple-900"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.minExperienceYears > 0 && (
            <Badge
              variant="secondary"
              className="gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal pr-1"
            >
              <span>Min {filters.minExperienceYears} yrs</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, minExperienceYears: 0 })}
                className="hover:text-slate-900"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.onlyAvailable && (
            <Badge
              variant="secondary"
              className="gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900 font-normal pr-1"
            >
              <span>Open Availability</span>
              <button
                type="button"
                onClick={toggleAvailability}
                className="hover:text-emerald-900"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
