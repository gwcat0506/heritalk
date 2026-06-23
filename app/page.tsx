"use client";
// 홈 — 지도 풀블리드 히어로(가치 한 줄 + "주변 코스 추천" 메인 CTA) + 스와이프 덱(개별 장소 탐색).
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nearby } from "@/lib/poi";
import { buildWalkablePool } from "@/lib/heritage-pool";
import { recommendNearbyCourse } from "@/lib/recommendCourse";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { Wordmark, Skeleton } from "@/components/ui";
import { useT } from "@/lib/i18n/LocaleProvider";
import { MapPin, Navigation } from "lucide-react";
import KakaoMap from "@/components/KakaoMap";
import { useUserLocation } from "@/lib/useUserLocation";
import MapSheet from "@/components/MapSheet";
import SwipeDeck from "@/components/SwipeDeck";
import type { POI } from "@/lib/types";

// 서울 도심 기준점.
const SEOUL = { lat: 37.5759, lng: 126.9769 };

export default function HomePage() {
  const t = useT();
  const [seed, setSeed] = useState(1);
  const [mapOpen, setMapOpen] = useState(false);
  const [pool, setPool] = useState<POI[]>([]);
  const [recBusy, setRecBusy] = useState(false);
  const { toggle, contains, clear } = useCourseDraft();
  const draftCount = useCourseDraft((s) => s.pois.length);
  const { center, locate } = useUserLocation();
  const router = useRouter();

  // KHS 서울 목록 → 워커블 풀(박물관 + 장소형)
  useEffect(() => {
    fetch("/api/heritage/seoul")
      .then((r) => r.json())
      .then((d) => setPool(buildWalkablePool(d.places ?? [])))
      .catch(() => setPool(buildWalkablePool([])));
  }, []);

  const ready = pool.length > 0;

  // 지도 핀(도심 주변) + 내 위치 근처 자치구 라벨
  const mapPins = useMemo(
    () => (ready ? nearby(pool, SEOUL, 50_000, 8).map((poi) => ({ poi })) : []),
    [pool, ready]
  );
  const area = useMemo(
    () => (ready ? nearby(pool, center, 50_000, 1)[0]?.district : undefined),
    [pool, ready, center]
  );

  const deckPool = useMemo(() => {
    if (!ready) return [];
    const near = nearby(pool, SEOUL, 12_000, 30);
    const shuffle = (arr: POI[]) =>
      [...arr].sort((a, b) => ((a.id + seed) > (b.id + seed) ? 1 : -1));
    // 덱은 배열 끝에서부터 소비된다 → 사진 있는 거점을 끝에 배치해 먼저 보이게(첫인상).
    const imaged = shuffle(near.filter((p) => p.imageUrl));
    const others = shuffle(near.filter((p) => !p.imageUrl));
    return [...others, ...imaged].slice(-12);
  }, [pool, ready, seed]);

  // 메인 CTA — 내 위치(없으면 서울 도심) 기준 주변 코스를 만들어 결과로 이동.
  async function recommendCourse() {
    if (recBusy) return;
    setRecBusy(true);
    try {
      const me = (await locate()) ?? SEOUL;
      const r = await recommendNearbyCourse(me, { pool, radius: 2500 });
      let picks = r.ok ? r.picks : [];
      if (picks.length < 2 && ready) {
        picks = nearby(pool, SEOUL, 50_000, 12)
          .filter((p) => p.imageUrl)
          .slice(0, 4);
      }
      if (picks.length >= 2) {
        clear();
        picks.forEach((p) => toggle(p));
        router.push("/course/result");
        return;
      }
    } finally {
      setRecBusy(false);
    }
  }

  function decide(poi: POI, like: boolean) {
    if (!like) return;
    const already = contains(poi.id);
    if (!already) toggle(poi);
    const next = draftCount + (already ? 0 : 1);
    if (next >= 4) router.push("/course/result");
  }

  return (
    <main className="pb-4">
      {/* 지도 풀블리드 히어로 */}
      <section className="relative h-[46svh] min-h-[320px] w-full overflow-hidden rounded-b-[28px] shadow-card">
        <KakaoMap fill markers={mapPins} center={center} autoFit={false} />
        {/* 지도 빈 영역 탭 → 전체 지도 시트(보조) */}
        <button
          onClick={() => setMapOpen(true)}
          className="absolute inset-0 z-0"
          aria-label={t("home.mapOpen")}
        />

        {/* 위치 칩(상단) */}
        {area && (
          <span className="pointer-events-none absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-chip bg-white/90 px-3 py-1.5 text-xs font-semibold text-navy shadow-card backdrop-blur">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {t("home.areaRec", { area })}
          </span>
        )}

        {/* 하단 스크림 + 가치 한 줄 + 메인 CTA */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-navy via-navy/55 to-transparent px-5 pb-5 pt-20">
          <div className="rise pointer-events-auto">
            <Wordmark size="lg" className="text-white" />
            <p className="mt-2 mb-4 text-sm text-white/85">{t("auth.tagline")}</p>
            <button
              onClick={recommendCourse}
              disabled={recBusy}
              className="pressable flex w-full items-center justify-center gap-2 rounded-card bg-white py-3.5 text-center font-semibold text-navy shadow-card disabled:opacity-70"
            >
              <Navigation className="h-5 w-5" aria-hidden />
              {recBusy ? t("home.heroCtaBusy") : t("home.heroCta")}
            </button>
          </div>
        </div>
      </section>

      {/* 스와이프 덱(좌 패스 / 우 코스에 담기) */}
      <section className="rise mt-6 px-4" style={{ animationDelay: "100ms" }}>
        <h2 className="font-semibold text-neutral-800">{t("home.deckTitle")}</h2>
        <p className="mb-3 text-xs text-neutral-500">{t("home.deckHint")}</p>
        {ready ? (
          <SwipeDeck
            pois={deckPool}
            poolKey={seed}
            onDecide={decide}
            onRefill={() => setSeed((s) => s + 1)}
          />
        ) : (
          <Skeleton className="h-[380px] w-full rounded-card" />
        )}
      </section>

      <MapSheet open={mapOpen} onClose={() => setMapOpen(false)} />
    </main>
  );
}
