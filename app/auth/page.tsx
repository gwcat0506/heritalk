"use client";
// 로그인 / 회원가입 — 이메일 + 구글 + 카카오. (heritalk main 차용 + web/ 디자인)
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, signInWithGoogle, signInWithKakao } from "@/lib/auth";
import { PrimaryButton, Wordmark } from "@/components/ui";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        router.push("/mypage");
      } else {
        const data = await signUp(email, password, nickname || email.split("@")[0]);
        if (data.session) router.push("/mypage");
        else setNotice("확인 메일을 보냈어요. 메일의 링크로 인증한 뒤 로그인해주세요.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function social(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "소셜 로그인 오류");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <header className="mb-8 text-center">
        <div className="flex justify-center">
          <Wordmark size="lg" />
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          박물관·유적을 잇는 도보 역사 AI 가이드
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          {mode === "login" ? "다시 오신 걸 환영해요" : "함께 걸어볼까요?"}
        </p>
      </header>

      {/* 소셜 */}
      <div className="space-y-2">
        <button
          onClick={() => social(signInWithGoogle)}
          className="pressable flex w-full items-center justify-center gap-2 rounded-card border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700"
        >
          <GoogleIcon /> 구글로 계속하기
        </button>
        <button
          onClick={() => social(signInWithKakao)}
          className="pressable flex w-full items-center justify-center gap-2 rounded-card py-3 text-sm font-medium text-[#191600]"
          style={{ backgroundColor: "#FEE500" }}
        >
          <KakaoIcon /> 카카오로 계속하기
        </button>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
        <div className="h-px flex-1 bg-neutral-200" />
        또는 이메일
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      {/* 이메일 폼 */}
      <form onSubmit={submit} className="space-y-2.5">
        {mode === "signup" && (
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임"
            className="w-full rounded-card border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-navy"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          className="w-full rounded-card border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-navy"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (6자 이상)"
          className="w-full rounded-card border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-navy"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {notice && <p className="text-xs text-ai">{notice}</p>}
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "처리 중…" : mode === "login" ? "로그인" : "회원가입"}
        </PrimaryButton>
      </form>

      <button
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
          setNotice(null);
        }}
        className="pressable mt-5 text-center text-sm text-neutral-500"
      >
        {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
      </button>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="#191600">
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.94 5.33 4.86 6.73-.21.77-.78 2.85-.9 3.3-.14.55.2.55.43.4.18-.12 2.86-1.94 4.02-2.73.52.07 1.05.1 1.59.1 5.52 0 10-3.58 10-8C22 6.58 17.52 3 12 3z" />
    </svg>
  );
}
