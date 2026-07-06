import { all } from "@/lib/data";
import type { KnowledgeBaseFile } from "@/lib/types";

export interface KnowledgePassage {
  fileId: string;
  fileName: string;
  text: string;
  score: number;
}

// Keyword relevance search over extracted text. When embeddings are available
// (Supabase pgvector), swap this for a vector similarity query — the copilot
// contract (return top passages) stays the same.
export async function searchKnowledge(businessId: string, query: string, limit = 3): Promise<KnowledgePassage[]> {
  const files = await all("knowledge_base_files", businessId);
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (!terms.length) return [];

  const passages: KnowledgePassage[] = [];
  for (const f of files as KnowledgeBaseFile[]) {
    if (!f.extracted_text || f.status !== "ready") continue;
    // split into sentences and score by term hits
    const sentences = f.extracted_text.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      const low = s.toLowerCase();
      let score = 0;
      for (const t of terms) if (low.includes(t)) score += 1;
      if (score > 0) passages.push({ fileId: f.id, fileName: f.name, text: s.trim(), score });
    }
  }
  return passages.sort((a, b) => b.score - a.score).slice(0, limit);
}
