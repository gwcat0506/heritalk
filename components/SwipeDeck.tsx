"use client";
// 좌(패스)/우(좋아요) 스와이프 카드 덱 — 토이 POICardDeck.swift 이식.
// 상위 3장 스택, 최상단 카드만 드래그. 임계 100px 넘기면 결정, 아니면 스냅백.
import { useEffect, useRef, useState } from "react";
import { Heart, X, RotateCw, Check } from "lucide-react";
import type { POI } from "@/lib/types";
import { CategoryChip, POIThumbnail } from "@/components/ui";

export default function SwipeDeck({
  pois,
  poolKey,
  onDecide,
  onRefill,
}: {
  pois: POI[];
  poolKey?: string | number; // 값이 바뀌면 풀 리셋(재추천·다시 채우기)
  onDecide: (poi: POI, like: boolean) => void;
  onRefill?: () => void;
}) {
  const [pool, setPool] = useState<POI[]>(pois);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [flying, setFlying] = useState(false); // 카드가 날아가는 중
  const draggingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // poolKey 변경 시 풀 리셋
  useEffect(() => {
    setPool(pois);
    setDrag({ x: 0, y: 0 });
    setFlying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey]);

  const top = pool[pool.length - 1];

  function settle(like: boolean) {
    if (!top || flying) return;
    const decided = top;
    setFlying(true);
    setDrag({ x: like ? 700 : -700, y: 0 });
    window.setTimeout(() => {
      setPool((p) => p.slice(0, -1));
      setDrag({ x: 0, y: 0 });
      setFlying(false);
      onDecide(decided, like);
    }, 220);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (flying) return;
    draggingRef.current = true;
    startRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || !startRef.current) return;
    setDrag({
      x: e.clientX - startRef.current.x,
      y: (e.clientY - startRef.current.y) * 0.3,
    });
  }
  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (Math.abs(drag.x) > 100) settle(drag.x > 0);
    else setDrag({ x: 0, y: 0 });
  }

  if (pool.length === 0) {
    return (
      <div className="card grid min-h-[200px] place-items-center gap-2 p-8 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-ai-gradient text-ai">
          <Check className="h-6 w-6" aria-hidden />
        </div>
        <p className="text-sm text-neutral-600">주변 후보를 다 봤어요</p>
        {onRefill && (
          <button
            onClick={onRefill}
            className="pressable inline-flex items-center gap-1 text-sm font-semibold text-ai"
          >
            <RotateCw className="h-4 w-4" aria-hidden />
            다시 채우기
          </button>
        )}
      </div>
    );
  }

  const mag = Math.min(Math.abs(drag.x) / 110, 1);
  const like = drag.x >= 0;

  return (
    <div className="space-y-4">
      <div className="relative h-[380px] select-none">
        {pool.slice(-3).map((poi, i, arr) => {
          const depth = arr.length - 1 - i; // 0 = top
          const isTop = poi.id === top?.id;
          const transform = isTop
            ? `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`
            : `translateY(${depth * 10}px) scale(${1 - depth * 0.03})`;
          return (
            <div
              key={poi.id}
              className="absolute inset-0 touch-none"
              style={{
                transform,
                transition:
                  draggingRef.current && isTop
                    ? "none"
                    : "transform .3s cubic-bezier(.2,.8,.2,1)",
                zIndex: 10 - depth,
              }}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? onPointerUp : undefined}
              onPointerCancel={isTop ? onPointerUp : undefined}
            >
              <Card poi={poi} />
              {isTop && (
                <div
                  className="pointer-events-none absolute inset-0 grid place-items-center rounded-card"
                  style={{
                    backgroundColor: like
                      ? `rgba(34,197,94,${0.55 * mag})`
                      : `rgba(239,68,68,${0.55 * mag})`,
                  }}
                >
                  <div
                    className="flex flex-col items-center gap-1 text-white"
                    style={{ opacity: mag, transform: `scale(${0.7 + 0.3 * mag})` }}
                  >
                    {like ? (
                      <Heart className="h-14 w-14 fill-current" aria-hidden />
                    ) : (
                      <X className="h-14 w-14" strokeWidth={3} aria-hidden />
                    )}
                    <span className="text-xl font-bold">
                      {like ? "LIKE" : "PASS"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 액션 버튼 — 토이 circleButton */}
      <div className="flex items-center justify-center gap-10">
        <button
          onClick={() => settle(false)}
          aria-label="패스"
          className="pressable grid h-14 w-14 place-items-center rounded-full bg-white text-red-500 shadow-card"
        >
          <X className="h-6 w-6" strokeWidth={2.5} aria-hidden />
        </button>
        <button
          onClick={() => settle(true)}
          aria-label="코스에 담기"
          className="pressable grid h-14 w-14 place-items-center rounded-full bg-white text-green-500 shadow-card"
        >
          <Heart className="h-6 w-6 fill-current" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function Card({ poi }: { poi: POI }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card">
      <POIThumbnail poi={poi} className="h-44 w-full shrink-0" />
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <div>
          <CategoryChip category={poi.category} />
        </div>
        <h3 className="line-clamp-1 text-lg font-bold text-neutral-900">
          {poi.name}
        </h3>
        <p className="line-clamp-1 text-xs text-neutral-500">
          {poi.district}
          {poi.address ? ` · ${poi.address}` : ""}
        </p>
        {poi.shortDesc && (
          <>
            <div className="h-px bg-neutral-100" />
            <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">
              {poi.shortDesc}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
