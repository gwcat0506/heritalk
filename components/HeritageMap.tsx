"use client";
// 국가유산청(KHS) 서울 라이브 지도 — 전체화면 오버레이(상단 컨트롤 + 하단 정보 패널), 좌표 클러스터.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import KakaoMap, { type KakaoMapHandle } from "@/components/KakaoMap";
import { Landmark, ImageIcon, Heart, Plus, Check } from "lucide-react";
import { CategoryChip } from "@/components/ui";
import { useUserLocation } from "@/lib/useUserLocation";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { getUser } from "@/lib/auth";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { categoryHex, isHeritage } from "@/lib/categories";
import { ALL_POIS } from "@/lib/data";
import { isKhsId } from "@/lib/places";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { dname } from "@/lib/i18n/name";
import type { POI } from "@/lib/types";

const MUSEUMS = ALL_POIS.filter((p) => p.category === "박물관");

const FILTERS = [
  "전체",
  "박물관",
  "사적",
  "국보",
  "보물",
  "명승",
  "천연기념물",
  "시도유형문화유산",
  "시도기념물",
] as const;

const coordKey = (p: POI) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;

interface Detail {
  id: string;
  name: string;
  designation?: string;
  district?: string;
  address?: string;
  era?: string;
  description?: string;
  summaryAi?: string;
  imageUrl?: string;
}

