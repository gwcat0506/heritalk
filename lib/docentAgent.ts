// 서버 전용 — 도슨트 도구 호출 에이전트 루프(Gemini function calling).
// 모델이 도구 호출 → 서버 실행 → 결과 반환 → 반복 → 최종 답변 스트림. 이벤트 제너레이터로 방출.
import {
  GoogleGenerativeAI,
  SchemaType,
  type Tool,
  type Content,
  type GenerationConfig,
} from "@google/generative-ai";
import { ALL_POIS, getPoi } from "./data";
import { nearby, distanceMeters } from "./poi";
import { depthFor } from "./gemini";
import type { Citation, LatLng, POI } from "./types";

const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = KEY ? new GoogleGenerativeAI(KEY) : null;
const MODEL = process.env.DOCENT_MODEL || "gemini-2.5-flash";
const MAX_STEPS = 4;
const SEOUL: LatLng = { lat: 37.5759, lng: 126.9769 };

export type AgentEvent =
  | { t: "delta"; text: string }
  | { t: "tool"; name: string }
  | { t: "action"; action: "addToCourse"; poi: POI }
  | { t: "citations"; items: Citation[] }
  | { t: "error"; text: string };

export interface AgentOpts {
  question: string;
  history?: { role: string; content: string }[];
  placeId?: string;
  placeName?: string;
  context?: string; // 거점 공식 설명문(grounding)
  general?: boolean;
  level?: string;
  language?: string;
  interests?: string[];
  origin?: LatLng; // 현재 위치(근처 찾기 기준)
}

const TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "find_nearby_places",
        description:
          "사용자의 현재 위치 주변에 있는 한국 역사·유산 거점을 찾는다. '근처/주변에 뭐 있어?' 같은 질문에 사용.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: "선택: 카테고리/키워드(예: 박물관, 궁궐, 사적)",
            },
            limit: { type: SchemaType.NUMBER, description: "반환 개수(기본 5, 최대 8)" },
          },
        },
      },
      {
        name: "lookup_heritage",
        description: "이름/키워드로 특정 유산·거점의 정보(시대·소개·자치구)를 조회한다.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: "유산/장소 이름 또는 키워드" },
          },
          required: ["name"],
        },
      },
      {
        name: "get_directions",
        description: "특정 거점까지의 길찾기(지도) 링크를 제공한다.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: "목적지 거점 이름 또는 키워드" },
          },
          required: ["name"],
        },
      },
      {
        name: "add_to_course",
        description:
          "특정 거점을 사용자의 도보 코스에 추가한다. '코스에 담아줘/추가해줘'라고 할 때 사용.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: "추가할 거점 이름 또는 키워드" },
          },
          required: ["name"],
        },
      },
    ],
  },
];

function resolvePoi(name?: string): POI | undefined {
  const q = (name ?? "").trim().toLowerCase();
  if (!q) return undefined;
  return (
    ALL_POIS.find((p) => p.name.toLowerCase() === q) ??
    ALL_POIS.find(
      (p) => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase())
    )
  );
}

type ToolArgs = Record<string, unknown>;

function execTool(
  name: string,
  args: ToolArgs,
  ctx: { origin?: LatLng }
): { response: object; action?: AgentEvent } {
  switch (name) {
    case "find_nearby_places": {
      const origin = ctx.origin ?? SEOUL;
      const limit = Math.min(8, Math.max(1, Number(args.limit) || 5));
      const near = nearby(ALL_POIS, origin, 50_000, 30);
      const q = String(args.query ?? "").trim().toLowerCase();
      const filtered = q
        ? near.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.category.toLowerCase().includes(q) ||
              p.district.toLowerCase().includes(q)
          )
        : near;
      const places = (filtered.length ? filtered : near).slice(0, limit).map((p) => ({
        name: p.name,
        district: p.district,
        category: p.category,
        distance_m: Math.round(distanceMeters(origin, { lat: p.latitude, lng: p.longitude })),
      }));
      return { response: { places } };
    }
    case "lookup_heritage": {
      const p = resolvePoi(String(args.name ?? ""));
      if (!p) return { response: { found: false } };
      return {
        response: {
          found: true,
          name: p.name,
          era: p.era ?? null,
          district: p.district,
          category: p.category,
          summary: (p.shortDesc ?? "").slice(0, 500),
        },
      };
    }
    case "get_directions": {
      const p = resolvePoi(String(args.name ?? ""));
      if (!p) return { response: { found: false } };
      const url = `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.latitude},${p.longitude}`;
      return { response: { found: true, name: p.name, url } };
    }
    case "add_to_course": {
      const p = resolvePoi(String(args.name ?? ""));
      if (!p) return { response: { ok: false } };
      return {
        response: { ok: true, name: p.name },
        action: { t: "action", action: "addToCourse", poi: p },
      };
    }
    default:
      return { response: { error: "unknown tool" } };
  }
}

