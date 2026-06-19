"use client";
// 국가유산청(KHS) 서울 라이브 지도 — 전체화면 오버레이(상단 컨트롤 + 하단 정보 패널), 좌표 클러스터.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import KakaoMap from "@/components/KakaoMap";
import { CategoryChip } from "@/components/ui";
import { useUserLocation } from "@/lib/useUserLocation";
import { categoryHex, isHeritage } from "@/lib/categories";
import type { POI } from "@/lib/types";

const FILTERS = [
  "전체",
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
  const [all, setAll] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");
  const [q, setQ] = useState("");

  const [group, setGroup] = useState<POI[] | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const center = useUserLocation();
  const router = useRouter();

  // 필터 줄 드래그 스크롤
  const filterRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scroll: 0, moved: false });

  useEffect(() => {
    fetch("/api/heritage/seoul")
      .then((r) => r.json())
      .then((d) => setAll(d.places ?? []))
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
    () => [...groups.values()].map((g) => ({ poi: g[0], count: g.length })),
    [groups]
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
    setDetailLoading(true);
    fetch(`/api/place?id=${encodeURIComponent(detailId)}`)
      .then((r) => r.json())
      .then((d) => setDetail(d.place ?? null))
      .finally(() => setDetailLoading(false));
  }, [detailId]);

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
        <KakaoMap fill markers={markers} onMarkerClick={onMarker} center={center} autoFit={false} />
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
                    <span className="line-clamp-1 text-sm text-neutral-800">{p.name}</span>
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
                    className="mb-2 grid h-32 w-full place-items-center rounded-chip text-3xl text-white/90"
                    style={{
                      background: `linear-gradient(135deg, ${categoryHex(
                        detail.designation ?? ""
                      )}d9, ${categoryHex(detail.designation ?? "")}8c)`,
                    }}
                  >
                    {isHeritage(detail.designation ?? "") ? "🏛️" : "🖼️"}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CategoryChip category={detail.designation ?? ""} />
                  <span className="font-semibold text-neutral-900">{detail.name}</span>
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
                <div className="mt-3 flex gap-2">
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
                    className="pressable rounded-chip bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    자세히 · 도슨트 →
                  </button>
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
