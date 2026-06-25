/**
 * 사료 시드 → Google 임베딩(text-embedding-004) → Supabase passages 적재.
 * 데모 시드(정약용·세종·이순신 + 거점 연결). 실제 운영은 한국사DB·문집총간 청크로 확장.
 *
 * 실행: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_GENERATIVE_AI_API_KEY 설정 후
 *   npm run seed:passages
 */
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!url || !serviceKey || !googleKey) {
  console.error("SUPABASE URL/SERVICE_ROLE_KEY, GOOGLE_GENERATIVE_AI_API_KEY 필요");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);
const genAI = new GoogleGenerativeAI(googleKey);
const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// 출처 → 청크. place_ids는 seoul_pois.json의 id(거점 연결), tags는 인물/시대.
const SEED: {
  source: { key: string; title: string; ref?: string; url?: string };
  passages: { content: string; place_ids?: string[]; tags?: string[] }[];
}[] = [
  {
    source: { key: "ksdb", title: "한국사데이터베이스", url: "https://db.history.go.kr" },
    passages: [
      {
        content:
          "정약용은 1801년 신유박해로 강진에 유배되어 18년간 머물며 목민심서·경세유표 등 500여 권의 저술을 남겼다. 강진 다산초당은 그 집필의 거점이었다.",
        tags: ["정약용", "조선", "실학", "유배"],
      },
      {
        content:
          "세종대왕은 1443년 훈민정음을 창제하고 1446년 반포하였다. 집현전 학자들과 함께 천문·음악·농업 등 다방면의 국가사업을 추진했다.",
        tags: ["세종", "조선", "훈민정음"],
      },
      {
        content:
          "이순신은 임진왜란 중 한산도대첩(1592)·명량해전(1597) 등에서 연전연승하며 제해권을 지켰다. 난중일기는 그 7년의 기록이다.",
        tags: ["이순신", "조선", "임진왜란"],
      },
    ],
  },
  {
    source: { key: "heritage", title: "국가유산청 국가유산 해설", url: "https://www.khs.go.kr" },
    passages: [
      {
        content:
          "조선 왕릉은 유교적 예법에 따라 조성된 능역으로, 봉분·정자각·홍살문 등이 자연 지형과 어우러진다. 2009년 유네스코 세계유산에 등재되었다.",
        tags: ["조선", "왕릉", "세계유산"],
      },
    ],
  },
];

async function embed(text: string): Promise<number[]> {
  const res = await embedModel.embedContent(text);
  return res.embedding.values;
}

async function main() {
  for (const block of SEED) {
    const { data: src, error: srcErr } = await supabase
      .from("sources")
      .insert({ title: block.source.title, ref: block.source.ref ?? null, url: block.source.url ?? null })
      .select("id")
      .single();
    if (srcErr || !src) {
      console.error("source insert 실패:", srcErr?.message);
      continue;
    }
    for (const p of block.passages) {
      const embedding = await embed(p.content);
      const { error } = await supabase.from("passages").insert({
        source_id: src.id,
        content: p.content,
        embedding,
        place_ids: p.place_ids ?? [],
        tags: p.tags ?? [],
      });
      if (error) console.error("passage insert 실패:", error.message);
      else console.log("  + 청크:", p.content.slice(0, 24), "…");
    }
  }
  console.log("✅ 사료 시드 적재 완료");
}

main();
