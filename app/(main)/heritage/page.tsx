'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Heritage } from '@/types/heritage'
import { ArrowLeft, MessageCircle, MapPin, Clock, Bookmark, BookmarkCheck } from 'lucide-react'
import { addBookmark, removeBookmark, getBookmarks } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

// 지정종류별 배경색
const DESIGNATION_COLOR: Record<string, string> = {
  '국보': 'bg-amber-50 text-amber-700',
  '보물': 'bg-blue-50 text-blue-700',
  '사적': 'bg-green-50 text-green-700',
  '명승': 'bg-teal-50 text-teal-700',
  '천연기념물': 'bg-emerald-50 text-emerald-700',
}

function HeritageContent() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id')

  // URL 파라미터에서 기본 정보 (상세 API 미지원 유산 대비)
  const fallbackName = params.get('name') ?? ''
  const fallbackDesignation = params.get('designation') ?? ''
  const fallbackDistrict = params.get('district') ?? ''
  const fallbackDistance = params.get('distance') ?? ''

  const [heritage, setHeritage] = useState<Heritage | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookmarked, setBookmarked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (!id) { setLoading(false); return }

    // 유산 상세 조회
    fetch(`/api/heritage?id=${id}`)
      .then(r => r.json())
      .then(data => {
        // 상세 API 미지원 시 URL 파라미터 기본값 사용
        if (!data.name) {
          setHeritage({
            id,
            name: fallbackName,
            designation: fallbackDesignation,
            district: fallbackDistrict,
            distance: fallbackDistance ? parseInt(fallbackDistance) : undefined,
            category: '',
            era: '',
            city: '',
            address: '',
            lat: 0,
            lng: 0,
          })
        } else {
          setHeritage(data)
        }
      })
      .finally(() => setLoading(false))

    // 로그인 + 즐겨찾기 여부 확인
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setIsLoggedIn(true)
      const bookmarks = await getBookmarks()
      setBookmarked(bookmarks.some((b: { heritage_id: string }) => b.heritage_id === id))
    })
  }, [id])

  const toggleBookmark = async () => {
    if (!isLoggedIn || !heritage) {
      router.push('/auth')
      return
    }
    if (bookmarked) {
      await removeBookmark(heritage.id)
      setBookmarked(false)
    } else {
      await addBookmark(heritage.id, heritage.name || fallbackName)
      setBookmarked(true)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
    </div>
  )

  if (!heritage) return (
    <div className="flex items-center justify-center h-full text-stone-400 text-sm">
      유산 정보를 찾을 수 없습니다
    </div>
  )

  const designationColor = DESIGNATION_COLOR[heritage.designation] ?? 'bg-stone-100 text-stone-600'

  return (
    <div className="h-full overflow-y-auto">
      {/* 뒤로가기 + 즐겨찾기 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-700 p-1">
          <ArrowLeft size={20} />
        </button>
        <button onClick={toggleBookmark} className="p-1">
          {bookmarked
            ? <BookmarkCheck size={20} className="text-amber-500" />
            : <Bookmark size={20} className="text-stone-400" />
          }
        </button>
      </div>

      {/* 이미지 */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden bg-stone-100" style={{ height: '200px' }}>
        {heritage.imageUrl ? (
          <Image
            src={heritage.imageUrl}
            alt={heritage.name}
            width={600}
            height={200}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            🏛️
          </div>
        )}
      </div>

      {/* 기본 정보 */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${designationColor}`}>
            {heritage.designation}
          </span>
          {heritage.era && (
            <span className="text-xs text-stone-400">{heritage.era}</span>
          )}
        </div>
        <h1 className="text-xl font-bold text-stone-900 mb-2">{heritage.name}</h1>

        {heritage.address && (
          <div className="flex items-center gap-1.5 text-stone-400 text-sm mb-1">
            <MapPin size={13} />
            <span>{heritage.address}</span>
          </div>
        )}
        {heritage.distance && (
          <div className="flex items-center gap-1.5 text-stone-400 text-sm">
            <Clock size={13} />
            <span>현재 위치에서 {heritage.distance}m</span>
          </div>
        )}
      </div>

      {/* 설명 */}
      <div className="px-5 mb-6">
        <div className="h-px bg-stone-100 mb-4" />
        {heritage.description ? (
          <>
            <h2 className="text-sm font-semibold text-stone-700 mb-2">유산 소개</h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              {heritage.description.slice(0, 300)}
              {heritage.description.length > 300 && '...'}
            </p>
          </>
        ) : (
          <p className="text-sm text-stone-400 text-center py-4">
            이 유산의 상세 정보는 준비 중입니다
          </p>
        )}
      </div>

      {/* 도슨트 버튼 */}
      <div className="px-5 pb-6">
        <button
          onClick={() => router.push(`/docent?id=${heritage.id}`)}
          className="w-full flex items-center justify-center gap-2.5 py-4 bg-stone-900 text-white rounded-2xl font-semibold text-sm hover:bg-stone-700 transition-all active:scale-[0.98]"
        >
          <MessageCircle size={18} />
          AI 도슨트와 대화하기
        </button>
      </div>
    </div>
  )
}

export default function HeritagePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
      </div>
    }>
      <HeritageContent />
    </Suspense>
  )
}
