"use client";
// 장소 즐겨찾기 — 팀 bookmarks 테이블(브라우저 Supabase). 로그인 사용자만(비로그인 graceful).
// 컬럼: { id, user_id, heritage_id(text, KHS형), heritage_name, created_at }
import { createClient } from "./supabase/client";

export interface BookmarkRow {
  heritage_id: string;
  heritage_name: string | null;
  created_at: string;
}

async function uid(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** 내 즐겨찾기 목록(최근순). */
export async function listBookmarks(): Promise<BookmarkRow[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const userId = await uid();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("bookmarks")
    .select("heritage_id, heritage_name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as BookmarkRow[];
}

/** 해당 거점이 내 즐겨찾기인지. */
export async function isBookmarked(heritageId: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const userId = await uid();
  if (!userId) return false;
  const { data } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("heritage_id", heritageId)
    .maybeSingle();
  return !!data;
}

/** 토글 — 있으면 해제, 없으면 추가. 반환=토글 후 즐겨찾기 여부. 비로그인이면 null. */
export async function toggleBookmark(opts: {
  heritageId: string;
  heritageName: string;
}): Promise<boolean | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const userId = await uid();
  if (!userId) return null;

  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("heritage_id", opts.heritageId)
    .maybeSingle();

  if (existing) {
    await supabase.from("bookmarks").delete().eq("id", existing.id);
    return false;
  }
  await supabase.from("bookmarks").insert({
    user_id: userId,
    heritage_id: opts.heritageId,
    heritage_name: opts.heritageName,
  });
  return true;
}
