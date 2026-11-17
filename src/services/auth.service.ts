import { createClient } from "@/lib/supabase/server";
import {
  RegistrationInput,
  LoginInput,
  AuthResponse,
  UserRole,
  UserProfile,
} from "@/types/auth";
import type { Session } from "@supabase/supabase-js";

/**
 * Validates email format according to standard regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates password strength:
 * - At least 8 characters
 * - Contains at least one letter and one number
 */
export function validatePassword(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long.",
    };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      isValid: false,
      message: "Password must contain at least one letter and one number.",
    };
  }

  return { isValid: true };
}

/**
 * Registers a new user with Supabase Auth and triggers profile initialization.
 * ONLY 'founder' or 'mentor' roles are allowed from public registration.
 */
export async function registerUser(input: RegistrationInput): Promise<AuthResponse> {
  try {
    // 1. Validate email format
    if (!input.email || !isValidEmail(input.email)) {
      return {
        success: false,
        error: "Please provide a valid email address.",
      };
    }

    // 2. Validate password strength
    const passwordValidation = validatePassword(input.password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: passwordValidation.message,
      };
    }

    // 3. Strictly restrict role (founder or mentor only)
    if (input.role !== "founder" && input.role !== "mentor") {
      return {
        success: false,
        error: "Invalid role selected. Public registration only supports 'founder' or 'mentor'.",
      };
    }

    // 4. Validate full name
    const trimmedName = input.full_name?.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return {
        success: false,
        error: "Full name must be at least 2 characters long.",
      };
    }

    const supabase = await createClient();

    // 5. Build user metadata object
    const metadata: Record<string, unknown> = {
      full_name: trimmedName,
      role: input.role,
      phone: input.phone?.trim() || null,
      location: input.location?.trim() || null,
      bio: input.bio?.trim() || null,
    };

    if (input.role === "founder") {
      metadata.startup_name = input.startup_name?.trim() || null;
      metadata.industry = input.industry?.trim() || null;
      metadata.business_stage = input.business_stage || "idea";
      metadata.business_description = input.business_description?.trim() || null;
      metadata.business_goals = input.business_goals?.trim() || null;
      metadata.experience_level = input.experience_level || "first_time";
      metadata.entrepreneurial_interests = input.entrepreneurial_interests || [];
    } else if (input.role === "mentor") {
      metadata.previous_designation = input.previous_designation?.trim() || null;
      metadata.professional_title =
        input.professional_title?.trim() || input.previous_designation?.trim() || "";
      metadata.previous_company = input.previous_company?.trim() || "";
      metadata.years_experience = input.years_experience ?? input.years_of_experience ?? 0;
      metadata.years_of_experience = input.years_of_experience ?? input.years_experience ?? 0;
      metadata.industry_expertise = input.industry_expertise || input.expertise || [];
      metadata.expertise = input.expertise || input.industry_expertise || [];
      metadata.specialization = input.specialization || [];
      metadata.achievements = input.achievements?.trim() || null;
      metadata.mentoring_availability = input.mentoring_availability || "advisory_only";
      metadata.availability = input.mentoring_availability || "advisory_only";
      metadata.mentoring_format = input.mentoring_format || "virtual";
    }

    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: "User creation failed. Please try again.",
      };
    }

    const targetRoute = input.role === "founder" ? "/founder" : "/mentor";

    return {
      success: true,
      message: data.session
        ? "Account created successfully."
        : "Account created successfully. Please check your email to verify your address.",
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          }
        : null,
      user: {
        id: data.user.id,
        email: data.user.email || input.email,
        role: input.role,
      },
      redirectTo: targetRoute,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred during registration.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Authenticates user with email and password, returning session and role for routing.
 */
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  try {
    if (!input.email || !isValidEmail(input.email)) {
      return {
        success: false,
        error: "Please provide a valid email address.",
      };
    }

    if (!input.password) {
      return {
        success: false,
        error: "Password is required.",
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });

    if (error || !data.user) {
      return {
        success: false,
        error: error?.message || "Invalid email or password.",
      };
    }

    // Fetch user profile from database to get official role and active status
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profile && profile.is_active === false) {
      // User account is deactivated
      await supabase.auth.signOut();
      return {
        success: false,
        error: "Your account has been deactivated. Please contact support.",
      };
    }

    const userRole: UserRole =
      (profile?.role as UserRole) ||
      (data.user.user_metadata?.role as UserRole) ||
      "founder";

    let redirectTo = "/founder";
    if (userRole === "admin") {
      redirectTo = "/admin";
    } else if (userRole === "mentor") {
      redirectTo = "/mentor";
    }

    return {
      success: true,
      message: "Login successful.",
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          }
        : null,
      user: {
        id: data.user.id,
        email: data.user.email || input.email,
        role: userRole,
      },
      profile: profile || null,
      redirectTo,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred during login.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Signs out the current user and clears session cookies.
 */
export async function logoutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred during logout.";
    return { success: false, error: message };
  }
}

/**
 * Sends a password reset email with redirection link.
 */
export async function requestPasswordReset(
  email: string,
  redirectUrl?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (!email || !isValidEmail(email)) {
      return {
        success: false,
        error: "Please provide a valid email address.",
      };
    }

    const supabase = await createClient();
    const options = redirectUrl ? { redirectTo: redirectUrl } : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      options
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to request password reset.";
    return { success: false, error: message };
  }
}

/**
 * Updates password for currently authenticated user.
 */
export async function updatePassword(
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: passwordValidation.message,
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: "Password updated successfully.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update password.";
    return { success: false, error: message };
  }
}

/**
 * Retrieves the current session on the server side.
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current user's role on the server side.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      return profile.role as UserRole;
    }

    return (user.user_metadata?.role as UserRole) || null;
  } catch {
    return null;
  }
}
