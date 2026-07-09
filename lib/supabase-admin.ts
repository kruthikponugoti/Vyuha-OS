import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Privileged, service-role Supabase client for server-only admin operations
// (creating/deactivating staff auth accounts). NEVER import this into a client
// component or expose the key. Requires SUPABASE_SERVICE_ROLE_KEY.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True when the service-role key is configured — staff auth accounts possible. */
export const adminConfigured = Boolean(url && serviceKey && url.startsWith("http"));

export function supabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
