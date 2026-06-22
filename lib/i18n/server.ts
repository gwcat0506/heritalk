// 서버 컴포넌트용 번역기 — locale 쿠키를 읽어 dict로 t()를 만든다.
import { cookies } from "next/headers";
import { dict, type Locale } from "./dict";

export async function getServerT() {
  const c = await cookies();
  const locale: Locale = c.get("locale")?.value === "en" ? "en" : "ko";
  return (key: string, vars?: Record<string, string | number>) => {
    let s = dict[locale][key] ?? dict.ko[key] ?? key;
    if (vars)
      for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}
