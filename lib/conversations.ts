"use client";
// 도슨트 대화 영속 — 브라우저 Supabase(RLS). 로그인 사용자만(비로그인은 휘발).
// agent_sessions(세션) + messages(메시지). user_id = 현재 uid 로 기록해 RLS 충족.
import { createClient } from "./supabase/client";
import type { Citation, DocentMessage } from "./types";

export interface SessionRow {
  id: string;
  title: string | null;
  mode: string | null; // 'place' | 'general'
  place_id: string | null;
  updated_at: string;
}

/** 현재 로그인 사용자 id(없으면 null). */
export async function getUserId(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** 내 대화 세션 목록(최근순). */
export async function listSessions(): Promise<SessionRow[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("agent_sessions")
    .select("id, title, mode, place_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return (data ?? []) as SessionRow[];
}

/** 단일 세션 메타(딥링크 이어보기용). */
export async function getSession(id: string): Promise<SessionRow | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("agent_sessions")
    .select("id, title, mode, place_id, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as SessionRow;
}

/** 세션 생성 후 id 반환. title은 거점명 또는 첫 질문 일부. */
export async function createSession(opts: {
  mode: "place" | "general";
  placeId?: string;
  title: string;
}): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("agent_sessions")
    .insert({
      user_id: userId,
      mode: opts.mode,
      place_id: opts.placeId ?? null,
      title: opts.title.slice(0, 80),
    })
    .select("id")
    .single();
  if (error) return null;
  return data.id as string;
}

/** 세션 삭제 — 메시지 먼저 지우고 세션 제거(RLS로 본인 것만). */
export async function deleteSession(id: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("messages").delete().eq("session_id", id);
  await supabase.from("agent_sessions").delete().eq("id", id);
}

/** 세션의 메시지 전체(시간순) → DocentMessage[]. */
export async function loadMessages(sessionId: string): Promise<DocentMessage[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, citations")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content as string,
    citations: (m.citations ?? []) as Citation[],
  }));
}

/** 메시지 저장 + 세션 updated_at 갱신. */
export async function saveMessage(opts: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from("messages").insert({
    session_id: opts.sessionId,
    user_id: userId,
    role: opts.role,
    content: opts.content,
    citations: opts.citations ?? [],
  });
  await supabase
    .from("agent_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", opts.sessionId);
}
