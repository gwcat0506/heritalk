/**
 * 영문명 seed: 정적 거점(data/seoul_pois.json)에 nameEn 추가 +
 * 서울 KHS 목록 영문맵(data/khs_names_en.json, koName→en) 생성.
 * 실행: bun run scripts/seed-names-en.ts   (GOOGLE_GENERATIVE_AI_API_KEY 필요)
 *
 * 증분·내성: 이미 번역된 항목은 건너뛰고, 429(쿼터)면 백오프 재시도.
 * 부분 성공분은 즉시 파일에 기록하므로 쿼터 소진 후 재실행하면 이어서 채운다.
 * 앱 도슨트(gemini-2.5-flash)와 쿼터를 나누지 않도록 lite 모델 사용.
 */
import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { getSeoulHeritageList } from "../lib/khs";

const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!KEY) {
  console.error("GOOGLE_GENERATIVE_AI_API_KEY 필요");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    responseMimeType: "application/json",
    thinkingConfig: { thinkingBudget: 0 },
  } as unknown as GenerationConfig,
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function translateBatch(names: string[]): Promise<Record<string, string>> {
  const prompt = `다음 한국 문화유산·박물관·거점 이름들을 자연스러운 영어 공식 명칭으로 번역하라.
고유명사는 국립국어원 로마자표기 + 의미역(예: 경복궁 → "Gyeongbokgung Palace",
국립중앙박물관 → "National Museum of Korea", 도산안창호기념관 → "Dosan An Chang-ho Memorial Hall").
반드시 JSON 객체로만 응답: { "한국어이름": "English Name", ... }

이름들:
${names.map((n) => `- ${n}`).join("\n")}`;
  // 429 백오프 재시도(최대 5회).
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await model.generateContent(prompt);
      const obj = JSON.parse(res.response.text());
      return obj && typeof obj === "object" ? (obj as Record<string, string>) : {};
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("429") && attempt < 4) {
        const wait = 5000 * (attempt + 1);
        console.warn(`  429 — ${wait / 1000}s 후 재시도 (${attempt + 1}/4)`);
        await sleep(wait);
        continue;
      }
      console.error("batch fail:", msg.slice(0, 120));
      return {};
    }
  }
  return {};
}

function chunk<T>(a: T[], n: number): T[][] {
  const o: T[][] = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}

async function main() {
  const CHUNK = 40;

  // 1) 정적 거점 — nameEn 없는 것만 증분 번역, 청크마다 즉시 저장.
  const path = "data/seoul_pois.json";
  const pois = JSON.parse(readFileSync(path, "utf8")) as { name: string; nameEn?: string }[];
  const haveStatic = new Set(pois.filter((p) => p.nameEn).map((p) => p.name));
  const needStatic = [...new Set(pois.map((p) => p.name))].filter((n) => !haveStatic.has(n));
  console.log(`static: ${pois.length - needStatic.length}/${pois.length} 이미 완료, ${needStatic.length} 필요`);
  for (const c of chunk(needStatic, CHUNK)) {
    const m = await translateBatch(c);
    if (!Object.keys(m).length) break; // 쿼터 소진 등 — 부분분만 남기고 중단
    for (const p of pois) if (m[p.name]) p.nameEn = m[p.name];
    writeFileSync(path, JSON.stringify(pois, null, 2) + "\n");
    console.log(`  static +${Object.keys(m).length} → ${pois.filter((p) => p.nameEn).length}/${pois.length}`);
  }

  // 2) KHS 서울 목록 — 기존 맵에 병합, 없는 것만 증분.
  const kPath = "data/khs_names_en.json";
  const kMap: Record<string, string> = existsSync(kPath)
    ? JSON.parse(readFileSync(kPath, "utf8"))
    : {};
  try {
    const khs = await getSeoulHeritageList();
    const needKhs = [...new Set(khs.map((h) => h.name))].filter((n) => !kMap[n]);
    console.log(`khs: ${Object.keys(kMap).length} 이미 완료, ${needKhs.length} 필요`);
    for (const c of chunk(needKhs, CHUNK)) {
      const m = await translateBatch(c);
      if (!Object.keys(m).length) break;
      Object.assign(kMap, m);
      writeFileSync(kPath, JSON.stringify(kMap, null, 2) + "\n");
      console.log(`  khs +${Object.keys(m).length} → ${Object.keys(kMap).length}`);
    }
  } catch (e) {
    console.error("KHS list fail:", (e as Error).message);
  }
}

main();