function systemInstruction(opts: AgentOpts): string {
  const en = opts.language === "en";
  const base = opts.general
    ? en
      ? "You are Heri, a friendly AI docent for Korean history and heritage."
      : "너는 한국 역사·유산을 안내하는 친근한 AI 도슨트 '헤리'다."
    : en
    ? "You are Heri, an AI docent for Korean heritage sites; ground answers in the provided '자료' when available."
    : "너는 한국 역사 거점을 안내하는 AI 도슨트 '헤리'다. 제공된 '자료'가 있으면 그것에 근거해 답한다.";
  const lang = en ? "Answer in natural English." : "정확하고 간결한 한국어로 답한다.";
  const depth = (en ? "Tone & depth: " : "말투·난이도: ") + depthFor(opts.level, opts.language) + ".";
  const interests = opts.interests?.length
    ? en
      ? `The visitor is interested in: ${opts.interests.join(", ")}.`
      : `방문자 관심사: ${opts.interests.join(", ")}.`
    : "";
  const toolGuide = en
    ? "Use tools when helpful: find_nearby_places for 'what's nearby', lookup_heritage for facts about a specific place, get_directions for how to get somewhere, add_to_course when the user asks to add a stop. Don't fabricate; if unsure, look it up. After tools, give a short natural reply (3-5 sentences)."
    : "필요하면 도구를 써라: 주변 질문엔 find_nearby_places, 특정 거점 사실은 lookup_heritage, 길 안내는 get_directions, 코스 추가 요청엔 add_to_course. 지어내지 말고 불확실하면 조회해라. 도구 사용 후 3~5문장으로 자연스럽게 답한다.";
  return [base, lang, depth, interests, toolGuide].filter(Boolean).join(" ");
}

function userText(opts: AgentOpts): string {
  if (opts.general || !opts.context) return opts.question;
  return `[거점] ${opts.placeName ?? ""}\n[자료]\n${opts.context}\n\n[질문]\n${opts.question}`;
}

export async function* runDocentAgent(opts: AgentOpts): AsyncGenerator<AgentEvent> {
  if (!genAI) {
    yield {
      t: "delta",
      text:
        opts.language === "en"
          ? "The AI docent needs GOOGLE_GENERATIVE_AI_API_KEY to answer."
          : "AI 도슨트 연결이 필요해요 (GOOGLE_GENERATIVE_AI_API_KEY 설정 필요).",
    };
    return;
  }

  // 거점 모드면 공식 설명을 출처로 1건 먼저 방출(기존 동작 유지).
  if (opts.context && opts.placeName) {
    yield {
      t: "citations",
      items: [
        {
          passageId: opts.placeId ?? opts.placeName,
          sourceTitle: "국가유산청",
          sourceRef: opts.placeName,
          snippet: opts.context.slice(0, 120),
        },
      ],
    };
  }

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemInstruction(opts),
    tools: TOOLS,
    generationConfig: {
      maxOutputTokens: 800,
      thinkingConfig: { thinkingBudget: 0 },
    } as unknown as GenerationConfig,
  });

  const mapped: Content[] = (opts.history ?? []).slice(-8).map((h) => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.content }],
  }));
  // Gemini는 history가 (a) 'user'로 시작하고 (b) user/model 엄격 교대여야 함.
  // 도구 사용 시 보조 노트+답변처럼 연속 같은 role이 생길 수 있어 → 인접 동일 role 병합.
  const history: Content[] = [];
  for (const c of mapped) {
    const last = history[history.length - 1];
    if (last && last.role === c.role) {
      last.parts = [{ text: `${(last.parts[0] as { text: string }).text}\n${(c.parts[0] as { text: string }).text}` }];
    } else {
      history.push({ role: c.role, parts: [{ text: (c.parts[0] as { text: string }).text }] });
    }
  }
  while (history.length && history[0].role !== "user") history.shift(); // 선행 model 제거
  const chat = model.startChat({ history });

  // 첫 메시지: grounding 컨텍스트 + 질문
  let parts: Array<{ text: string } | { functionResponse: { name: string; response: object } }> = [
    { text: userText(opts) },
  ];

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const result = await chat.sendMessageStream(parts);
      for await (const chunk of result.stream) {
        let tt = "";
        try {
          tt = chunk.text();
        } catch {
          tt = "";
        }
        if (tt) yield { t: "delta", text: tt };
      }
      const resp = await result.response;
      const calls = resp.functionCalls?.() ?? [];
      if (!calls.length) return; // 최종 답변 완료

      const next: Array<{ functionResponse: { name: string; response: object } }> = [];
      for (const call of calls) {
        yield { t: "tool", name: call.name };
        const { response, action } = execTool(call.name, (call.args ?? {}) as ToolArgs, {
          origin: opts.origin,
        });
        if (action) yield action;
        next.push({ functionResponse: { name: call.name, response } });
      }
      parts = next;
    }
  } catch (e) {
    console.error("docent agent error", e);
    yield { t: "error", text: "" };
  }
}
