"use client";
// 디자인 시스템 프리미티브 — 토이 DesignSystem/Components.swift 이식.
import { useState } from "react";
import Link from "next/link";
import { Landmark, ImageIcon, MapPin } from "lucide-react";
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
      <MapPin className="h-3 w-3" aria-hidden />
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
        <div className="absolute inset-0 grid place-items-center text-white/90">
          {isHeritage(poi.category) ? (
            <Landmark className="h-1/3 w-1/3" strokeWidth={1.5} aria-hidden />
          ) : (
            <ImageIcon className="h-1/3 w-1/3" strokeWidth={1.5} aria-hidden />
          )}
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

/**
 * 공통 빈 상태 — 거대한 여백 대신 "의도된 디자인"으로 보이게.
 * 아이콘(원형 ai-gradient 배경) + 제목 + 설명 + 다음 행동 CTA.
 * action.href(라우팅) 또는 action.onClick 중 하나를 전달.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-8 py-14 text-center ${className}`}
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-ai-gradient text-ai">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-neutral-800">{title}</p>
        {description && (
          <p className="text-sm leading-relaxed text-neutral-500">{description}</p>
        )}
      </div>
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="pressable mt-1 rounded-card bg-navy px-5 py-2.5 text-sm font-semibold text-white"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="pressable mt-1 rounded-card bg-navy px-5 py-2.5 text-sm font-semibold text-white"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}

/** 단일 스켈레톤 블록 — 최종 레이아웃과 같은 모양으로 조합해 사용. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-chip bg-neutral-200/70 ${className}`} />;
}

/** 카드형 리스트 행 스켈레톤(heritage-live·저장 목록 등). */
export function SkeletonRow() {
  return (
    <div className="card flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-chip" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/** 브랜드 워드마크 — 핀 마크 + "Heritalk"(heritage + talk). size로 스케일. */
export function Wordmark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const mark = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-6 w-6" : "h-7 w-7";
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold text-navy ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/heritalk-mark.png"
        alt=""
        aria-hidden
        className={`${mark} rounded-chip object-cover`}
      />
      <span className={text}>Heritalk</span>
    </span>
  );
}
