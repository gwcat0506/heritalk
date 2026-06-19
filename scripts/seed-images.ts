// 서울 전체 KHS 거점을 places에 적재 + 대표 이미지 연결(이미지 API). 멱등.
// 실행: bun run scripts/seed-images.ts  (.env.local의 SUPABASE_SERVICE_ROLE_KEY 사용)
import { getSeoulHeritageList, getSeoulHeritageImage } from "../lib/khs";
import { createAdmin } from "../lib/supabase/admin";

const CONC = 8; // 동시 요청 제한

async function main() {
  const admin = createAdmin();
  if (!admin) {
    console.error("Supabase env(SUPABASE_SERVICE_ROLE_KEY/URL) 미설정");
    process.exit(1);
  }

  const list = await getSeoulHeritageList();
  console.log(`서울 거점 ${list.length}곳 — 이미지 조회·적재 시작`);

  let done = 0;
  let withImg = 0;

  for (let i = 0; i < list.length; i += CONC) {
    const batch = list.slice(i, i + CONC);
    await Promise.all(
      batch.map(async (p) => {
        const [fk, fa] = p.id.split("_");
        const img = await getSeoulHeritageImage(p.kdcd ?? fk, p.asno ?? fa);
        const row: Record<string, unknown> = {
          id: p.id,
          kdcd: p.kdcd ?? fk,
          asno: p.asno ?? fa,
          name: p.name,
          designation: p.designation ?? null,
          district: p.district ?? null,
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          updated_at: new Date().toISOString(),
        };
        if (img) row.image_url = img; // 이미지 있을 때만 기록(기존 이미지/summary 보존)
        const { error } = await admin.from("places").upsert(row);
        if (error) console.error("upsert 실패", p.id, error.message);
        else {
          done++;
          if (img) withImg++;
        }
      })
    );
    console.log(`...${Math.min(i + CONC, list.length)}/${list.length} (이미지 ${withImg})`);
  }

  console.log(`\n완료: ${done}곳 적재, 이미지 연결 ${withImg}곳`);
}

main();
