# HeriTalk 🏛️

> **"내가 서 있는 이 자리의 모든 시간을 알려주는 AI"**
>
> 위치 기반 국가유산 AI 도슨트 서비스

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)](https://heritalk.vercel.app)

**Live Demo** → [heritalk.vercel.app](https://heritalk.vercel.app)

---

## 서비스 소개

기존 국가유산 서비스는 정보를 **제공**하지만, HeriTalk은 AI가 **안내**합니다.

현재 위치 주변 국가유산을 지도에서 확인하고, 선택하면 AI 도슨트와 자유롭게 대화할 수 있어요. 역사 지식 수준에 맞게 어린이 / 일반 / 심화 3단계로 설명하며, 음성 입출력도 지원합니다.

---

## 주요 기능

### 📍 위치 기반 유산 조회
GPS로 현재 위치를 감지하고 반경 2km 내 국가유산을 카카오 지도와 목록으로 표시합니다. 국가유산청 공공 Open API를 실시간 호출하며 API 키 없이 무료로 동작합니다.

### 🤖 난이도 적응형 AI 도슨트
유산 선택 시 GPT-4o-mini 기반 AI 도슨트와 자유롭게 대화할 수 있습니다.

| 난이도 | 설명 스타일 |
|--------|-------------|
| 어린이 | 짧고 친근한 문장, 비유 중심 |
| 일반 | 역사적 맥락 + 사건 중심 |
| 심화 | 사료·건축양식·연구 관점 |

### 🎤 음성 도슨트
Web Speech API로 마이크로 질문하고 AI 답변을 음성으로 들을 수 있습니다.

### 🗺️ 테마별 AI 추천 코스
테마(조선왕궁, 일제강점기, 이순신 등)와 소요시간을 선택하면 주변 유산을 역사 서사로 엮은 탐방 코스를 생성합니다. 각 장소의 실제 상세 설명문을 기반으로 GPT가 구체적인 해설을 생성합니다.

### 👤 회원 기능
이메일 / 구글 / 카카오 로그인을 지원하며, 방문 기록과 즐겨찾기를 저장합니다.

---

## 시스템 아키텍처

```
사용자 (GPS + 텍스트/음성)
          │
          ▼
┌─────────────────────────┐
│   Next.js 15 App Router  │  ← Vercel 배포 (자동 HTTPS)
│   React PWA (모바일 웹)  │
│                          │
│  /map     지도 + 목록    │
│  /docent  AI 대화        │
│  /course  코스 추천      │
│  /profile 마이페이지     │
│  /auth    로그인         │
└────────────┬────────────┘
             │ API Routes (서버사이드)
    ┌────────┼──────────┬──────────┐
    ▼        ▼          ▼          ▼
국가유산청  GPT-4o-mini  Supabase   Kakao Map
Open API   (OpenAI)    (Auth+DB)   SDK
```

### 데이터 흐름

**유산 조회:**
```
GPS 좌표 → /api/heritage → 국가유산청 API (7개 지정종류 병렬 조회)
→ Haversine 거리 계산 → 반경 내 필터 → 거리순 정렬
```

**도슨트 대화:**
```
질문 → /api/chat → GPT-4o-mini (유산 설명문 + 난이도 프롬프트)
→ 스트리밍 텍스트 → TTS 음성 출력
```

**코스 추천:**
```
테마 선택 → /api/course → 국가유산청 API (반경 3km)
→ 테마 키워드 필터 → 유산 상세 조회 (병렬)
→ GPT-4o-mini (역사 서사 + 장소별 해설) → JSON 코스
```

---

## 기술 스택

| 분류 | 기술 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 15 (App Router) | API Route로 서버 별도 불필요 |
| 스타일링 | Tailwind CSS | 빠른 모바일 UI |
| LLM | GPT-4o-mini | 비용 효율, 스트리밍 지원 |
| DB / Auth | Supabase (PostgreSQL) | Auth + DB + 실시간 한 번에 |
| 지도 | Kakao Map SDK | 한국 좌표 정확도 최고 |
| STT/TTS | Web Speech API | 무료, 브라우저 내장 |
| 유산 데이터 | 국가유산청 Open API | API 키 없이 무료 |
| 배포 | Vercel | GitHub push → 자동 배포 |

---

## 로컬 실행

```bash
# 1. 클론
git clone https://github.com/gwcat0506/heritalk.git
cd heritalk

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cp .env.example .env.local
# .env.local에 아래 키 입력

# 4. 개발 서버 (HTTPS - 카카오 지도 로컬 테스트용)
npx next dev --experimental-https

# 또는 일반 HTTP (카카오 지도 제외 기능 테스트)
npm run dev
```

## 환경변수

```env
NEXT_PUBLIC_KAKAO_MAP_KEY=     # 카카오 개발자 콘솔 JavaScript 키
OPENAI_API_KEY=                # OpenAI API 키
NEXT_PUBLIC_SUPABASE_URL=      # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anon public 키
```

> 국가유산청 API는 키 없이 동작합니다.

---

## 프로젝트 구조

```
heritalk/
├── app/
│   ├── (main)/
│   │   ├── layout.tsx        # 하단 네비게이션 (활성탭 표시)
│   │   ├── map/page.tsx      # 지도 홈 + 유산 목록
│   │   ├── docent/page.tsx   # AI 도슨트 대화
│   │   ├── course/page.tsx   # 코스 추천
│   │   └── profile/page.tsx  # 마이페이지
│   ├── api/
│   │   ├── heritage/route.ts # 국가유산청 API 프록시
│   │   ├── chat/route.ts     # GPT 도슨트 (스트리밍)
│   │   └── course/route.ts   # 코스 추천 생성
│   ├── auth/
│   │   ├── page.tsx          # 로그인/회원가입 (이메일·구글·카카오)
│   │   └── callback/page.tsx # OAuth 콜백 처리
│   ├── layout.tsx            # 루트 레이아웃 (카카오 SDK 로드)
│   └── page.tsx              # / → /map 리다이렉트
├── components/
│   ├── chat/ChatInterface.tsx # 도슨트 대화 UI + 음성
│   └── map/KakaoMap.tsx       # 카카오 지도 컴포넌트
├── hooks/
│   ├── useGeolocation.ts     # GPS 위치
│   └── useVoice.ts           # STT/TTS
├── lib/
│   ├── api/heritage.ts       # 국가유산청 API 클라이언트
│   ├── auth.ts               # Supabase Auth 헬퍼
│   └── supabase.ts           # Supabase 클라이언트 + DB 헬퍼
└── types/
    └── heritage.ts           # 타입 정의
```

---

## Supabase 테이블 구조

```sql
users      -- 유저 프로필 (id, email, nickname)
visits     -- 방문 기록 (user_id, heritage_id, heritage_name)
bookmarks  -- 즐겨찾기 (user_id, heritage_id, heritage_name)
heritage_docs -- RAG용 유산 문서 벡터 (향후 확장)
```

---

## 공모전 출품

2025 문화 디지털혁신 및 데이터 활용 공모전
- 부문: 우수사례 > AI·디지털 기술을 활용한 문화서비스
- 주최: 문화체육관광부 / 한국문화정보원
