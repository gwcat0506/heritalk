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
import { dname } from "@/lib/i18n/name";
import { distanceMeters } from "@/lib/poi";
import { recommendNearbyCourse } from "@/lib/recommendCourse";
import { readDocentStream, toolLabelKey } from "@/lib/docentStream";
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
  const startMode = useCourseDraft((s) => s.startMode);
  const { locale } = useLocale();
  const { locate } = useUserLocation(undefined, { auto: false });
  const t = useT();
  const [tour, setTour] = useState<TourData | null>(null);
  const [level, setLevel] = useState("general");
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [nonce, setNonce] = useState(0); // 재시도 트리거
  const builtRef = useRef(false); // 드래프트 투어 1회 빌드 후 코스 담기 등 draft 변경에도 재생성 방지

  // 요청 키 — pois 시그니처/saved id 변할 때만 재요청(+재시도 nonce)
  const reqKey = useMemo(() => {
    if (source.kind === "saved") return `saved:${source.id}:${nonce}`;
    if (source.kind === "pois")
      return `pois:${source.pois.map((p) => p.id).join(",")}:${nonce}`;
    return `draft:${draftPois.map((p) => p.id).join(",")}:${startMode}:${nonce}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, draftPois, startMode, nonce]);

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
      if (source.kind !== "draft") builtRef.current = false; // saved/pois는 항상 재빌드 허용
      const pois = source.kind === "pois" ? source.pois : draftPois;
      if (pois.length < 2) {
        setStatus("empty");
        return;
      }
      if (source.kind === "draft" && builtRef.current) return; // 이미 만든 드래프트 투어 유지
      setStatus("loading");
      const u = await getUser();
      const lv = (u?.user_metadata?.defaultLevel as string) ?? "general";
      const interests = Array.isArray(u?.user_metadata?.interests)
        ? (u!.user_metadata!.interests as string[])
        : undefined;
      setLevel(lv);
      // 출발지=내 위치면 좌표 확보(거부/실패 시 첫 거점 폴백).
      const startOrigin = startMode === "me" ? await locate() : null;
      try {
        const res = await fetch("/api/tour", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pois,
            startId,
            level: lv,
            language: locale,
            interests,
            startOrigin: startOrigin ?? undefined,
          }),
        });
        const data = (await res.json()) as TourData & { error?: string };
        if (cancelled) return;
        if (data.error || !data.path?.length) setStatus("error");
        else {
          builtRef.current = true;
          setTour(data);
          setStatus("ready");
        }
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
          onClick={() => {
            builtRef.current = false;
            setNonce((n) => n + 1);
          }}
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
    const r = await recommendNearbyCourse(await locate());
    if (!r.ok) {
      setMsg(
        r.reason === "no-location"
          ? "위치 권한을 허용하면 주변 코스를 추천할 수 있어요."
          : r.reason === "too-few"
          ? "주변에 걸을 만한 거점이 부족해요. 지도에서 직접 담아보세요."
          : "추천에 실패했어요. 다시 시도해 주세요."
      );
      setBusy(false);
      return;
    }
    draft.clear();
    r.picks.forEach((p) => draft.toggle(p)); // 드래프트 변경 → 상위가 자동 투어 생성
    setBusy(false);
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
  const draftAdd = useCourseDraft((s) => s.toggle);
  const [mode, setMode] = useState<"live" | "preview">("live");
  const [log, setLog] = useState<Chat[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [toolLabel, setToolLabel] = useState<string | null>(null);
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
      push({ kind: "docent", title: t("tour.introTitle"), text: tour.intro || t("tour.introFallback") });
      push({
        kind: "walking",
        text: mode === "live" ? t("tour.liveHint") : t("tour.previewHint"),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maybeOutro = useCallback(() => {
    if (!outroRef.current && arrivedRef.current.every(Boolean)) {
      outroRef.current = true;
      push({ kind: "docent", title: t("tour.outroTitle"), text: tour.outro || t("tour.outroFallback") });
      push({ kind: "system", text: t("tour.completeMsg") });
    }
  }, [push, tour.outro, t]);

  // 근접 해설 공개 — 명령형(RAF·watchPosition에서 직접 호출). effect 타이밍/스테일 클로저 회피.
  const revealAt = useCallback(
    (p: LatLng) => {
      tour.stops.forEach((s, i) => {
        const d = distanceMeters(p, { lat: s.lat, lng: s.lng });
        const segs = s.segments.length ? s.segments : [t("tour.near", { name: dname(s, locale) })];
        if (d < APPROACH_M) {
          const frac = Math.min(1, Math.max(0, (APPROACH_M - d) / (APPROACH_M - ARRIVE_M)));
          const target = Math.min(segs.length, Math.max(1, Math.ceil(frac * segs.length)));
          while (revealedRef.current[i] < target) {
            const j = revealedRef.current[i];
            push({
              kind: "docent",
              text: segs[j],
              title: j === 0 ? t("tour.approaching", { n: s.order, name: dname(s, locale) }) : undefined,
            });
            revealedRef.current[i] = j + 1;
          }
        }
        if (d < ARRIVE_M && !arrivedRef.current[i]) {
          arrivedRef.current[i] = true;
          const next = tour.stops[i + 1];
          push({
            kind: "walking",
            text: next
              ? t("tour.arrivedNext", { name: dname(s, locale), next: dname(next, locale), min: next.legMin })
              : t("tour.arrived", { name: dname(s, locale) }),
          });
        }
      });
      maybeOutro();
    },
    [tour.stops, push, maybeOutro, t, locale]
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
    let answer = "";
    let pushed = false;
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
          origin: pos,
        }),
      });
      if (!res.body) throw new Error("no body");
      for await (const ev of readDocentStream(res)) {
        if (ev.t === "tool") {
          setToolLabel(t(toolLabelKey(ev.name)));
        } else if (ev.t === "action" && ev.action === "addToCourse") {
          draftAdd(ev.poi);
          push({ kind: "system", text: t("agent.added", { name: dname(ev.poi, locale) }) });
        } else if (ev.t === "delta") {
          setToolLabel(null);
          answer += ev.text;
          if (!pushed) {
            pushed = true;
            push({ kind: "docent", text: answer });
          } else {
            const cur = answer;
            setLog((l) => updateLast(l, cur));
          }
        }
      }
      if (!pushed) push({ kind: "docent", text: t("tour.askEmpty") });
    } catch {
      if (pushed) setLog((l) => updateLast(l, t("tour.askError")));
      else push({ kind: "docent", text: t("tour.askError") });
    } finally {
      setToolLabel(null);
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
      {/* 지도 히어로 — 풀블리드 지도 + 상단 오버레이(모드/저장) + 하단 스크림(상태/진행) */}
      {(() => {
        const nextStop = tour.stops.find((_, i) => !arrivedRef.current[i]);
        const dist = nextStop
          ? distanceMeters(pos, { lat: nextStop.lat, lng: nextStop.lng })
          : 0;
        const distLabel = dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`;
        return (
          <section className="rise relative -mx-4 h-[40svh] min-h-[300px] overflow-hidden rounded-b-[24px] shadow-card">
            <TourMap fill path={tour.path} stops={tour.stops.map((s) => ({ ...s, name: dname(s, locale) }))} pos={pos} />

            {/* 상단: 모드 토글 + 저장 */}
            <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between">
              <div className="flex gap-1 rounded-chip bg-white/90 p-0.5 text-xs font-semibold shadow-card backdrop-blur">
                {(["live", "preview"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`pressable rounded-chip px-2.5 py-1 ${
                      mode === m ? "bg-navy text-white" : "text-neutral-500"
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
                  className="pressable inline-flex items-center gap-1 rounded-chip bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow-card backdrop-blur disabled:opacity-60"
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

            {/* 하단 스크림: 다음 거점 + 거리 + 진행률 + 메타 */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-navy via-navy/55 to-transparent px-4 pb-4 pt-16 text-white">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  {nextStop ? (
                    <>
                      <p className="text-[11px] text-white/70">{t("tour.next")}</p>
                      <p className="truncate text-base font-bold">
                        {nextStop.order}. {dname(nextStop, locale)}
                      </p>
                    </>
                  ) : (
                    <p className="text-base font-bold">{t("tour.done")}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {nextStop && (
                    <p className="text-sm font-bold">{t("tour.away", { d: distLabel })}</p>
                  )}
                  <p className="text-[11px] text-white/80">{pct}%</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-white/70">
                {t("tour.meta", {
                  km: (total / 1000).toFixed(1),
                  min: tour.totalMinutes,
                  n: tour.stops.length,
                })}
              </p>
            </div>
          </section>
        );
      })()}

      {/* 미리보기 컨트롤: 재생 + 배속 슬라이더 + 진행 스크럽 + 정류지 점프 */}
      {mode === "preview" && (
        <div className="card mt-3 space-y-2 p-3">
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
                {s.order}. {dname(s, locale)}
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
      <div ref={scrollRef} className="no-scrollbar mt-3 flex-1 space-y-3 overflow-y-auto py-1">
        {log.map((c, i) => (
          <Bubble key={i} c={c} streaming={asking && i === log.length - 1 && c.kind === "docent"} />
        ))}
        {toolLabel && (
          <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-ai">
            <span className="inline-block animate-pulse">●</span>
            {toolLabel}
          </div>
        )}
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
      <div className="msg-in flex justify-end">
        <div className="max-w-[85%] rounded-card bg-navy px-3 py-2 text-sm text-white">{c.text}</div>
      </div>
    );
  if (c.kind === "walking")
    return (
      <div className="msg-in flex items-center gap-1.5 px-1 text-xs text-neutral-400">
        <span className="text-ai">🚶</span>
        <span>{c.text}</span>
      </div>
    );
  if (c.kind === "system")
    return <div className="msg-in rounded-chip bg-ai/10 py-2 text-center text-xs text-ai">{c.text}</div>;
  return (
    <div className="msg-in flex justify-start">
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
