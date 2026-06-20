// Google Gemini — 채팅 도슨트 생성 + 임베딩(text-embedding-004, 768d). 서버 전용.
import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";

const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
export const hasGemini = !!KEY;

const genAI = KEY ? new GoogleGenerativeAI(KEY) : null;

const CHAT_MODEL = "gemini-2.5-flash"; // 무료 티어 허용 모델 (1.5-flash 은퇴)
const EMBED_MODEL = "text-embedding-004"; // 768차원

/** 질문/문서 임베딩(768d). 키 없거나 모델 미지원이면 null(RAG는 폴백). */
export async function embed(text: string): Promise<number[] | null> {
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
    const res = await model.embedContent(text);
    return res.embedding.values;
  } catch {
    return null;
  }
}

export interface AnswerOpts {
  question: string;
  placeName: string;
  context: string; // 거점 공식 설명문 (일반 모드에선 비어도 됨)
  history?: { role: string; content: string }[];
  general?: boolean;
}

// 모드별 시스템 지침 + 프롬프트 구성을 generateAnswer/streamAnswer가 공유.
function buildModel(general?: boolean) {
  const systemInstruction = general
    ? [
        "너는 한국 역사·유산을 안내하는 친근한 AI 도슨트다.",
        "방문자의 질문에 정확하고 간결한 한국어로 답한다.",
        "확실치 않거나 모르는 내용은 단정하지 말고 솔직히 밝힌다.",
        "답변은 3~5문장으로.",
      ].join(" ")
    : [
        "너는 한국 역사 거점을 안내하는 AI 도슨트다.",
        "아래 '자료'(국가유산청 공식 설명)에 근거해 친근하고 간결한 한국어로 답한다.",
        "자료에 없는 세부는 일반적 배경지식으로 보충하되, 단정 짓지 말고 솔직히 밝힌다.",
        "답변은 3~5문장으로.",
      ].join(" ");

  return genAI!.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction,
    // gemini-2.5-flash는 thinking이 기본 켜져 출력이 잘림 → 비활성화 + 출력 토큰 확보
    // (SDK 0.21 타입엔 thinkingConfig 미정의 → 캐스트)
    generationConfig: { maxOutputTokens: 800, thinkingConfig: { thinkingBudget: 0 } } as unknown as GenerationConfig,
  });
}

function buildPrompt(opts: AnswerOpts) {
  const historyText = (opts.history ?? [])
    .slice(-4)
    .map((h) => `${h.role === "user" ? "방문자" : "도슨트"}: ${h.content}`)
    .join("\n");

  return opts.general
    ? `${historyText ? `[이전 대화]\n${historyText}\n\n` : ""}[질문]\n${opts.question}`
    : `[거점] ${opts.placeName}

[자료]
${opts.context || "(공식 설명 없음 — 일반 배경지식으로 도와주세요)"}

${historyText ? `[이전 대화]\n${historyText}\n` : ""}[질문]
${opts.question}`;
}

/**
 * 답변 생성(논스트리밍). 키 없으면 null(호출측이 폴백).
 * - 거점 모드(기본): '자료'(국가유산청 공식 설명)에 근거.
 * - 일반 모드(general): 장소 무관, 한국 역사·유산 전반을 Gemini 지식으로 답함.
 */
export async function generateAnswer(opts: AnswerOpts): Promise<string | null> {
  if (!genAI) return null;
  const res = await buildModel(opts.general).generateContent(buildPrompt(opts));
  return res.response.text();
}

/** 답변 스트리밍 — 토큰 청크를 순차 yield. 키 없으면 아무것도 yield하지 않음(호출측 폴백). */
export async function* streamAnswer(opts: AnswerOpts): AsyncGenerator<string> {
  if (!genAI) return;
  const res = await buildModel(opts.general).generateContentStream(buildPrompt(opts));
  for await (const chunk of res.stream) {
    const t = chunk.text();
    if (t) yield t;
  }
}
