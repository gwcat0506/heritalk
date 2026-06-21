// 투어 경로/타이밍 — 순수 함수(서버·클라 공용). feat/tour-docent 이식, haversine은 lib/poi 재사용.
import { distanceMeters } from "@/lib/poi";
import type { LatLng } from "@/lib/types";

/** 경로 위의 한 점 — 출발지로부터 누적 거리(m) 포함. */
export interface PathPoint extends LatLng {
  dist: number;
}

/** 투어 정류지(=/api/tour 응답 stop). */
export interface TourStop {
  order: number;
  id: string;
  name: string;
  designation: string;
  era: string;
  address: string;
  imageUrl?: string | null;
  lat: number;
  lng: number;
  cumDist: number;
  legMin: number;
  segments: string[];
}

/** /api/tour 응답 = 한 번의 투어(경로 + 스토리). 저장 시 그대로 직렬화. */
export interface TourData {
  path: PathPoint[];
  totalDistance: number;
  totalMinutes: number;
  intro: string;
  outro: string;
  stops: TourStop[];
}

export const WALK_MPS = 1.3; // 보행 속도 ≈ 1.3 m/s (약 78 m/분)

/** 거리(m) → 도보 분(최소 1분). */
export function walkMinutes(distM: number): number {
  return Math.max(1, Math.round(distM / WALK_MPS / 60));
}

/**
 * 좌표열(route.paths 평탄화 또는 TMap LineString)에 누적거리를 붙이고,
 * 각 정류지(stops)가 경로 상에서 가장 가까운 점의 누적거리를 찾는다.
 */
export function attachDistances(
  coords: LatLng[],
  stops: LatLng[]
): { path: PathPoint[]; stopDist: number[] } {
  const path: PathPoint[] = [];
  let acc = 0;
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) acc += distanceMeters(coords[i - 1], coords[i]);
    path.push({ ...coords[i], dist: acc });
  }
  const stopDist = stops.map((s) => {
    let bd = Infinity;
    let bDist = 0;
    for (const p of path) {
      const d = distanceMeters(s, p);
      if (d < bd) {
        bd = d;
        bDist = p.dist;
      }
    }
    return bDist;
  });
  return { path, stopDist };
}

/** 누적거리 path에서 traveled(m) 위치의 좌표를 보간(미리보기 이동점). */
export function positionAt(path: PathPoint[], traveled: number): LatLng {
  if (path.length === 0) return { lat: 0, lng: 0 };
  if (traveled <= 0) return { lat: path[0].lat, lng: path[0].lng };
  const total = path[path.length - 1].dist;
  if (traveled >= total)
    return { lat: path[path.length - 1].lat, lng: path[path.length - 1].lng };
  for (let i = 1; i < path.length; i++) {
    if (path[i].dist >= traveled) {
      const a = path[i - 1];
      const b = path[i];
      const span = b.dist - a.dist || 1;
      const t = (traveled - a.dist) / span;
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
  }
  return { lat: path[path.length - 1].lat, lng: path[path.length - 1].lng };
}
