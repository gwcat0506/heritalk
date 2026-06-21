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

// ── 투어 도슨트 스토리텔링 (전체 줄기 + 정류지별 해설 토막 + intro/outro) ──
export interface TourStopInput {
  name: string;
  designation: string;
  era: string;
  description: string;
  legMin: number;
}
export interface TourStory {
  intro: string;
  stops: { segments: string[] }[];
  outro: string;
}

/**
 * 코스 전체를 "하나로 이어지는 이야기"로 엮어 정류지별 해설 토막(segments)을 생성.
 * 난이도(child/general/expert) 반영. JSON 강제(responseMimeType). 실패 시 빈 스토리.
 */
export async function generateTourStory(
  stops: TourStopInput[],
  level: string = "general"
): Promise<TourStory> {
  const empty: TourStory = { intro: "", stops: [], outro: "" };
  if (!genAI || stops.length === 0) return empty;

  const depth =
    level === "child"
      ? "초등학생도 이해할 만큼 쉬운 말과 비유로 풀되, 내용은 풍부하게"
      : level === "expert"
      ? "역사 애호가가 만족할 깊이로, 시대 배경·인물·제도·건축/미술사적 의의까지"
      : "일반 성인이 흥미롭게 따라올 수 있게, 배경 맥락과 뒷이야기를 충분히";

  const stopInfo = stops
    .map(
      (s, i) =>
        `${i + 1}번째 「${s.name}」 (${s.designation}, ${s.era || "시대미상"}) — 직전 지점에서 도보 약 ${s.legMin}분\n   자료: ${s.description.slice(0, 600) || "(상세 설명 없음 — 일반적 역사 지식으로 보완)"}`
    )
    .join("\n\n");

  const names = stops.map((s, i) => `${i + 1}.${s.name}`).join("  ");

  const prompt = `당신은 한국 국가유산 도보 투어를 이끄는 AI 도슨트 "헤리"입니다. 한 명의 일관된 해설자로서, 아래 ${stops.length}곳을 "하나로 이어지는 이야기"로 안내합니다.

[오늘의 방문 순서]  ${names}

[각 장소 자료]
${stopInfo}

가장 중요한 원칙 — 각 장소를 따로 노는 별개 설명으로 만들지 말 것:
1) 먼저 이 장소들을 관통하는 하나의 큰 줄기(공통 시대·인물·사건·주제 등 무엇이든 자료에서 찾아)를 정한다. 그 줄기를 intro에서 제시하고, 모든 장소 해설이 그 줄기에 매달리게 한다.
2) 각 장소 해설은 하나의 긴 문단이 아니라, 그 장소에 "다가가며" 하나씩 듣는 해설 토막(segments)으로 나눈다. 한 장소당 3~5개, 각 토막은 1~2문장의 짧고 완결된 조각이다. 첫 토막은 그 장소가 가까워지는 시점의 안내로 시작하고("곧 ~가 보입니다 / 이제 ~로 다가가고 있어요" 같은), 이어지는 토막들이 (a)앞 장소와의 연결 → (b)구체적 연도·인물·사건의 깊은 본론 → (c)전체 줄기 속 의미로 흐른다. ※ "도착했습니다" 같은 도착 표현은 쓰지 말 것(도착 안내는 시스템이 따로 표시함). 어디까지나 다가가는 중에 미리 들려주는 해설이다.
3) 각 토막은 그 자체로 읽기 쉬워야 한다. 한 토막에 여러 주제를 욱여넣지 말 것. 마지막 토막에서는 다음 장소 이름을 언급해 다리를 놓는다(마지막 장소 제외).
4) 방문 순서가 시대순이 아니면 "시간을 거슬러 가보면" 식으로 자연스럽게 연결한다.
5) outro는 전체를 하나의 흐름으로 되짚는 마무리.
말투는 친근하고 생생하게(${depth}). 자료에 없는 사실을 지어내지 말고, 자료가 빈약하면 일반적으로 널리 알려진 역사 상식 수준에서 신중히 보완한다.

다음 JSON 형식으로만 응답(다른 텍스트 없이):
{
  "intro": "투어 시작 인사 + 오늘 코스를 관통하는 줄기를 제시하는 2~3문장.",
  "stops": [
    { "segments": ["1~2문장짜리 이야기 토막", "다음 토막", "...(장소당 3~5개)"] }
  ],
  "outro": "전체를 하나로 정리하는 마무리 2~3문장."
}`;

  try {
    const model = genAI.getGenerativeModel({
      model: CHAT_MODEL,
      generationConfig: {
        maxOutputTokens: 3000,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      } as unknown as GenerationConfig,
    });
    const res = await model.generateContent(prompt);
    const parsed = JSON.parse(res.response.text());
    return {
      intro: typeof parsed.intro === "string" ? parsed.intro : "",
      stops: Array.isArray(parsed.stops)
        ? parsed.stops.map((s: unknown) => ({
            segments:
              s && Array.isArray((s as { segments?: unknown }).segments)
                ? (s as { segments: unknown[] }).segments.filter(
                    (x): x is string => typeof x === "string" && x.trim().length > 0
                  )
                : [],
          }))
        : [],
      outro: typeof parsed.outro === "string" ? parsed.outro : "",
    };
  } catch {
    return empty;
  }
}
