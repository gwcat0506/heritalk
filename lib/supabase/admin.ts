import { createClient } from "@supabase/supabase-js";

/**
 * 서비스-롤 Supabase 클라이언트 (서버 전용 · RLS 우회).
 * 장소 캐시(places) upsert·운영 검증 등 신뢰된 서버 쓰기에만 사용.
 * 절대 클라이언트로 노출 금지(SUPABASE_SERVICE_ROLE_KEY).
 */
export function createAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
