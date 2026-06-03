'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp, signInWithGoogle, signInWithKakao } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, User, ArrowLeft } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // 이미 로그인된 경우 /map으로
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/map')
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, nickname)
      }
      router.push('/map')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto px-5">
      {/* 헤더 */}
      <div className="flex items-center pt-12 pb-8">
        <button onClick={() => router.push('/map')} className="text-stone-400 mr-3">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {mode === 'login' ? 'HeriTalk에 오신 것을 환영합니다' : '새 계정을 만들어보세요'}
          </p>
        </div>
      </div>

      {/* 소셜 로그인 */}
      <div className="space-y-3 mb-6">
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-stone-200 hover:bg-stone-50 transition-all text-sm font-medium text-stone-700"
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Google로 계속하기
        </button>
        <button
          onClick={signInWithKakao}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-[#FEE500] hover:bg-[#F0D800] transition-all text-sm font-medium text-[#191919]"
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#191919" d="M9 0C4.029 0 0 3.136 0 7c0 2.497 1.548 4.688 3.878 5.956L2.95 16.5c-.082.3.261.54.512.36L7.5 14.1c.494.059.995.09 1.5.09 4.971 0 9-3.134 9-7S13.971 0 9 0z"/></svg>
          카카오로 계속하기
        </button>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-stone-100" />
        <span className="text-xs text-stone-400">또는</span>
        <div className="flex-1 h-px bg-stone-100" />
      </div>

      {/* 이메일 폼 */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-stone-200 focus-within:border-stone-400 transition-all">
            <User size={16} className="text-stone-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="닉네임"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="flex-1 text-sm outline-none text-stone-800 placeholder:text-stone-400 bg-transparent"
              required
            />
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-stone-200 focus-within:border-stone-400 transition-all">
          <Mail size={16} className="text-stone-400 flex-shrink-0" />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 text-sm outline-none text-stone-800 placeholder:text-stone-400 bg-transparent"
            required
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-stone-200 focus-within:border-stone-400 transition-all">
          <Lock size={16} className="text-stone-400 flex-shrink-0" />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="flex-1 text-sm outline-none text-stone-800 placeholder:text-stone-400 bg-transparent"
            required
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 px-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-stone-900 text-white rounded-2xl text-sm font-semibold disabled:opacity-40 hover:bg-stone-700 transition-all mt-2"
        >
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>

      {/* 모드 전환 */}
      <div className="text-center mt-6">
        <span className="text-sm text-stone-400">
          {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
        </span>
        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
          className="text-sm text-amber-600 font-medium"
        >
          {mode === 'login' ? '회원가입' : '로그인'}
        </button>
      </div>
    </div>
  )
}
