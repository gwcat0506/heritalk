"use client";
// 채팅 도슨트 — 거점 진입 능동 인사 + 자연어 Q&A + 출처 카드. (음성 없음)
import { useEffect, useRef, useState } from "react";
import type { POI, DocentMessage } from "@/lib/types";

export default function DocentPanel({
  poi,
  className = "h-[420px]",
}: {
  poi?: POI;
  className?: string;
}) {
  const [messages, setMessages] = useState<DocentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // 진입 시 능동 인사(첫 카드). 거점 모드/일반 모드 구분.
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: poi
          ? `${poi.name}에 대해 궁금한 점을 물어보세요. "여기 왜 중요해요?", "언제 만들어졌어요?" 같은 질문에 사료를 바탕으로 답해드려요.`
          : `안녕하세요! 한국 역사·유산에 대해 무엇이든 물어보세요. 궁금한 인물·시대·장소를 편하게 물어보시면 도슨트가 답해드려요.`,
      },
    ]);
  }, [poi?.id, poi?.name]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    const history = messages;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/docent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: poi?.id,
          question,
          history: history.map((h) => ({ role: h.role, content: h.content })),
        }),
      });
      const json = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: json.answer ?? json.error ?? "응답을 받지 못했어요.",
          citations: json.citations ?? [],
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "도슨트 연결에 실패했어요." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = poi
    ? ["여기 왜 중요해요?", "언제 만들어졌어요?", "누구와 관련 있어요?"]
    : ["경복궁은 왜 중요해?", "조선시대 궁궐 알려줘", "한글은 누가 만들었어?"];

  return (
    <div className={`card flex ${className} flex-col overflow-hidden`}>
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <span className="text-lg">🧑‍🏫</span>
        <span className="font-semibold">AI 도슨트</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-card px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-navy text-white"
                  : "bg-black/5 text-neutral-800"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.citations && m.citations.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {m.citations.map((c) => (
                    <div
                      key={c.passageId}
                      className="rounded-chip border border-ai/30 bg-white p-2 text-xs"
                    >
                      <div className="font-semibold text-ai">
                        📖 {c.sourceTitle}
                        {c.sourceRef ? ` · ${c.sourceRef}` : ""}
                      </div>
                      <p className="line-clamp-2 text-neutral-500">{c.snippet}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-sm text-neutral-400">도슨트가 사료를 찾는 중…</div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="chip pressable bg-ai/10 text-ai"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2 border-t border-neutral-100 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="궁금한 점을 물어보세요"
          className="flex-1 rounded-card border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <button
          type="submit"
          disabled={loading}
          className="pressable rounded-card bg-navy px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          전송
        </button>
      </form>
    </div>
  );
}
