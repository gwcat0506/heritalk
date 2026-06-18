"use client";
// 디자인 시스템 프리미티브 — 토이 DesignSystem/Components.swift 이식.
import { useState } from "react";
import type { POI } from "@/lib/types";

import { categoryHex, isHeritage } from "@/lib/categories";
export { categoryHex, isHeritage };

/** 카테고리 칩(사적=퍼플 / 박물관=브라운). */
export function CategoryChip({ category }: { category: string }) {
  return (
    <span
      className="chip text-white"
      style={{ backgroundColor: categoryHex(category) }}
    >
      {category}
    </span>
  );
}

/** 거리 뱃지(m/km). */
export function DistanceBadge({ meters }: { meters: number }) {
  const label = meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`;
  return (
    <span className="chip bg-black/5 text-neutral-700">
      <span aria-hidden>📍</span>
      {label}
    </span>
  );
}

/** 거점 썸네일 — 이미지 없으면 카테고리 그라데이션 + 아이콘 폴백. */
export function POIThumbnail({
  poi,
  className = "",
}: {
  poi: POI;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const showFallback = !poi.imageUrl || errored;
  const hex = categoryHex(poi.category);
  return (
    <div
      className={`relative overflow-hidden bg-neutral-100 ${className}`}
      style={
        showFallback
          ? { background: `linear-gradient(135deg, ${hex}d9, ${hex}8c)` }
          : undefined
      }
    >
      {showFallback ? (
        <div className="absolute inset-0 grid place-items-center text-white/90 text-2xl">
          {isHeritage(poi.category) ? "🏛️" : "🖼️"}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poi.imageUrl!}
          alt={poi.name}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}

/** primary CTA(navy pill) — PressableButtonStyle 적용. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="pressable w-full rounded-card bg-navy py-3.5 text-center font-semibold text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** 동선 연결 점선 커넥터(DashedConnector). */
export function DashedConnector() {
  return (
    <div className="flex flex-col items-center gap-1 py-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1 w-1 rounded-full bg-neutral-300" />
      ))}
    </div>
  );
}

/** 루트 요약(총거리·도보시간·거점수) — RouteMapView 상단. */
export function RouteSummary({
  distanceM,
  timeSec,
  stops,
}: {
  distanceM: number;
  timeSec: number;
  stops: number;
}) {
  const km = (distanceM / 1000).toFixed(1);
  const min = Math.round(timeSec / 60);
  return (
    <div className="flex items-center justify-around rounded-card bg-white p-4 shadow-card">
      <Stat label="총 거리" value={`${km}km`} />
      <div className="h-8 w-px bg-neutral-200" />
      <Stat label="도보 시간" value={`${min}분`} />
      <div className="h-8 w-px bg-neutral-200" />
      <Stat label="거점" value={`${stops}곳`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-navy">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}
