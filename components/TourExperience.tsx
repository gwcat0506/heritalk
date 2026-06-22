"use client";
// 라이브 투어 도슨트 경험 — source(draft|saved|pois) → /api/tour(또는 저장본) → 라이브/미리보기 플레이어.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Footprints,
  MapPin,
  ArrowRight,
  RefreshCw,
  Save,
  Check,
  Play,
  Pause,
} from "lucide-react";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { getUser } from "@/lib/auth";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { distanceMeters, nearby } from "@/lib/poi";
import { buildWalkablePool } from "@/lib/heritage-pool";
import { useUserLocation } from "@/lib/useUserLocation";
import { saveTour, getSavedTour } from "@/lib/courses";
import { positionAt, WALK_MPS, type TourData } from "@/lib/tour/route";
import type { LatLng, POI } from "@/lib/types";

const TourMap = dynamic(() => import("@/components/TourMap"), { ssr: false });

export type TourSource =
  | { kind: "draft" }
  | { kind: "pois"; pois: POI[] }
  | { kind: "saved"; id: string };

const APPROACH_M = 150;
const ARRIVE_M = 30;

export default function TourExperience({ source }: { source: TourSource }) {
  const draftPois = useCourseDraft((s) => s.pois);
  const startId = useCourseDraft((s) => s.startId);
  const { locale } = useLocale();
  const t = useT();
  const [tour, setTour] = useState<TourData | null>(null);
  const [level, setLevel] = useState("general");
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [nonce, setNonce] = useState(0); // 재시도 트리거

  // 요청 키 — pois 시그니처/saved id 변할 때만 재요청(+재시도 nonce)
  const reqKey = useMemo(() => {
    if (source.kind === "saved") return `saved:${source.id}:${nonce}`;
    if (source.kind === "pois")
      return `pois:${source.pois.map((p) => p.id).join(",")}:${nonce}`;
    return `draft:${draftPois.map((p) => p.id).join(",")}:${nonce}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, draftPois, nonce]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (source.kind === "saved") {
        setStatus("loading");
        const t = await getSavedTour(source.id);
        if (cancelled) return;
        t ? (setTour(t), setStatus("ready")) : setStatus("error");
        return;
      }
      const pois = source.kind === "pois" ? source.pois : draftPois;
      if (pois.length < 2) {
        setStatus("empty");
        return;
      }
      setStatus("loading");
      const u = await getUser();
      const lv = (u?.user_metadata?.defaultLevel as string) ?? "general";
      const interests = Array.isArray(u?.user_metadata?.interests)
        ? (u!.user_metadata!.interests as string[])
        : undefined;
      setLevel(lv);
      try {
        const res = await fetch("/api/tour", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pois, startId, level: lv, language: locale, interests }),
        });
        const data = (await res.json()) as TourData & { error?: string };
        if (cancelled) return;
        if (data.error || !data.path?.length) setStatus("error");
        else (setTour(data), setStatus("ready"));
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqKey]);

  if (status === "empty") return <TourEmpty />;
  if (status === "error")
    return (
      <Centered>
        <p className="mb-3">{t("tour.failed")}</p>
        <button
          onClick={() => setNonce((n) => n + 1)}
          className="pressable inline-flex items-center gap-1 rounded-card bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {t("common.retry")}
        </button>
      </Centered>
    );
  if (status !== "ready" || !tour)
    return (
      <Centered>
        <div className="mb-3 h-7 w-7 animate-spin rounded-full border-2 border-neutral-200 border-t-navy" />
        {t("tour.building")}
      </Centered>
    );

  return (
    <TourPlayer
      tour={tour}
      level={level}
      canSave={source.kind !== "saved"}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-8 text-center text-sm text-neutral-400">
      {children}
    </div>
  );
}

// 코스 없음 — 코스 만들기 / 주변 자동 추천
function TourEmpty() {
  const t = useT();
  const draft = useCourseDraft();
  const { locate } = useUserLocation();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function autoCourse() {
    setBusy(true);
    setMsg("");
    const me = await locate();
    if (!me) {
      setBusy(false);
      setMsg("위치 권한을 허용하면 주변 코스를 추천할 수 있어요.");
      return;
    }
    try {
      const res = await fetch("/api/heritage/seoul");
      const pool = buildWalkablePool((await res.json()).places ?? []);
      const picks = nearby(pool, me, 1500, 4);
      if (picks.length < 2) {
        setMsg("주변에 걸을 만한 거점이 부족해요. 지도에서 직접 담아보세요.");
        setBusy(false);
        return;
      }
      draft.clear();
      picks.forEach((p) => draft.toggle(p));
      // 드래프트가 바뀌면 상위 TourExperience가 자동으로 투어 생성
    } catch {
      setMsg("추천에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-ai-gradient text-ai">
        <Footprints className="h-7 w-7" strokeWidth={1.8} aria-hidden />
      </div>
      <p className="text-sm text-neutral-500">{t("tour.empty.desc")}</p>
      <div className="flex flex-col items-stretch gap-2">
        <button
          onClick={autoCourse}
          disabled={busy}
          className="pressable inline-flex items-center justify-center gap-1.5 rounded-card bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            t("tour.empty.finding")
          ) : (
            <>
              <MapPin className="h-4 w-4" aria-hidden />
              {t("tour.empty.autoRec")}
            </>
          )}
        </button>
        <Link
          href="/course"
          className="pressable inline-flex items-center justify-center gap-1 rounded-card bg-ai/10 px-5 py-2.5 text-sm font-medium text-ai"
        >
          {t("tour.empty.manual")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      {msg && <p className="text-xs text-amber-700">{msg}</p>}
    </div>
  );
}

type ChatKind = "docent" | "system" | "user" | "walking";
interface Chat {
  kind: ChatKind;
  text: string;
  title?: string;
}

function TourPlayer({
  tour,
  level,
  canSave,
}: {
  tour: TourData;
  level: string;
  canSave: boolean;
}) {
  const { locale } = useLocale();
  const t = useT();
  const [mode, setMode] = useState<"live" | "preview">("live");
  const [log, setLog] = useState<Chat[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [interests, setInterests] = useState<string[] | undefined>(undefined);
  const [pos, setPos] = useState<LatLng>({ lat: tour.path[0].lat, lng: tour.path[0].lng });
  const [geoError, setGeoError] = useState(false);

  const [traveled, setTraveled] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(8);
  const total = tour.totalDistance;

  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const push = useCallback((c: Chat) => setLog((l) => [...l, c]), []);

  const revealedRef = useRef<number[]>(tour.stops.map(() => 0));
  const arrivedRef = useRef<boolean[]>(tour.stops.map(() => false));
  const introRef = useRef(false);
  const outroRef = useRef(false);
  const liveFixRef = useRef(false);

  useEffect(() => {
    getUser().then((u) => {
      setUserId(u?.id ?? null);
      if (Array.isArray(u?.user_metadata?.interests))
        setInterests(u!.user_metadata!.interests as string[]);
    });
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  useEffect(() => {
    if (!introRef.current) {
      introRef.current = true;
      push({ kind: "docent", title: "투어 시작", text: tour.intro || "함께 떠나볼까요?" });
      push({
        kind: "walking",
        text:
          mode === "live"
            ? "실제로 이동하면 가까운 유산부터 헤리가 먼저 이야기를 들려줘요."
            : "▶ 누르면 헤리가 코스를 따라 안내를 시작해요.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maybeOutro = useCallback(() => {
    if (!outroRef.current && arrivedRef.current.every(Boolean)) {
      outroRef.current = true;
      push({ kind: "docent", title: "투어 마무리", text: tour.outro || "오늘 투어는 여기까지예요. 수고하셨어요!" });
      push({ kind: "system", text: "🎉 투어 완료! 직접 방문하면 더 생생해요." });
    }
  }, [push, tour.outro]);

  // 근접 해설 공개 — 명령형(RAF·watchPosition에서 직접 호출). effect 타이밍/스테일 클로저 회피.
  const revealAt = useCallback(
    (p: LatLng) => {
      tour.stops.forEach((s, i) => {
        const d = distanceMeters(p, { lat: s.lat, lng: s.lng });
        const segs = s.segments.length ? s.segments : [`${s.name} 근처입니다.`];
        if (d < APPROACH_M) {
          const frac = Math.min(1, Math.max(0, (APPROACH_M - d) / (APPROACH_M - ARRIVE_M)));
          const target = Math.min(segs.length, Math.max(1, Math.ceil(frac * segs.length)));
          while (revealedRef.current[i] < target) {
            const j = revealedRef.current[i];
            push({ kind: "docent", text: segs[j], title: j === 0 ? `🔭 곧 ${s.order}. ${s.name}` : undefined });
            revealedRef.current[i] = j + 1;
          }
        }
        if (d < ARRIVE_M && !arrivedRef.current[i]) {
          arrivedRef.current[i] = true;
          const next = tour.stops[i + 1];
          push({
            kind: "walking",
            text: next ? `📍 「${s.name}」 도착 · 다음은 「${next.name}」, 약 ${next.legMin}분` : `📍 「${s.name}」 도착`,
          });
        }
      });
      maybeOutro();
    },
    [tour.stops, push, maybeOutro]
  );
  // RAF/watch 콜백에서 항상 최신 revealAt을 쓰도록 ref 경유
  const revealRef = useRef(revealAt);
  useEffect(() => {
    revealRef.current = revealAt;
  }, [revealAt]);

  // 라이브 GPS
  useEffect(() => {
    if (mode !== "live") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(true);
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGeoError(false);
        liveFixRef.current = true;
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(c);
        revealRef.current(c); // 라이브: 실제 위치마다 근접 해설
      },
      () => setGeoError(true),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [mode]);

  // 미리보기 RAF
  const traveledRef = useRef(0);
  const speedRef = useRef(speed);
  const playingRef = useRef(playing);
  const lastRef = useRef(0);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    if (mode !== "preview") return;
    let raf = 0;
    const loop = (now: number) => {
      if (playingRef.current) {
        const dt = lastRef.current ? (now - lastRef.current) / 1000 : 0;
        const nt = Math.min(total, traveledRef.current + dt * WALK_MPS * speedRef.current);
        traveledRef.current = nt;
        setTraveled(nt);
        const p = positionAt(tour.path, nt);
        setPos(p);
        revealRef.current(p); // 미리보기: 재생 중 위치마다 근접 해설
        if (nt >= total) setPlaying(false);
      }
      lastRef.current = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, total, tour.path]);

  // 스크럽/점프 — 위치만 이동, 지나친 정류지는 무음 마킹
  function seekTo(d: number) {
    const nt = Math.max(0, Math.min(total, d));
    setPlaying(false);
    traveledRef.current = nt;
    setTraveled(nt);
    setPos(positionAt(tour.path, nt));
    tour.stops.forEach((s, i) => {
      if (s.cumDist <= nt) {
        revealedRef.current[i] = (s.segments.length || 1);
        arrivedRef.current[i] = true;
      }
    });
    maybeOutro();
  }

  const nearestStopId = useCallback(() => {
    let best = tour.stops[0];
    let bd = Infinity;
    for (const s of tour.stops) {
      const d = distanceMeters(pos, { lat: s.lat, lng: s.lng });
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best.id;
  }, [pos, tour.stops]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || asking) return;
    if (mode === "preview") setPlaying(false);
    push({ kind: "user", text: q });
    setInput("");
    setAsking(true);
    const history = log
      .filter((c) => c.kind === "user" || c.kind === "docent")
      .map((c) => ({ role: c.kind === "user" ? "user" : "assistant", content: c.text }));
    push({ kind: "docent", text: "" });
    let answer = "";
    try {
      const res = await fetch("/api/docent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: nearestStopId(),
          question: q,
          history,
          level,
          language: locale,
          interests,
        }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let metaDone = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        if (!metaDone) {
          const nl = buf.indexOf("\n");
          if (nl === -1) continue;
          buf = buf.slice(nl + 1);
          metaDone = true;
        }
        if (buf) {
          answer += buf;
          buf = "";
          const cur = answer;
          setLog((l) => updateLast(l, cur));
        }
      }
      if (!answer) setLog((l) => updateLast(l, "답을 찾지 못했어요."));
    } catch {
      setLog((l) => updateLast(l, "오류가 났어요. 다시 물어봐 주세요."));
    } finally {
      setAsking(false);
    }
  }

  async function onSave() {
    if (saving || saved) return;
    if (!userId) return; // 버튼은 로그인 시에만 노출
    setSaving(true);
    const id = await saveTour(tour, level);
    setSaving(false);
    if (id) setSaved(true);
  }

  const arrivedCount = arrivedRef.current.filter(Boolean).length;
  const pct =
    mode === "preview"
      ? total
        ? Math.round((traveled / total) * 100)
        : 0
      : tour.stops.length
      ? Math.round((arrivedCount / tour.stops.length) * 100)
      : 0;

  return (
    <div className="flex h-full flex-col">
      {/* 헤더: 모드 토글 + 저장 */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex gap-1 rounded-chip bg-black/5 p-0.5 text-xs font-semibold">
          {(["live", "preview"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`pressable rounded-chip px-2.5 py-1 ${
                mode === m ? "bg-white text-navy shadow-card" : "text-neutral-500"
              }`}
            >
              {m === "live" ? t("tour.live") : t("tour.preview")}
            </button>
          ))}
        </div>
        {canSave && userId && (
          <button
            onClick={onSave}
            disabled={saving || saved}
            className="pressable inline-flex items-center gap-1 rounded-chip bg-black/5 px-2.5 py-1 text-xs font-semibold text-neutral-600 disabled:opacity-60"
          >
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                {t("tour.saved")}
              </>
            ) : saving ? (
              t("tour.saving")
            ) : (
              <>
                <Save className="h-3.5 w-3.5" aria-hidden />
                {t("tour.save")}
              </>
            )}
          </button>
        )}
      </div>

      <TourMap path={tour.path} stops={tour.stops} pos={pos} />

      <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
        <span>
          {t("tour.meta", {
            km: (total / 1000).toFixed(1),
            min: tour.totalMinutes,
            n: tour.stops.length,
          })}
        </span>
        <span className="font-medium text-ai">{pct >= 100 ? t("tour.done") : `${pct}%`}</span>
      </div>

      {/* 미리보기 컨트롤: 재생 + 배속 슬라이더 + 진행 스크럽 + 정류지 점프 */}
      {mode === "preview" && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (traveled >= total) seekTo(0);
                setPlaying((p) => !p);
              }}
              className="pressable grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-white"
              aria-label={playing ? "일시정지" : "재생"}
            >
              {playing ? (
                <Pause className="h-4 w-4 fill-current" aria-hidden />
              ) : (
                <Play className="h-4 w-4 fill-current" aria-hidden />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.round(total))}
              value={Math.round(traveled)}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="h-1.5 flex-1 accent-ai"
              aria-label="진행 위치"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="shrink-0">배속 {speed}배</span>
            <input
              type="range"
              min={1}
              max={30}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="h-1.5 flex-1 accent-navy"
              aria-label="배속"
            />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {tour.stops.map((s) => (
              <button
                key={s.id}
                onClick={() => seekTo(s.cumDist)}
                className="pressable whitespace-nowrap rounded-chip bg-black/5 px-2.5 py-1 text-xs text-neutral-600"
              >
                {s.order}. {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "live" && geoError && (
        <p className="mt-2 rounded-chip bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {t("tour.geoNeeded")}
        </p>
      )}

      {/* 챗 로그 */}
      <div ref={scrollRef} className="mt-2 flex-1 space-y-3 overflow-y-auto border-t border-neutral-100 py-3">
        {log.map((c, i) => (
          <Bubble key={i} c={c} streaming={asking && i === log.length - 1 && c.kind === "docent"} />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2 border-t border-neutral-100 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("tour.inputPlaceholder")}
          className="flex-1 rounded-card border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <button
          type="submit"
          disabled={asking || !input.trim()}
          className="pressable rounded-card bg-navy px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t("common.send")}
        </button>
      </form>
    </div>
  );
}

function Bubble({ c, streaming }: { c: Chat; streaming: boolean }) {
  if (c.kind === "user")
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-card bg-navy px-3 py-2 text-sm text-white">{c.text}</div>
      </div>
    );
  if (c.kind === "walking")
    return (
      <div className="flex items-center gap-1.5 px-1 text-xs text-neutral-400">
        <span className="text-ai">🚶</span>
        <span>{c.text}</span>
      </div>
    );
  if (c.kind === "system")
    return <div className="rounded-chip bg-ai/10 py-2 text-center text-xs text-ai">{c.text}</div>;
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%]">
        {c.title && <div className="mb-1 px-1 text-[11px] font-semibold text-ai">🚩 {c.title}</div>}
        <div className="rounded-card bg-black/5 px-3 py-2 text-sm leading-relaxed text-neutral-800">
          <span className="whitespace-pre-wrap">{c.text}</span>
          {streaming && <span className="ml-0.5 inline-block animate-pulse">▋</span>}
        </div>
      </div>
    </div>
  );
}

function updateLast(l: Chat[], text: string): Chat[] {
  if (l.length === 0) return l;
  const n = l.slice();
  n[n.length - 1] = { ...n[n.length - 1], text };
  return n;
}
