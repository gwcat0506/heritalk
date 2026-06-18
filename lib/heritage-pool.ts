// 코스·스와이프·홈추천용 "걸을 수 있는 장소 풀" (순수·클라이언트 안전).
// = 정적 박물관 42 + KHS 장소형(국보·보물 제외, 좌표 중복 제거).
import { ALL_POIS } from "./data";
import type { POI } from "./types";

// 장소형 지정종류(걸어가는 유적). 국보·보물(박물관 소장 이동형)은 제외.
const SITE_CATS = new Set([
  "사적",
  "명승",
  "천연기념물",
  "시도유형문화유산",
  "시도기념물",
  "사적 및 명승",
]);

const coordKey = (p: POI) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;

/** 정적 박물관 + KHS 장소형(좌표 dedupe)을 합친 워커블 풀. */
export function buildWalkablePool(khs: POI[]): POI[] {
  const museums = ALL_POIS.filter((p) => p.category === "박물관");
  const seen = new Set<string>();
  const sites: POI[] = [];
  for (const p of khs) {
    if (!SITE_CATS.has(p.category)) continue; // 국보·보물 등 이동형 제외
    const k = coordKey(p);
    if (seen.has(k)) continue; // 같은 좌표(박물관 stacking) 1개만
    seen.add(k);
    sites.push(p);
  }
  return [...museums, ...sites];
}
