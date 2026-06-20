"use client";
// 사용자 현재 위치 훅 — 지도 중심/내위치 마커용. 거부/실패/미지원 시 fallback(기본 경복궁) 유지.
import { useCallback, useEffect, useState } from "react";
import type { LatLng } from "@/lib/types";

export const GYEONGBOKGUNG: LatLng = { lat: 37.5796, lng: 126.977 }; // 경복궁
export const NMK: LatLng = { lat: 37.524, lng: 126.9803 }; // 국립중앙박물관

const GEO_OPTS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 300000,
};

export interface UserLocation {
  center: LatLng; // fallback 또는 실제 위치
  located: boolean; // 실제 geolocation 확보 여부(거짓 위치 마커 방지)
  locate: () => Promise<LatLng | null>; // 버튼용 재조회(성공 시 좌표, 실패 null)
}

export function useUserLocation(fallback: LatLng = GYEONGBOKGUNG): UserLocation {
  const [center, setCenter] = useState<LatLng>(fallback);
  const [located, setLocated] = useState(false);

  const locate = useCallback(() => {
    return new Promise<LatLng | null>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(c);
          setLocated(true);
          resolve(c);
        },
        () => resolve(null), // 거부/실패 → fallback 유지
        GEO_OPTS
      );
    });
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  return { center, located, locate };
}
