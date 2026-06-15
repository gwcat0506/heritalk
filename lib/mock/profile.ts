// 가짜(mock) 데이터 — 마이페이지(auth) 화면용. Supabase 연결 전 미리보기.
// 나중에 DB 연동 시 이 데이터를 실제 조회로 교체.

export interface SavedCourseSummary {
  id: string
  title: string
  emoji: string
  stopCount: number
  duration: number            // 분
  savedAt: string
}

export interface VisitLog {
  date: string                // 'YYYY-MM-DD'
  recap: string               // 한 줄 회상 (나중에 AI 생성)
  heritages: string[]
}

export const MOCK_PROFILE = {
  nickname: '수진',
  level: 2,
  levelName: '답사가',
  nextLevelName: '시간 여행자',
  toNext: 6,        // 다음 레벨까지 남은 방문 수
  visits: 4,
  bookmarks: 3,
  collected: 4,
}

export const MOCK_COURSES: SavedCourseSummary[] = [
  { id: 'c1', title: '조선왕궁 코스', emoji: '🏯', stopCount: 3, duration: 120, savedAt: '2026-06-14' },
  { id: 'c2', title: '근현대 산책',   emoji: '🏙️', stopCount: 4, duration: 60,  savedAt: '2026-06-16' },
]

export const MOCK_LOGS: VisitLog[] = [
  { date: '2026-06-16', recap: '광화문 일대 근대 유산을 걸었어요.',     heritages: ['서울 우정총국'] },
  { date: '2026-06-14', recap: '조선 왕궁 3곳을 도슨트와 함께 걸었어요.', heritages: ['경복궁', '종묘'] },
]

export const MOCK_SUGGESTION = {
  reason: '조선을 좋아하시네요',
  title: '수원 화성 코스',
}
