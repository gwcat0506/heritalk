"use client";
// 인증 헬퍼 — heritalk main:lib/auth.ts 차용, web/의 @supabase/ssr 클라이언트로 구현.
// 이메일 + 구글/카카오 OAuth. 개인 설정은 Auth user_metadata에 저장.
import { createClient } from "./supabase/client";

function client() {
  const c = createClient();
  if (!c) throw new Error("Supabase가 설정되지 않았어요 (.env.local 확인).");
  return c;
}

const callbackUrl = () => `${window.location.origin}/auth/callback`;

/** 이메일 회원가입 — 닉네임은 user_metadata + users 테이블(있으면)에 반영. */
export async function signUp(email: string, password: string, nickname: string) {
  const supabase = client();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // 확인 메일 링크가 가입한 도메인(로컬=localhost, 배포=vercel)으로 돌아오도록 명시.
    // ※ 해당 /auth/callback이 Supabase Redirect URLs 허용목록에 있어야 함.
    options: { data: { nickname }, emailRedirectTo: callbackUrl() },
  });
  if (error) throw error;
  if (data.user) {
    // 팀 users 테이블에도 반영(RLS로 막히면 조용히 무시).
    await supabase.from("users").upsert({ id: data.user.id, email, nickname });
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const supabase = client();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl() },
  });
  if (error) throw error;
}

export async function signInWithKakao() {
  const supabase = client();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: callbackUrl(), scopes: "profile_nickname" },
  });
  if (error) throw error;
}

export async function signOut() {
  const supabase = client();
  await supabase.auth.signOut();
}

export async function getUser() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** 개인 설정 저장 — Auth user_metadata (스키마 변경 없음). */
export async function updateSettings(settings: Record<string, unknown>) {
  const supabase = client();
  const { error } = await supabase.auth.updateUser({ data: settings });
  if (error) throw error;
}
