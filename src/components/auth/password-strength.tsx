"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordRequirement {
  id: string;
  label: string;
  test: (pass: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (p: string) => p.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter (A-Z)",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "lowercase",
    label: "One lowercase letter (a-z)",
    test: (p: string) => /[a-z]/.test(p),
  },
  {
    id: "number",
    label: "One number (0-9)",
    test: (p: string) => /[0-9]/.test(p),
  },
  {
    id: "special",
    label: "One special character (!@#$...)",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  colorClass: string;
  barClass: string;
  isStrong: boolean;
} {
  if (!password) {
    return {
      score: 0,
      label: "None",
      colorClass: "text-muted-foreground",
      barClass: "bg-muted",
      isStrong: false,
    };
  }

  const passedCount = PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length;

  if (passedCount <= 1) {
    return {
      score: 1,
      label: "Very Weak",
      colorClass: "text-rose-600 dark:text-rose-400",
      barClass: "bg-rose-500",
      isStrong: false,
    };
  }
  if (passedCount === 2) {
    return {
      score: 2,
      label: "Weak",
      colorClass: "text-orange-600 dark:text-orange-400",
      barClass: "bg-orange-500",
      isStrong: false,
    };
  }
  if (passedCount === 3) {
    return {
      score: 3,
      label: "Fair",
      colorClass: "text-amber-600 dark:text-amber-400",
      barClass: "bg-amber-500",
      isStrong: false,
    };
  }
  if (passedCount === 4) {
    return {
      score: 4,
      label: "Good",
      colorClass: "text-blue-600 dark:text-blue-400",
      barClass: "bg-blue-500",
      isStrong: false,
    };
  }

  return {
    score: 5,
    label: "Strong",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    barClass: "bg-emerald-600",
    isStrong: true,
  };
}

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

export function PasswordStrengthMeter({
  password,
  showRequirements = true,
  className,
}: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password);

  return (
    <div className={cn("space-y-2 pt-1", className)} aria-live="polite">
      {/* Strength Bar */}
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground">Password strength</span>
        <span className={cn("font-semibold", strength.colorClass)}>
          {password ? strength.label : "Required"}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={cn(
              "h-full rounded-full transition-all duration-300",
              password && step <= strength.score ? strength.barClass : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
          {PASSWORD_REQUIREMENTS.map((req) => {
            const passed = req.test(password);
            return (
              <div
                key={req.id}
                className={cn(
                  "flex items-center gap-1.5 transition-colors",
                  passed
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-muted-foreground"
                )}
              >
                {passed ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                )}
                <span>{req.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
