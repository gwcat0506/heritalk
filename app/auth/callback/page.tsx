"use client";
// OAuth 콜백 — code 교환 후 세션 확인하고 /mypage(성공) 또는 /auth(실패)로.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      router.replace("/auth");
      return;
    }
    (async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => {});
      }
      const { data } = await supabase.auth.getSession();
      router.replace(data.session ? "/mypage" : "/auth");
    })();
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-navy" />
    </main>
  );
}
