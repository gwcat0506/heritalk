// 거점(국가유산) 영속·어댑터 — 서버 전용(createAdmin 사용). 클라이언트에서 import 금지.
import { createAdmin } from "./supabase/admin";
import { getSeoulHeritageDetail, getSeoulHeritageImage, type KhsHeritage } from "./khs";
import type { POI } from "./types";
import khsNamesEn from "@/data/khs_names_en.json";

const KHS_EN = khsNamesEn as Record<string, string>;

/** KHS id 형식(`kdcd_asno`)이면 true, 정적 POI id면 false. */
export const isKhsId = (id: string) => id.includes("_");

/** KHS 거점 → UI가 쓰는 POI 형상으로 변환(브리지). */
export function khsToPoi(k: KhsHeritage): POI {
  return {
    id: k.id,
    name: k.name,
    nameEn: KHS_EN[k.name],
    category: k.designation || "국가유산",
    district: k.district || "",
    latitude: k.lat,
    longitude: k.lng,
    address: k.address ?? "",
    shortDesc: k.summaryAi ?? k.description ?? "", // AI 요약 우선, 없으면 원문

    imageUrl: k.imageUrl ?? null,
    era: k.era ?? null,
  };
}

// DB places 행(snake) ↔ KhsHeritage(camel)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToKhs(r: any): KhsHeritage {
  return {
    id: r.id,
    kdcd: r.kdcd ?? undefined,
    asno: r.asno ?? undefined,
    name: r.name,
    designation: r.designation ?? "",
    district: r.district ?? "",
    lat: r.lat,
    lng: r.lng,
    address: r.address ?? undefined,
    era: r.era ?? undefined,
    description: r.summary ?? undefined,
    summaryAi: r.summary_ai ?? undefined,
    imageUrl: r.image_url ?? undefined,
  };
}

function khsToRow(d: KhsHeritage) {
  return {
    id: d.id,
    kdcd: d.kdcd ?? d.id.split("_")[0],
    asno: d.asno ?? d.id.split("_")[1],
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
}

/**
 * 거점 상세 — cache-aside. places 히트 시 DB, 미스 시 KHS 상세 → places upsert(service-role).
 * 서버 전용.
 */
export async function getPlaceCached(id: string): Promise<KhsHeritage | null> {
  const admin = createAdmin();
  if (admin) {
    const { data } = await admin.from("places").select("*").eq("id", id).maybeSingle();
    if (data) return rowToKhs(data);
  }
  const d = await getSeoulHeritageDetail(id);
  if (!d) return null;
  if (!d.imageUrl) {
    const [kdcd, asno] = id.split("_");
    const img = await getSeoulHeritageImage(d.kdcd ?? kdcd, d.asno ?? asno);
    if (img) d.imageUrl = img;
  }
  if (admin) {
    const { error } = await admin.from("places").upsert(khsToRow(d));
    if (error) console.error("place upsert 실패:", error.message);
  }
  return d;
}
