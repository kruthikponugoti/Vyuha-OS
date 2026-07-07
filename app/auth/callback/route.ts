// OAuth / email-link callback. Exchanges the code for a session, then routes
// the user to onboarding (no profile yet) or the dashboard.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/auth";
import { usingSupabase } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!usingSupabase || !code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  let dest = next;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!profile) dest = "/onboarding";
  }

  // Real sign-in wins over any lingering demo session.
  const res = NextResponse.redirect(`${origin}${dest}`);
  res.cookies.delete("vyuha-demo-auth");
  return res;
}
