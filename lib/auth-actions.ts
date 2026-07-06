"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { usingSupabase, getDb, DEMO_BUSINESS_ID } from "./db";
import { supabaseServer, DEMO_AUTH_COOKIE, DEMO_ROLE_COOKIE } from "./auth";
import type { Role } from "./types";
import { ROLES } from "./types";

const YEAR = 60 * 60 * 24 * 365;

// ---------------------------------------------------------------------------
// Demo mode — role-based sign-in so RBAC is exercisable without real auth
// ---------------------------------------------------------------------------

export async function demoSignIn(role: Role = "owner") {
  const r: Role = ROLES.includes(role) ? role : "owner";
  cookies().set(DEMO_AUTH_COOKIE, "1", { path: "/", maxAge: YEAR, sameSite: "lax" });
  cookies().set(DEMO_ROLE_COOKIE, r, { path: "/", maxAge: YEAR, sameSite: "lax" });
  redirect("/dashboard");
}

export async function switchDemoRole(role: Role) {
  const r: Role = ROLES.includes(role) ? role : "owner";
  cookies().set(DEMO_ROLE_COOKIE, r, { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function signOut() {
  if (usingSupabase) {
    await supabaseServer().auth.signOut();
  } else {
    cookies().delete(DEMO_AUTH_COOKIE);
  }
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Real Supabase auth. These run only when keys are configured; in demo mode
// the forms call demoSignIn instead. Returned strings surface as form errors.
// ---------------------------------------------------------------------------

export async function signInWithPassword(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string } | void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!usingSupabase) {
    // Demo: any credentials sign you in as owner.
    await demoSignIn("owner");
    return;
  }
  const supabase = supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signUp(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string } | void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");

  if (!usingSupabase) {
    // Demo: proceed to onboarding as a fresh owner.
    cookies().set(DEMO_AUTH_COOKIE, "1", { path: "/", maxAge: YEAR, sameSite: "lax" });
    cookies().set(DEMO_ROLE_COOKIE, "owner", { path: "/", maxAge: YEAR, sameSite: "lax" });
    redirect("/onboarding");
  }
  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) return { error: error.message };
  // If email confirmation is on, session is null until verified.
  if (!data.session) redirect("/verify-email");
  redirect("/onboarding");
}

export async function signInWithGoogle(): Promise<{ error: string } | void> {
  if (!usingSupabase) {
    await demoSignIn("owner");
    return;
  }
  const supabase = supabaseServer();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
}

export async function requestPasswordReset(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; sent?: boolean }> {
  const email = String(formData.get("email") ?? "");
  if (!usingSupabase) return { sent: true };
  const supabase = supabaseServer();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  if (error) return { error: error.message };
  return { sent: true };
}

// ---------------------------------------------------------------------------
// Onboarding — create the business + owner profile
// ---------------------------------------------------------------------------

export async function completeOnboarding(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string } | void> {
  const name = String(formData.get("business_name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "Retail");
  const country = String(formData.get("country") ?? "India");
  const currency = String(formData.get("currency") ?? "INR");
  const timezone = String(formData.get("timezone") ?? "Asia/Kolkata");
  if (!name) return { error: "Business name is required." };

  if (!usingSupabase) {
    // Demo mode has a fixed seeded business; onboarding is a walkthrough. Land
    // the user in the app.
    redirect("/dashboard");
  }

  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .insert({ name, industry, country, currency, timezone })
    .select()
    .single();
  if (bizErr) return { error: bizErr.message };

  const { error: userErr } = await supabase.from("users").insert({
    auth_id: user.id,
    business_id: biz.id,
    name: user.user_metadata?.full_name ?? user.email ?? "Owner",
    email: user.email,
    role: "owner",
  });
  if (userErr) return { error: userErr.message };

  redirect("/dashboard");
}

export async function inviteTeamMember(email: string, role: Role) {
  // Real mode: create a pending user row scoped to the inviter's business.
  // (Email delivery would use a server-side service-role client or an edge
  // function; that piece is not wired without keys.)
  if (!usingSupabase) return { ok: true, demo: true };
  const db = getDb();
  const { error } = await db.from("users").insert({
    auth_id: null,
    business_id: DEMO_BUSINESS_ID,
    name: email.split("@")[0],
    email,
    role,
  });
  return { ok: !error, error: error?.message };
}
