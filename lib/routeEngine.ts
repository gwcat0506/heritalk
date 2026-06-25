// 토이 RouteEngine.swift 이식 (서버 전용 — TMap 키 보호).
// ① nearest-neighbor 방문 순서 → ② 구간별 TMap 보행자 경로 → ③ 누적 집계.
// 구간 실패 시 직선거리×1.3 ÷ 1.3 m/s 폴백(루트가 끊기지 않도록).
import { ORIGIN_ID, type POI, type Route, type RouteStop, type LatLng } from "./types";
import { distanceMeters } from "./poi";
import { walkSegment } from "./tmap";

export { ORIGIN_ID };

const toLatLng = (p: POI): LatLng => ({ lat: p.latitude, lng: p.longitude });

/** 현위치 출발용 합성 거점 POI(내레이션·표시에서 식별). */
export function makeOriginPOI(o: LatLng): POI {
  return {
    id: ORIGIN_ID,
    name: "내 위치",
    category: "",
    district: "",
    latitude: o.lat,
    longitude: o.lng,
    address: "",
    shortDesc: "",
  };
}

/** nearest-neighbor 방문 순서. (RouteEngine.nearestNeighborOrder) */
function nearestNeighborOrder(start: POI, pois: POI[]): POI[] {
  let remaining = pois.filter((p) => p.id !== start.id);
  const ordered: POI[] = [start];
  let current = start;
  while (remaining.length) {
    let bestIdx = 0;
    let best = Infinity;
    remaining.forEach((p, i) => {
      const d = distanceMeters(toLatLng(current), toLatLng(p));
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    });
    current = remaining[bestIdx];
    ordered.push(current);
    remaining = remaining.filter((_, i) => i !== bestIdx);
  }
  return ordered;
}

export class NotEnoughStopsError extends Error {
  constructor() {
    super("루트를 만들려면 거점이 2곳 이상 필요합니다.");
  }
}

/** 토이 buildRoute(start:through:) 와 동일 인터페이스. */
export async function buildRoute(start: POI, through: POI[]): Promise<Route> {
  const stopsToVisit = through.some((p) => p.id === start.id)
    ? through
    : [start, ...through];
  if (stopsToVisit.length < 2) throw new NotEnoughStopsError();

  const ordered = nearestNeighborOrder(start, stopsToVisit);

  const paths: LatLng[][] = [];
  const stops: RouteStop[] = [
    { poi: ordered[0], order: 0, cumulativeDistance: 0, cumulativeTime: 0 },
  ];
  let cumDist = 0;
  let cumTime = 0;

  for (let i = 0; i < ordered.length - 1; i++) {
    const from = ordered[i];
    const to = ordered[i + 1];
    try {
      const seg = await walkSegment(toLatLng(from), toLatLng(to));
      paths.push(seg.path);
      cumDist += seg.distance;
      cumTime += seg.time;
    } catch {
      // 직선 폴백
      const d = distanceMeters(toLatLng(from), toLatLng(to));
      paths.push([toLatLng(from), toLatLng(to)]);
      cumDist += d * 1.3;
      cumTime += (d * 1.3) / 1.3; // ≈ 1.3 m/s 보행
    }
    stops.push({
      poi: to,
      order: i + 1,
      cumulativeDistance: cumDist,
      cumulativeTime: cumTime,
    });
  }

  return { stops, paths, totalDistance: cumDist, totalTravelTime: cumTime };
}
