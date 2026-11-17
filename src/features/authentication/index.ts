/**
 * Feature Module: Authentication & Role Management
 * Phase 02 implementation.
 *
 * Responsibilities:
 * - Supabase Auth sign-up / sign-in (email/password & magic link)
 * - User role-based routing (founder / mentor / admin)
 * - Profile onboarding workflows
 */

export * from "@/types/auth";
export * from "@/services/auth.service";
export * from "@/services/profile.service";

// UI Components
export * from "@/components/auth/register-form";
export * from "@/components/auth/login-form";
export * from "@/components/auth/forgot-password-form";
export * from "@/components/auth/reset-password-form";
export * from "@/components/auth/password-strength";
