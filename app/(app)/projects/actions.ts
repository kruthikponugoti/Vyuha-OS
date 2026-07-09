"use server";

import { revalidatePath } from "next/cache";
import { getSession, canWrite } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { byId } from "@/lib/data";
import type { TaskStatus, TaskAttachment } from "@/lib/types";

// Files up to this size are inlined as data URLs (so they're downloadable in
// demo mode without object storage); larger files store metadata only.
const INLINE_LIMIT = 512 * 1024;

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

export async function addAttachment(
  taskId: string,
  file: { name: string; size: number; type: string; data_url: string | null },
) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "tasks")) return { ok: false, error: "Your role can't attach files." };
  if (!file.name.trim()) return { ok: false, error: "No file selected." };
  const task = await byId("tasks", session.business.id, taskId);
  if (!task) return { ok: false, error: "Task not found." };

  const attachment: TaskAttachment = {
    name: file.name.trim(),
    size: file.size,
    type: file.type || "application/octet-stream",
    data_url: file.size <= INLINE_LIMIT ? file.data_url : null,
    uploaded_by: session.user.name,
    created_at: new Date().toISOString(),
  };
  const attachments = [...(task.attachments ?? []), attachment];
  const db = getDb();
  await db.from("tasks").update({ attachments }).eq("id", taskId).eq("business_id", session.business.id);
  await db.from("audit_logs").insert({
    business_id: session.business.id, user_id: session.user.id, user_name: session.user.name,
    action: "attached", entity_type: "task", entity_id: taskId, detail: `Attached ${attachment.name} to a task`,
  });
  revalidatePath("/projects");
  return { ok: true };
}
