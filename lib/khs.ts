// 국가유산청(KHS) OpenAPI — 서울 한정 라이브 조회. 서버 전용(무인증·무료, XML).
// heritalk main:lib/api/heritage.ts 차용 + 서울(ccbaCtcd=11) 고정.
// API 호출 중심: Supabase 저장 없이 Next fetch revalidate 캐싱만 사용.
import { XMLParser } from "fast-xml-parser";

const BASE = "https://www.khs.go.kr/cha";
const CTCD = "11"; // 서울특별시

// 지정종류: 국보11·보물12·사적13·명승14·천연기념물15·시도유형21·시도기념물23
const KDCD_LIST = ["11", "12", "13", "14", "15", "21", "23"] as const;

export const DESIGNATION_BY_KDCD: Record<string, string> = {
  "11": "국보",
  "12": "보물",
  "13": "사적",
  "14": "명승",
  "15": "천연기념물",
  "21": "시도유형문화유산",
  "23": "시도기념물",
};

export interface KhsHeritage {
  id: string; // `${ccbaKdcd}_${ccbaAsno}`
  kdcd?: string; // 지정종류 코드
  asno?: string; // 관리번호
  name: string;
  designation: string; // ccmaName (국보·보물·사적…)
  district: string; // ccsiName (자치구)
  lat: number;
  lng: number;
  // 상세에서만
  address?: string;
  era?: string;
  description?: string;
  summaryAi?: string; // Claude 정규화 요약(있으면 표시 우선)
  imageUrl?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  cdataPropName: "__cdata",
  isArray: (name) => name === "item",
  trimValues: true,
  parseTagValue: false, // 앞자리 0 보존(ccbaAsno)
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cdata(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object" && "__cdata" in val) return String(val.__cdata).trim();
  return String(val).trim();
}

/** Haversine 거리(m). */
export function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

async function fetchList(kdcd: string) {
  const url = `${BASE}/SearchKindOpenapiList.do?pageUnit=100&pageIndex=1&ccbaCtcd=${CTCD}&ccbaKdcd=${kdcd}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return [];
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const items = parsed?.result?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

/** 서울 전체 국가유산 목록(지정종류 병렬). 좌표/이름 없는 항목·중복 제거. */
export async function getSeoulHeritageList(): Promise<KhsHeritage[]> {
  const results = await Promise.all(KDCD_LIST.map((k) => fetchList(k)));
  const seen = new Set<string>();
  const out: KhsHeritage[] = [];
  for (const item of results.flat()) {
    const id = `${item.ccbaKdcd}_${item.ccbaAsno}`;
    if (seen.has(id)) continue;
    const lat = parseFloat(item.latitude ?? "0");
    const lng = parseFloat(item.longitude ?? "0");
    const name = cdata(item.ccbaMnm1);
    if (!name || !lat || !lng) continue;
    seen.add(id);
    out.push({
      id,
      kdcd: String(item.ccbaKdcd),
      asno: String(item.ccbaAsno),
      name,
      designation: cdata(item.ccmaName) || DESIGNATION_BY_KDCD[item.ccbaKdcd] || "",
      district: cdata(item.ccsiName),
      lat,
      lng,
    });
  }
  return out;
}

/** 서울 거점 상세(주소·시대·설명·이미지). */
export async function getSeoulHeritageDetail(id: string): Promise<KhsHeritage | null> {
  const [kdcd, asno] = id.split("_");
  const url = `${BASE}/SearchKindOpenapiDt.do?ccbaKdcd=${kdcd}&ccbaAsno=${asno}&ccbaCtcd=${CTCD}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const root = parsed?.result;
  const item = Array.isArray(root?.item) ? root.item[0] : root?.item;
  if (!item) return null;
  return {
    id,
    kdcd,
    asno,
    name: cdata(item.ccbaMnm1),
    designation: cdata(item.ccmaName) || DESIGNATION_BY_KDCD[kdcd] || "",
    district: cdata(item.ccsiName),
    lat: parseFloat(root.latitude ?? item.latitude ?? "0"),
    lng: parseFloat(root.longitude ?? item.longitude ?? "0"),
    address: cdata(item.ccbaLcad),
    era: cdata(item.ccceName),
    description: cdata(item.content),
    imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
  };
}
