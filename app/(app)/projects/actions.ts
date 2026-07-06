"use server";

import { revalidatePath } from "next/cache";
import { getSession, canWrite } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { byId } from "@/lib/data";
import type { TaskStatus } from "@/lib/types";

export async function moveTask(taskId: string, status: TaskStatus) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "tasks")) return { ok: false, error: "Your role can't change tasks." };
  const db = getDb();
  const { error } = await db.from("tasks").update({ status }).eq("id", taskId).eq("business_id", session.business.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/projects");
  return { ok: true };
}

export async function addComment(taskId: string, body: string) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "tasks")) return { ok: false, error: "Your role can't comment." };
  if (!body.trim()) return { ok: false, error: "Comment is empty." };
  const task = await byId("tasks", session.business.id, taskId);
  if (!task) return { ok: false, error: "Task not found." };
  const comments = [
    ...(task.comments ?? []),
    { user_id: session.user.id, user_name: session.user.name, body: body.trim(), created_at: new Date().toISOString() },
  ];
  const db = getDb();
  await db.from("tasks").update({ comments }).eq("id", taskId).eq("business_id", session.business.id);
  revalidatePath("/projects");
  return { ok: true };
}
