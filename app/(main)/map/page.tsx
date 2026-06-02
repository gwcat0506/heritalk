'use client'
import { useState, useEffect } from 'react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { Heritage } from '@/types/heritage'
import { useRouter } from 'next/navigation'
import { MapPin, Navigation, Clock } from 'lucide-react'

const ERA_COLOR: Record<string, string> = {
  '조선': 'bg-amber-100 text-amber-800',
  '고려': 'bg-green-100 text-green-800',
  '일제강점기': 'bg-red-100 text-red-800',
  '근현대': 'bg-blue-100 text-blue-800',
}

export default function MapPage() {
  const { location, loading } = useGeolocation()
  const [heritageList, setHeritageList] = useState<Heritage[]>([])
  const [fetching, setFetching] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!location) return
    setFetching(true)
    fetch(`/api/heritage?lat=${location.lat}&lng=${location.lng}&radius=1000`)
      .then(r => r.json())
      .then(data => setHeritageList(data))
      .finally(() => setFetching(false))
  }, [location])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-400">
      <Navigation size={28} className="animate-pulse" />
      <p className="text-sm">위치 확인 중...</p>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto">
      {/* 위치 헤더 */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-1.5 text-stone-500 text-sm">
          <MapPin size={14} className="text-amber-500" />
          <span>현재 위치 기준 · 반경 1km</span>
        </div>
        <h1 className="text-xl font-bold text-stone-900 mt-1">내 주변 유산</h1>
      </div>

      {/* 지도 영역 (추후 KakaoMap 컴포넌트로 교체) */}
      <div className="mx-5 h-44 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 text-sm mb-4">
        🗺️ 카카오 지도 영역
      </div>

      {/* 유산 목록 */}
      <div className="px-5 space-y-3 pb-6">
        {fetching ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-stone-100 animate-pulse" />
          ))
        ) : heritageList.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-sm">
            주변 1km 내 유산이 없습니다
          </div>
        ) : (
          heritageList.map(h => (
            <button
              key={h.id}
              onClick={() => router.push(`/docent?id=${h.id}`)}
              className="w-full flex items-center gap-3.5 p-4 rounded-2xl border border-stone-100 hover:border-stone-300 hover:bg-stone-50 transition-all text-left active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-xl flex-shrink-0">
                🏛️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-900 text-sm truncate">{h.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${ERA_COLOR[h.era] ?? 'bg-stone-100 text-stone-600'}`}>
                    {h.era}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-stone-400">{h.distance ? `${h.distance}m` : h.address}</span>
                  <span className="text-xs text-stone-300">·</span>
                  <span className="text-xs text-stone-400">{h.designation}</span>
                </div>
              </div>
              <Clock size={14} className="text-stone-300 flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
