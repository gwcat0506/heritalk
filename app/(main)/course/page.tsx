'use client'
import { useState } from 'react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { Course, DocentLevel } from '@/types/heritage'
import { Route, Clock, MapPin, ChevronRight } from 'lucide-react'

const THEMES = [
  { id: 'joseon',     label: '조선왕궁',   emoji: '🏯', color: 'bg-amber-50 border-amber-200' },
  { id: 'japanese',   label: '일제강점기', emoji: '🔴', color: 'bg-red-50 border-red-200' },
  { id: 'yi_sunshin', label: '이순신',     emoji: '⚔️', color: 'bg-blue-50 border-blue-200' },
  { id: 'sejong',     label: '세종대왕',   emoji: '📜', color: 'bg-green-50 border-green-200' },
  { id: 'modern',     label: '근현대',     emoji: '🏙️', color: 'bg-stone-50 border-stone-200' },
]

const DURATIONS = [60, 120, 180]

export default function CoursePage() {
  const { location } = useGeolocation()
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [duration, setDuration] = useState(120)
  const [level, setLevel] = useState<DocentLevel>('general')
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!location || !selectedTheme) return
    setLoading(true)
    const res = await fetch('/api/course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: location.lat, lng: location.lng, theme: selectedTheme, duration, level }),
    })
    const data = await res.json()
    setCourse(data)
    setLoading(false)
  }

  return (
    <div className="h-full overflow-y-auto px-5 pt-4 pb-8">
      <h1 className="text-xl font-bold text-stone-900 mb-4">추천 코스</h1>

      {/* 테마 선택 */}
      <section className="mb-5">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">테마</p>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTheme(t.id)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                selectedTheme === t.id
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : `${t.color} text-stone-700 hover:border-stone-300`
              }`}
            >
              <span className="text-xl">{t.emoji}</span>
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 소요시간 */}
      <section className="mb-5">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">소요 시간</p>
        <div className="flex gap-2">
          {DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                duration === d
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
              }`}
            >
              {d / 60}시간
            </button>
          ))}
        </div>
      </section>

      {/* 코스 생성 버튼 */}
      <button
        onClick={generate}
        disabled={!selectedTheme || loading}
        className="w-full py-3.5 bg-stone-900 text-white rounded-2xl font-semibold text-sm disabled:opacity-40 hover:bg-stone-700 transition-all active:scale-[0.98] mb-6"
      >
        {loading ? '코스 생성 중...' : 'AI 코스 생성'}
      </button>

      {/* 코스 결과 */}
      {course && (
        <div className="space-y-4">
          {/* 서사 요약 */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
            <p className="text-xs font-semibold text-amber-700 mb-1">코스 이야기</p>
            <p className="text-sm text-amber-900 leading-relaxed">{course.story}</p>
          </div>

          {/* 경유지 */}
          {course.stops.map((stop, i) => (
            <div key={i} className="relative">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {stop.order}
                  </div>
                  {i < course.stops.length - 1 && (
                    <div className="w-0.5 h-full bg-stone-200 mt-1 mb-1" />
                  )}
                </div>
                <div className="pb-4 flex-1">
                  <div className="p-3.5 rounded-xl border border-stone-100 bg-white">
                    <p className="font-semibold text-stone-900 text-sm">{stop.heritage.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5 mb-2">{stop.heritage.address}</p>
                    <p className="text-xs text-stone-600 leading-relaxed">{stop.docentScript}</p>
                  </div>
                  {stop.transitionScript && (
                    <div className="flex items-center gap-1.5 mt-2 ml-2 text-xs text-stone-400">
                      <ChevronRight size={12} />
                      <span>{stop.transitionScript}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
