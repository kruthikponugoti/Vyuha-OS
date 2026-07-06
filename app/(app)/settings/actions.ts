"use server";

import { revalidatePath } from "next/cache";
import { getSession, canWrite } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { inviteTeamMember } from "@/lib/auth-actions";
import type { Role } from "@/lib/types";

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

export async function inviteMember(email: string, role: Role) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "team")) return { ok: false, error: "Only an owner or admin can invite team members." };
  const res = await inviteTeamMember(email, role);
  if (!res.ok) return { ok: false, error: res.error ?? "Invite failed." };
  const db = getDb();
  await db.from("audit_logs").insert({
    business_id: session.business.id, user_id: session.user.id, user_name: session.user.name,
    action: "invited", entity_type: "user", entity_id: null, detail: `Invited ${email} as ${role}`,
  });
  revalidatePath("/settings");
  return { ok: true, demo: res.demo };
}

export async function updateMemberRole(userId: string, role: Role) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "team")) return { ok: false, error: "Only an owner or admin can change roles." };
  const db = getDb();
  const { error } = await db.from("users").update({ role }).eq("id", userId).eq("business_id", session.business.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
