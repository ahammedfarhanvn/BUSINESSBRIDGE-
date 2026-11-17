import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type"); // e.g. 'recovery' | 'signup' | 'email' | 'invite'
  const next = searchParams.get("next");

  const supabase = await createClient();

  try {
    let authSuccess = false;

    // Handle PKCE code exchange
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        authSuccess = true;
      } else {
        console.error("Auth callback exchangeCode error:", error.message);
      }
    } else if (tokenHash && type) {
      // Handle OTP verification (token_hash & type)
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });
      if (!error) {
        authSuccess = true;
      } else {
        console.error("Auth callback verifyOtp error:", error.message);
      }
    }

    if (authSuccess) {
      // If this is a password recovery flow, immediately redirect to reset-password
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // Check current user role to perform intelligent routing
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Query user's verified role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role = profile?.role || (user.user_metadata?.role as string);

        if (next && next.startsWith("/")) {
          return NextResponse.redirect(`${origin}${next}`);
        }

        if (role === "admin") {
          return NextResponse.redirect(`${origin}/admin/dashboard`);
        } else if (role === "mentor") {
          return NextResponse.redirect(`${origin}/mentor/dashboard`);
        } else {
          return NextResponse.redirect(`${origin}/founder/dashboard`);
        }
      }

      // Fallback redirection
      return NextResponse.redirect(`${origin}${next || "/founder/dashboard"}`);
    }
  } catch (err: unknown) {
    console.error("Unhandled auth callback error:", err);
  }

  // If code exchange failed or expired, return to login with informative error parameter
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
