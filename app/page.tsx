"use client";
// 홈 — 인사 + 지도 미리보기(시트) + AI 추천 코스 + 스와이프 덱. 장소 풀 = KHS 장소형 + 정적 박물관.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { districts, poisIn, nearby, walkEstimate } from "@/lib/poi";
import { buildWalkablePool } from "@/lib/heritage-pool";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { POIThumbnail, PrimaryButton, Wordmark, Skeleton } from "@/components/ui";
import { useT } from "@/lib/i18n/LocaleProvider";
import { Sparkles, RotateCw, ArrowRight, MapPin } from "lucide-react";
import KakaoMap from "@/components/KakaoMap";
import { useUserLocation } from "@/lib/useUserLocation";
import MapSheet from "@/components/MapSheet";
import SwipeDeck from "@/components/SwipeDeck";
import type { POI } from "@/lib/types";

// 서울 도심 기준점.
const SEOUL = { lat: 37.5759, lng: 126.9769 };

function pickRecommendation(pool: POI[], seed: number): POI[] {
  // 첫인상 — 실제 사진이 있는 거점 3곳 이상인 자치구를 우선해서 추천.
  const hasImg = (p: POI) => !!p.imageUrl;
  const imagedDs = districts(pool).filter(
    (d) => poisIn(pool, d).filter(hasImg).length >= 3
  );
  const ds = imagedDs.length
    ? imagedDs
    : districts(pool).filter((d) => poisIn(pool, d).length >= 3);
  if (ds.length === 0) return pool.slice(0, 3);
  const d = ds[seed % ds.length];
  const inDistrict = poisIn(pool, d);
  const imaged = inDistrict.filter(hasImg);
  const base = imaged.length >= 3 ? imaged : inDistrict;
  const s = seed % base.length;
  return [base[s], base[(s + 1) % base.length], base[(s + 2) % base.length]];
}

export default function HomePage() {
  const t = useT();
  const [seed, setSeed] = useState(1);
  const [mapOpen, setMapOpen] = useState(false);
  const [pool, setPool] = useState<POI[]>([]);
  const { toggle, contains } = useCourseDraft();
  const draftCount = useCourseDraft((s) => s.pois.length);
  const { center } = useUserLocation();
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
    const near = nearby(pool, SEOUL, 12_000, 30);
    const shuffle = (arr: POI[]) =>
      [...arr].sort((a, b) => ((a.id + seed) > (b.id + seed) ? 1 : -1));
    // 덱은 배열 끝에서부터 소비된다 → 사진 있는 거점을 끝에 배치해 먼저 보이게(첫인상).
    const imaged = shuffle(near.filter((p) => p.imageUrl));
    const others = shuffle(near.filter((p) => !p.imageUrl));
    return [...others, ...imaged].slice(-12);
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
      <header className="mb-5">
        <Wordmark size="lg" />
        <p className="mt-2 text-sm text-neutral-500">{t("home.greeting")}</p>
        {ready && rec[0] && (
          <span className="chip mt-2 bg-black/5 text-neutral-600">
            <MapPin className="h-3.5 w-3.5 text-navy" aria-hidden />
            {t("home.areaRec", { area: rec[0].district })}
          </span>
        )}
      </header>

      {/* 지도 섹션 — 탭하면 아래에서 위로 시트로 펼침 */}
      {ready ? (
        <section className="relative mb-6 overflow-hidden rounded-card shadow-card">
          <KakaoMap markers={mapPins} center={center} autoFit={false} height={200} />
          <button
            onClick={() => setMapOpen(true)}
            className="absolute inset-0 z-10"
            aria-label="지도 열기"
          />
          <span className="pointer-events-none absolute bottom-3 right-3 z-20 inline-flex items-center gap-1 rounded-chip bg-white/90 px-3 py-1.5 text-xs font-semibold text-navy shadow-card backdrop-blur">
            {t("home.mapOpen")} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </section>
      ) : (
        <Skeleton className="mb-6 h-[200px] w-full rounded-card" />
      )}

      {/* AI 추천 코스 */}
      <section className="mb-6 rounded-card bg-ai-gradient p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <span className="chip bg-ai/15 text-ai">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("home.aiCourse")}
          </span>
          <button
            onClick={() => setSeed((s) => s + 1)}
            className="pressable inline-flex items-center gap-1 text-sm text-ai"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
            {t("home.reRecommend")}
          </button>
        </div>
        {ready ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              {rec.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <POIThumbnail poi={p} className="h-14 w-14 rounded-chip" />
                  {i < rec.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-neutral-400" aria-hidden />
                  )}
                </div>
              ))}
            </div>
            <p className="mb-3 text-sm text-neutral-600">
              {rec.map((p) => p.name).join(" · ")}
              <br />
              <span className="text-neutral-500">
                {t("home.courseMeta", {
                  min: est.minutes,
                  km: est.km.toFixed(1),
                  n: rec.length,
                })}
              </span>
            </p>
            <PrimaryButton onClick={walkThisCourse}>{t("home.walkThisCourse")}</PrimaryButton>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-14 w-14 rounded-chip bg-white/60" />
              <Skeleton className="h-14 w-14 rounded-chip bg-white/60" />
              <Skeleton className="h-14 w-14 rounded-chip bg-white/60" />
            </div>
            <Skeleton className="h-4 w-3/4 bg-white/60" />
            <Skeleton className="h-11 w-full rounded-card bg-white/60" />
          </div>
        )}
      </section>

      {/* 스와이프 덱(좌 패스 / 우 코스에 담기) */}
      <section className="mb-2">
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
