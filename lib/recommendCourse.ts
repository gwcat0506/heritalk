"use client";
// 위치 기반 "주변 코스 추천" 공유 헬퍼 — 홈 히어로 CTA와 투어 빈 상태가 함께 사용.
// 거점 picks만 반환하고, 드래프트 설정·이동은 호출측이 결정한다.
import { buildWalkablePool } from "./heritage-pool";
import { nearby } from "./poi";
import type { LatLng, POI } from "./types";

export type RecommendResult =
  | { ok: true; picks: POI[] }
  | { ok: false; reason: "no-location" | "too-few" | "error" };

export async function recommendNearbyCourse(
  me: LatLng | null,
  opts: { pool?: POI[]; radius?: number; count?: number } = {}
): Promise<RecommendResult> {
  if (!me) return { ok: false, reason: "no-location" };
  const radius = opts.radius ?? 1500;
  const count = opts.count ?? 4;
  try {
    let pool = opts.pool;
    if (!pool || pool.length === 0) {
      const res = await fetch("/api/heritage/seoul");
      pool = buildWalkablePool((await res.json()).places ?? []);
    }
    // 근접 후보 넉넉히 → 사진 있는 거점 우선(첫인상), 부족하면 전체로 보충.
    const near = nearby(pool, me, radius, count * 3);
    const imaged = near.filter((p) => p.imageUrl);
    const base = imaged.length >= 2 ? imaged : near;
    const picks = base.slice(0, count);
    if (picks.length < 2) return { ok: false, reason: "too-few" };
    return { ok: true, picks };
  } catch {
    return { ok: false, reason: "error" };
  }
}
