"use client";
// 지도 탭 — 토이 MapTabView 이식: 전체 핀 + 카테고리 필터 + 검색 + 하단 미리보기.
import { useMemo, useState } from "react";
import Link from "next/link";
import { ALL_POIS } from "@/lib/data";
import { useCourseDraft } from "@/stores/useCourseDraft";
import KakaoMap from "@/components/KakaoMap";
import { CategoryChip, POIThumbnail } from "@/components/ui";
import type { POI } from "@/lib/types";

const FILTERS = ["전체", "사적", "박물관"] as const;

export default function MapPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<POI | null>(null);
  const { toggle, contains } = useCourseDraft();

  const markers = useMemo(() => {
    return ALL_POIS.filter((p) => {
      const okCat = filter === "전체" || p.category === filter;
      const okQ = !q || p.name.includes(q) || p.district.includes(q);
      return okCat && okQ;
    }).map((poi) => ({ poi }));
  }, [filter, q]);

  return (
    <main className="px-4 pt-6">
      <h1 className="mb-3 text-xl font-bold text-navy">거점 지도</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="거점·자치구 검색"
        className="mb-3 w-full rounded-card border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-navy"
      />

      <div className="mb-3 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`chip pressable ${
              filter === f ? "bg-navy text-white" : "bg-black/5 text-neutral-600"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-neutral-400">
          {markers.length}곳
        </span>
      </div>

      <KakaoMap markers={markers} height={400} onMarkerClick={setSelected} />

      {selected && (
        <div className="mt-3 flex items-center gap-3 card p-3">
          <POIThumbnail poi={selected} className="h-16 w-16 rounded-chip" />
          <div className="min-w-0 flex-1">
            <CategoryChip category={selected.category} />
            <p className="mt-1 line-clamp-1 font-medium">{selected.name}</p>
            <p className="line-clamp-1 text-xs text-neutral-500">
              {selected.address}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Link
              href={`/place/${selected.id}`}
              className="pressable rounded-chip bg-black/5 px-3 py-1.5 text-center text-xs font-semibold"
            >
              상세
            </Link>
            <button
              onClick={() => toggle(selected)}
              className={`pressable rounded-chip px-3 py-1.5 text-xs font-semibold ${
                contains(selected.id)
                  ? "bg-navy text-white"
                  : "bg-accent text-white"
              }`}
            >
              {contains(selected.id) ? "담음 ✓" : "담기"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
