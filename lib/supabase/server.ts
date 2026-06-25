import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 Supabase 클라이언트 (API 라우트·서버 컴포넌트).
 * env 미설정 시 null → 호출측에서 폴백 처리.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: any }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // 서버 컴포넌트에서 set 호출 시 무시(미들웨어가 갱신 담당).
        }
      },
    },
  });
}
