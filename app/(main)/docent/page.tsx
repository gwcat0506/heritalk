'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Heritage } from '@/types/heritage'
import ChatInterface from '@/components/chat/ChatInterface'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function DocentContent() {
  const params = useSearchParams()
  const id = params.get('id')
  const [heritage, setHeritage] = useState<Heritage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    fetch(`/api/heritage?id=${id}`)
      .then(r => r.json())
      .then(data => setHeritage(data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-stone-400 text-sm">
      불러오는 중...
    </div>
  )

  if (!heritage) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-stone-400 text-sm">유산을 선택해주세요</p>
      <Link href="/map" className="text-sm text-amber-600 underline">지도로 이동</Link>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-stone-100">
        <Link href="/map" className="text-stone-400 hover:text-stone-700">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-sm text-stone-500">{heritage.designation}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatInterface heritage={heritage} />
      </div>
    </div>
  )
}

export default function DocentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full text-stone-400 text-sm">
        불러오는 중...
      </div>
    }>
      <DocentContent />
    </Suspense>
  )
}
