'use client'
import { useState, useMemo } from 'react'
import * as Icons from 'lucide-react'
import { Lock } from 'lucide-react'
import {
  MOCK_COLLECTED, MOCK_BADGES, MAIN_CATEGORIES, categoryOf,
} from '@/lib/mock/archive'

type ViewMode = 'type' | 'region'

export default function DogamPage() {
  const [view, setView] = useState<ViewMode>('type')
  const [filter, setFilter] = useState<string>('전체')

  // 종류별: 대표 4종 + 기타,  지역별: 데이터에 등장하는 지역들
  const filters = useMemo(() => {
    if (view === 'type') return ['전체', ...MAIN_CATEGORIES, '기타']
    const regions = Array.from(new Set(MOCK_COLLECTED.map(h => h.region)))
    return ['전체', ...regions]
  }, [view])

  const list = MOCK_COLLECTED.filter(h => {
    if (filter === '전체') return true
    return view === 'type' ? categoryOf(h.designation) === filter : h.region === filter
  })

  const collectedCount = MOCK_COLLECTED.filter(h => h.collectedAt).length
  const total = MOCK_COLLECTED.length
  const percent = Math.round((collectedCount / total) * 100)

  return (
    <div className="h-full overflow-y-auto px-5 pt-4 pb-8">
      <h1 className="text-xl font-bold text-stone-900 mb-4">국가유산 도감</h1>

      {/* 진행도 */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-sm font-semibold text-stone-700">전체 수집</span>
          <span className="text-sm text-stone-500">{collectedCount} / {total}</span>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* 보기 전환: 종류별 / 지역별 */}
      <div className="flex gap-2 mb-3">
        {(['type', 'region'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => { setView(v); setFilter('전체') }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
              view === v ? 'bg-stone-900 text-white border-stone-900'
                         : 'bg-white text-stone-600 border-stone-200'
            }`}
          >
            {v === 'type' ? '종류별' : '지역별'}
          </button>
        ))}
      </div>

      {/* 분류 칩 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full transition-all ${
              filter === f ? 'bg-amber-700 text-amber-50'
                           : 'bg-stone-100 text-stone-500'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 유산 카드 그리드 */}
      <div className="grid grid-cols-2 gap-2.5 mb-7">
        {list.map(h => {
          const collected = !!h.collectedAt
          return (
            <div
              key={h.id}
              className={`border border-stone-100 rounded-2xl overflow-hidden ${collected ? '' : 'opacity-60'}`}
            >
              <div className={`h-16 flex items-center justify-center ${collected ? 'bg-amber-50' : 'bg-stone-100'}`}>
                {collected
                  ? <span className="text-2xl">{h.emoji}</span>
                  : <Lock size={20} className="text-stone-400" />}
              </div>
              <div className="px-2.5 py-2">
                <p className={`text-xs font-medium ${collected ? 'text-stone-900' : 'text-stone-400'}`}>
                  {collected ? h.name : '???'}
                </p>
                <div className="flex justify-between items-center mt-1">
                  {collected ? (
                    <>
                      <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">
                        {h.designation}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(h.collectedAt!).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-stone-400">미방문</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 뱃지 */}
      <div className="flex items-center gap-1.5 mb-3">
        <Icons.Award size={15} className="text-amber-600" />
        <h2 className="text-sm font-semibold text-stone-700">뱃지</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {MOCK_BADGES.map(b => {
          const Icon = (Icons as any)[b.icon] ?? Icons.Award
          return (
            <div
              key={b.id}
              className={`flex items-center gap-2.5 p-2.5 border border-stone-100 rounded-2xl ${b.achieved ? '' : 'opacity-60'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${b.achieved ? 'bg-amber-50' : 'bg-stone-100'}`}>
                <Icon size={16} className={b.achieved ? 'text-amber-800' : 'text-stone-400'} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-stone-800">{b.label}</p>
                <p className={`text-[10px] ${b.achieved ? 'text-green-700' : 'text-stone-400'}`}>
                  {b.achieved ? '획득' : b.progress}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
