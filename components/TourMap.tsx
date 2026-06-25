"use client";
// 투어 경로 지도 — 폴리라인 + 정류지 번호 마커 + 이동점(위치만 갱신, 재생성 X).
// 이동점 좌표는 부모가 주입(미리보기=positionAt, 라이브=실제 GPS).
import { useEffect, useRef } from "react";
import { loadKakao } from "@/lib/kakao";
import type { LatLng } from "@/lib/types";
import type { PathPoint } from "@/lib/tour/route";

interface Props {
  path: PathPoint[];
  stops: { lat: number; lng: number; name: string }[];
  pos: LatLng;
  fill?: boolean; // true면 부모(relative)를 absolute inset-0로 채움(히어로용)
}

export default function TourMap({ path, stops, pos, fill = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meRef = useRef<any>(null);
  const readyRef = useRef(false);

  // 최초 1회: 지도 + 경로 + 정류지 마커 + 이동점
  useEffect(() => {
    let cancelled = false;
    if (path.length === 0) return;
    loadKakao()
      .then((kakao) => {
        if (cancelled || !ref.current) return;
        const map = new kakao.maps.Map(ref.current, {
          center: new kakao.maps.LatLng(path[0].lat, path[0].lng),
          level: 5,
        });

        const linePath = path.map((p) => new kakao.maps.LatLng(p.lat, p.lng));
        new kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 5,
          strokeColor: "#1a294a",
          strokeOpacity: 0.9,
          strokeStyle: "solid",
          map,
        });

        const bounds = new kakao.maps.LatLngBounds();
        linePath.forEach((ll: unknown) => bounds.extend(ll));
        map.setBounds(bounds, 30, 30, 30, 30);

        stops.forEach((s, i) => {
          new kakao.maps.CustomOverlay({
            position: new kakao.maps.LatLng(s.lat, s.lng),
            map,
            zIndex: 3,
            content: `<div style="display:flex;flex-direction:column;align-items:center">
              <div style="width:22px;height:22px;background:#1a294a;color:#fff;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.35)">${i + 1}</div>
              <div style="margin-top:2px;background:rgba(255,255,255,.92);padding:1px 6px;border-radius:6px;font-size:10px;font-weight:600;color:#1a294a;white-space:nowrap">${s.name}</div>
            </div>`,
          });
        });

        meRef.current = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(pos.lat, pos.lng),
          map,
          zIndex: 5,
          content: `<div style="width:16px;height:16px;background:#dc2626;border:3px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(220,38,38,.7)"></div>`,
        });
        readyRef.current = true;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // 경로/정류지는 투어 동안 고정 → 최초 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 이동점만 갱신
  useEffect(() => {
    const kakao = (typeof window !== "undefined" && window.kakao) || null;
    if (readyRef.current && meRef.current && kakao?.maps) {
      meRef.current.setPosition(new kakao.maps.LatLng(pos.lat, pos.lng));
    }
  }, [pos.lat, pos.lng]);

  return (
    <div
      ref={ref}
      className={
        fill
          ? "absolute inset-0"
          : "h-[220px] w-full rounded-card border border-neutral-200"
      }
    />
  );
}
