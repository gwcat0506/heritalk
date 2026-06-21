'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGeolocation } from '@/hooks/useGeolocation'
import { Heritage } from '@/types/heritage'
import { useRouter } from 'next/navigation'
import { MapPin, Navigation, Clock, LocateFixed, Footprints, Check, X } from 'lucide-react'
import { saveVisit } from '@/lib/supabase'

const KakaoMap = dynamic(() => import('@/components/map/KakaoMap'), { ssr: false })

const DESIGNATION_ICON: Record<string, string> = {
  '국보': '⭐', '보물': '💎', '사적': '🏯', '명승': '🌿',
  '천연기념물': '🌳', '시도유형문화유산': '🏛️', '시도기념물': '🗿',
}
const DESIGNATION_COLOR: Record<string, string> = {
  '국보': 'bg-amber-100 text-amber-800',
  '보물': 'bg-blue-100 text-blue-800',
  '사적': 'bg-green-100 text-green-800',
  '명승': 'bg-teal-100 text-teal-800',
  '천연기념물': 'bg-emerald-100 text-emerald-800',
}

// 반경 선택지 (미터)
const RADIUS_OPTIONS = [1000, 2000, 5000, 10000]

// 위치 바로가기 프리셋
const PRESETS = [
  { name: '경복궁', lat: 37.5796, lng: 126.9770 },
  { name: '경주',   lat: 35.8348, lng: 129.2194 },
  { name: '전주',   lat: 35.8150, lng: 127.1530 },
  { name: '수원화성', lat: 37.2881, lng: 127.0146 },
]

const LEVELS = [
  { key: 'child', label: '쉽게' },
  { key: 'general', label: '보통' },
  { key: 'expert', label: '자세히' },
]

interface Loc { lat: number; lng: number }

