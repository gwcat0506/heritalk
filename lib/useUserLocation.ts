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

export type GeoStatus = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

export interface UserLocation {
  center: LatLng; // fallback 또는 실제 위치
  located: boolean; // 실제 geolocation 확보 여부(거짓 위치 마커 방지)
  status: GeoStatus; // 권한 상태(미지원 환경은 unsupported)
  locate: () => Promise<LatLng | null>; // 버튼용 재조회(성공 시 좌표, 실패 null)
}

export function useUserLocation(
  fallback: LatLng = GYEONGBOKGUNG,
  opts: { auto?: boolean } = {}
): UserLocation {
  const auto = opts.auto ?? true;
  const [center, setCenter] = useState<LatLng>(fallback);
  const [located, setLocated] = useState(false);
  const [status, setStatus] = useState<GeoStatus>("unknown");

  // 권한 상태 조회(Permissions API 지원 시) — 자동 팝업 없이 현재 상태만 파악.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    const perms = navigator.permissions;
    if (!perms?.query) return; // 미지원(예: 일부 Safari) → unknown 유지
    let ps: PermissionStatus | null = null;
    perms
      .query({ name: "geolocation" as PermissionName })
      .then((p) => {
        ps = p;
        setStatus(p.state as GeoStatus);
        p.onchange = () => setStatus(p.state as GeoStatus);
      })
      .catch(() => {});
    return () => {
      if (ps) ps.onchange = null;
    };
  }, []);

  const locate = useCallback(() => {
    return new Promise<LatLng | null>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setStatus("unsupported");
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(c);
          setLocated(true);
          setStatus("granted");
          resolve(c);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setStatus("denied");
          resolve(null); // 거부/실패 → fallback 유지
        },
        GEO_OPTS
      );
    });
  }, []);

  useEffect(() => {
    if (auto) locate();
  }, [auto, locate]);

  return { center, located, status, locate };
}
