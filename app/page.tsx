"use client";
// 홈 — 인사 + 지도 미리보기(시트) + AI 추천 코스 + 스와이프 덱. 장소 풀 = KHS 장소형 + 정적 박물관.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { districts, poisIn, nearby, walkEstimate } from "@/lib/poi";
import { buildWalkablePool } from "@/lib/heritage-pool";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { POIThumbnail, PrimaryButton } from "@/components/ui";
import KakaoMap from "@/components/KakaoMap";
import MapSheet from "@/components/MapSheet";
import SwipeDeck from "@/components/SwipeDeck";
import type { POI } from "@/lib/types";

// 서울 도심 기준점.
const SEOUL = { lat: 37.5759, lng: 126.9769 };

function pickRecommendation(pool: POI[], seed: number): POI[] {
  // 거점 3곳 이상인 자치구 중 하나를 골라 근접 2~3곳 추천.
  const ds = districts(pool).filter((d) => poisIn(pool, d).length >= 3);
  if (ds.length === 0) return pool.slice(0, 3);
  const d = ds[seed % ds.length];
  const p = poisIn(pool, d);
  const s = seed % p.length;
  return [p[s], p[(s + 1) % p.length], p[(s + 2) % p.length]];
}

export default function HomePage() {
  const [seed, setSeed] = useState(1);
  const [mapOpen, setMapOpen] = useState(false);
  const [pool, setPool] = useState<POI[]>([]);
  const { toggle, contains } = useCourseDraft();
  const draftCount = useCourseDraft((s) => s.pois.length);
  const router = useRouter();

  // KHS 서울 목록 → 워커블 풀(박물관 + 장소형)
  useEffect(() => {
    fetch("/api/heritage/seoul")
      .then((r) => r.json())
      .then((d) => setPool(buildWalkablePool(d.places ?? [])))
      .catch(() => setPool(buildWalkablePool([])));
  }, []);

  const ready = pool.length > 0;
  const rec = useMemo(() => (ready ? pickRecommendation(pool, seed) : []), [pool, ready, seed]);
  const est = walkEstimate(rec);

  const mapPins = useMemo(
    () => (ready ? nearby(pool, SEOUL, 50_000, 6).map((poi) => ({ poi })) : []),
    [pool, ready]
  );

  const deckPool = useMemo(() => {
    if (!ready) return [];
    const near = nearby(pool, SEOUL, 8_000, 14);
    return [...near].sort((a, b) => ((a.id + seed) > (b.id + seed) ? 1 : -1)).slice(0, 12);
  }, [pool, ready, seed]);

  function walkThisCourse() {
    rec.forEach((p) => {
      if (!contains(p.id)) toggle(p);
    });
    router.push("/course");
  }

  function decide(poi: POI, like: boolean) {
    if (!like) return;
    const already = contains(poi.id);
    if (!already) toggle(poi);
    const next = draftCount + (already ? 0 : 1);
    if (next >= 4) router.push("/course/result");
  }

  return (
    <main className="px-4 pt-6">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500">오늘, 어디를 걸어볼까요?</p>
          <h1 className="text-2xl font-bold text-navy">걷는 시간</h1>
        </div>
      </header>

      {/* 지도 섹션 — 탭하면 아래에서 위로 시트로 펼침 */}
      <section className="relative mb-6 overflow-hidden rounded-card shadow-card">
        <KakaoMap markers={mapPins} center={SEOUL} height={200} />
        <button
          onClick={() => setMapOpen(true)}
          className="absolute inset-0 z-10"
          aria-label="지도 열기"
        />
        <span className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-chip bg-white/90 px-3 py-1.5 text-xs font-semibold text-navy shadow-card backdrop-blur">
          지도 보기 →
        </span>
      </section>

      {/* AI 추천 코스 */}
      <section className="mb-6 rounded-card bg-ai-gradient p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <span className="chip bg-ai/15 text-ai">✨ AI 추천 코스</span>
          <button onClick={() => setSeed((s) => s + 1)} className="pressable text-sm text-ai">
            다시 추천 ↻
          </button>
        </div>
        {ready ? (
          <>
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
          </>
        ) : (
          <div className="h-28 animate-pulse rounded-chip bg-white/50" />
        )}
      </section>

      {/* 스와이프 덱(좌 패스 / 우 코스에 담기) */}
      <section className="mb-2">
        <h2 className="font-semibold text-neutral-800">이런 곳 어때요?</h2>
        <p className="mb-3 text-xs text-neutral-500">
          오른쪽으로 밀면 코스에 담겨요 (코스 탭에서 확인)
        </p>
        {ready ? (
          <SwipeDeck
            pois={deckPool}
            poolKey={seed}
            onDecide={decide}
            onRefill={() => setSeed((s) => s + 1)}
          />
        ) : (
          <div className="h-[380px] animate-pulse rounded-card bg-neutral-100" />
        )}
      </section>

      <MapSheet open={mapOpen} onClose={() => setMapOpen(false)} />
    </main>
  );
}
