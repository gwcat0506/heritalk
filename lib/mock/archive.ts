// 가짜(mock) 데이터 — Supabase 연결 전 화면 미리보기용.
// 나중에 DB 연동 시, 이 파일 대신 lib/supabase.ts의 실제 조회 함수를 쓰면 됩니다.
// (화면 코드는 그대로 두고 데이터 출처만 교체)

export interface CollectedHeritage {
  id: string
  name: string
  designation: string         // 국보 / 보물 / 사적 / 명승 / 시도유형문화유산 ...
  emoji: string
  collectedAt: string | null  // null = 아직 미수집
  region: string              // 서울, 경기 ...
}

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

export interface Badge {
  id: string
  label: string
  icon: string                // lucide 아이콘 이름
  achieved: boolean
  progress?: string           // 미획득 시 진행도 예: '2 / 5'
}

// 도감 분류: 대표 4종만 노출, 나머지는 '기타'
export const MAIN_CATEGORIES = ['국보', '보물', '사적', '명승'] as const
export function categoryOf(designation: string): string {
  return (MAIN_CATEGORIES as readonly string[]).includes(designation) ? designation : '기타'
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

export const MOCK_COLLECTED: CollectedHeritage[] = [
  { id: '1', name: '경복궁',            designation: '사적', emoji: '🏯', collectedAt: '2026-06-14', region: '서울' },
  { id: '2', name: '종묘',              designation: '사적', emoji: '⛩️', collectedAt: '2026-06-14', region: '서울' },
  { id: '3', name: '숭례문',            designation: '국보', emoji: '🏛️', collectedAt: '2026-06-10', region: '서울' },
  { id: '4', name: '서울 우정총국',      designation: '사적', emoji: '🏤', collectedAt: '2026-06-16', region: '서울' },
  { id: '5', name: '원각사지 십층석탑',  designation: '국보', emoji: '🗿', collectedAt: null,         region: '서울' },
  { id: '6', name: '흥인지문',          designation: '보물', emoji: '🏯', collectedAt: null,         region: '서울' },
  { id: '7', name: '명승 백악산',        designation: '명승', emoji: '⛰️', collectedAt: null,         region: '서울' },
  { id: '8', name: '동십자각',          designation: '시도유형문화유산', emoji: '🏛️', collectedAt: null, region: '서울' },
]

export const MOCK_COURSES: SavedCourseSummary[] = [
  { id: 'c1', title: '조선왕궁 코스', emoji: '🏯', stopCount: 3, duration: 120, savedAt: '2026-06-14' },
  { id: 'c2', title: '근현대 산책',   emoji: '🏙️', stopCount: 4, duration: 60,  savedAt: '2026-06-16' },
]

export const MOCK_LOGS: VisitLog[] = [
  { date: '2026-06-16', recap: '광화문 일대 근대 유산을 걸었어요.',     heritages: ['서울 우정총국'] },
  { date: '2026-06-14', recap: '조선 왕궁 3곳을 도슨트와 함께 걸었어요.', heritages: ['경복궁', '종묘'] },
]

export const MOCK_BADGES: Badge[] = [
  { id: 'b1', label: '첫 발자국',      icon: 'Footprints',     achieved: true },
  { id: 'b2', label: '도슨트 첫 대화', icon: 'MessageCircle',  achieved: true },
  { id: 'b3', label: '조선왕궁 마스터', icon: 'Castle',        achieved: false, progress: '2 / 5' },
  { id: 'b4', label: '10곳 답사',      icon: 'Map',            achieved: false, progress: '4 / 10' },
]

// 다음 답사 제안 (나중에 era/designation 기반 자동 생성)
export const MOCK_SUGGESTION = {
  reason: '조선을 좋아하시네요',
  title: '수원 화성 코스',
}
