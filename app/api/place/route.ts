// 장소(국가유산) 조회 — cache-aside. places 캐시 히트 시 DB, 미스 시 KHS 상세 fetch → places upsert.
import { NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { getSeoulHeritageDetail } from "@/lib/khs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const admin = createAdmin();

  // 1) 캐시 조회
  if (admin) {
    const { data } = await admin.from("places").select("*").eq("id", id).maybeSingle();
    if (data) return NextResponse.json({ place: data, cached: true });
  }

  // 2) 미스 → KHS 상세
  const d = await getSeoulHeritageDetail(id);
  if (!d) return NextResponse.json({ error: "거점을 찾을 수 없습니다." }, { status: 404 });

  const row = {
    id: d.id,
    kdcd: d.kdcd ?? id.split("_")[0],
    asno: d.asno ?? id.split("_")[1],
    name: d.name,
    designation: d.designation ?? null,
    district: d.district ?? null,
    lat: d.lat ?? null,
    lng: d.lng ?? null,
    address: d.address ?? null,
    era: d.era ?? null,
    summary: d.description ?? null,
    image_url: d.imageUrl ?? null,
    raw: d as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };

  // 3) places에 적재(service-role, RLS 우회)
  if (admin) {
    const { error } = await admin.from("places").upsert(row);
    if (error) console.error("place upsert 실패:", error.message);
  }

  return NextResponse.json({ place: row, cached: false });
}
