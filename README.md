# HeriTalk 🏛️

> **"내가 서 있는 이 자리의 모든 시간을 알려주는 AI"**
>
> 위치 기반 국가유산 AI 도슨트 서비스

**Live Demo** → [heritalk.vercel.app](https://heritalk.vercel.app)

---

## ✅ 구현 완료 기능

### 지도 & 유산 조회
- [x] GPS 기반 현재 위치 감지 (위치 권한 거부 시 서울 기본값)
- [x] 카카오 지도에 현재 위치 + 주변 유산 마커 표시
- [x] 반경 2km 내 국가유산 목록 조회 (국보, 보물, 사적, 명승 등 7종 병렬 조회)
- [x] 지정종류별 아이콘 및 배지 색상 구분
- [x] 유산 상세 페이지 (실제 이미지, 설명문, 시대, 주소)
- [x] 유산 클릭 → 상세 페이지 → 도슨트 연결
- [x] 상세 API 미지원 유산(시도유형, 시도기념물 등) 기본 정보 표시 + "준비 중" 안내

### AI 도슨트
- [x] GPT-4o-mini 기반 AI 도슨트 대화
- [x] 난이도 3단계 선택 (어린이 / 일반 / 심화)
- [x] 스트리밍 응답 (실시간 타이핑 효과)
- [x] 마이크 음성 입력 (Web Speech API STT)
- [x] AI 답변 음성 출력 (Web Speech API TTS)

### 코스 추천
- [x] 테마별 코스 추천 (조선왕궁, 일제강점기, 이순신, 세종, 근현대)
- [x] 소요시간 선택 (1h / 2h / 3h)
- [x] 유산 상세 정보 기반 GPT 스토리라인 생성
- [x] 경유지별 도슨트 멘트 + 이동 연결 멘트

### 회원 기능
- [x] 이메일 회원가입 / 로그인
- [x] 구글 소셜 로그인 (OAuth)
- [x] 카카오 소셜 로그인 (OAuth)
- [x] 로그인 시 방문 기록 자동 저장
- [x] 즐겨찾기 추가 / 삭제
- [x] 마이페이지 (방문 기록, 즐겨찾기 목록)
- [x] 로그아웃

### UX
- [x] 하단 네비게이션 (현재 탭 강조)
- [x] 비로그인 시 지도/도슨트 사용 가능 (로그인 없이 탐방 가능)
- [x] 즐겨찾기 버튼 → 비로그인 시 로그인 페이지로 유도

---

## 🚧 개발 예정

- [ ] 시도유형·시도기념물 상세 정보 데이터 별도 구축 (국가유산청 상세 API 미지원)
- [ ] RAG 기반 유산 해설 데이터 구축 (국사편찬위, 문화유산포털 크롤링)
- [ ] 탐방 완료 뱃지 / 레벨 시스템
- [ ] 유산 검색 기능
- [ ] 코스 저장 / 공유
- [ ] 다국어 지원 (영어, 일본어)

---

## 🛠️ 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 15.3 (App Router) | 풀스택 프레임워크. SSR + API Route로 별도 서버 불필요 |
| **React** | 19 | UI 컴포넌트 |
| **TypeScript** | 5 | 정적 타입 |
| **Tailwind CSS** | 4 | 유틸리티 기반 스타일링 |
| **Kakao Map SDK** | v2 | 한국 지도. 유산 마커, 현재 위치 표시 |
| **Web Speech API** | 브라우저 내장 | STT(음성→텍스트), TTS(텍스트→음성). 추가 비용 없음 |
| **Lucide React** | 0.514 | 아이콘 |

### Backend (Next.js API Routes)
| 기술 | 용도 |
|------|------|
| **Next.js API Routes** | `/api/heritage`, `/api/chat`, `/api/course` 서버사이드 처리 |
| **국가유산청 Open API** | 유산 목록/상세 조회. API 키 없이 무료 사용 가능 |
| **fast-xml-parser** | 국가유산청 XML 응답 파싱 |
| **OpenAI GPT-4o-mini** | AI 도슨트 대화, 코스 스토리라인 생성 |

### Database & Auth
| 기술 | 용도 |
|------|------|
| **Supabase** | BaaS (Backend as a Service). Auth + DB + 실시간 구독 통합 |
| **PostgreSQL** | Supabase 내장 DB. 유저, 방문 기록, 즐겨찾기, 유산 문서 저장 |
| **Supabase Auth** | 이메일/구글/카카오 OAuth 인증. JWT 세션 관리 |
| **pgvector** | PostgreSQL 벡터 확장. 향후 RAG 유사도 검색용 |

### DevOps & 배포
| 기술 | 용도 |
|------|------|
| **Vercel** | 배포 플랫폼. GitHub push → 자동 빌드/배포. 자동 HTTPS |
| **GitHub** | 소스코드 관리. Vercel과 연동 |

---

## 🗄️ DB 스키마 (PostgreSQL)

```sql
-- 유저 프로필
users (
  id uuid PRIMARY KEY,        -- Supabase Auth user id
  email text,
  nickname text,
  default_level text,         -- 기본 도슨트 난이도
  created_at timestamptz
)

-- 방문 기록
visits (
  id uuid PRIMARY KEY,
  user_id uuid → users.id,
  heritage_id text,           -- 국가유산청 API id (ccbaKdcd_ccbaAsno)
  heritage_name text,
  visited_at timestamptz
)

-- 즐겨찾기
bookmarks (
  id uuid PRIMARY KEY,
  user_id uuid → users.id,
  heritage_id text,
  heritage_name text,
  created_at timestamptz,
  UNIQUE(user_id, heritage_id)
)

-- RAG 유산 문서 (향후 사용)
heritage_docs (
  id uuid PRIMARY KEY,
  heritage_id text,
  heritage_name text,
  content text,
  embedding vector(1536),     -- OpenAI text-embedding-3-small
  source text,
  created_at timestamptz
)
```

---

## 🏗️ 시스템 아키텍처

```
사용자 (모바일 웹)
    │
    ├── GPS 위치 요청
    ├── 텍스트/음성 입력
    │
    ▼
┌─────────────────────────────────┐
│        Next.js 15 App Router     │
│        (Vercel - 자동 HTTPS)     │
│                                  │
│  Pages           API Routes      │
│  /map       →   /api/heritage   ─── 국가유산청 Open API
│  /heritage  →   /api/chat       ─── OpenAI GPT-4o-mini
│  /docent    →   /api/course     ─── OpenAI GPT-4o-mini
│  /course                        │
│  /profile   →   Supabase Auth   ─── 이메일/구글/카카오
│  /auth      →   Supabase DB     ─── PostgreSQL
└─────────────────────────────────┘
```

---

## 🚀 로컬 실행

```bash
# 1. 클론
git clone https://github.com/gwcat0506/heritalk.git
cd heritalk

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cp .env.example .env.local
# 아래 키 입력 후 저장

# 4-a. 일반 개발 서버 (카카오 지도 제외)
npm run dev

# 4-b. HTTPS 개발 서버 (카카오 지도 포함)
npx next dev --experimental-https
```

## 🔑 환경변수

```env
# 카카오 개발자 콘솔 → JavaScript 키
NEXT_PUBLIC_KAKAO_MAP_KEY=

# OpenAI Platform → API Keys
OPENAI_API_KEY=

# Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

> 국가유산청 API는 인증키 없이 무료로 사용 가능합니다.

---

## 📁 프로젝트 구조

```
heritalk/
├── app/
│   ├── (main)/                   # 하단 네비게이션 레이아웃
│   │   ├── layout.tsx            # 네비게이션 (활성 탭 강조)
│   │   ├── map/page.tsx          # 지도 홈
│   │   ├── heritage/page.tsx     # 유산 상세
│   │   ├── docent/page.tsx       # AI 도슨트 대화
│   │   ├── course/page.tsx       # 코스 추천
│   │   └── profile/page.tsx      # 마이페이지
│   ├── api/
│   │   ├── heritage/route.ts     # 국가유산청 API 프록시
│   │   ├── chat/route.ts         # GPT 도슨트 (스트리밍)
│   │   └── course/route.ts       # 코스 추천 생성
│   ├── auth/
│   │   ├── page.tsx              # 로그인/회원가입
│   │   └── callback/page.tsx     # OAuth 콜백
│   ├── layout.tsx                # 루트 레이아웃 (카카오 SDK)
│   └── page.tsx                  # / → /map 리다이렉트
├── components/
│   ├── chat/ChatInterface.tsx    # 도슨트 대화 UI + 음성
│   └── map/KakaoMap.tsx          # 카카오 지도
├── hooks/
│   ├── useGeolocation.ts         # GPS 위치
│   └── useVoice.ts               # STT/TTS
├── lib/
│   ├── api/heritage.ts           # 국가유산청 API + XML 파싱
│   ├── auth.ts                   # Supabase Auth 헬퍼
│   └── supabase.ts               # DB 클라이언트 + CRUD
└── types/
    └── heritage.ts               # 공통 타입 정의
```

---

## 🏆 공모전 출품

**2025 문화 디지털혁신 및 데이터 활용 공모전**
- 주최: 문화체육관광부 / 한국문화정보원
- 부문: 우수사례 > AI·디지털 기술을 활용한 문화서비스 (ADX)
- 핵심 기술: Agentic AI (위치→유산검색→필터→스토리생성 연쇄 처리), 공공 Open API 활용
