// 사료 RAG 검색 — pgvector RPC search_passages(query_embedding, match_count) 호출.
// Supabase/임베딩 미설정 시 빈 결과 → 도슨트는 거점 요약만으로 폴백.
import { createClient } from "./supabase/server";
import { embed } from "./gemini";
import type { Citation } from "./types";

export interface RetrievedPassage {
  passageId: string;
  content: string;
  sourceTitle: string;
  sourceRef: string | null;
  similarity: number;
}

export async function searchPassages(
  question: string,
  placeId?: string,
  k = 4
): Promise<RetrievedPassage[]> {
  // 임베딩/RPC가 없거나 실패해도 도슨트는 일반 답변으로 진행되도록 전부 안전 처리.
  try {
    const supabase = await createClient();
    if (!supabase) return [];
    const queryEmbedding = await embed(question);
    if (!queryEmbedding) return [];

    const { data, error } = await supabase.rpc("search_passages", {
      query_embedding: queryEmbedding,
      match_count: k,
      filter_place_id: placeId ?? null,
    });
    if (error || !data) return [];

    return (data as any[]).map((r) => ({
      passageId: String(r.id),
      content: r.content,
      sourceTitle: r.source_title ?? "사료",
      sourceRef: r.source_ref ?? null,
      similarity: r.similarity ?? 0,
    }));
  } catch {
    return [];
  }
}

export function toCitations(passages: RetrievedPassage[]): Citation[] {
  return passages.map((p) => ({
    passageId: p.passageId,
    sourceTitle: p.sourceTitle,
    sourceRef: p.sourceRef,
    snippet: p.content.slice(0, 120),
  }));
}