export default function MapPage() {
  const { location, loading } = useGeolocation()
  const [center, setCenter] = useState<Loc | null>(null)
  const [centerLabel, setCenterLabel] = useState('현재 위치')
  const [radius, setRadius] = useState(2000)
  const [heritageList, setHeritageList] = useState<Heritage[]>([])
  const [fetching, setFetching] = useState(false)

  // 투어 만들기 모드
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [level, setLevel] = useState('general')

  const router = useRouter()

  // GPS가 잡히면 최초 1회 중심으로 설정
  useEffect(() => {
    if (location && !center) setCenter(location)
  }, [location, center])

  // 중심·반경 바뀔 때마다 재조회
  useEffect(() => {
    if (!center) return
    setFetching(true)
    fetch(`/api/heritage?lat=${center.lat}&lng=${center.lng}&radius=${radius}`)
      .then(r => r.json())
      .then(data => setHeritageList(data))
      .finally(() => setFetching(false))
  }, [center, radius])

  const useMyLocation = () => {
    if (location) { setCenter(location); setCenterLabel('현재 위치') }
  }
  const usePreset = (p: typeof PRESETS[number]) => {
    setCenter({ lat: p.lat, lng: p.lng }); setCenterLabel(p.name)
  }
  const handleMapClick = (lat: number, lng: number) => {
    setCenter({ lat, lng }); setCenterLabel('선택한 위치')
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-400">
      <Navigation size={28} className="animate-pulse" />
      <p className="text-sm">위치 확인 중...</p>
    </div>
  )

  // 유산 탭 → 모드에 따라: 일반=상세, 투어=선택 토글
  const onCardTap = (h: Heritage) => {
    if (selecting) {
      setSelectedIds(s => s.includes(h.id) ? s.filter(x => x !== h.id) : [...s, h.id])
      return
    }
    saveVisit(h.id, h.name).catch(() => {})
    const params = new URLSearchParams({
      id: h.id, name: h.name, designation: h.designation,
      district: h.district, distance: String(h.distance ?? ''),
    })
    router.push(`/heritage?${params.toString()}`)
  }

  // 선택한 유산들로 투어 시작 → 세션에 담아 /tour 재생 페이지로
  const startTour = () => {
    if (!center || selectedIds.length === 0) return
    const stops = heritageList
      .filter(h => selectedIds.includes(h.id))
      .map(h => ({ id: h.id, name: h.name, lat: h.lat, lng: h.lng }))
    sessionStorage.setItem('heritalk_tour', JSON.stringify({
      start: center, startLabel: centerLabel, level, stops,
    }))
    router.push('/tour')
  }

  const radiusKm = radius / 1000

  return (
    <div className="h-full overflow-y-auto">
      {/* 위치 헤더 */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-1.5 text-stone-500 text-sm">
          <MapPin size={14} className="text-amber-500" />
          <span>{centerLabel} 기준 · 반경 {radiusKm}km</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-xl font-bold text-stone-900">내 주변 유산</h1>
          {/* 투어 만들기 토글 */}
          {!selecting ? (
            <button
              onClick={() => setSelecting(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-600 text-white active:scale-95"
            >
              <Footprints size={14} /> 투어 만들기
            </button>
          ) : (
            <button
              onClick={() => { setSelecting(false); setSelectedIds([]) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500"
            >
              <X size={13} /> 취소
            </button>
          )}
        </div>
        {selecting && (
          <p className="text-xs text-amber-700 mt-1">투어에 넣을 유산을 탭해서 고르세요. 골라둔 순서와 상관없이 최적 동선으로 짜드려요.</p>
        )}
      </div>

      {/* 컨트롤: 반경 + 위치 */}
      <div className="px-5 pb-3 space-y-2.5">
        <div className="flex gap-1.5">
          {RADIUS_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                radius === r ? 'bg-stone-900 text-white border-stone-900'
                             : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              {r / 1000}km
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={useMyLocation}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 flex-shrink-0"
          >
            <LocateFixed size={13} /> 내 위치
          </button>
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => usePreset(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-all ${
                centerLabel === p.name ? 'bg-stone-900 text-white border-stone-900'
                                       : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 카카오 지도 */}
      <div className="mx-5 rounded-2xl border border-stone-200 overflow-hidden mb-1" style={{ height: '208px' }}>
        {center && (
          <KakaoMap
            lat={center.lat}
            lng={center.lng}
            radius={radius}
            heritageList={heritageList}
            onSelect={onCardTap}
            onMapClick={handleMapClick}
          />
        )}
      </div>
      <p className="px-5 text-[11px] text-stone-400 mb-4">지도를 탭하면 그 위치 기준으로 유산을 찾아요</p>

      {/* 유산 목록 */}
      <div className="px-5 space-y-3 pb-28">
        {fetching ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-stone-100 animate-pulse" />
          ))
        ) : heritageList.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-sm">
            반경 {radiusKm}km 내 유산이 없어요. 반경을 넓히거나 위치를 옮겨보세요.
          </div>
        ) : (
          heritageList.map(h => {
            const on = selectedIds.includes(h.id)
            return (
              <button
                key={h.id}
                onClick={() => onCardTap(h)}
                className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left active:scale-[0.98] ${
                  selecting && on ? 'border-amber-400 bg-amber-50'
                  : 'border-stone-100 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                {selecting ? (
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                    on ? 'bg-amber-500 border-amber-500 text-white' : 'border-stone-300 text-transparent'
                  }`}>
                    <Check size={15} />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-xl flex-shrink-0">
                    {DESIGNATION_ICON[h.designation] ?? '🏛️'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 text-sm truncate">{h.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${DESIGNATION_COLOR[h.designation] ?? 'bg-stone-100 text-stone-600'}`}>
                      {h.designation}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-stone-400">
                      {h.distance ? `${h.distance}m` : h.district}
                    </span>
                    {h.era && (
                      <>
                        <span className="text-xs text-stone-300">·</span>
                        <span className="text-xs text-stone-400">{h.era}</span>
                      </>
                    )}
                  </div>
                </div>
                {!selecting && <Clock size={14} className="text-stone-300 flex-shrink-0" />}
              </button>
            )
          })
        )}
      </div>

      {/* 투어 시작 바 (선택 모드) */}
      {selecting && (
        <div className="fixed bottom-16 inset-x-0 max-w-md mx-auto px-5 z-20">
          <div className="bg-white/95 backdrop-blur border border-stone-200 rounded-2xl shadow-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">해설 깊이</span>
              <div className="flex gap-1 bg-stone-100 rounded-full p-0.5">
                {LEVELS.map(l => (
                  <button key={l.key} onClick={() => setLevel(l.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      level === l.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={startTour}
              disabled={selectedIds.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-[0.98]"
            >
              <Footprints size={16} />
              {selectedIds.length === 0 ? '유산을 선택하세요' : `${selectedIds.length}곳으로 투어 시작`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
