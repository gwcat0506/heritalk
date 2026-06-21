"use client";
// 채팅 도슨트 — 스트리밍 답변 + 대화 저장/이어보기(로그인) + 출처 카드.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MessagesSquare,
  Clock,
  Plus,
  X,
  BookOpen,
  MapPin,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import type { POI, DocentMessage, Citation } from "@/lib/types";
import {
  getUserId,
  listSessions,
  createSession,
  loadMessages,
  saveMessage,
  getSession,
  type SessionRow,
} from "@/lib/conversations";

function greeting(name?: string): DocentMessage {
  return {
    role: "assistant",
    content: name
      ? `${name}에 대해 궁금한 점을 물어보세요. "여기 왜 중요해요?", "언제 만들어졌어요?" 같은 질문에 국가유산청 설명을 바탕으로 답해드려요.`
      : `안녕하세요! 한국 역사·유산에 대해 무엇이든 물어보세요. 궁금한 인물·시대·장소를 편하게 물어보시면 도슨트가 답해드려요.`,
  };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function DocentPanel({
  poi,
  sessionParam,
  className = "h-[420px]",
}: {
  poi?: POI;
  sessionParam?: string;
  className?: string;
}) {
  const [userId, setUserId] = useState<string | null | undefined>(undefined); // undefined=로딩
  const [messages, setMessages] = useState<DocentMessage[]>([greeting(poi?.name)]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  // 현재 대화의 grounding 대상(거점). poi 진입 또는 이어보기로 세팅.
  const [activePlaceId, setActivePlaceId] = useState<string | undefined>(poi?.id);
  const [activePlaceName, setActivePlaceName] = useState<string | undefined>(poi?.name);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  // 로그인 사용자 확인
  useEffect(() => {
    getUserId().then(setUserId);
  }, []);

  // 진입: 이어보기(sessionParam) 또는 새 대화(poi 기준)
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (sessionParam) {
        const [row, msgs] = await Promise.all([
          getSession(sessionParam),
          loadMessages(sessionParam),
        ]);
        if (cancelled) return;
        if (row && msgs.length) {
          setSessionId(row.id);
          setActivePlaceId(row.place_id ?? undefined);
          setActivePlaceName(row.title ?? undefined);
          setMessages(msgs);
          return;
        }
      }
      // 새 대화
      setSessionId(null);
      setActivePlaceId(poi?.id);
      setActivePlaceName(poi?.name);
      setMessages([greeting(poi?.name)]);
    }
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poi?.id, poi?.name, sessionParam]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  function refreshSessions() {
    if (userId) listSessions().then(setSessions);
  }

  function startFresh() {
    setSessionId(null);
    setActivePlaceId(poi?.id);
    setActivePlaceName(poi?.name);
    setMessages([greeting(poi?.name)]);
    setHistoryOpen(false);
  }

  async function openSession(row: SessionRow) {
    setHistoryOpen(false);
    const msgs = await loadMessages(row.id);
    setSessionId(row.id);
    setActivePlaceId(row.place_id ?? undefined);
    setActivePlaceName(row.title ?? undefined);
    setMessages(msgs.length ? msgs : [greeting(row.title ?? undefined)]);
  }

  async function ask(question: string) {
    if (!question.trim() || streaming) return;
    const loggedIn = !!userId;
    const mode: "place" | "general" = activePlaceId ? "place" : "general";
    const historyForApi = messages.map((h) => ({ role: h.role, content: h.content }));

    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setStreaming(true);

    // 세션 보장 + user 메시지 저장(로그인 시)
    let sid = sessionId;
    if (loggedIn) {
      if (!sid) {
        sid = await createSession({
          mode,
          placeId: activePlaceId,
          title: activePlaceName || question,
        });
        setSessionId(sid);
      }
      if (sid) await saveMessage({ sessionId: sid, role: "user", content: question });
    }

    let answer = "";
    let citations: Citation[] = [];
    try {
      const res = await fetch("/api/docent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: activePlaceId, question, history: historyForApi }),
      });
      if (!res.body) throw new Error("no body");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let metaDone = false;
      let pushed = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        if (!metaDone) {
          const nl = buf.indexOf("\n");
          if (nl === -1) continue;
          try {
            citations = JSON.parse(buf.slice(0, nl)).citations ?? [];
          } catch {
            citations = [];
          }
          buf = buf.slice(nl + 1);
          metaDone = true;
        }
        if (buf) {
          answer += buf;
          buf = "";
          if (!pushed) {
            pushed = true;
            const cur = answer;
            setMessages((m) => [...m, { role: "assistant", content: cur, citations }]);
          } else {
            const cur = answer;
            setMessages((m) => updateLast(m, cur));
          }
        }
      }
      if (!pushed) {
        // 토큰이 전혀 안 온 경우(예외) — 빈 답변 카드 방지
        answer = answer || "응답을 받지 못했어요.";
        setMessages((m) => [...m, { role: "assistant", content: answer, citations }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "도슨트 연결에 실패했어요." }]);
    } finally {
      setStreaming(false);
    }

    if (loggedIn && sid && answer) {
      await saveMessage({ sessionId: sid, role: "assistant", content: answer, citations });
      refreshSessions();
    }
  }

  const suggestions = activePlaceId
    ? ["여기 왜 중요해요?", "언제 만들어졌어요?", "누구와 관련 있어요?"]
    : ["경복궁은 왜 중요해?", "조선시대 궁궐 알려줘", "한글은 누가 만들었어?"];

  return (
    <div className={`card relative flex ${className} flex-col overflow-hidden`}>
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ai-gradient text-ai">
          <MessagesSquare className="h-4 w-4" aria-hidden />
        </span>
        <span className="font-semibold">AI 도슨트</span>
        {userId && (
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => {
                refreshSessions();
                setHistoryOpen((v) => !v);
              }}
              className="pressable inline-flex items-center gap-1 rounded-chip bg-black/5 px-2.5 py-1 text-xs font-medium text-neutral-600"
            >
              <Clock className="h-3.5 w-3.5" aria-hidden />
              기록
            </button>
            <button
              onClick={startFresh}
              className="pressable inline-flex items-center gap-1 rounded-chip bg-black/5 px-2.5 py-1 text-xs font-medium text-neutral-600"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              새 대화
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length <= 1 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-ai-gradient text-ai">
              <MessagesSquare className="h-7 w-7" strokeWidth={1.8} aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-neutral-800">
                {activePlaceName ? `${activePlaceName} 도슨트` : "무엇이든 물어보세요"}
              </p>
              <p className="mx-auto max-w-[17rem] text-sm leading-relaxed text-neutral-500">
                {messages[0]?.content}
              </p>
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-card px-3 py-2 text-sm ${
                m.role === "user" ? "bg-navy text-white" : "bg-black/5 text-neutral-800"
              }`}
            >
              <p className="whitespace-pre-wrap">
                {m.content}
                {streaming && i === messages.length - 1 && m.role === "assistant" && (
                  <span className="ml-0.5 inline-block animate-pulse">▋</span>
                )}
              </p>
              {m.citations && m.citations.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {m.citations.map((c) => (
                    <div
                      key={c.passageId}
                      className="rounded-chip border border-ai/30 bg-white p-2 text-xs"
                    >
                      <div className="flex items-center gap-1 font-semibold text-ai">
                        <BookOpen className="h-3 w-3" aria-hidden />
                        {c.sourceTitle}
                        {c.sourceRef ? ` · ${c.sourceRef}` : ""}
                      </div>
                      <p className="line-clamp-2 text-neutral-500">{c.snippet}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          ))
        )}
        {streaming && messages[messages.length - 1]?.role === "user" && (
          <div className="text-sm text-neutral-400">도슨트가 답하는 중…</div>
        )}
        <div ref={endRef} />
      </div>

      {/* 비로그인: 저장 안내 */}
      {userId === null && messages.length <= 1 && (
        <Link
          href="/auth"
          className="mx-4 mb-2 flex items-center justify-center gap-1 rounded-chip bg-ai/10 px-3 py-2 text-center text-xs font-medium text-ai"
        >
          로그인하면 대화가 저장돼요
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => ask(s)} className="chip pressable bg-ai/10 text-ai">
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
          disabled={streaming}
          className="pressable rounded-card bg-navy px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          전송
        </button>
      </form>

      {/* 대화 기록 드로어 */}
      {historyOpen && (
        <div className="absolute inset-0 z-20 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <span className="font-semibold">대화 기록</span>
            <button
              onClick={() => setHistoryOpen(false)}
              className="pressable px-1 text-neutral-400"
              aria-label="닫기"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {sessions.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-400">저장된 대화가 없어요.</p>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openSession(s)}
                    className="pressable flex w-full items-center gap-2 rounded-card border border-neutral-100 p-3 text-left hover:bg-black/5"
                  >
                    {s.mode === "place" ? (
                      <MapPin className="h-4 w-4 shrink-0 text-navy" aria-hidden />
                    ) : (
                      <MessageCircle className="h-4 w-4 shrink-0 text-ai" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-800">
                        {s.title || "(제목 없음)"}
                      </span>
                      <span className="block text-xs text-neutral-400">{timeAgo(s.updated_at)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 마지막 메시지(스트리밍 중 assistant)의 content 갱신
function updateLast(m: DocentMessage[], content: string): DocentMessage[] {
  if (m.length === 0) return m;
  const next = m.slice();
  next[next.length - 1] = { ...next[next.length - 1], content };
  return next;
}
