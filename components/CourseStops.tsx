"use client";
// 코스 거점 리스트 — 모바일 제스처: 핸들 드래그로 순서 변경 + 본문 왼쪽 스와이프로 삭제.
// 핸들=세로(정렬), 본문=가로(삭제)로 제스처 분리. 맨 위 = 출발지.
import { useRef, useState } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { POIThumbnail, CategoryChip } from "@/components/ui";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { POI } from "@/lib/types";

const ROW_H = 76; // 카드(≈68) + 간격(8) 추정 — 증분 이동 임계
const DEL_THRESHOLD = -64;

export default function CourseStops({
  pois,
  onMove,
  onRemove,
}: {
  pois: POI[];
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
}) {
  const t = useT();

  // 순서 변경(핸들)
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragDY, setDragDY] = useState(0);
  const fromRef = useRef<number | null>(null);
  const baseYRef = useRef(0);

  // 삭제(스와이프)
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const swipeXRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const axisRef = useRef<"none" | "h" | "v">("none");
  const swipeActiveRef = useRef<string | null>(null);

  // ── 핸들: 세로 드래그 → 증분 move ──
  function handleDown(e: React.PointerEvent, index: number, id: string) {
    e.currentTarget.setPointerCapture(e.pointerId);
    fromRef.current = index;
    baseYRef.current = e.clientY;
    setDragId(id);
    setDragDY(0);
  }
  function handleMove(e: React.PointerEvent) {
    if (fromRef.current === null) return;
    let dy = e.clientY - baseYRef.current;
    while (dy > ROW_H && fromRef.current < pois.length - 1) {
      onMove(fromRef.current, fromRef.current + 1);
      fromRef.current += 1;
      baseYRef.current += ROW_H;
      dy -= ROW_H;
    }
    while (dy < -ROW_H && fromRef.current > 0) {
      onMove(fromRef.current, fromRef.current - 1);
      fromRef.current -= 1;
      baseYRef.current -= ROW_H;
      dy += ROW_H;
    }
    setDragDY(dy);
  }
  function handleUp() {
    fromRef.current = null;
    setDragId(null);
    setDragDY(0);
  }

  // ── 본문: 가로 스와이프 → 삭제(축 잠금으로 세로 스크롤과 분리) ──
  function bodyDown(e: React.PointerEvent, id: string) {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    axisRef.current = "none";
    swipeActiveRef.current = id;
  }
  function bodyMove(e: React.PointerEvent, id: string) {
    if (swipeActiveRef.current !== id) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    if (axisRef.current === "none") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (axisRef.current === "h") e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (axisRef.current !== "h") return; // 세로 → 스크롤 양보
    const x = Math.max(-100, Math.min(0, dx));
    swipeXRef.current = x;
    setSwipeId(id);
    setSwipeX(x);
  }
  function bodyUp(id: string) {
    const remove = swipeActiveRef.current === id && axisRef.current === "h" && swipeXRef.current <= DEL_THRESHOLD;
    swipeActiveRef.current = null;
    axisRef.current = "none";
    swipeXRef.current = 0;
    setSwipeId(null);
    setSwipeX(0);
    if (remove) onRemove(id);
  }

  return (
    <ul className="space-y-2">
      {pois.map((p, i) => {
        const lifted = dragId === p.id;
        const x = swipeId === p.id ? swipeX : 0;
        const y = lifted ? dragDY : 0;
        const active = lifted || swipeId === p.id;
        return (
          <li key={p.id} className="relative overflow-hidden rounded-card">
            {/* 삭제 패널(뒤) */}
            <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center gap-1 rounded-card bg-red-500 text-xs font-semibold text-white">
              <Trash2 className="h-4 w-4" aria-hidden />
              {t("course.delete")}
            </div>

            {/* 카드(앞) */}
            <div
              className={`card relative flex items-center gap-2 p-2.5 ${lifted ? "z-10 scale-[1.02] shadow-lg" : ""}`}
              style={{
                transform: `translate(${x}px, ${y}px)`,
                transition: active ? "none" : "transform .2s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              {/* 드래그 핸들(세로 정렬) */}
              <button
                onPointerDown={(e) => handleDown(e, i, p.id)}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={handleUp}
                className="pressable -ml-1 shrink-0 cursor-grab touch-none p-1 text-neutral-300 active:cursor-grabbing"
                aria-label={t("course.reorder")}
              >
                <GripVertical className="h-5 w-5" aria-hidden />
              </button>

              {/* 본문(가로 스와이프 = 삭제) */}
              <div
                onPointerDown={(e) => bodyDown(e, p.id)}
                onPointerMove={(e) => bodyMove(e, p.id)}
                onPointerUp={() => bodyUp(p.id)}
                onPointerCancel={() => bodyUp(p.id)}
                className="flex min-w-0 flex-1 items-center gap-3"
                style={{ touchAction: "pan-y" }}
              >
                <div className="relative shrink-0">
                  <POIThumbnail poi={p} className="h-12 w-12 rounded-chip" />
                  <span className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-navy text-[10px] font-bold text-white shadow">
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                    {i === 0 && (
                      <span className="chip shrink-0 bg-accent/15 text-accent">
                        {t("course.startBadge")}
                      </span>
                    )}
                  </div>
                  <CategoryChip category={p.category} />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
