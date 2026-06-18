"use client";
// 홈 — 인사 + 지도 미리보기 + AI 추천 코스 + 스와이프 덱(좌패스/우담기). (도슨트는 별도 탭)
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ALL_POIS } from "@/lib/data";
import { districts, poisIn, nearby, walkEstimate } from "@/lib/poi";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { POIThumbnail, PrimaryButton } from "@/components/ui";
import KakaoMap from "@/components/KakaoMap";
import SwipeDeck from "@/components/SwipeDeck";
import type { POI } from "@/lib/types";

// 서울 도심 기준점(토이 seoulFallback).
const SEOUL = { lat: 37.5759, lng: 126.9769 };

function pickRecommendation(seed: number): POI[] {
  // 거점 3곳 이상인 자치구 중 하나를 골라 근접 2~3곳을 추천(가벼운 1시간 내 코스).
  const ds = districts(ALL_POIS).filter((d) => poisIn(ALL_POIS, d).length >= 3);
  const d = ds[seed % ds.length];
  const pool = poisIn(ALL_POIS, d);
  const start = seed % pool.length;
  return [pool[start], pool[(start + 1) % pool.length], pool[(start + 2) % pool.length]];
}

export default function HomePage() {
  const [seed, setSeed] = useState(1);
  const rec = useMemo(() => pickRecommendation(seed), [seed]);
  const est = walkEstimate(rec);
  const { toggle, contains } = useCourseDraft();
  const draftCount = useCourseDraft((s) => s.pois.length);
  const router = useRouter();

  // 지도 미리보기 핀(도심 주변 6곳).
  const mapPins = useMemo(
    () => nearby(ALL_POIS, SEOUL, 50_000, 6).map((poi) => ({ poi })),
    []
  );

  // 스와이프 후보 풀(도심 주변 12곳, seed로 섞기).
  const deckPool = useMemo(() => {
    const near = nearby(ALL_POIS, SEOUL, 8_000, 14);
    return [...near]
      .sort((a, b) => ((a.id + seed) > (b.id + seed) ? 1 : -1))
      .slice(0, 12);
  }, [seed]);

  function walkThisCourse() {
    rec.forEach((p) => {
      if (!contains(p.id)) toggle(p);
    });
    router.push("/course");
  }

  // 스와이프 결정: 우(담기) → 드래프트 추가. 4곳 채워지면 자동으로 코스 결과로.
  function decide(poi: POI, like: boolean) {
    if (!like) return;
    const already = contains(poi.id);
    if (!already) toggle(poi);
    const next = draftCount + (already ? 0 : 1);
    if (next >= 4) router.push("/course/result");
  }

  return (
    <main className="px-4 pt-6">
      <header className="mb-4">
        <p className="text-sm text-neutral-500">오늘, 어디를 걸어볼까요?</p>
        <h1 className="text-2xl font-bold text-navy">걷는 시간</h1>
      </header>

      {/* 지도 섹션 */}
      <section className="relative mb-6 overflow-hidden rounded-card shadow-card">
        <KakaoMap markers={mapPins} center={SEOUL} height={200} />
        <Link
          href="/map"
          className="pressable absolute bottom-3 right-3 z-10 rounded-chip bg-white/90 px-3 py-1.5 text-xs font-semibold text-navy shadow-card backdrop-blur"
        >
          지도 보기 →
        </Link>
      </section>

      {/* AI 추천 코스 */}
      <section className="mb-6 rounded-card bg-ai-gradient p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <span className="chip bg-ai/15 text-ai">✨ AI 추천 코스</span>
          <button
            onClick={() => setSeed((s) => s + 1)}
            className="pressable text-sm text-ai"
          >
            다시 추천 ↻
          </button>
        </div>
        <div className="mb-3 flex items-center gap-2">
          {rec.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <POIThumbnail poi={p} className="h-14 w-14 rounded-chip" />
              {i < rec.length - 1 && <span className="text-neutral-400">→</span>}
            </div>
          ))}
        </div>
        <p className="mb-3 text-sm text-neutral-600">
          {rec.map((p) => p.name).join(" · ")}
          <br />
          <span className="text-neutral-500">
            약 {est.minutes}분 · {est.km.toFixed(1)}km · {rec.length}곳
          </span>
        </p>
        <PrimaryButton onClick={walkThisCourse}>이 코스로 걷기</PrimaryButton>
      </section>

      {/* 스와이프 덱(좌 패스 / 우 코스에 담기) */}
      <section className="mb-2">
        <h2 className="font-semibold text-neutral-800">이런 곳 어때요?</h2>
        <p className="mb-3 text-xs text-neutral-500">
          오른쪽으로 밀면 코스에 담겨요 (코스 탭에서 확인)
        </p>
        <SwipeDeck
          pois={deckPool}
          poolKey={seed}
          onDecide={decide}
          onRefill={() => setSeed((s) => s + 1)}
        />
      </section>
    </main>
  );
}
