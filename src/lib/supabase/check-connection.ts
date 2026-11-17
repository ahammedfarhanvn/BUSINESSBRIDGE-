import { getSupabaseEnv } from "@/lib/validations/env";
import { createClient } from "@supabase/supabase-js";

export interface ConnectionStatus {
  isConfigured: boolean;
  canConnect: boolean;
  message: string;
  missingVariables?: string[];
  latencyMs?: number;
}

/**
 * Validates whether Supabase environment variables are provided and tests actual network connectivity.
 * Returns a structured report without throwing unhandled exceptions.
 */
export async function checkSupabaseConnection(): Promise<ConnectionStatus> {
  const env = getSupabaseEnv();
  const missingVariables: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-id")) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-anon-key")) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!env.isConfigured || missingVariables.length > 0) {
    return {
      isConfigured: false,
      canConnect: false,
      missingVariables,
      message: `Supabase credentials not configured. Please supply: ${missingVariables.join(", ")} in .env.local`,
    };
  }

  const startTime = Date.now();
  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false },
    });

    // Attempt a light query to test connection
    const { error } = await supabase.from("profiles").select("id").limit(1);
    const latencyMs = Date.now() - startTime;

    if (error && error.code !== "PGRST116") {
      // PGRST116 is single row not found or similar; if error is permission/table that still verifies network connectivity
      return {
        isConfigured: true,
        canConnect: true,
        latencyMs,
        message: `Connected to Supabase endpoint (${latencyMs}ms), but query returned: ${error.message}`,
      };
    }

    return {
      isConfigured: true,
      canConnect: true,
      latencyMs,
      message: `Successfully connected to Supabase (${latencyMs}ms).`,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      isConfigured: true,
      canConnect: false,
      message: `Failed to connect to Supabase endpoint: ${errorMessage}`,
    };
  }
}
