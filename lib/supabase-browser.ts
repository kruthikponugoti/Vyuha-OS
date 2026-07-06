"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser client when configured; null in demo mode (components then poll).
export const supabaseBrowser =
  url && anonKey && url.startsWith("http") ? createBrowserClient(url, anonKey) : null;
