// TMap 보행자 경로 API 래퍼 (서버 전용). MapKit MKDirections(.walking) 대체.
// docs: https://tmapapi.sktelecom.com  (POST /tmap/routes/pedestrian)
import type { LatLng } from "./types";

const ENDPOINT = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1";

export interface WalkSegment {
  path: LatLng[]; // 좌표열(LineString)
  distance: number; // m
  time: number; // s
}

/** 한 구간 도보 경로. 실패 시 throw(호출측이 직선 폴백). */
export async function walkSegment(from: LatLng, to: LatLng): Promise<WalkSegment> {
  const appKey = process.env.TMAP_APP_KEY;
  if (!appKey) throw new Error("TMAP_APP_KEY 미설정");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      appKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      startX: from.lng,
      startY: from.lat,
      endX: to.lng,
      endY: to.lat,
      startName: "출발",
      endName: "도착",
      reqCoordType: "WGS84GEO",
      resCoordType: "WGS84GEO",
      searchOption: "0",
    }),
    // 타임아웃: 구간 호출이 느리면 폴백으로 넘어가도록.
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`TMap ${res.status}`);
  const json = await res.json();
  const features: any[] = json.features ?? [];
  if (!features.length) throw new Error("TMap 경로 없음");

  const path: LatLng[] = [];
  let distance = 0;
  let time = 0;
  for (const f of features) {
    const props = f.properties ?? {};
    if (typeof props.totalDistance === "number") distance = props.totalDistance;
    if (typeof props.totalTime === "number") time = props.totalTime;
    if (f.geometry?.type === "LineString") {
      for (const [lng, lat] of f.geometry.coordinates as [number, number][]) {
        path.push({ lat, lng });
      }
    }
  }
  if (!path.length) throw new Error("TMap 좌표 없음");
  return { path, distance, time };
}
