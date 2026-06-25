"use client";
// 코스 거점 리스트 — 모바일 제스처.
// · 순서 변경: motion Reorder + 핸들(useDragControls) → 이웃이 자동 레이아웃 애니메이션으로 비켜줌.
// · 삭제: 본문 왼쪽 스와이프(축 잠금). 빨간 삭제 패널은 "스와이프 중에만" 렌더(드래그 시 노출 방지).
import { Reorder, useDragControls } from "motion/react";
import { useRef, useState } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { POIThumbnail, CategoryChip } from "@/components/ui";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";
import { dname } from "@/lib/i18n/name";
import type { POI } from "@/lib/types";

const DEL_THRESHOLD = -64;

export default function CourseStops({
  pois,
  onReorder,
  onRemove,
}: {
  pois: POI[];
  onReorder: (pois: POI[]) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Reorder.Group axis="y" values={pois} onReorder={onReorder} className="space-y-2">
      {pois.map((p, i) => (
        <StopRow key={p.id} poi={p} index={i} onRemove={onRemove} />
      ))}
    </Reorder.Group>
  );
}

function StopRow({
  poi,
  index,
  onRemove,
}: {
  poi: POI;
  index: number;
  onRemove: (id: string) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const controls = useDragControls();

  // 가로 스와이프(삭제) 상태 — 세로 스크롤/세로 드래그와 분리하기 위해 축 잠금.
  const [x, setX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"none" | "h" | "v">("none");
  const xRef = useRef(0);

  function down(e: React.PointerEvent) {
    startX.current = e.clientX;
    startY.current = e.clientY;
    axis.current = "none";
  }
  function move(e: React.PointerEvent) {
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (axis.current === "none") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (axis.current === "h") {
        setSwiping(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
    if (axis.current !== "h") return; // 세로 → 스크롤 양보
    const nx = Math.max(-100, Math.min(0, dx));
    xRef.current = nx;
    setX(nx);
  }
  function up() {
    const del = axis.current === "h" && xRef.current <= DEL_THRESHOLD;
    axis.current = "none";
    setSwiping(false);
    setX(0);
    xRef.current = 0;
    if (del) onRemove(poi.id);
  }

  return (
    <Reorder.Item
      value={poi}
      dragListener={false}
      dragControls={controls}
      className="relative list-none"
      whileDrag={{ scale: 1.03, zIndex: 20 }}
    >
      {/* 삭제 패널 — 스와이프 중에만 노출 */}
      {x < 0 && (
        <div className="absolute inset-y-0 right-0 z-0 flex w-24 items-center justify-center gap-1 rounded-card bg-red-500 text-xs font-semibold text-white">
          <Trash2 className="h-4 w-4" aria-hidden />
          {t("course.delete")}
        </div>
      )}

      {/* 카드 — 핸들(세로 정렬) + 본문(가로 스와이프) */}
      <div
        className="card relative z-[1] flex items-center gap-2 p-2.5"
        style={{
          transform: `translateX(${x}px)`,
          transition: swiping ? "none" : "transform .2s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <button
          onPointerDown={(e) => controls.start(e)}
          style={{ touchAction: "none" }}
          className="pressable -ml-1 shrink-0 cursor-grab p-1 text-neutral-300 active:cursor-grabbing"
          aria-label={t("course.reorder")}
        >
          <GripVertical className="h-5 w-5" aria-hidden />
        </button>

        <div
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="flex min-w-0 flex-1 items-center gap-3"
          style={{ touchAction: "pan-y" }}
        >
          <div className="relative shrink-0">
            <POIThumbnail poi={poi} className="h-12 w-12 rounded-chip" />
            <span className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-navy text-[10px] font-bold text-white shadow">
              {index + 1}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="line-clamp-1 text-sm font-medium">{dname(poi, locale)}</p>
              {index === 0 && (
                <span className="chip shrink-0 bg-accent/15 text-accent">
                  {t("course.startBadge")}
                </span>
              )}
            </div>
            <CategoryChip category={poi.category} />
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}
