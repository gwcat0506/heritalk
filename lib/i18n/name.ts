// 거점 표시명 — en 로케일이고 영문명이 있으면 영문, 아니면 한국어 폴백. (클라/서버 공용 순수 함수)
import type { Locale } from "./dict";

export function dname(
  poi: { name: string; nameEn?: string | null },
  locale: Locale
): string {
  return locale === "en" && poi.nameEn ? poi.nameEn : poi.name;
}
