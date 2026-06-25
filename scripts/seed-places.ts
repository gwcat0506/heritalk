/**
 * seoul_pois.json 116곳 → Supabase `places` upsert.
 * (앱은 거점을 시드 JSON에서 직접 읽지만, 운영 백본/RLS·향후 쿼리를 위해 DB에도 적재한다.)
 * 매핑은 docs/02_DB설계.md §5(토이 → 서비스 매핑/시드) 기준.
 *
 * 실행: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL 설정 후
 *   npm run seed:places
 */
import { createClient } from "@supabase/supabase-js";
import seoulPois from "../data/seoul_pois.json";

type POI = (typeof seoulPois)[number];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

function typeOf(category: string): string {
  if (category === "사적") return "historic_site";
  if (category === "박물관") return "museum";
  if (category === "미술관" || category === "갤러리") return "gallery";
  return "museum";
}

async function main() {
  const rows = (seoulPois as POI[]).map((p) => ({
    id: p.id,
    type: typeOf(p.category),
    name_ko: p.name,
    category: p.category,
    district: p.district,
    // PostGIS: ST_MakePoint(lng, lat). PostgREST RPC가 없으면 lng/lat 컬럼으로 적재 후 트리거 권장.
    // 여기서는 WKT EWKT 문자열로 geog 컬럼에 넣는다.
    geog: `SRID=4326;POINT(${p.longitude} ${p.latitude})`,
    address: p.address,
    summary_ko: p.shortDesc,
    thumbnail: p.imageUrl ?? null,
    source_id: p.category === "사적" ? "heritage_gis" : "museum_api",
    raw: p,
  }));

  const { error } = await supabase.from("places").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("upsert 실패:", error.message);
    process.exit(1);
  }
  console.log(`✅ places ${rows.length}곳 upsert 완료`);
}

main();
