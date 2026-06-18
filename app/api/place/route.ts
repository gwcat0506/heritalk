// 장소(국가유산) 조회 — cache-aside(lib/places.getPlaceCached). places 히트 시 DB, 미스 시 KHS→places upsert.
import { NextResponse } from "next/server";
import { getPlaceCached } from "@/lib/places";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const place = await getPlaceCached(id);
  if (!place) return NextResponse.json({ error: "거점을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ place });
}
