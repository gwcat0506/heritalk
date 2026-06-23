"use client";
// 홈 — 단일 주경로(지도 히어로 + 주변 코스) + 보조 진입(도슨트/직접) + 발견 레일. 위치는 옵인.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { nearby } from "@/lib/poi";
import { buildWalkablePool } from "@/lib/heritage-pool";
import { recommendNearbyCourse } from "@/lib/recommendCourse";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { POIThumbnail, CategoryChip, Wordmark, Skeleton } from "@/components/ui";
import { useT } from "@/lib/i18n/LocaleProvider";
import { MapPin, Navigation, MessagesSquare, Route, ChevronRight } from "lucide-react";
import KakaoMap from "@/components/KakaoMap";
import { useUserLocation } from "@/lib/useUserLocation";
import MapSheet from "@/components/MapSheet";
import type { POI } from "@/lib/types";

// 서울 도심 기준점.
const SEOUL = { lat: 37.5759, lng: 126.9769 };

export default function HomePage() {
  const t = useT();
  const [mapOpen, setMapOpen] = useState(false);
  const [pool, setPool] = useState<POI[]>([]);
  const [recBusy, setRecBusy] = useState(false);
  const { toggle, clear } = useCourseDraft();
  const { center, located, status, locate } = useUserLocation(undefined, { auto: false });
  const router = useRouter();

  // KHS 서울 목록 → 워커블 풀(박물관 + 장소형)
  useEffect(() => {
    fetch("/api/heritage/seoul")
      .then((r) => r.json())
      .then((d) => setPool(buildWalkablePool(d.places ?? [])))
      .catch(() => setPool(buildWalkablePool([])));
  }, []);

  const ready = pool.length > 0;

  const mapPins = useMemo(
    () => (ready ? nearby(pool, SEOUL, 50_000, 8).map((poi) => ({ poi })) : []),
    [pool, ready]
  );
  const area = useMemo(
    () => (ready ? nearby(pool, center, 50_000, 1)[0]?.district : undefined),
    [pool, ready, center]
  );

  // 발견 레일 — 사진 있는 가까운 거점.
  const discover = useMemo(() => {
    if (!ready) return [];
    return nearby(pool, center, 50_000, 24)
      .filter((p) => p.imageUrl)
      .slice(0, 10);
  }, [pool, ready, center]);

  // 메인 CTA — 내 위치(없으면 서울 도심) 기준 주변 코스 → 결과.
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

  const locActive = status === "granted" && located;
  const locOff = status === "denied" || status === "unsupported";

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

        {/* 위치 권한 컨트롤(상단) */}
        <div className="absolute left-4 top-4 z-10">
          {locActive ? (
            <span className="inline-flex items-center gap-1 rounded-chip bg-white/90 px-3 py-1.5 text-xs font-semibold text-navy shadow-card backdrop-blur">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {area ? t("home.areaRec", { area }) : t("home.locNear")}
            </span>
          ) : locOff ? (
            <span className="inline-flex items-center gap-1 rounded-chip bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-500 shadow-card backdrop-blur">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {t("home.locOff")}
            </span>
          ) : (
            <button
              onClick={() => locate()}
              className="pressable inline-flex items-center gap-1 rounded-chip bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-card"
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              {t("home.locEnable")}
            </button>
          )}
        </div>

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

      {/* 보조 진입 — 도슨트 대화 / 직접 코스 */}
      <section className="rise mt-5 grid grid-cols-2 gap-3 px-4" style={{ animationDelay: "80ms" }}>
        <Link href="/docent" className="pressable card flex flex-col items-start gap-2 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-chip bg-ai-gradient text-ai">
            <MessagesSquare className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-neutral-800">{t("home.secChat")}</span>
        </Link>
        <Link href="/course" className="pressable card flex flex-col items-start gap-2 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-chip bg-ai-gradient text-ai">
            <Route className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-neutral-800">{t("home.secBuild")}</span>
        </Link>
      </section>

      {/* 발견 레일 — 가까운 거점 둘러보기 */}
      <section className="rise mt-6" style={{ animationDelay: "160ms" }}>
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="font-semibold text-neutral-800">{t("home.discoverTitle")}</h2>
          <Link href="/map" className="pressable text-neutral-300" aria-label={t("home.mapOpen")}>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
        {ready ? (
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {discover.map((p) => (
              <Link key={p.id} href={`/place/${p.id}`} className="pressable w-40 shrink-0">
                <POIThumbnail poi={p} className="h-28 w-full rounded-card" />
                <div className="mt-1.5">
                  <CategoryChip category={p.category} />
                  <p className="mt-1 line-clamp-1 text-sm font-medium text-neutral-800">{p.name}</p>
                  <p className="line-clamp-1 text-xs text-neutral-400">{p.district}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 px-4">
            <Skeleton className="h-40 w-40 shrink-0 rounded-card" />
            <Skeleton className="h-40 w-40 shrink-0 rounded-card" />
            <Skeleton className="h-40 w-24 shrink-0 rounded-card" />
          </div>
        )}
      </section>

      <MapSheet open={mapOpen} onClose={() => setMapOpen(false)} />
    </main>
  );
}
