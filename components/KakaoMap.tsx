"use client";
// Kakao 지도 — 마커 + 도보 폴리라인. 키 미설정 시 안내 폴백.
import { useEffect, useRef, useState } from "react";
import { loadKakao } from "@/lib/kakao";
import { categoryHex } from "./ui";
import type { LatLng, POI } from "@/lib/types";

export interface MapMarker {
  poi: POI;
  order?: number; // 루트 순서 핀(있으면 번호 표시)
}

export default function KakaoMap({
  markers = [],
  paths = [],
  center,
  height = 360,
  onMarkerClick,
}: {
  markers?: MapMarker[];
  paths?: LatLng[][];
  center?: LatLng;
  height?: number;
  onMarkerClick?: (poi: POI) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 지도 생성
  useEffect(() => {
    let cancelled = false;
    loadKakao()
      .then((kakao) => {
        if (cancelled || !ref.current) return;
        const c = center ??
          (markers[0] ? { lat: markers[0].poi.latitude, lng: markers[0].poi.longitude } : { lat: 37.5759, lng: 126.9769 });
        mapRef.current = new kakao.maps.Map(ref.current, {
          center: new kakao.maps.LatLng(c.lat, c.lng),
          level: 5,
        });
      })
      .catch((e) => setError(String(e?.message ?? e)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마커·폴리라인 갱신
  useEffect(() => {
    const kakao = (typeof window !== "undefined" && window.kakao) || null;
    if (!kakao?.maps || !mapRef.current) return;
    const map = mapRef.current;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    const bounds = new kakao.maps.LatLngBounds();

    // 폴리라인(도보 경로)
    paths.forEach((path) => {
      if (path.length < 2) return;
      const line = new kakao.maps.Polyline({
        path: path.map((p) => new kakao.maps.LatLng(p.lat, p.lng)),
        strokeWeight: 5,
        strokeColor: "#1a294a",
        strokeOpacity: 0.85,
        strokeStyle: "solid",
      });
      line.setMap(map);
      overlaysRef.current.push(line);
      path.forEach((p) => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng)));
    });

    // 마커(순서 핀 또는 카테고리 핀)
    markers.forEach((m) => {
      const pos = new kakao.maps.LatLng(m.poi.latitude, m.poi.longitude);
      const hex = categoryHex(m.poi.category);
      const label =
        m.order !== undefined ? `${m.order === 0 ? "출발" : m.order}` : "";
      const el = document.createElement("div");
      el.style.cssText = `transform:translate(-50%,-100%);cursor:pointer;`;
      el.innerHTML = `<div style="background:${hex};color:#fff;border-radius:14px;padding:3px 9px;font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.3);white-space:nowrap">${label || "●"} ${m.poi.name}</div>`;
      el.onclick = () => onMarkerClick?.(m.poi);
      const overlay = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1 });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
      bounds.extend(pos);
    });

    if (markers.length + paths.length > 0 && !bounds.isEmpty()) {
      map.setBounds(bounds, 40, 40, 40, 40);
    }
  }, [markers, paths, onMarkerClick]);

  if (error) {
    return (
      <div
        className="grid place-items-center rounded-card bg-neutral-100 text-center text-sm text-neutral-500"
        style={{ height }}
      >
        <div className="px-6">
          지도를 표시하려면 <code>NEXT_PUBLIC_KAKAO_MAP_KEY</code>가 필요합니다.
          <br />
          (코스 거리·시간 계산과 목록은 키 없이도 동작)
        </div>
      </div>
    );
  }

  return <div ref={ref} className="rounded-card" style={{ width: "100%", height }} />;
}
