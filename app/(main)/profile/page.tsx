'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getVisits, getBookmarks } from '@/lib/supabase'
import { signOut } from '@/lib/auth'
import { LogIn, LogOut, MapPin, Bookmark, User } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [visits, setVisits] = useState<any[]>([])
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        Promise.all([getVisits(), getBookmarks()]).then(([v, b]) => {
          setVisits(v)
          setBookmarks(b)
        })
      }
      setLoading(false)
    })
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
    router.push('/map')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full text-stone-400 text-sm">
      불러오는 중...
    </div>
  )

  // 비로그인 상태
  if (!user) return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-8">
      <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
        <User size={28} className="text-stone-400" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-stone-900 mb-1">로그인이 필요해요</p>
        <p className="text-sm text-stone-400">방문 기록과 즐겨찾기를 저장하려면 로그인하세요</p>
      </div>
      <button
        onClick={() => router.push('/auth')}
        className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-2xl text-sm font-medium"
      >
        <LogIn size={16} />
        로그인 / 회원가입
      </button>
    </div>
  )

  const nickname = user.user_metadata?.nickname
    ?? user.user_metadata?.name
    ?? user.user_metadata?.full_name
    ?? user.user_metadata?.preferred_username
    ?? user.email?.split('@')[0]
    ?? '사용자'

  return (
    <div className="h-full overflow-y-auto px-5 pt-5 pb-8">
      {/* 프로필 헤더 */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-stone-50 border border-stone-100">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-xl font-bold text-amber-700">
          {nickname[0]}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-stone-900">{nickname}</p>
          <p className="text-xs text-stone-400">{user.email}</p>
        </div>
        <button onClick={handleSignOut} className="text-stone-400 hover:text-stone-700">
          <LogOut size={18} />
        </button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 text-center">
          <p className="text-2xl font-bold text-stone-900">{visits.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">방문한 유산</p>
        </div>
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 text-center">
          <p className="text-2xl font-bold text-stone-900">{bookmarks.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">즐겨찾기</p>
        </div>
      </div>

      {/* 최근 방문 */}
      {visits.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-stone-700">최근 방문</h2>
          </div>
          <div className="space-y-2">
            {visits.slice(0, 5).map((v: any) => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                <span className="text-sm text-stone-800">{v.heritage_name}</span>
                <span className="text-xs text-stone-400">
                  {new Date(v.visited_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 즐겨찾기 */}
      {bookmarks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bookmark size={14} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-stone-700">즐겨찾기</h2>
          </div>
          <div className="space-y-2">
            {bookmarks.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                <span className="text-sm text-stone-800">{b.heritage_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {visits.length === 0 && bookmarks.length === 0 && (
        <div className="text-center py-8 text-stone-400 text-sm">
          아직 방문한 유산이 없어요.<br />지도에서 유산을 탐방해보세요!
        </div>
      )}
    </div>
  )
}
