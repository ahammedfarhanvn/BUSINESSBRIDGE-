import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Maps user roles to their authorized dashboard paths.
 */
function getAuthorizedDashboard(role?: string): string {
  switch (role) {
    case "founder":
      return "/founder/dashboard";
    case "mentor":
      return "/mentor/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/login";
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Direct path redirection for base module roots
  if (pathname === "/founder") {
    return NextResponse.redirect(new URL("/founder/dashboard", request.url));
  }
  if (pathname === "/mentor") {
    return NextResponse.redirect(new URL("/mentor/dashboard", request.url));
  }
  if (pathname === "/admin") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // 2. Define unauthenticated public routes
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/health");

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase credentials are not configured, allow requests to proceed safely without crashing
  const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-id") &&
    !supabaseUrl.includes("placeholder")
  );

  if (!isSupabaseConfigured) {
    return supabaseResponse;
  }

  // Helper function to preserve cookies across Next.js redirects
  const createRedirectWithCookies = (url: string | URL) => {
    const redirectResponse = NextResponse.redirect(new URL(url, request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is accessing public route, let request proceed
  if (isPublicRoute) {
    return supabaseResponse;
  }

  // Enforce server-side role-based authorization for protected routes
  const isFounderRoute = pathname.startsWith("/founder");
  const isMentorRoute = pathname.startsWith("/mentor");
  const isAdminRoute = pathname.startsWith("/admin");

  if (isFounderRoute || isMentorRoute || isAdminRoute) {
    // If not authenticated, redirect to login with return path
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return createRedirectWithCookies(loginUrl);
    }

    // Resolve user role (user_metadata first, fallback to profiles table)
    let role = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;

    if (!role) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        role = profile?.role;
      } catch {
        // Fallback if query fails
        role = undefined;
      }
    }

    // Enforce role matching
    if (isFounderRoute && role !== "founder") {
      const authorizedDashboard = getAuthorizedDashboard(role);
      return createRedirectWithCookies(authorizedDashboard);
    }

    if (isMentorRoute && role !== "mentor") {
      const authorizedDashboard = getAuthorizedDashboard(role);
      return createRedirectWithCookies(authorizedDashboard);
    }

    if (isAdminRoute && role !== "admin") {
      const authorizedDashboard = getAuthorizedDashboard(role);
      return createRedirectWithCookies(authorizedDashboard);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files and images:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with common extensions (.svg, .png, .jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
