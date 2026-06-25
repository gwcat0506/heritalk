// 토이 POIStore.swift 이식 — 순수 함수(자치구/근처/예상시간). 데이터는 호출측에서 주입.
import type { POI, LatLng } from "./types";

/** 두 좌표 간 거리(m) — haversine. (POIStore.distance) */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const toLatLng = (p: POI): LatLng => ({ lat: p.latitude, lng: p.longitude });

/** 거점이 있는 자치구를 거점 수 많은 순으로. (POIStore.districts) */
export function districts(pois: POI[]): string[] {
  const groups = new Map<string, number>();
  for (const p of pois) groups.set(p.district, (groups.get(p.district) ?? 0) + 1);
  return [...groups.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

/** 자치구별 거점(이름순). (POIStore.pois(in:)) */
export function poisIn(pois: POI[], district: string): POI[] {
  return pois
    .filter((p) => p.district === district)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/**
 * 기준 좌표에서 가까운 거점. 반경 내 우선, 부족하면 최근접으로 보충(limit개).
 * (POIStore.nearby)
 */
export function nearby(
  pois: POI[],
  center: LatLng,
  radiusM: number,
  limit: number
): POI[] {
  const ranked = pois
    .map((p) => ({ poi: p, dist: distanceMeters(center, toLatLng(p)) }))
    .sort((a, b) => a.dist - b.dist);
  const within = ranked.filter((r) => r.dist <= radiusM);
  const chosen = within.length >= limit ? within : ranked;
  return chosen.slice(0, limit).map((r) => r.poi);
}

/**
 * 코스의 예상 도보(첫 거점 시작, 최근접 순서). 비현실값은 1~180분으로 클램프.
 * (POIStore.walkEstimate) — RouteEngine 호출 전 UI 프리뷰용.
 */
export function walkEstimate(pois: POI[]): { minutes: number; km: number } {
  if (pois.length < 2) return { minutes: 0, km: 0 };
  let remaining = pois.slice(1);
  let cur = toLatLng(pois[0]);
  let meters = 0;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = distanceMeters(cur, toLatLng(p));
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    meters += bestDist;
    cur = toLatLng(remaining[bestIdx]);
    remaining = remaining.filter((_, i) => i !== bestIdx);
  }
  if (!isFinite(meters) || meters <= 0) return { minutes: 1, km: 0 };
  const roadMeters = meters * 1.3;
  const minutes = Math.max(1, Math.min(180, Math.round(roadMeters / 1.3 / 60)));
  return { minutes, km: roadMeters / 1000 };
}
