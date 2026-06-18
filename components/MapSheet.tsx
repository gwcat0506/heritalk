"use client";
// 지도 bottom-sheet — 아래에서 위로 슬라이드해 화면을 채움. 핸들 스와이프/backdrop 탭으로 닫기.
import { useEffect, useRef, useState } from "react";
import HeritageMap from "@/components/HeritageMap";

export default function MapSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [dragY, setDragY] = useState(0);
  const [mapH, setMapH] = useState(480);
  const dragging = useRef(false);
  const startY = useRef(0);

  // 뷰포트 높이에 맞춰 지도 높이 산정(시트 세로 꽉 채움)
  useEffect(() => {
    const calc = () => setMapH(Math.max(360, window.innerHeight - 210));
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // 열렸을 때 배경 스크롤 잠금 + 드래그 초기화
  useEffect(() => {
    if (!open) {
      setDragY(0);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function onTouchStart(e: React.TouchEvent) {
    dragging.current = true;
    startY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const dy = e.touches[0].clientY - startY.current;
    setDragY(dy > 0 ? dy : 0); // 아래로만 따라감
  }
  function onTouchEnd() {
    dragging.current = false;
    if (dragY > 120) onClose();
    else setDragY(0);
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* sheet */}
      <div
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-md flex-col overflow-hidden rounded-t-card bg-canvas shadow-card"
        style={{
          top: "0.5rem",
          transform: open ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: dragging.current ? "none" : "transform 300ms ease",
        }}
      >
        {/* 드래그 핸들 */}
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center pb-1 pt-2"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={onClose}
        >
          <span className="h-1.5 w-10 rounded-full bg-neutral-300" />
        </div>
        {/* 지도 (열렸을 때만 마운트 → KakaoMap 사이징 안전) */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {open && <HeritageMap mapHeight={mapH} />}
        </div>
      </div>
    </div>
  );
}
