"use client";
// 국가유산청(KHS) 서울 라이브 지도 — 좌표 클러스터 + 인라인 상세 패널. /map·홈 시트 공용.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import KakaoMap from "@/components/KakaoMap";
import { CategoryChip } from "@/components/ui";
import { categoryHex } from "@/lib/categories";
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
  imageUrl?: string;
}

export default function HeritageMap({ mapHeight = 400 }: { mapHeight?: number }) {
  const [all, setAll] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");
  const [q, setQ] = useState("");

  const [group, setGroup] = useState<POI[] | null>(null); // 클릭한 좌표의 유산들
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const router = useRouter();

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

  // 같은 좌표(박물관 소장 등)끼리 묶기
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

  // 인라인 상세 fetch (cache-aside)
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

  function close() {
    setGroup(null);
    setDetailId(null);
  }

  return (
    <div className="px-4 pb-6 pt-2">
      <h1 className="mb-1 text-xl font-bold text-navy">국가유산 지도</h1>
      <p className="mb-3 text-xs text-neutral-400">국가유산청 실시간 · 서울</p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="유산·자치구 검색"
        className="mb-3 w-full rounded-card border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-navy"
      />

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const hex = f === "전체" ? "#1a294a" : categoryHex(f);
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="chip pressable whitespace-nowrap"
              style={
                active
                  ? { backgroundColor: hex, color: "#fff" }
                  : { backgroundColor: `${hex}1a`, color: hex }
              }
            >
              {f}
            </button>
          );
        })}
        <span className="ml-auto shrink-0 self-center pl-2 text-xs text-neutral-400">
          {loading ? "불러오는 중…" : `${filtered.length}곳`}
        </span>
      </div>

      {loading ? (
        <div
          className="grid place-items-center rounded-card bg-neutral-100 text-sm text-neutral-400"
          style={{ height: mapHeight }}
        >
          국가유산 불러오는 중…
        </div>
      ) : (
        <KakaoMap markers={markers} height={mapHeight} onMarkerClick={onMarker} />
      )}

      {group && (
        <div className="card mt-3 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-800">
              {group.length > 1 && !detailId
                ? `이 위치의 국가유산 ${group.length}점`
                : "유산 정보"}
            </span>
            <button onClick={close} className="pressable px-1 text-sm text-neutral-400">
              ✕
            </button>
          </div>

          {group.length > 1 && !detailId ? (
            // 같은 좌표 다수 → 목록
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
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
            // 인라인 상세 (라우팅 없음)
            <div>
              {detail.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.imageUrl}
                  alt={detail.name}
                  className="mb-2 h-36 w-full rounded-chip object-cover"
                />
              )}
              <div className="flex items-center gap-2">
                <CategoryChip category={detail.designation ?? ""} />
                <span className="font-semibold text-neutral-900">{detail.name}</span>
              </div>
              <div className="mt-1 space-y-0.5 text-xs text-neutral-500">
                {detail.era && <p>시대 · {detail.era}</p>}
                {detail.address && <p>{detail.address}</p>}
              </div>
              {detail.description && (
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-neutral-700">
                  {detail.description}
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
      )}
    </div>
  );
}
