"use client";
// 루트 결과 — 토이 RouteMapView 이식: 순서 핀 + 도보 폴리라인 + 요약 + 정류장 리스트 + 저장.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { useSaved } from "@/stores/useSaved";
import KakaoMap, { type MapMarker } from "@/components/KakaoMap";
import { RouteSummary, POIThumbnail, PrimaryButton } from "@/components/ui";
import type { Route } from "@/lib/types";

export default function RouteResultPage() {
  const { pois, startId } = useCourseDraft();
  const { add, contains } = useSaved();
  const router = useRouter();
  const [route, setRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [latency, setLatency] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (pois.length < 2) {
      router.replace("/course");
      return;
    }
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
  }, []);

  const markers: MapMarker[] =
    route?.stops.map((s) => ({ poi: s.poi, order: s.order })) ?? [];

  return (
    <main className="px-4 pt-6">
      <button
        onClick={() => router.back()}
        className="pressable mb-3 text-sm text-neutral-500"
      >
        ← 코스 편집
      </button>
      <h1 className="mb-3 text-xl font-bold text-navy">오늘의 도보 코스</h1>

      {loading && (
        <div className="card grid h-40 place-items-center text-sm text-neutral-500">
          도보 경로 계산 중…
        </div>
      )}
      {error && (
        <div className="card p-6 text-center text-sm text-red-500">{error}</div>
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
                  {s.order === 0 ? "출발" : s.order}
                </span>
                <POIThumbnail poi={s.poi} className="h-12 w-12 rounded-chip" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{s.poi.name}</p>
                  <p className="text-xs text-neutral-500">
                    {s.order === 0
                      ? "시작점"
                      : `누적 ${(s.cumulativeDistance / 1000).toFixed(1)}km · ${Math.round(
                          s.cumulativeTime / 60
                        )}분`}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <button
            onClick={() => router.push("/docent?tab=tour")}
            className="pressable mb-2 w-full rounded-card bg-ai py-3 text-sm font-semibold text-white"
          >
            🎧 AI 도슨트와 이 코스 걷기
          </button>

          <PrimaryButton
            disabled={saved || contains(pois)}
            onClick={() => {
              add(`${pois[0].district} 코스 ${pois.length}곳`, pois);
              setSaved(true);
            }}
          >
            {saved || contains(pois) ? "저장됨 ✓" : "이 코스 저장하기"}
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
