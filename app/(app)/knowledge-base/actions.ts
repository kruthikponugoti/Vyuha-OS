"use server";

import { revalidatePath } from "next/cache";
import { getSession, canWrite } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { searchKnowledge } from "@/lib/queries/knowledge";

// The client reads the picked file and extracts its text before calling this;
// `size` is the file's real byte length. With Supabase Storage configured, the
// original file would also be uploaded and `file_url` set — the copilot search
// contract (extracted_text) is unchanged.
export async function addKnowledgeFile(input: { name: string; text: string; mime?: string; size?: number }) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "knowledge_base_files")) return { ok: false, error: "Your role can't add documents." };
  if (!input.name.trim() || !input.text.trim()) return { ok: false, error: "Name and content are required." };
  const db = getDb();
  const { error } = await db.from("knowledge_base_files").insert({
    business_id: session.business.id,
    name: input.name.trim(),
    file_url: null,
    mime_type: input.mime ?? "text/plain",
    size_bytes: input.size && input.size > 0 ? input.size : input.text.length,
    extracted_text: input.text.trim(),
    status: "ready",
  });
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({
    business_id: session.business.id, user_id: session.user.id, user_name: session.user.name,
    action: "uploaded", entity_type: "knowledge_base_files", entity_id: null, detail: `Added knowledge document ${input.name}`,
  });
  revalidatePath("/knowledge-base");
  return { ok: true };
}

export async function askKnowledge(query: string) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in.", passages: [] };
  const passages = await searchKnowledge(session.business.id, query, 3);
  if (!passages.length) return { ok: true, answer: null, passages: [] };
  return {
    ok: true,
    answer: passages.map((p) => p.text).join(" "),
    sources: [...new Set(passages.map((p) => p.fileName))],
    passages,
  };
}
