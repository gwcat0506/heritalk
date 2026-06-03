'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // hash fragment 방식 (카카오/구글 implicit flow)
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        // Supabase JS SDK가 hash를 자동으로 파싱해서 세션 저장
        // onAuthStateChange로 확실히 잡기
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe()
            router.replace('/map')
          }
        })

        // 이미 세션이 있을 수도 있으니 바로 체크
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          subscription.unsubscribe()
          router.replace('/map')
        }
        return
      }

      // code 방식 (PKCE flow)
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const error = params.get('error')

      if (error) {
        router.replace('/auth')
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          router.replace('/auth')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      router.replace(session ? '/map' : '/auth')
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-stone-400">
      <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
      <p className="text-sm">로그인 처리 중...</p>
    </div>
  )
}
