"use client";
// 로케일 + 접근성(큰글씨) 전역 컨텍스트. 라우트 분리 없는 클라이언트 i18n.
// 초기 locale/largeText는 서버(layout)가 쿠키로 결정해 깜빡임 방지.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { dict, type Locale } from "./dict";
import { getUser, updateSettings } from "@/lib/auth";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  largeText: boolean;
  setLargeText: (v: boolean) => void;
};

const LocaleCtx = createContext<Ctx | null>(null);

const COOKIE_DAYS = 365;
function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const exp = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
  document.cookie = `${name}=${value}; path=/; expires=${exp}; SameSite=Lax`;
}

export function LocaleProvider({
  initialLocale = "ko",
  initialLargeText = false,
  children,
}: {
  initialLocale?: Locale;
  initialLargeText?: boolean;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [largeText, setLargeTextState] = useState<boolean>(initialLargeText);

  // 로그인 사용자의 저장 설정으로 1회 동기화(쿠키가 없거나 다를 때).
  useEffect(() => {
    getUser().then((u) => {
      const m = (u?.user_metadata ?? {}) as Record<string, unknown>;
      if (m.language === "ko" || m.language === "en") setLocaleState(m.language);
      if (typeof m.largeText === "boolean") setLargeTextState(m.largeText);
    });
  }, []);

  // locale → <html lang> + 쿠키
  useEffect(() => {
    document.documentElement.lang = locale;
    writeCookie("locale", locale);
  }, [locale]);

  // largeText → <html> 클래스 + 쿠키
  useEffect(() => {
    document.documentElement.classList.toggle("a11y-large", largeText);
    writeCookie("pref_large", largeText ? "1" : "0");
  }, [largeText]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    updateSettings({ language: l }).catch(() => {}); // 비로그인/실패 무시
  }, []);

  const setLargeText = useCallback((v: boolean) => {
    setLargeTextState(v);
    updateSettings({ largeText: v }).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = dict[locale][key] ?? dict.ko[key] ?? key;
      if (vars)
        for (const [k, v] of Object.entries(vars))
          s = s.replace(`{${k}}`, String(v));
      return s;
    },
    [locale]
  );

  return (
    <LocaleCtx.Provider value={{ locale, setLocale, t, largeText, setLargeText }}>
      {children}
    </LocaleCtx.Provider>
  );
}

function useCtx(): Ctx {
  const c = useContext(LocaleCtx);
  if (!c) throw new Error("useLocale/useT must be used within LocaleProvider");
  return c;
}

/** 번역 함수만 필요할 때. */
export function useT() {
  return useCtx().t;
}

/** 로케일 읽기/변경. */
export function useLocale() {
  const { locale, setLocale } = useCtx();
  return { locale, setLocale };
}

/** 접근성(큰글씨) 읽기/변경. */
export function usePrefs() {
  const { largeText, setLargeText } = useCtx();
  return { largeText, setLargeText };
}
