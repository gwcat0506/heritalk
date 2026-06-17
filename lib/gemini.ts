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

/**
 * 답변 생성. 키 없으면 null(호출측이 폴백).
 * - 거점 모드(기본): '자료'(사료+거점 요약)에 근거해서만 답함.
 * - 일반 모드(general): 장소 무관, 한국 역사·유산 전반을 Gemini 지식으로 답함.
 */
export async function generateAnswer(opts: {
  question: string;
  placeName: string;
  context: string; // 사료 청크 + 거점 요약 (일반 모드에선 비어도 됨)
  history?: { role: string; content: string }[];
  general?: boolean;
}): Promise<string | null> {
  if (!genAI) return null;

  const systemInstruction = opts.general
    ? [
        "너는 한국 역사·유산을 안내하는 친근한 AI 도슨트다.",
        "방문자의 질문에 정확하고 간결한 한국어로 답한다.",
        "확실치 않거나 모르는 내용은 단정하지 말고 솔직히 밝힌다.",
        "답변은 3~5문장으로.",
      ].join(" ")
    : [
        "너는 한국 역사 거점을 안내하는 AI 도슨트다.",
        "아래 '자료'에 있는 내용만 근거로, 친근하고 간결한 한국어로 답한다.",
        "자료에 없는 내용은 지어내지 말고 '이 부분은 제가 가진 자료에는 없어요'라고 말한다.",
        "답변은 3~5문장으로.",
      ].join(" ");

  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction,
    // gemini-2.5-flash는 thinking이 기본 켜져 출력이 잘림 → 비활성화 + 출력 토큰 확보
    // (SDK 0.21 타입엔 thinkingConfig 미정의 → 캐스트)
    generationConfig: { maxOutputTokens: 800, thinkingConfig: { thinkingBudget: 0 } } as unknown as GenerationConfig,
  });

  const historyText = (opts.history ?? [])
    .slice(-4)
    .map((h) => `${h.role === "user" ? "방문자" : "도슨트"}: ${h.content}`)
    .join("\n");

  const prompt = opts.general
    ? `${historyText ? `[이전 대화]\n${historyText}\n\n` : ""}[질문]\n${opts.question}`
    : `[거점] ${opts.placeName}

[자료]
${opts.context || "(관련 사료 없음)"}

${historyText ? `[이전 대화]\n${historyText}\n` : ""}[질문]
${opts.question}`;

  const res = await model.generateContent(prompt);
  return res.response.text();
}
