// 서버: 채팅 도슨트 — 스트리밍 생성 + 국가유산청 공식 설명 grounding.
// 응답 계약: 첫 줄 = JSON.stringify({ citations }) + "\n", 이후 = 답변 텍스트 토큰 스트림.
import { getPoi } from "@/lib/data";
import { isKhsId, getPlaceCached } from "@/lib/places";
import { streamAnswer, hasGemini } from "@/lib/gemini";
import type { Citation } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { placeId, question, history, level, language, interests } =
    (await req.json()) as {
      placeId?: string;
      question: string;
      history?: { role: string; content: string }[];
      level?: string;
      language?: string;
      interests?: string[];
    };

  if (!question?.trim()) {
    return Response.json({ error: "질문이 비었습니다." }, { status: 400 });
  }

  // placeId 있으면 거점 모드(정적 116 또는 KHS), 없으면 일반(장소 무관) 도슨트.
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

  // grounding 컨텍스트 = 거점 공식 설명문(전문) + 시대
  const context = [
    poi?.description ? poi.description : "",
    poi?.era ? `시대: ${poi.era}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // citations = 결정적. 거점 모드면 국가유산청 공식 설명을 출처로 1건, 일반 모드면 없음.
  const citations: Citation[] =
    poi && poi.description
      ? [
          {
            passageId: placeId!,
            sourceTitle: "국가유산청",
            sourceRef: poi.name,
            snippet: poi.description.slice(0, 120),
          },
        ]
      : [];

  const fallback = poi
    ? `${poi.name} 소개입니다. ${poi.description || "자세한 설명은 준비 중이에요."}`
    : "AI 도슨트 연결이 필요해요. (GOOGLE_GENERATIVE_AI_API_KEY 설정 시 한국 역사·유산 질문에 답해드려요.)";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // 1) 메타 라인(citations) 먼저
      controller.enqueue(encoder.encode(JSON.stringify({ citations }) + "\n"));
      try {
        // 2) 답변 토큰 스트림 (키 없으면 폴백 한 번)
        if (hasGemini) {
          let any = false;
          for await (const t of streamAnswer({
            question,
            placeName: poi ? poi.name : "한국 역사·유산",
            context,
            history,
            general,
            level,
            language,
            interests,
          })) {
            any = true;
            controller.enqueue(encoder.encode(t));
          }
          if (!any) controller.enqueue(encoder.encode(fallback));
        } else {
          controller.enqueue(encoder.encode(fallback));
        }
      } catch (e) {
        console.error("docent stream error", e);
        controller.enqueue(encoder.encode("\n\n(도슨트 응답 중 오류가 발생했어요.)"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
