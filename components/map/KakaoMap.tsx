'use client'
import { useEffect, useRef } from 'react'
import { Heritage } from '@/types/heritage'

interface Props {
  lat: number
  lng: number
  radius: number                                  // 미터 — 반경 원 표시용
  heritageList: Heritage[]
  onSelect: (heritage: Heritage) => void
  onMapClick?: (lat: number, lng: number) => void // 지도 탭 → 위치 지정
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { kakao: any }
}

// 반경에 맞춰 지도 줌 레벨 자동 조절
function levelForRadius(radius: number): number {
  if (radius <= 1000) return 5
  if (radius <= 2000) return 6
  if (radius <= 5000) return 7
  return 8
}

export default function KakaoMap({ lat, lng, radius, heritageList, onSelect, onMapClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return

    const drawMap = () => {
      if (!mapRef.current) return

      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(lat, lng),
        level: levelForRadius(radius),
      })

      // 검색 반경 원
      new window.kakao.maps.Circle({
        center: new window.kakao.maps.LatLng(lat, lng),
        radius,
        strokeWeight: 1,
        strokeColor: '#d97706',
        strokeOpacity: 0.6,
        fillColor: '#f59e0b',
        fillOpacity: 0.08,
        map,
      })

      // 중심(내/선택) 위치 마커 (별)
      new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(lat, lng),
        map,
        image: new window.kakao.maps.MarkerImage(
          'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
          new window.kakao.maps.Size(24, 35)
        ),
      })

      // 유산 마커
      heritageList.forEach(h => {
        if (!h.lat || !h.lng) return
        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(h.lat, h.lng),
          map,
        })
        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${h.name}</div>`,
        })
        window.kakao.maps.event.addListener(marker, 'mouseover', () => infowindow.open(map, marker))
        window.kakao.maps.event.addListener(marker, 'mouseout', () => infowindow.close())
        window.kakao.maps.event.addListener(marker, 'click', () => onSelect(h))
      })

      // 지도 탭 → 위치 지정
      if (onMapClick) {
        window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
          const ll = mouseEvent.latLng
          onMapClick(ll.getLat(), ll.getLng())
        })
      }
    }

    if (window.kakao) {
      window.kakao.maps.load(drawMap)
      return
    }

    const timer = setInterval(() => {
      if (window.kakao) {
        clearInterval(timer)
        window.kakao.maps.load(drawMap)
      }
    }, 50)

    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, radius, heritageList])

  return <div ref={mapRef} style={{ width: '100%', height: '208px' }} />
}
