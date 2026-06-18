"use client";
// 지도 전체화면 모달 — 화면을 덮되 하단 탭바는 보이게(탭바 높이만큼 bottom 비움). 우상단 X로 닫기.
import { useEffect } from "react";
import HeritageMap from "@/components/HeritageMap";

const TABBAR = "calc(3.5rem + env(safe-area-inset-bottom))"; // 하단 탭바 높이

export default function MapSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // 열렸을 때 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div
      className={`fixed inset-x-0 top-0 z-30 mx-auto flex max-w-md flex-col bg-canvas transition-opacity duration-200 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ bottom: TABBAR }}
      aria-hidden={!open}
    >
      {/* 헤더 + 닫기 */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h2 className="font-bold text-navy">국가유산 지도</h2>
        <button onClick={onClose} className="pressable text-lg text-neutral-400" aria-label="닫기">
          ✕
        </button>
      </div>

      {/* 지도(채움) — 열렸을 때만 마운트 */}
      <div className="relative flex-1">{open && <HeritageMap />}</div>
    </div>
  );
}
