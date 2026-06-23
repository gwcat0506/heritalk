// 서버: 채팅 도슨트 — 도구 호출 에이전트 루프(lib/docentAgent). 응답 = NDJSON 이벤트 스트림.
import { getPoi } from "@/lib/data";
import { isKhsId, getPlaceCached } from "@/lib/places";
import { runDocentAgent } from "@/lib/docentAgent";
import type { LatLng } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { placeId, question, history, level, language, interests, origin } =
    (await req.json()) as {
      placeId?: string;
      question: string;
      history?: { role: string; content: string }[];
      level?: string;
      language?: string;
      interests?: string[];
      origin?: LatLng;
    };

  if (!question?.trim()) {
    return Response.json({ error: "질문이 비었습니다." }, { status: 400 });
  }

  // placeId 있으면 거점 모드(정적 116 또는 KHS), 없으면 일반.
  let poi: { name: string; description: string; era?: string | null } | null = null;
  if (placeId) {
    if (isKhsId(placeId)) {
      const k = await getPlaceCached(placeId);
      if (k) poi = { name: k.name, description: k.description ?? k.summaryAi ?? "", era: k.era };
    } else {
      const p = getPoi(placeId);
      if (p) poi = { name: p.name, description: p.shortDesc, era: p.era };
    }
    if (!poi) {
      return Response.json({ error: "거점을 찾을 수 없습니다." }, { status: 404 });
    }
  }
  const general = !poi;
  const context = [poi?.description ?? "", poi?.era ? `시대: ${poi.era}` : ""]
    .filter(Boolean)
    .join("\n");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of runDocentAgent({
          question,
          history,
          placeId,
          placeName: poi?.name,
          context: context || undefined,
          general,
          level,
          language,
          interests,
          origin,
        })) {
          controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
        }
      } catch (e) {
        console.error("docent stream error", e);
        controller.enqueue(encoder.encode(JSON.stringify({ t: "error", text: "" }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
