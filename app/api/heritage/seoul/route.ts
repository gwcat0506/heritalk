// 서울 국가유산 목록 — KHS 라이브(서버에서 호출 → CORS 회피). /map 마커용. POI 형상으로 반환.
import { NextResponse } from "next/server";
import { getSeoulHeritageList } from "@/lib/khs";
import { khsToPoi } from "@/lib/places";

export const runtime = "nodejs";
export const revalidate = 86400; // 하루 캐시

export async function GET() {
  try {
    const list = await getSeoulHeritageList();
    return NextResponse.json({ places: list.map(khsToPoi) });
  } catch (e) {
    console.error("seoul list error", e);
    return NextResponse.json({ places: [], error: "목록 조회 실패" }, { status: 200 });
  }
}
