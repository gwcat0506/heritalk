// 서버: 채팅 도슨트 — RAG(사료) + Gemini. 키 미설정 시 거점 요약 폴백.
import { NextResponse } from "next/server";
import { getPoi } from "@/lib/data";
import { generateAnswer, hasGemini } from "@/lib/gemini";
import { searchPassages, toCitations } from "@/lib/rag";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { placeId, question, history } = (await req.json()) as {
      placeId?: string;
      question: string;
      history?: { role: string; content: string }[];
    };
    if (!question?.trim()) {
      return NextResponse.json({ error: "질문이 비었습니다." }, { status: 400 });
    }
    // placeId 있으면 거점 모드, 없으면 일반(장소 무관) 도슨트.
    const poi = placeId ? getPoi(placeId) : null;
    if (placeId && !poi) {
      return NextResponse.json({ error: "거점을 찾을 수 없습니다." }, { status: 404 });
    }
    const general = !poi;

    const t0 = Date.now();

    // 1) 사료 RAG (Supabase+임베딩 있을 때만 결과). 일반 모드면 place 필터 없음.
    const passages = await searchPassages(question, placeId, 4);
    const citations = toCitations(passages);

    // 2) 컨텍스트 = (거점 요약 +) 사료 청크
    const context = [
      poi ? `거점 소개: ${poi.shortDesc}` : "",
      poi?.era ? `시대: ${poi.era}` : "",
      ...passages.map((p, i) => `사료 ${i + 1} (${p.sourceTitle}): ${p.content}`),
    ]
      .filter(Boolean)
      .join("\n");

    // 3) 생성 (Gemini 있으면 LLM, 없으면 폴백)
    let answer: string | null = null;
    if (hasGemini) {
      answer = await generateAnswer({
        question,
        placeName: poi ? poi.name : "한국 역사·유산",
        context,
        history,
        general,
      });
    }
    if (!answer) {
      answer = poi
        ? `${poi.name} 소개입니다. ${poi.shortDesc}` +
          (passages.length
            ? `\n\n관련 사료에 따르면, ${passages[0].content.slice(0, 140)}…`
            : "\n\n(더 깊은 사료 답변은 AI 도슨트 연결 후 제공됩니다.)")
        : "AI 도슨트 연결이 필요해요. (GOOGLE_GENERATIVE_AI_API_KEY 설정 시 한국 역사·유산 질문에 답해드려요.)";
    }

    return NextResponse.json({
      answer,
      citations,
      latencyMs: Date.now() - t0,
    });
  } catch (e) {
    console.error("docent error", e);
    return NextResponse.json({ error: "도슨트 처리 실패" }, { status: 500 });
  }
}
