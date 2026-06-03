'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // hash fragment 방식 (카카오/구글)
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        // Supabase가 hash를 자동으로 처리해서 세션 저장
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.replace('/map')
          return
        }
      }

      // query string 방식 (code)
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          router.replace('/auth')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/map')
      } else {
        router.replace('/auth')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen text-stone-400 text-sm">
      로그인 처리 중...
    </div>
  )
}
