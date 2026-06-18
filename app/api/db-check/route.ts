// 저장 검증(임시) — 테이블 행 수 + 4대 요소(장소·도슨트·루트·개인) 실삽입→read-back→정리.
// service-role 사용(RLS 우회). 운영 배포 전 제거 권장.
import { NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const TABLES = [
  "users",
  "places",
  "visits",
  "bookmarks",
  "agent_sessions",
  "messages",
  "saved_courses",
  "saved_course_items",
  "heritage_docs",
];

type DomainResult = { ok: boolean; detail?: unknown; error?: string };

export async function GET() {
  const admin = createAdmin();
  if (!admin)
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY/URL 미설정" },
      { status: 500 }
    );

  // 테이블별 행 수
  const counts: Record<string, number | string> = {};
  for (const t of TABLES) {
    const { count, error } = await admin
      .from(t)
      .select("*", { count: "exact", head: true });
    counts[t] = error ? `ERR: ${error.message}` : count ?? 0;
  }

  // FK 충족용 기존 user id 1개
  const { data: anyUser } = await admin.from("users").select("id").limit(1).maybeSingle();
  const userId: string | null = anyUser?.id ?? null;

  const results: Record<string, DomainResult> = {};
  results.place = await checkPlace(admin);
  results.docent = userId
    ? await checkDocent(admin, userId)
    : { ok: false, error: "users 비어있음(FK 불가)" };
  results.course = userId
    ? await checkCourse(admin, userId)
    : { ok: false, error: "users 비어있음(FK 불가)" };
  results.personal = { ok: !!userId, detail: { users_count: counts.users } };

  const allOk = Object.values(results).every((r) => r.ok);
  return NextResponse.json({ allOk, counts, results });
}

async function checkPlace(admin: SupabaseClient): Promise<DomainResult> {
  const row = { id: "test_db_check", kdcd: "00", asno: "0", name: "DB체크 장소", lat: 0, lng: 0 };
  const up = await admin.from("places").upsert(row);
  if (up.error) return { ok: false, error: up.error.message };
  const { data } = await admin.from("places").select("id,name").eq("id", row.id).maybeSingle();
  await admin.from("places").delete().eq("id", row.id);
  return { ok: !!data, detail: data };
}

async function checkDocent(admin: SupabaseClient, userId: string): Promise<DomainResult> {
  const s = await admin
    .from("agent_sessions")
    .insert({ user_id: userId, place_id: null, mode: "general" })
    .select("id")
    .single();
  if (s.error) return { ok: false, error: `session: ${s.error.message}` };
  const sessionId = s.data.id;
  const m = await admin.from("messages").insert([
    { session_id: sessionId, user_id: userId, role: "user", content: "테스트 질문" },
    { session_id: sessionId, user_id: userId, role: "assistant", content: "테스트 답변", citations: [] },
  ]);
  const { count } = await admin
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);
  await admin.from("agent_sessions").delete().eq("id", sessionId); // cascade로 messages 정리
  if (m.error) return { ok: false, error: `messages: ${m.error.message}` };
  return { ok: count === 2, detail: { sessionId, messages: count } };
}

async function checkCourse(admin: SupabaseClient, userId: string): Promise<DomainResult> {
  const c = await admin
    .from("saved_courses")
    .insert({
      user_id: userId,
      title: "DB체크 코스",
      kind: "theme",
      mode: "joseon",
      total_distance: 1234,
      total_time: 1800,
      story: "테스트 스토리",
    })
    .select("id")
    .single();
  if (c.error) return { ok: false, error: `course: ${c.error.message}` };
  const courseId = c.data.id;
  const it = await admin.from("saved_course_items").insert({
    course_id: courseId,
    ord: 0,
    place_id: "13_0001170000000",
    docent_script: "테스트 도슨트 스크립트",
    transition_script: null,
  });
  const { data } = await admin
    .from("saved_courses")
    .select("id,kind,total_distance,story")
    .eq("id", courseId)
    .maybeSingle();
  await admin.from("saved_courses").delete().eq("id", courseId); // cascade로 items 정리
  if (it.error) return { ok: false, error: `items: ${it.error.message}` };
  return { ok: !!data, detail: data };
}
