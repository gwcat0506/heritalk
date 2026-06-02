# HeriTalk 🏛️

> **"내가 서 있는 이 자리의 모든 시간을 알려주는 AI"**
>
> 위치 기반 국가유산 AI 도슨트 서비스

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)](https://heritalk.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Live Demo** → [heritalk.vercel.app](https://heritalk.vercel.app)

---

## 서비스 소개

기존 국가유산 서비스(my.heritage.go.kr)는 정보를 **제공**하지만, HeriTalk은 AI가 **안내**합니다.

- 현재 위치 주변 국가유산을 지도에서 바로 확인
- 유산을 선택하면 AI 도슨트와 자유롭게 대화
- 역사 지식 수준에 맞게 어린이 / 일반 / 심화 3단계로 설명
- 음성으로 질문하고 음성으로 답변 받기
- 테마별(조선왕궁, 일제강점기, 이순신 등) AI 추천 코스 생성

---

## 주요 기능

### 1. 위치 기반 주변 유산 조회
GPS로 현재 위치를 감지하고 반경 내 국가유산을 지도와 목록으로 표시합니다. 국가유산청 공공 Open API를 실시간으로 호출하며, API 키 없이 동작합니다.

### 2. 난이도 적응형 AI 도슨트 대화
유산을 선택하면 GPT-4o-mini 기반 AI 도슨트와 자유롭게 대화할 수 있습니다. 난이도를 3단계로 선택하면 같은 질문에도 다른 수준의 답변을 제공합니다.

| 난이도 | 대상 | 설명 스타일 |
|--------|------|-------------|
| 어린이 | 초등학생 이하 | 짧고 친근한 문장, 비유 중심 |
| 일반 | 일반 성인 | 역사적 맥락 + 사건 중심 |
| 심화 | 역사 전공·마니아 | 사료·건축양식·연구 관점 |

### 3. 음성 도슨트 (STT / TTS)
Web Speech API를 활용해 마이크로 질문하고 AI 답변을 음성으로 들을 수 있습니다. 현장에서 핸즈프리로 사용 가능합니다.

### 4. 테마별 AI 추천 코스
사용자 조건(테마, 소요시간)을 입력하면 주변 유산을 실제 상세 정보 기반으로 분석해 하나의 역사 서사로 엮은 탐방 코스를 생성합니다.

| 테마 | 설명 |
|------|------|
| 조선왕궁 | 경복궁·창덕궁·종묘 등 조선 왕실 중심 |
| 일제강점기 | 서대문형무소·독립문·경교장 등 항일 역사 |
| 이순신 | 임진왜란·이순신 관련 유산 |
| 세종대왕 | 한글 창제·과학·문화 관련 유산 |
| 근현대 | 개항기~1950년대 근대화 관련 유산 |

---

## 시스템 아키텍처

```
사용자 (GPS + 텍스트/음성)
          │
          ▼
┌─────────────────────────┐
│   Next.js 15 App Router  │  ← Vercel 배포
│   React PWA (모바일 웹)  │
│                          │
│  /map     지도 + 목록    │
│  /docent  AI 대화        │
│  /course  코스 추천      │
└────────────┬────────────┘
             │ API Routes (서버)
    ┌────────┼─────────────┐
    ▼        ▼             ▼
국가유산청  GPT-4o-mini   Web Speech
Open API   (OpenAI API)   API (STT/TTS)
    │        │
    ▼        ▼
실제 유산  유산 설명 +
정보 조회  스토리 생성
```

### 데이터 흐름

**도슨트 대화:**
```
사용자 질문
  → POST /api/chat
  → GPT-4o-mini (유산 기본정보 + 난이도 프롬프트)
  → 스트리밍 텍스트 응답
  → TTS로 음성 출력
```

**코스 추천:**
```
테마 + 소요시간 선택
  → POST /api/course
  → 국가유산청 API (반경 3km 유산 조회)
  → 테마 키워드 필터링
  → 각 유산 상세 조회 (설명문, 시대, 주소) - 병렬 처리
  → GPT-4o-mini (구체적 역사 서사 + 장소별 해설 생성)
  → JSON 코스 반환
```

---

## 기술 스택

| 분류 | 기술 | 선택 이유 |
|------|------|-----------|
| 프레임워크 | Next.js 15 (App Router) | API Route로 서버 별도 불필요, Vercel 최적화 |
| 스타일링 | Tailwind CSS | 빠른 모바일 UI 개발 |
| LLM | GPT-4o-mini (OpenAI) | 비용 효율, 한국어 품질 |
| 지도 | 카카오 지도 SDK | 한국 주소·좌표 정확도 |
| STT/TTS | Web Speech API | 무료, 브라우저 내장, 추가 API 불필요 |
| 국가유산 데이터 | 국가유산청 Open API | API 키 없이 무료 사용 가능 |
| 배포 | Vercel | GitHub 연동 자동 배포 |

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
# .env.local에 OPENAI_API_KEY 입력

# 4. 개발 서버 실행
npm run dev
# http://localhost:3000/map 접속
```

## 환경변수

```env
OPENAI_API_KEY=sk-...        # OpenAI API 키 (필수)
```

> 국가유산청 API는 키 없이 동작합니다.

---

## 프로젝트 구조

```
heritalk/
├── app/
│   ├── (main)/
│   │   ├── layout.tsx        # 하단 네비게이션
│   │   ├── map/page.tsx      # 지도 홈
│   │   ├── docent/page.tsx   # AI 도슨트 대화
│   │   ├── course/page.tsx   # 코스 추천
│   │   └── profile/page.tsx  # 내 정보
│   └── api/
│       ├── heritage/route.ts # 국가유산청 API 프록시
│       ├── chat/route.ts     # GPT 도슨트 대화
│       └── course/route.ts   # 코스 추천 생성
├── components/
│   └── chat/ChatInterface.tsx
├── hooks/
│   ├── useGeolocation.ts     # GPS 위치
│   └── useVoice.ts           # STT/TTS
├── lib/
│   └── api/heritage.ts       # 국가유산청 API 클라이언트
└── types/
    └── heritage.ts
```

---

## 공모전 출품

2025 문화 디지털혁신 및 데이터 활용 공모전 출품작
- 부문: 우수사례 > AI·디지털 기술을 활용한 문화서비스
- 주최: 문화체육관광부 / 한국문화정보원
