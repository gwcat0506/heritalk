// 토이 Models/POI.swift · Route.swift 이식.

export type LatLng = { lat: number; lng: number };

/** 서울 역사 거점(박물관·기념관 / 국가지정 사적). seoul_pois.json 레코드와 1:1. */
export interface POI {
  id: string;
  name: string;
  category: string; // "박물관" | "사적"
  district: string; // 자치구
  latitude: number;
  longitude: number;
  address: string;
  shortDesc: string;
  imageUrl?: string | null; // 공공 이미지(없으면 폴백)
  era?: string | null; // 시대(사적)
}

export const coord = (p: POI): LatLng => ({ lat: p.latitude, lng: p.longitude });

/** 루트의 한 정류장. 시작점부터 누적 거리·시간 포함. (Route.swift RouteStop) */
export interface RouteStop {
  poi: POI;
  order: number; // 0 = 시작점
  cumulativeDistance: number; // m
  cumulativeTime: number; // s
}

/** 완성된 도보 루트. (Route.swift Route) — 폴리라인은 구간별 좌표열. */
export interface Route {
  stops: RouteStop[];
  paths: LatLng[][]; // 구간별 실제 도보 경로 좌표열(TMap)
  totalDistance: number; // m
  totalTravelTime: number; // s
}

/** 채팅 도슨트 출처 카드 (passage → source). */
export interface Citation {
  passageId: string;
  sourceTitle: string;
  sourceRef?: string | null;
  snippet: string;
}

export interface DocentMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}
