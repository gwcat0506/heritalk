// 국가유산청 API 실제 응답 필드 기반
export interface Heritage {
  id: string           // ccbaKdcd_ccbaAsno
  name: string         // ccbaMnm1
  designation: string  // ccmaName (국보, 보물, 사적 등)
  category: string     // gcodeName (유적건조물, 유물 등)
  era: string          // ccceName (조선 태조 7년 형태)
  city: string         // ccbaCtcdNm
  district: string     // ccsiName
  address: string      // ccbaLcad
  lat: number
  lng: number
  imageUrl?: string
  description?: string // content (상세 조회 시만 포함)
  distance?: number    // 현재 위치에서 거리 (m), 클라이언트 계산
}

export type DocentLevel = 'child' | 'general' | 'expert'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}
