'use client'
import { useEffect, useRef } from 'react'
import { PathPoint } from '@/lib/tour/route'

interface Stop { name: string; cumDist: number }
interface Props {
  path: PathPoint[]
  stopPositions: { lat: number; lng: number; name: string }[]
  pos: { lat: number; lng: number }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { kakao: any }
}

// 투어 경로를 실제 카카오 지도 위에 그린다.
// - 경로 폴리라인(직선 또는 Tmap 도로) + 출발/정류지 마커
// - 현재 위치(빨간 점)는 지도 전체를 다시 그리지 않고 위치만 갱신 → 부드럽게 이동
export default function TourMap({ path, stopPositions, pos }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const meRef = useRef<any>(null)   // 현재 위치 오버레이
  const mapRef = useRef<any>(null)
  const readyRef = useRef(false)

  // 최초 1회: 지도 + 경로 + 정류지 마커
  useEffect(() => {
    const init = () => {
      if (!ref.current || !window.kakao?.maps || path.length === 0) return
      const kakao = window.kakao
      const map = new kakao.maps.Map(ref.current, {
        center: new kakao.maps.LatLng(path[0].lat, path[0].lng),
        level: 5,
      })
      mapRef.current = map

      // 경로 폴리라인
      const linePath = path.map(p => new kakao.maps.LatLng(p.lat, p.lng))
      new kakao.maps.Polyline({
        path: linePath, strokeWeight: 5, strokeColor: '#f59e0b',
        strokeOpacity: 0.9, strokeStyle: 'solid', map,
      })

      // 경로 전체가 보이도록 범위 맞춤
      const bounds = new kakao.maps.LatLngBounds()
      linePath.forEach((ll: any) => bounds.extend(ll))
      map.setBounds(bounds)

      // 출발 마커
      new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(path[0].lat, path[0].lng), map, zIndex: 2,
        content: `<div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:14px;height:14px;background:#0c0a09;border:3px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>
          <div style="margin-top:2px;background:#0c0a09;padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;color:#fff;white-space:nowrap">출발 · 현재위치</div>
        </div>`,
      })

      // 정류지 마커 (번호 + 이름)
      stopPositions.forEach((s, i) => {
        new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(s.lat, s.lng), map, zIndex: 3,
          content: `<div style="display:flex;flex-direction:column;align-items:center">
            <div style="width:22px;height:22px;background:#f59e0b;color:#fff;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.35)">${i + 1}</div>
            <div style="margin-top:2px;background:rgba(255,255,255,.92);padding:1px 6px;border-radius:6px;font-size:10px;font-weight:600;color:#92400e;white-space:nowrap">${s.name}</div>
          </div>`,
        })
      })

      // 현재 위치(이동점)
      const me = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(pos.lat, pos.lng), map, zIndex: 5,
        content: `<div style="width:16px;height:16px;background:#dc2626;border:3px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(220,38,38,.7)"></div>`,
      })
      meRef.current = me
      readyRef.current = true
    }

    if (window.kakao?.maps) { window.kakao.maps.load(init); return }
    const timer = setInterval(() => {
      if (window.kakao?.maps) { clearInterval(timer); window.kakao.maps.load(init) }
    }, 60)
    return () => clearInterval(timer)
  // 경로/정류지는 투어 동안 고정 → 최초 1회만
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 현재 위치만 갱신 (지도 재생성 없이)
  useEffect(() => {
    if (readyRef.current && meRef.current && window.kakao?.maps) {
      meRef.current.setPosition(new window.kakao.maps.LatLng(pos.lat, pos.lng))
    }
  }, [pos.lat, pos.lng])

  return <div ref={ref} style={{ width: '100%', height: 220 }} className="rounded-2xl border border-stone-200" />
}
