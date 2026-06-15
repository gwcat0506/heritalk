'use client'
// 미리보기용: 가짜(mock) 데이터로 그린 '내 기록' 화면.
// DB 연동 시 MOCK_* 를 lib/supabase.ts 실제 조회로 교체하세요.
import { Route, MapPin, Share2, Lightbulb, ChevronRight } from 'lucide-react'
import {
  MOCK_PROFILE, MOCK_COURSES, MOCK_LOGS, MOCK_SUGGESTION,
} from '@/lib/mock/archive'

export default function ProfilePage() {
  const p = MOCK_PROFILE

  return (
    <div className="h-full overflow-y-auto px-5 pt-5 pb-8">
      {/* 프로필 헤더 + 레벨 */}
      <div className="flex items-center gap-4 mb-5 p-4 rounded-2xl bg-stone-50 border border-stone-100">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-xl font-bold text-amber-700">
          {p.nickname[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-stone-900">{p.nickname}</p>
            <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
              Lv.{p.level} {p.levelName}
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            {p.nextLevelName}까지 {p.toNext}곳 더
          </p>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { n: p.visits, label: '방문' },
          { n: p.bookmarks, label: '즐겨찾기' },
          { n: p.collected, label: '수집' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-2xl bg-stone-50 border border-stone-100 text-center">
            <p className="text-xl font-bold text-stone-900">{s.n}</p>
            <p className="text-xs text-stone-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 내 코스 */}
      <div className="flex items-center gap-1.5 mb-2">
        <Route size={15} className="text-amber-600" />
        <h2 className="text-sm font-semibold text-stone-700">내 코스</h2>
      </div>
      <div className="flex flex-col gap-2 mb-6">
        {MOCK_COURSES.map(c => (
          <div key={c.id} className="flex items-center gap-3 p-3 border border-stone-100 rounded-2xl">
            <span className="text-xl">{c.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-800">{c.title}</p>
              <p className="text-xs text-stone-400">
                경유지 {c.stopCount}곳 · {c.duration / 60}시간 ·{' '}
                {new Date(c.savedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 저장
              </p>
            </div>
            <button className="text-stone-400 hover:text-stone-700" aria-label="공유">
              <Share2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* 방문 일지 */}
      <div className="flex items-center gap-1.5 mb-2">
        <MapPin size={15} className="text-amber-600" />
        <h2 className="text-sm font-semibold text-stone-700">방문 일지</h2>
      </div>
      <div className="flex flex-col gap-2.5 mb-6">
        {MOCK_LOGS.map(log => (
          <div key={log.date} className="p-3 rounded-2xl bg-stone-50">
            <p className="text-[11px] text-stone-400 mb-1">
              {new Date(log.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
            </p>
            <p className="text-xs italic text-stone-500 mb-1.5">&ldquo;{log.recap}&rdquo;</p>
            <p className="text-xs text-stone-800">{log.heritages.join(' · ')}</p>
          </div>
        ))}
      </div>

      {/* 다음 답사 제안 */}
      <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-amber-200 bg-amber-50">
        <Lightbulb size={20} className="text-amber-800" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-amber-800">이런 답사는 어때요?</p>
          <p className="text-xs text-amber-700">
            {MOCK_SUGGESTION.reason} → {MOCK_SUGGESTION.title}
          </p>
        </div>
        <ChevronRight size={16} className="text-amber-700" />
      </div>
    </div>
  )
}
