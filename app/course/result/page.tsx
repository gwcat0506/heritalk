"use client";
// 루트 결과 — 토이 RouteMapView 이식: 순서 핀 + 도보 폴리라인 + 요약 + 정류장 리스트 + 저장.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { useSaved } from "@/stores/useSaved";
import KakaoMap, { type MapMarker } from "@/components/KakaoMap";
import { RouteSummary, POIThumbnail, PrimaryButton, Skeleton } from "@/components/ui";
import { useT } from "@/lib/i18n/LocaleProvider";
import { ChevronLeft, Headphones, Check, RefreshCw } from "lucide-react";
import type { Route } from "@/lib/types";

export default function RouteResultPage() {
  const { pois, startId } = useCourseDraft();
  const { add, contains } = useSaved();
  const router = useRouter();
  const t = useT();
  const [route, setRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [latency, setLatency] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [nonce, setNonce] = useState(0); // 재시도 트리거

  useEffect(() => {
    if (pois.length < 2) {
      router.replace("/course");
      return;
    }
    setError(null);
    setLoading(true);
    fetch("/api/route/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startId: startId ?? pois[0].id,
        pois,
      }),
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "루트 생성 실패");
        setRoute(json.route);
        setLatency(json.latencyMs ?? null);
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const markers: MapMarker[] =
    route?.stops.map((s) => ({ poi: s.poi, order: s.order })) ?? [];

  return (
    <main className="px-4 pt-6">
      <button
        onClick={() => router.back()}
        className="pressable mb-3 inline-flex items-center gap-0.5 text-sm text-neutral-500"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t("result.back")}
      </button>
      <h1 className="mb-3 text-xl font-bold text-navy">{t("result.title")}</h1>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-[300px] w-full rounded-card" />
          <Skeleton className="h-20 w-full rounded-card" />
          <p className="flex items-center justify-center gap-2 py-1 text-sm text-neutral-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-navy" />
            {t("result.calculating")}
          </p>
        </div>
      )}
      {error && (
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-red-500">{t("result.failed")}</p>
          <button
            onClick={() => setNonce((n) => n + 1)}
            className="pressable inline-flex items-center gap-1 rounded-card bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {t("common.retry")}
          </button>
        </div>
      )}

      {route && (
        <>
          <div className="mb-3">
            <KakaoMap markers={markers} paths={route.paths} height={300} />
          </div>
          <div className="mb-3">
            <RouteSummary
              distanceM={route.totalDistance}
              timeSec={route.totalTravelTime}
              stops={route.stops.length}
            />
          </div>

          <ol className="mb-4 space-y-2">
            {route.stops.map((s) => (
              <li key={s.poi.id} className="flex items-center gap-3 card p-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">
                  {s.order === 0 ? t("result.start") : s.order}
                </span>
                <POIThumbnail poi={s.poi} className="h-12 w-12 rounded-chip" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{s.poi.name}</p>
                  <p className="text-xs text-neutral-500">
                    {s.order === 0
                      ? t("result.startPoint")
                      : t("result.cumMeta", {
                          km: (s.cumulativeDistance / 1000).toFixed(1),
                          min: Math.round(s.cumulativeTime / 60),
                        })}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <button
            onClick={() => router.push("/docent?tab=tour")}
            className="pressable mb-2 flex w-full items-center justify-center gap-2 rounded-card bg-ai py-3 text-sm font-semibold text-white"
          >
            <Headphones className="h-4 w-4" aria-hidden />
            {t("result.walkWithDocent")}
          </button>

          <PrimaryButton
            disabled={saved || contains(pois)}
            onClick={() => {
              add(`${pois[0].district} 코스 ${pois.length}곳`, pois);
              setSaved(true);
            }}
          >
            {saved || contains(pois) ? (
              <span className="inline-flex items-center gap-1">
                <Check className="h-4 w-4" aria-hidden />
                {t("result.savedCourse")}
              </span>
            ) : (
              t("result.saveCourse")
            )}
          </PrimaryButton>

          {latency !== null && (
            <p className="mt-2 text-center text-[11px] text-neutral-300">
              동선 생성 {latency}ms
            </p>
          )}
        </>
      )}
    </main>
  );
}
