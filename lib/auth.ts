import { supabase } from './supabase'

// 이메일 회원가입
export async function signUp(email: string, password: string, nickname: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
    },
  })
  if (error) throw error

  // users 테이블에 프로필 저장
  if (data.user) {
    await supabase.from('users').upsert({
      id: data.user.id,
      email,
      nickname,
    })
  }
  return data
}

// 이메일 로그인
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// 구글 로그인
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
}

// 카카오 로그인
export async function signInWithKakao() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'profile_nickname',
      queryParams: {
        scope: 'profile_nickname',
      },
    },
  })
  if (error) throw error
}

// 로그아웃
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// 현재 유저 가져오기
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// 유저 프로필 조회
export async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}
