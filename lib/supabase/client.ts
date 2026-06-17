"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저 Supabase 클라이언트 (사용자 데이터: 저장 코스·대화).
 * 데모 인증 = 익명 로그인. env 미설정 시 null을 반환해 로컬 폴백을 허용한다.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

/** 익명 세션 보장 — 저장 코스 RLS(auth.uid())를 충족시키기 위해. */
export async function ensureAnonSession() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: signed } = await supabase.auth.signInAnonymously();
  return signed.session ?? null;
}
