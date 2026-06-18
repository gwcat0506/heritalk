"use client";
// Kakao 지도 — 마커 + 도보 폴리라인. 키 미설정 시 안내 폴백.
import { useEffect, useRef, useState } from "react";
import { loadKakao } from "@/lib/kakao";
import { categoryHex } from "./ui";
import type { LatLng, POI } from "@/lib/types";

export interface MapMarker {
  poi: POI;
  order?: number; // 루트 순서 핀(있으면 번호 표시)
  count?: number; // 좌표 클러스터 개수(>1이면 묶음 마커)
}

export default function KakaoMap({
  markers = [],
  paths = [],
  center,
  height = 360,
  fill = false,
  onMarkerClick,
}: {
  markers?: MapMarker[];
  paths?: LatLng[][];
  center?: LatLng;
  height?: number;
  fill?: boolean; // true면 부모(relative)를 absolute inset-0로 채움
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

    // 마커
    const labelEls: HTMLElement[] = [];
    markers.forEach((m) => {
      const pos = new kakao.maps.LatLng(m.poi.latitude, m.poi.longitude);
      const hex = categoryHex(m.poi.category);
      const el = document.createElement("div");
      el.style.cssText = "cursor:pointer;";
      if (m.order !== undefined) {
        // 루트 핀(코스결과): 번호 + 이름 pill — 항상 표시
        el.innerHTML = `<div style="background:${hex};color:#fff;border-radius:14px;padding:3px 9px;font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.3);white-space:nowrap">${m.order === 0 ? "출발" : m.order} ${m.poi.name}</div>`;
      } else if (m.count && m.count > 1) {
        // 좌표 클러스터: 개수 배지 원형(같은 위치 유산 묶음)
        el.innerHTML = `<div style="display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:${hex};border:2px solid #fff;color:#fff;font-size:11px;font-weight:800;box-shadow:0 1px 4px rgba(0,0,0,.45)">${m.count}</div>`;
      } else {
        // 단일 유산: 색 원형 dot(항상) + 이름 라벨(흰 배경·색 테두리, 줌인 시에만)
        el.innerHTML = `<div style="position:relative;width:14px;height:14px">
          <span style="display:block;width:14px;height:14px;border-radius:50%;background:${hex};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45)"></span>
          <span class="hm-label" style="display:none;position:absolute;top:18px;left:50%;transform:translateX(-50%);background:#fff;color:${hex};border:1.5px solid ${hex};border-radius:10px;padding:1px 7px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.25)">${m.poi.name}</span>
        </div>`;
        const lbl = el.querySelector(".hm-label") as HTMLElement | null;
        if (lbl) labelEls.push(lbl);
      }
      el.onclick = () => onMarkerClick?.(m.poi);
      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        yAnchor: m.order !== undefined ? 1 : 0.5,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
      bounds.extend(pos);
    });

    if (markers.length + paths.length > 0 && !bounds.isEmpty()) {
      map.setBounds(bounds, 40, 40, 40, 40);
    }

    // 줌 레벨에 따라 유산 이름 라벨 토글(겹침 방지). 레벨↓ = 확대.
    const LABEL_LEVEL = 5;
    const applyLabels = () => {
      const show = map.getLevel() <= LABEL_LEVEL;
      for (const l of labelEls) l.style.display = show ? "block" : "none";
    };
    applyLabels();
    kakao.maps.event.addListener(map, "zoom_changed", applyLabels);
    return () => {
      kakao.maps.event.removeListener(map, "zoom_changed", applyLabels);
    };
  }, [markers, paths, onMarkerClick]);

  if (error) {
    return (
      <div
        className={`grid place-items-center bg-neutral-100 text-center text-sm text-neutral-500 ${
          fill ? "absolute inset-0" : "rounded-card"
        }`}
        style={fill ? undefined : { height }}
      >
        <div className="px-6">
          지도를 표시하려면 <code>NEXT_PUBLIC_KAKAO_MAP_KEY</code>가 필요합니다.
          <br />
          (코스 거리·시간 계산과 목록은 키 없이도 동작)
        </div>
      </div>
    );
  }

  if (fill) return <div ref={ref} className="absolute inset-0" />;
  return <div ref={ref} className="rounded-card" style={{ width: "100%", height }} />;
}
