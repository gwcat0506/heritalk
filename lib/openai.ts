// OpenAI Chat Completions — REST(fetch) 직접 호출. SDK 의존성 없음(npm 락파일 영향 회피).
// 도슨트 에이전트(도구호출+스트리밍)와 투어 스토리(JSON) 공용. 서버 전용.
// OPENAI_API_KEY 있으면 활성화 → docentAgent / generateTourStory가 Gemini 대신 사용.

const KEY = process.env.OPENAI_API_KEY;
export const hasOpenAI = !!KEY;
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

// OpenAI Chat 메시지/도구 타입(필요한 만큼만).
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}
export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
export interface OpenAITool {
  type: "function";
  function: { name: string; description: string; parameters: object };
}

/** 파싱된 도구 호출(인자 객체화). */
export interface ResolvedToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export type TurnEvent =
  | { type: "delta"; text: string }
  | { type: "done"; content: string; toolCalls: ResolvedToolCall[] };

/**
 * 한 번의 모델 턴을 스트리밍. content 토큰은 {type:"delta"}로 방출하고,
 * 끝나면 {type:"done"}에 누적 content + 파싱된 도구호출을 담아 방출.
 * 네트워크/HTTP 오류는 throw(호출측 try/catch에서 처리).
 */
export async function* openaiTurn(
  messages: ChatMessage[],
  tools?: OpenAITool[]
): AsyncGenerator<TurnEvent> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      ...(tools?.length ? { tools, tool_choice: "auto" } : {}),
      stream: true,
      max_tokens: 800,
    }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`);
  }

  // 스트리밍 tool_calls는 index별 조각(id/name 1회 + arguments 누적)으로 들어옴.
  const accCalls = new Map<number, { id: string; name: string; args: string }>();
  let content = "";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? ""; // 마지막 불완전 라인은 보관
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith("data:")) continue;
      const data = s.slice(5).trim();
      if (data === "[DONE]") continue;
      let json: {
        choices?: { delta?: { content?: string; tool_calls?: StreamToolCallFragment[] } }[];
      };
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      const delta = json.choices?.[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        content += delta.content;
        yield { type: "delta", text: delta.content };
      }
      for (const tc of delta.tool_calls ?? []) {
        const idx = tc.index ?? 0;
        const cur = accCalls.get(idx) ?? { id: "", name: "", args: "" };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name = tc.function.name;
        if (tc.function?.arguments) cur.args += tc.function.arguments;
        accCalls.set(idx, cur);
      }
    }
  }

  const toolCalls: ResolvedToolCall[] = [...accCalls.values()]
    .filter((c) => c.name)
    .map((c) => {
      let args: Record<string, unknown> = {};
      try {
        args = c.args ? JSON.parse(c.args) : {};
      } catch {
        args = {};
      }
      return { id: c.id, name: c.name, args };
    });

  yield { type: "done", content, toolCalls };
}

interface StreamToolCallFragment {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

/**
 * 논스트리밍 JSON 응답(투어 스토리용). response_format=json_object.
 * 실패 시 throw.
 */
export async function openaiChatJSON(
  messages: ChatMessage[],
  maxTokens = 3000
): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}
