// Server-side data access. Returns a real Supabase client when keys are
// configured, otherwise a LocalClient over the seeded in-memory store.
// Both expose the same query API (see local-client.ts), so callers never branch.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { LocalClient, LocalDatabase } from "./local-client";
import { buildSeedDatabase, BIZ_ID } from "./seed";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const usingSupabase = Boolean(url && anonKey && url.startsWith("http"));
export const DEMO_BUSINESS_ID = BIZ_ID;

type G = typeof globalThis & {
  __vyuhaDb?: LocalDatabase;
  __vyuhaVersion?: Record<string, number>;
  __vyuhaSupabase?: SupabaseClient;
};

const g = globalThis as G;

function localDb(): LocalDatabase {
  if (!g.__vyuhaDb) {
    g.__vyuhaDb = buildSeedDatabase();
    g.__vyuhaVersion = {};
  }
  return g.__vyuhaDb;
}

function bumpVersion(table: string) {
  if (!g.__vyuhaVersion) g.__vyuhaVersion = {};
  g.__vyuhaVersion[table] = (g.__vyuhaVersion[table] ?? 0) + 1;
  g.__vyuhaVersion.__all = (g.__vyuhaVersion.__all ?? 0) + 1;
}

/** Monotonic change counter — demo mode's stand-in for Realtime. */
export function dataVersion(): number {
  localDb();
  return g.__vyuhaVersion?.__all ?? 0;
}

export function getDb(): SupabaseClient | LocalClient {
  if (usingSupabase) {
    if (!g.__vyuhaSupabase) g.__vyuhaSupabase = createClient(url!, anonKey!);
    return g.__vyuhaSupabase;
  }
  return new LocalClient(localDb(), bumpVersion);
}

/** Reset the demo store to the pristine seed (used by the demo-reset action). */
export function resetDemoData() {
  if (usingSupabase) return false;
  g.__vyuhaDb = buildSeedDatabase();
  g.__vyuhaVersion = { __all: (g.__vyuhaVersion?.__all ?? 0) + 1 };
  return true;
}
