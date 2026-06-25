"use client";
// 마이 — 프로필 + 환경설정(언어·난이도·관심사·접근성) + 계정(인증·비번변경·로그아웃).
// 설정 저장: nickname/level/interests = 저장 버튼, language/largeText = 즉시 적용(LocaleProvider).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getUser,
  signOut,
  updateSettings,
  changePassword,
  resendVerification,
} from "@/lib/auth";
import { PrimaryButton, EmptyState } from "@/components/ui";
import { useT, useLocale, usePrefs } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/dict";
import {
  UserCircle,
  MessagesSquare,
  ChevronRight,
  Check,
  BadgeCheck,
  MailWarning,
  KeyRound,
  LogOut,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const INTERESTS = ["조선", "고려", "불교문화", "건축", "인물", "전쟁사", "근현대", "왕실"];
const LANGS: { id: Locale; label: string }[] = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
];

export default function MyPage() {
  const router = useRouter();
  const t = useT();
  const { locale, setLocale } = useLocale();
  const { largeText, setLargeText } = usePrefs();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [nickname, setNickname] = useState("");
  const [level, setLevel] = useState("general");
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // 계정
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    getUser().then((u) => {
      setUser(u);
      if (u) {
        const m = (u.user_metadata ?? {}) as Record<string, unknown>;
        setNickname((m.nickname as string) ?? u.email?.split("@")[0] ?? "");
        setLevel((m.defaultLevel as string) ?? "general");
        setInterests((m.interests as string[]) ?? []);
      }
      setLoading(false);
    });
  }, []);

  function toggleInterest(tag: string) {
    setInterests((arr) => (arr.includes(tag) ? arr.filter((x) => x !== tag) : [...arr, tag]));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      await updateSettings({ nickname, defaultLevel: level, interests });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  async function changePw() {
    if (newPw.length < 6 || pwBusy) return;
    setPwBusy(true);
    setPwMsg(null);
    try {
      await changePassword(newPw);
      setNewPw("");
      setPwMsg(t("my.account.pwChanged"));
    } catch (e) {
      setPwMsg(e instanceof Error ? e.message : t("auth.error"));
    } finally {
      setPwBusy(false);
    }
  }

  async function resend() {
    if (!user?.email) return;
    try {
      await resendVerification(user.email);
      setResendMsg(t("my.account.resent"));
    } catch {
      setResendMsg(t("auth.error"));
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
      <main className="px-4 pt-6">
        <h1 className="mb-3 text-2xl font-bold text-navy">{t("my.title")}</h1>
        <div className="card">
          <EmptyState
            icon={<UserCircle className="h-8 w-8" strokeWidth={1.6} aria-hidden />}
            title={t("my.needLogin.title")}
            description={t("my.needLogin.desc")}
            action={{ label: t("my.needLogin.cta"), href: "/auth" }}
          />
        </div>
      </main>
    );

  const verified = !!user.email_confirmed_at;
  const providers =
    (user.app_metadata?.providers as string[] | undefined) ??
    (user.app_metadata?.provider ? [user.app_metadata.provider as string] : []);
  const isEmailUser = providers.includes("email");

  return (
    <main className="space-y-5 px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-navy">{t("my.title")}</h1>

      {/* 프로필 */}
      <div className="card flex items-center gap-4 p-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-ai/15 text-xl font-bold text-ai">
          {(nickname || "?")[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-neutral-900">{nickname || "—"}</p>
          <p className="truncate text-xs text-neutral-400">{user.email}</p>
        </div>
        {verified ? (
          <span className="chip bg-green-50 text-green-600">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            {t("my.account.verified")}
          </span>
        ) : (
          <span className="chip bg-amber-50 text-amber-600">
            <MailWarning className="h-3.5 w-3.5" aria-hidden />
            {t("my.account.unverified")}
          </span>
        )}
      </div>

      {/* 바로가기 */}
      <Link href="/docent" className="card pressable flex items-center gap-3 p-4 text-sm">
        <MessagesSquare className="h-5 w-5 text-ai" aria-hidden />
        <span className="flex-1 font-medium text-neutral-800">
          {t("my.shortcut.docentHistory")}
        </span>
        <ChevronRight className="h-4 w-4 text-neutral-300" aria-hidden />
      </Link>

      {/* 환경설정 */}
      <section className="space-y-5">
        <SectionTitle>{t("my.section.prefs")}</SectionTitle>

        <Field label={t("my.field.nickname")}>
          <input
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setSaved(false);
            }}
            className="w-full rounded-card border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-navy"
          />
        </Field>

        <Field label={t("my.field.language")}>
          <Segmented
            options={LANGS}
            value={locale}
            onChange={(v) => setLocale(v as Locale)}
          />
        </Field>

        <Field label={t("my.field.level")}>
          <Segmented
            options={[
              { id: "child", label: t("my.level.child") },
              { id: "general", label: t("my.level.general") },
              { id: "expert", label: t("my.level.expert") },
            ]}
            value={level}
            onChange={(v) => {
              setLevel(v);
              setSaved(false);
            }}
          />
        </Field>

        <Field label={t("my.field.interests")}>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((tag) => {
              const on = interests.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleInterest(tag)}
                  className={`chip pressable ${on ? "bg-navy text-white" : "bg-black/5 text-neutral-600"}`}
                >
                  {t(`interest.${tag}`)}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={t("my.field.accessibility")}>
          <div className="space-y-2">
            <Toggle
              label={t("my.a11y.largeText")}
              on={largeText}
              onChange={(v) => setLargeText(v)}
            />
            {/* 휠체어 코스 우선 — 거점 접근성 데이터/라우팅 미비로 준비 중 */}
            <div className="card flex w-full items-center justify-between p-3.5 text-sm opacity-60">
              <span className="text-neutral-700">{t("my.a11y.wheelchair")}</span>
              <span className="chip bg-black/5 text-neutral-500">{t("common.comingSoon")}</span>
            </div>
          </div>
        </Field>

        <PrimaryButton onClick={save} disabled={busy}>
          {busy ? (
            t("my.save.busy")
          ) : saved ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-4 w-4" aria-hidden />
              {t("my.save.done")}
            </span>
          ) : (
            t("my.save.idle")
          )}
        </PrimaryButton>
      </section>

      {/* 계정 */}
      <section className="space-y-3">
        <SectionTitle>{t("my.section.account")}</SectionTitle>

        {/* 이메일 인증 재전송 */}
        {isEmailUser && !verified && (
          <div className="card flex items-center justify-between gap-3 p-4 text-sm">
            <span className="text-neutral-600">{t("my.account.unverified")}</span>
            <button
              onClick={resend}
              className="pressable shrink-0 rounded-chip bg-black/5 px-3 py-1.5 text-xs font-semibold text-neutral-700"
            >
              {resendMsg ?? t("my.account.resend")}
            </button>
          </div>
        )}

        {/* 비밀번호 변경 (이메일 계정만) */}
        {isEmailUser ? (
          <div className="card space-y-2 p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-800">
              <KeyRound className="h-4 w-4 text-neutral-400" aria-hidden />
              {t("my.account.changePw")}
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={newPw}
                onChange={(e) => {
                  setNewPw(e.target.value);
                  setPwMsg(null);
                }}
                placeholder={t("my.account.newPw")}
                className="min-w-0 flex-1 rounded-card border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-navy"
              />
              <button
                onClick={changePw}
                disabled={newPw.length < 6 || pwBusy}
                className="pressable shrink-0 rounded-card bg-navy px-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                {t("common.confirm")}
              </button>
            </div>
            {pwMsg && <p className="text-xs text-ai">{pwMsg}</p>}
          </div>
        ) : (
          <p className="card p-4 text-sm text-neutral-500">{t("my.account.social")}</p>
        )}

        {/* 로그아웃 */}
        {confirmLogout ? (
          <div className="card flex items-center justify-between gap-3 p-4 text-sm">
            <span className="text-neutral-700">{t("my.account.logoutConfirm")}</span>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setConfirmLogout(false)}
                className="pressable rounded-chip bg-black/5 px-3 py-1.5 text-xs font-semibold text-neutral-600"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={logout}
                className="pressable rounded-chip bg-red-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {t("my.account.logout")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLogout(true)}
            className="card pressable flex w-full items-center gap-3 p-4 text-sm font-medium text-red-500"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {t("my.account.logout")}
          </button>
        )}
      </section>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{children}</p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-700">{label}</p>
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
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-navy" : "bg-neutral-300"}`}>
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
