'use client'
import { useEffect, useRef } from 'react'
import { Heritage } from '@/types/heritage'

interface Props {
  lat: number
  lng: number
  heritageList: Heritage[]
  onSelect: (heritage: Heritage) => void
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { kakao: any }
}

export default function KakaoMap({ lat, lng, heritageList, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return

    const drawMap = () => {
      if (!mapRef.current) return

      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(lat, lng),
        level: 4,
      })

      // 내 위치 마커 (별)
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
    }

    // kakao 객체가 있으면 항상 maps.load() 통해서 초기화 (autoload=false이므로)
    if (window.kakao) {
      window.kakao.maps.load(drawMap)
      return
    }

    // 아직 SDK 로드 중 → 폴링
    const timer = setInterval(() => {
      if (window.kakao) {
        clearInterval(timer)
        window.kakao.maps.load(drawMap)
      }
    }, 50)

    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, heritageList])

  return <div ref={mapRef} style={{ width: '100%', height: '208px' }} />
}
