"use client";
// 사용자 현재 위치 훅 — 지도 중심용. 거부/실패/미지원 시 fallback(기본 경복궁) 유지.
import { useEffect, useState } from "react";
import type { LatLng } from "@/lib/types";

export const GYEONGBOKGUNG: LatLng = { lat: 37.5796, lng: 126.977 }; // 경복궁
export const NMK: LatLng = { lat: 37.524, lng: 126.9803 }; // 국립중앙박물관

export function useUserLocation(fallback: LatLng = GYEONGBOKGUNG): LatLng {
  const [center, setCenter] = useState<LatLng>(fallback);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // 거부/실패 → fallback 유지
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  return center;
}
