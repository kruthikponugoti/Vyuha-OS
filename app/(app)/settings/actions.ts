"use server";

import { revalidatePath } from "next/cache";
import { getSession, canWrite } from "@/lib/auth";
import { getDb, isDemoRequest } from "@/lib/db";
import { createStaffAccount } from "@/lib/auth-actions";
import { supabaseAdmin, adminConfigured } from "@/lib/supabase-admin";
import type { Role, User } from "@/lib/types";

export async function updateBusiness(patch: {
  name?: string; industry?: string; country?: string; currency?: string; timezone?: string;
}) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!["owner", "admin"].includes(session.user.role)) return { ok: false, error: "Only an owner or admin can change business settings." };
  const db = getDb();
  const { error } = await db.from("businesses").update(patch).eq("id", session.business.id);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({
    business_id: session.business.id, user_id: session.user.id, user_name: session.user.name,
    action: "updated", entity_type: "settings", entity_id: null, detail: "Updated business settings",
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addStaffMember(input: { name: string; email: string; role: Role; method: "temp" | "invite" }) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "team")) return { ok: false, error: "Only an owner or admin can add staff." };
  const res = await createStaffAccount(input);
  if (!res.ok) return res;
  const db = getDb();
  await db.from("audit_logs").insert({
    business_id: session.business.id, user_id: session.user.id, user_name: session.user.name,
    action: "created account", entity_type: "user", entity_id: null,
    detail: `Created ${input.role} account for ${input.email} (${input.method === "invite" ? "invite email" : "temp password"})`,
  });
  revalidatePath("/settings");
  return res;
}

async function targetMember(businessId: string, userId: string): Promise<User | null> {
  const db = getDb();
  const { data } = await db.from("users").select("*").eq("id", userId).eq("business_id", businessId).maybeSingle();
  return (data as User) ?? null;
}

export async function updateMemberRole(userId: string, role: Role) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "team")) return { ok: false, error: "Only an owner or admin can change roles." };
  if (role === "owner") return { ok: false, error: "There can only be one owner." };
  const target = await targetMember(session.business.id, userId);
  if (!target) return { ok: false, error: "Member not found." };
  if (target.role === "owner") return { ok: false, error: "The owner's role can't be changed." };
  if (target.id === session.user.id) return { ok: false, error: "You can't change your own role." };

  const db = getDb();
  const { error } = await db.from("users").update({ role }).eq("id", userId).eq("business_id", session.business.id);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({
    business_id: session.business.id, user_id: session.user.id, user_name: session.user.name,
    action: "changed role", entity_type: "user", entity_id: userId, detail: `Changed ${target.name}'s role to ${role}`,
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function setMemberActive(userId: string, active: boolean) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "team")) return { ok: false, error: "Only an owner or admin can deactivate accounts." };
  const target = await targetMember(session.business.id, userId);
  if (!target) return { ok: false, error: "Member not found." };
  if (target.role === "owner") return { ok: false, error: "The owner account can't be deactivated." };
  if (target.id === session.user.id) return { ok: false, error: "You can't deactivate your own account." };

  const db = getDb();
  const { error } = await db.from("users").update({ active }).eq("id", userId).eq("business_id", session.business.id);
  if (error) return { ok: false, error: error.message };
  // Real mode: ban/unban the auth account so the change is enforced immediately.
  if (!isDemoRequest() && adminConfigured && target.auth_id) {
    await supabaseAdmin().auth.admin.updateUserById(target.auth_id, {
      ban_duration: active ? "none" : "876000h",
    }).catch(() => {});
  }
  await db.from("audit_logs").insert({
    business_id: session.business.id, user_id: session.user.id, user_name: session.user.name,
    action: active ? "reactivated" : "deactivated", entity_type: "user", entity_id: userId,
    detail: `${active ? "Reactivated" : "Deactivated"} ${target.name}`,
  });
  revalidatePath("/settings");
  return { ok: true };
}
