"use client";
// 마이 — 로그인/회원가입 연결 + 개인 설정(user_metadata 저장).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser, signOut, updateSettings } from "@/lib/auth";
import { PrimaryButton } from "@/components/ui";
import type { User } from "@supabase/supabase-js";

const LEVELS = [
  { id: "child", label: "어린이" },
  { id: "general", label: "일반" },
  { id: "expert", label: "심화" },
];
const LANGS = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
];
const INTERESTS = ["조선", "고려", "불교문화", "건축", "인물", "전쟁사", "근현대", "왕실"];

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [nickname, setNickname] = useState("");
  const [language, setLanguage] = useState("ko");
  const [level, setLevel] = useState("general");
  const [interests, setInterests] = useState<string[]>([]);
  const [largeText, setLargeText] = useState(false);
  const [wheelchair, setWheelchair] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getUser().then((u) => {
      setUser(u);
      if (u) {
        const m = (u.user_metadata ?? {}) as Record<string, unknown>;
        setNickname((m.nickname as string) ?? u.email?.split("@")[0] ?? "");
        setLanguage((m.language as string) ?? "ko");
        setLevel((m.defaultLevel as string) ?? "general");
        setInterests((m.interests as string[]) ?? []);
        setLargeText(!!m.largeText);
        setWheelchair(!!m.wheelchair);
      }
      setLoading(false);
    });
  }, []);

  function toggleInterest(tag: string) {
    setInterests((arr) => (arr.includes(tag) ? arr.filter((t) => t !== tag) : [...arr, tag]));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      await updateSettings({ nickname, language, defaultLevel: level, interests, largeText, wheelchair });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await signOut();
    setUser(null);
    router.push("/");
  }

  if (loading)
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-navy" />
      </main>
    );

  // 비로그인
  if (!user)
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-8">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-ai/15 text-2xl">🧑‍🦰</div>
        <div className="text-center">
          <p className="mb-1 font-semibold text-neutral-900">로그인이 필요해요</p>
          <p className="text-sm text-neutral-400">방문 기록·취향 설정을 저장하려면 로그인하세요</p>
        </div>
        <div className="w-full max-w-xs">
          <PrimaryButton onClick={() => router.push("/auth")}>로그인 / 회원가입</PrimaryButton>
        </div>
      </main>
    );

  return (
    <main className="px-4 pt-6 pb-4">
      <h1 className="mb-4 text-2xl font-bold text-navy">마이</h1>

      {/* 프로필 헤더 */}
      <div className="card mb-5 flex items-center gap-4 p-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-ai/15 text-xl font-bold text-ai">
          {(nickname || "?")[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-neutral-900">{nickname || "사용자"}</p>
          <p className="truncate text-xs text-neutral-400">{user.email}</p>
        </div>
        <button onClick={logout} className="pressable text-sm text-neutral-400">
          로그아웃
        </button>
      </div>

      {/* 바로가기 */}
      <Link
        href="/docent"
        className="card pressable mb-5 flex items-center gap-3 p-4 text-sm"
      >
        <span className="text-lg">🧑‍🏫</span>
        <span className="flex-1 font-medium text-neutral-800">도슨트 대화 기록</span>
        <span className="text-neutral-300">›</span>
      </Link>

      {/* 설정 */}
      <section className="space-y-5">
        <Field label="닉네임">
          <input
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setSaved(false);
            }}
            className="w-full rounded-card border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-navy"
          />
        </Field>

        <Field label="언어">
          <Segmented
            options={LANGS}
            value={language}
            onChange={(v) => {
              setLanguage(v);
              setSaved(false);
            }}
          />
        </Field>

        <Field label="도슨트 기본 난이도">
          <Segmented
            options={LEVELS}
            value={level}
            onChange={(v) => {
              setLevel(v);
              setSaved(false);
            }}
          />
        </Field>

        <Field label="관심사">
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((tag) => {
              const on = interests.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleInterest(tag)}
                  className={`chip pressable ${on ? "bg-navy text-white" : "bg-black/5 text-neutral-600"}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="접근성">
          <div className="space-y-2">
            <Toggle label="큰 글씨" on={largeText} onChange={(v) => { setLargeText(v); setSaved(false); }} />
            <Toggle label="휠체어 코스 우선" on={wheelchair} onChange={(v) => { setWheelchair(v); setSaved(false); }} />
          </div>
        </Field>

        <div>
          <PrimaryButton onClick={save} disabled={busy}>
            {busy ? "저장 중…" : saved ? "저장됨 ✓" : "설정 저장"}
          </PrimaryButton>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      {children}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`pressable flex-1 rounded-card border py-2.5 text-sm font-medium transition-all ${
            value === o.id ? "border-navy bg-navy text-white" : "border-neutral-200 bg-white text-neutral-600"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="card pressable flex w-full items-center justify-between p-3.5 text-sm"
    >
      <span className="text-neutral-700">{label}</span>
      <span
        className={`relative h-6 w-10 rounded-full transition-colors ${on ? "bg-navy" : "bg-neutral-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            on ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
