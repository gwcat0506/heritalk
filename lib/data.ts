// 거점 데이터 소스. 116곳은 정적이므로 시드 JSON을 직접 로드(키 불필요).
// 사용자 데이터(저장 코스·대화)·사료 RAG만 Supabase를 쓴다.
import seoulPois from "@/data/seoul_pois.json";
import type { POI } from "./types";

export const ALL_POIS: POI[] = seoulPois as unknown as POI[];

export function getPoi(id: string): POI | undefined {
  return ALL_POIS.find((p) => p.id === id);
}

export function getPois(ids: string[]): POI[] {
  const map = new Map(ALL_POIS.map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter((p): p is POI => !!p);
}
