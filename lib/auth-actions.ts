"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { usingSupabase, isDemoRequest, getDb, DEMO_BUSINESS_ID } from "./db";
import { supabaseServer, DEMO_AUTH_COOKIE, DEMO_ROLE_COOKIE } from "./auth";
import { supabaseAdmin, adminConfigured } from "./supabase-admin";
import type { Role } from "./types";
import { ROLES } from "./types";

const YEAR = 60 * 60 * 24 * 365;

// Resolve the public origin for OAuth/redirect links. Prefers an explicit
// NEXT_PUBLIC_SITE_URL, then the Vercel deployment URL, then localhost in dev.
function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

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
  // Server-side enforcement: role switching is a DEMO-ONLY affordance. A real
  // authenticated session must never be able to change its own role this way.
  if (!isDemoRequest()) return { ok: false, error: "Role is fixed by your administrator." };
  const r: Role = ROLES.includes(role) ? role : "owner";
  cookies().set(DEMO_ROLE_COOKIE, r, { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Clears every server-side trace of the session — both demo cookies and the
 * real Supabase session. Does NOT redirect: the client sign-out flow also
 * clears client storage and then hard-navigates, guaranteeing no cached
 * identity/role survives into the next login.
 */
export async function signOut() {
  cookies().delete(DEMO_AUTH_COOKIE);
  cookies().delete(DEMO_ROLE_COOKIE);
  try {
    await supabaseServer().auth.signOut();
  } catch {
    // no real session — that's fine
  }
  revalidatePath("/", "layout");
  return { ok: true };
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
  // Leave no demo session behind, and bust the client router cache so the
  // previous user's server-rendered content can't be reused.
  cookies().delete(DEMO_AUTH_COOKIE);
  cookies().delete(DEMO_ROLE_COOKIE);
  revalidatePath("/", "layout");
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
  if (error) {
    let msg = error.message;
    if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("email link")) {
      msg = "Email confirmation rate limit exceeded. To bypass this requirement and sign up instantly, disable 'Confirm email' in your Supabase Auth Providers Settings (Authentication -> Providers -> Email -> toggle off 'Confirm email').";
    }
    return { error: msg };
  }
  cookies().delete(DEMO_AUTH_COOKIE);
  cookies().delete(DEMO_ROLE_COOKIE);
  revalidatePath("/", "layout");
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
  const origin = siteUrl();
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
  const origin = siteUrl();
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

// A readable but strong temporary password to hand over.
function makeTempPassword() {
  const words = ["Vyuha", "Swift", "Bright", "Nova", "Prime", "Bold", "Zen", "Peak"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  const sym = "!@#$%&".charAt(Math.floor(Math.random() * 6));
  return `${w}-${n}${sym}`;
}

export interface StaffResult {
  ok: boolean;
  error?: string;
  tempPassword?: string;
  invited?: boolean;
  demo?: boolean;
}

/**
 * Owner/Admin-only staff provisioning. Two paths:
 *  - "temp":   creates the auth account with a temporary password (returned to
 *              copy), forcing a password change on first login.
 *  - "invite": emails a set-password link (needs SMTP configured in Supabase).
 * Demo mode simulates the account so the flow is exercisable without real auth.
 */
export async function createStaffAccount(input: {
  name: string;
  email: string;
  role: Role;
  method: "temp" | "invite";
}): Promise<StaffResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || email.split("@")[0];
  const role = input.role;
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email address." };
  if (!ROLES.includes(role)) return { ok: false, error: "Pick a valid role." };
  if (role === "owner") return { ok: false, error: "Owner is reserved for the business creator — pick another role." };

  // Demo: simulate a provisioned profile so the flow is testable without auth.
  if (isDemoRequest()) {
    const db = getDb();
    const { error } = await db.from("users").insert({
      auth_id: null, business_id: DEMO_BUSINESS_ID, name, email, role,
      active: true, must_change_password: true,
    });
    if (error) return { ok: false, error: error.message };
    return {
      ok: true, demo: true,
      tempPassword: input.method === "temp" ? makeTempPassword() : undefined,
      invited: input.method === "invite",
    };
  }

  // Real: resolve the caller + their business, then provision via the admin API.
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: profile } = await supabase
    .from("users").select("business_id, role").eq("auth_id", user.id).maybeSingle();
  if (!profile) return { ok: false, error: "No profile found for your account." };
  if (!["owner", "admin"].includes(profile.role)) return { ok: false, error: "Only an owner or admin can add staff." };

  if (!adminConfigured) {
    return { ok: false, error: "Staff accounts need the SUPABASE_SERVICE_ROLE_KEY server environment variable. Add it in your host, then try again." };
  }
  const admin = supabaseAdmin();

  let authId: string;
  let tempPassword: string | undefined;
  if (input.method === "invite") {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl()}/reset-password`,
      data: { full_name: name },
    });
    if (error) return { ok: false, error: error.message };
    authId = data.user.id;
  } else {
    tempPassword = makeTempPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email, password: tempPassword, email_confirm: true, user_metadata: { full_name: name },
    });
    if (error) return { ok: false, error: error.message };
    authId = data.user.id;
  }

  const { error: insErr } = await admin.from("users").insert({
    auth_id: authId, business_id: profile.business_id, name, email, role,
    active: true, must_change_password: true,
  });
  if (insErr) {
    await admin.auth.admin.deleteUser(authId).catch(() => {}); // don't orphan the auth user
    return { ok: false, error: insErr.message };
  }
  return { ok: true, tempPassword, invited: input.method === "invite" };
}

/**
 * Sets a new password for the signed-in user and clears the forced-change flag.
 * Used by the first-login change-password gate.
 */
export async function setNewPassword(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string } | void> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  if (isDemoRequest()) redirect("/dashboard"); // demo has no real credential to change

  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  // Clear the forced-change flag (needs admin — the user can't write their own row).
  if (adminConfigured) {
    await supabaseAdmin().from("users").update({ must_change_password: false }).eq("auth_id", user.id);
  }
  redirect("/dashboard");
}