export default function HeritageMap() {
  const { locale } = useLocale();
  const [all, setAll] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");
  const [q, setQ] = useState("");

  const [group, setGroup] = useState<POI[] | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { center, located, locate } = useUserLocation();
  const mapRef = useRef<KakaoMapHandle>(null);
  const router = useRouter();

  // 코스 담기(localStorage 드래프트) + 즐겨찾기(로그인)
  const draftToggle = useCourseDraft((s) => s.toggle);
  const draftPois = useCourseDraft((s) => s.pois);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  // 필터 줄 드래그 스크롤
  const filterRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scroll: 0, moved: false });

  useEffect(() => {
    getUser().then((u) => setUserId(u?.id ?? null));
  }, []);

  useEffect(() => {
    fetch("/api/heritage/seoul")
      .then((r) => r.json())
      .then((d) => {
        // 정적 박물관(42) + KHS 라이브. 같은 좌표 중복은 박물관 우선.
        const khs: POI[] = (d.places ?? []) as POI[];
        const museumKeys = new Set(MUSEUMS.map(coordKey));
        const sites = khs.filter((p) => !museumKeys.has(coordKey(p)));
        setAll([...MUSEUMS, ...sites]);
      })
      .catch(() => setAll(MUSEUMS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      all.filter((p) => {
        const okCat = filter === "전체" || p.category === filter;
        const okQ = !q || p.name.includes(q) || p.district.includes(q);
        return okCat && okQ;
      }),
    [all, filter, q]
  );

  const groups = useMemo(() => {
    const m = new Map<string, POI[]>();
    for (const p of filtered) {
      const k = coordKey(p);
      const arr = m.get(k);
      if (arr) arr.push(p);
      else m.set(k, [p]);
    }
    return m;
  }, [filtered]);

  const markers = useMemo(
    () =>
      [...groups.values()].map((g) => ({
        poi: { ...g[0], name: dname(g[0], locale) },
        count: g.length,
      })),
    [groups, locale]
  );

  function onMarker(poi: POI) {
    const g = groups.get(coordKey(poi)) ?? [poi];
    setGroup(g);
    setDetailId(g.length === 1 ? g[0].id : null);
  }

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    // 정적 박물관(비 KHS id)은 로컬 POI로 상세 구성, KHS는 API 조회.
    if (!isKhsId(detailId)) {
      const p = all.find((x) => x.id === detailId);
      setDetail(
        p
          ? {
              id: p.id,
              name: p.name,
              designation: p.category,
              district: p.district,
              address: p.address,
              era: p.era ?? undefined,
              description: p.shortDesc,
              imageUrl: p.imageUrl ?? undefined,
            }
          : null
      );
      return;
    }
    setDetailLoading(true);
    fetch(`/api/place?id=${encodeURIComponent(detailId)}`)
      .then((r) => r.json())
      .then((d) => setDetail(d.place ?? null))
      .finally(() => setDetailLoading(false));
  }, [detailId, all]);

  // 현재 상세 거점의 POI(좌표·코스담기용) + 즐겨찾기 상태 초기화
  const detailPoi = useMemo(
    () => (detailId && group ? group.find((p) => p.id === detailId) : undefined),
    [detailId, group]
  );
  const inCourse = !!detailPoi && draftPois.some((p) => p.id === detailPoi.id);

  useEffect(() => {
    if (!detailId || !userId) {
      setBookmarked(false);
      return;
    }
    isBookmarked(detailId).then(setBookmarked);
  }, [detailId, userId]);

  async function recenter() {
    const c = await locate();
    if (c) mapRef.current?.panTo(c);
    else alert("위치 권한을 허용하면 내 위치로 이동해요.");
  }

  async function onToggleBookmark() {
    if (!detail) return;
    if (!userId) {
      router.push("/auth");
      return;
    }
    const r = await toggleBookmark({ heritageId: detail.id, heritageName: detail.name });
    if (r !== null) setBookmarked(r);
  }

  // 필터 드래그 핸들러
  const onDown = (e: React.PointerEvent) => {
    const el = filterRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, scroll: el.scrollLeft, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const el = filterRef.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.scroll - dx;
  };
  const onUp = () => {
    drag.current.active = false;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-100">
      {loading ? (
        <div className="absolute inset-0 grid place-items-center text-sm text-neutral-400">
          국가유산 불러오는 중…
        </div>
      ) : (
        <KakaoMap
          ref={mapRef}
          fill
          markers={markers}
          onMarkerClick={onMarker}
          center={center}
          userLocation={located ? center : undefined}
          autoFit={false}
        />
      )}

      {/* 플로팅 컨트롤 — 패널 닫혔을 때만(겹침 방지) */}
      {!group && (
        <>
          {draftPois.length > 0 && (
            <button
              onClick={() => router.push("/course")}
              className="pressable absolute bottom-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-card"
            >
              담은 {draftPois.length}곳 · 코스 만들기 →
            </button>
          )}
          <button
            onClick={recenter}
            aria-label="내 위치로 이동"
            className="pressable absolute bottom-4 right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white text-navy shadow-card"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <line x1="12" y1="2" x2="12" y2="5" strokeLinecap="round" />
              <line x1="12" y1="19" x2="12" y2="22" strokeLinecap="round" />
              <line x1="2" y1="12" x2="5" y2="12" strokeLinecap="round" />
              <line x1="19" y1="12" x2="22" y2="12" strokeLinecap="round" />
            </svg>
          </button>
        </>
      )}

      {/* 상단 컨트롤 오버레이 */}
      <div className="absolute inset-x-0 top-0 z-10 space-y-2 p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="유산·자치구 검색"
          className="w-full rounded-card border border-neutral-200 bg-white px-4 py-2.5 text-sm shadow-card outline-none focus:border-navy"
        />
        <div
          ref={filterRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="no-scrollbar flex cursor-grab gap-2 overflow-x-auto"
        >
          {FILTERS.map((f) => {
            const hex = f === "전체" ? "#1a294a" : categoryHex(f);
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => {
                  if (drag.current.moved) {
                    drag.current.moved = false;
                    return; // 드래그 중이면 선택 무시
                  }
                  setFilter(f);
                }}
                className="chip pressable whitespace-nowrap shadow-card"
                style={
                  active
                    ? { backgroundColor: hex, color: "#fff" }
                    : { backgroundColor: "#fff", color: hex, border: `1px solid ${hex}40` }
                }
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* 하단 정보 패널 */}
      {group && (
        <div className="absolute inset-x-0 bottom-0 z-10 p-3">
          <div className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-800">
                {group.length > 1 && !detailId
                  ? `이 위치의 국가유산 ${group.length}점`
                  : "유산 정보"}
              </span>
              <button
                onClick={() => {
                  setGroup(null);
                  setDetailId(null);
                }}
                className="pressable px-1 text-sm text-neutral-400"
              >
                ✕
              </button>
            </div>

            {group.length > 1 && !detailId ? (
              <div className="no-scrollbar max-h-52 space-y-1.5 overflow-y-auto">
                {group.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDetailId(p.id)}
                    className="pressable flex w-full items-center gap-2 rounded-chip p-2 text-left hover:bg-black/5"
                  >
                    <CategoryChip category={p.category} />
                    <span className="line-clamp-1 text-sm text-neutral-800">{dname(p, locale)}</span>
                  </button>
                ))}
              </div>
            ) : detailLoading ? (
              <p className="py-6 text-center text-sm text-neutral-400">불러오는 중…</p>
            ) : detail ? (
              <div className="no-scrollbar max-h-[46vh] overflow-y-auto">
                {detail.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.imageUrl}
                    alt={detail.name}
                    className="mb-2 h-32 w-full rounded-chip object-cover"
                  />
                ) : (
                  <div
                    className="mb-2 grid h-32 w-full place-items-center rounded-chip text-white/90"
                    style={{
                      background: `linear-gradient(135deg, ${categoryHex(
                        detail.designation ?? ""
                      )}d9, ${categoryHex(detail.designation ?? "")}8c)`,
                    }}
                  >
                    {isHeritage(detail.designation ?? "") ? (
                      <Landmark className="h-10 w-10" strokeWidth={1.5} aria-hidden />
                    ) : (
                      <ImageIcon className="h-10 w-10" strokeWidth={1.5} aria-hidden />
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CategoryChip category={detail.designation ?? ""} />
                  <span className="font-semibold text-neutral-900">{detailPoi ? dname(detailPoi, locale) : detail.name}</span>
                </div>
                <div className="mt-1 space-y-0.5 text-xs text-neutral-500">
                  {detail.era && <p>시대 · {detail.era}</p>}
                  {detail.address && <p>{detail.address}</p>}
                </div>
                {(detail.summaryAi ?? detail.description) && (
                  <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-neutral-700">
                    {detail.summaryAi ?? detail.description}
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {/* 빠른 액션: 즐겨찾기 · 코스 담기 · 길찾기 */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={onToggleBookmark}
                      className={`pressable inline-flex items-center gap-1 rounded-chip px-3 py-1.5 text-xs font-semibold ${
                        bookmarked ? "bg-red-50 text-red-500" : "bg-black/5 text-neutral-600"
                      }`}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 ${bookmarked ? "fill-current" : ""}`}
                        aria-hidden
                      />
                      {bookmarked ? "저장됨" : "즐겨찾기"}
                    </button>
                    {detailPoi && (
                      <button
                        onClick={() => draftToggle(detailPoi)}
                        className={`pressable inline-flex items-center gap-1 rounded-chip px-3 py-1.5 text-xs font-semibold ${
                          inCourse ? "bg-navy/10 text-navy" : "bg-black/5 text-neutral-600"
                        }`}
                      >
                        {inCourse ? (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {inCourse ? "코스에 담김" : "코스 담기"}
                      </button>
                    )}
                    {detailPoi && (
                      <a
                        href={`https://map.kakao.com/link/to/${encodeURIComponent(
                          detail.name
                        )},${detailPoi.latitude},${detailPoi.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pressable rounded-chip bg-black/5 px-3 py-1.5 text-xs font-semibold text-neutral-600"
                      >
                        길찾기
                      </a>
                    )}
                  </div>
                  {/* 상세·도슨트 */}
                  <div className="flex gap-2">
                    {group.length > 1 && (
                      <button
                        onClick={() => setDetailId(null)}
                        className="pressable rounded-chip bg-black/5 px-3 py-1.5 text-xs font-semibold text-neutral-600"
                      >
                        ← 목록
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/place/${detail.id}`)}
                      className="pressable flex-1 rounded-chip bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      자세히 · 도슨트 →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-neutral-400">정보를 찾을 수 없어요.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
