"use client";
// 생성한 투어 영속 — 팀 saved_courses/saved_course_items(브라우저 Supabase·RLS, 로그인).
// story(text)에 TourData 전체를 JSON으로 저장 → 재생 시 Gemini 재호출 없이 즉시 복원.
import { createClient } from "./supabase/client";
import type { TourData } from "./tour/route";

export interface SavedTourRow {
  id: string;
  title: string | null;
  mode: string | null; // 난이도(level)
  total_distance: number | null;
  total_time: number | null;
  created_at: string;
}

async function uid(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** 투어 저장 → saved_courses(kind='tour', story=JSON) + items. 반환=id(비로그인 null). */
export async function saveTour(tour: TourData, level: string): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const userId = await uid();
  if (!userId) return null;

  const title = `${tour.stops[0]?.name ?? "투어"} 외 ${Math.max(0, tour.stops.length - 1)}곳`;
  const { data, error } = await supabase
    .from("saved_courses")
    .insert({
      user_id: userId,
      title,
      kind: "tour",
      mode: level,
      total_distance: tour.totalDistance,
      total_time: tour.totalMinutes * 60,
      story: JSON.stringify(tour),
    })
    .select("id")
    .single();
  if (error) return null;
  const courseId = data.id as string;

  const items = tour.stops.map((s, i) => ({
    course_id: courseId,
    ord: i,
    place_id: s.id,
    docent_script: JSON.stringify(s.segments),
  }));
  await supabase.from("saved_course_items").insert(items);
  return courseId;
}

/** 내 저장 투어 목록(최근순). */
export async function listSavedTours(): Promise<SavedTourRow[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const userId = await uid();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("saved_courses")
    .select("id, title, mode, total_distance, total_time, created_at")
    .eq("user_id", userId)
    .eq("kind", "tour")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as SavedTourRow[];
}

/** 저장 투어 1건 복원(story JSON → TourData). */
export async function getSavedTour(id: string): Promise<TourData | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("saved_courses")
    .select("story")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.story) return null;
  try {
    return JSON.parse(data.story as string) as TourData;
  } catch {
    return null;
  }
}

/** 저장 투어 삭제(items는 ON DELETE CASCADE). */
export async function deleteSavedTour(id: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("saved_courses").delete().eq("id", id);
}
