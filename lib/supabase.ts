import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 방문 기록 저장
export async function saveVisit(heritageId: string, heritageName: string) {
  const { error } = await supabase
    .from('visits')
    .insert({ heritage_id: heritageId, heritage_name: heritageName })
  if (error) console.error('visit save error:', error)
}

// 즐겨찾기 추가
export async function addBookmark(heritageId: string, heritageName: string) {
  const { error } = await supabase
    .from('bookmarks')
    .insert({ heritage_id: heritageId, heritage_name: heritageName })
  if (error) console.error('bookmark error:', error)
}

// 즐겨찾기 삭제
export async function removeBookmark(heritageId: string) {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('heritage_id', heritageId)
  if (error) console.error('bookmark remove error:', error)
}

// 즐겨찾기 목록 조회
export async function getBookmarks() {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) console.error('bookmark fetch error:', error)
  return data ?? []
}

// 방문 기록 조회
export async function getVisits() {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .order('visited_at', { ascending: false })
    .limit(20)
  if (error) console.error('visit fetch error:', error)
  return data ?? []
}
