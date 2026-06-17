"use client";
// 지도 bottom-sheet — 홈에서 아래에서 올라오는 모달. 핀 탭 → 거점 상세.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import KakaoMap, { type MapMarker } from "@/components/KakaoMap";
import type { LatLng } from "@/lib/types";

export default function MapSheet({
  open,
  onClose,
  markers,
  center,
}: {
  open: boolean;
  onClose: () => void;
  markers: MapMarker[];
  center: LatLng;
}) {
  const router = useRouter();

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
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-card bg-white p-4 shadow-card transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-300" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-navy">주변 거점 지도</h2>
          <button onClick={onClose} className="pressable text-sm text-neutral-400">
            닫기
          </button>
        </div>
        <div className="overflow-hidden rounded-card">
          {open && (
            <KakaoMap
              markers={markers}
              center={center}
              height={380}
              onMarkerClick={(poi) => {
                onClose();
                router.push(`/place/${poi.id}`);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
