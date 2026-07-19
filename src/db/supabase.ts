import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

/**
 * Whether Supabase credentials are present in the environment.
 * Sign up at https://supabase.com, create a project, and add
 * SUPABASE_URL / SUPABASE_KEY to Railway variables to enable this.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/**
 * Configured Supabase client, or null when credentials are not set.
 * Other modules should check `isSupabaseConfigured` (or handle a null
 * client) before using this.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseKey as string)
  : null;

/**
 * Pings the Supabase database to verify connectivity.
 * Used by the /health endpoint.
 */
export async function pingDatabase(): Promise<{
  status: "connected" | "disconnected" | "not_configured";
  error?: string;
}> {
  if (!supabase) {
    return { status: "not_configured" };
  }

  try {
    // A lightweight call that just checks we can reach the Supabase API
    // using the configured credentials, without requiring any specific
    // table to exist yet.
    const { error } = await supabase.auth.getSession();

    if (error) {
      return { status: "disconnected", error: error.message };
    }

    return { status: "connected" };
  } catch (err) {
    return {
      status: "disconnected",
      error: err instanceof Error ? err.message : "Unknown database error",
    };
  }
}
