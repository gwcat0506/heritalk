# HeriTalk Git 협업 컨벤션

---

## 1. 커밋 메시지 규칙

### 형식
```
<type>: <설명>
```

- 타입은 **소문자**
- 콜론(`:`) 뒤에 **공백 하나**
- 설명은 **영어**, 동사 원형으로 시작, 마침표 없음
- 한 줄 요약 위주 (길면 본문 추가)

### 타입 목록

| 타입 | 언제 쓰나 | 예시 |
|------|-----------|------|
| `feat` | 새 기능 추가 | `feat: add bookmark toggle button` |
| `fix` | 버그 수정 | `fix: resolve null error on heritage detail` |
| `refactor` | 기능 변경 없이 코드 개선 | `refactor: clean up auth flow` |
| `docs` | README, 주석 등 문서 작업 | `docs: update API setup guide` |
| `style` | 포맷, 세미콜론 등 (로직 무관) | `style: format with prettier` |
| `chore` | 패키지 설치, 설정 변경 등 | `chore: upgrade Next.js to v15` |
| `test` | 테스트 코드 추가/수정 | `test: add unit test for parseTagValue` |

> `init:`은 프로젝트 초기 세팅 전용으로만 사용하고, 이후엔 위 타입을 씁니다.

### 좋은 예 / 나쁜 예

```
✅ feat: add kakao map integration
✅ fix: preserve leading zeros in ccbaAsno
✅ refactor: extract auth logic into hook

❌ Fixed bug           → 타입 없음
❌ feat : add map      → 콜론 앞에 공백
❌ feat: Add Map.      → 대문자 시작, 마침표
❌ feat: 지도 추가     → 한국어 (영어로)
```

---

## 2. 브랜치 전략

### 기본 구조

```
main                  ← 배포 브랜치 (직접 push 금지)
└── route-recommend   ← 경로 추천 기능 작업
└── mcp               ← MCP 연결 작업
└── docent            ← 유물 설명 / AI 도슨트 작업
└── ui                ← UI/UX 작업
└── stamp             ← 스탬프 시스템 작업
└── auth              ← 회원/인증 작업
└── map               ← 지도/유산 조회 작업
```

### 브랜치 이름 규칙

```
<기능영역>/<작업내용>
```

- **커밋 타입(feat/fix 등)을 브랜치 이름에 붙이지 않습니다** → 기능 영역으로만
- 설명은 **소문자 + 하이픈** (kebab-case)
- **이름(닉네임)으로 브랜치 파지 않습니다**
- 작업 내용이 간단하면 영역명만 써도 됩니다

### HeriTalk 기능 영역별 브랜치 & 예시

| 영역 | 브랜치명 | 작업 예시 |
|------|----------|-----------|
| 경로 추천 | `route-recommend` | 테마별 코스 추천, 소요시간 선택, 경유지 스토리라인 생성 |
| | `route-recommend/save-share` | 코스 저장 / 공유 기능 |
| MCP 연결 | `mcp` | MCP 서버 연결, Agentic AI 파이프라인 |
| | `mcp/rag-heritage` | RAG 기반 유산 해설 데이터 구축 |
| 유물 설명 | `docent` | AI 도슨트 대화, 난이도 선택, 스트리밍 응답 |
| | `docent/voice` | 음성 입력(STT) / 음성 출력(TTS) |
| | `docent/multilang` | 다국어 지원 (영어, 일본어) |
| UI/UX | `ui` | 네비게이션, 레이아웃, 공통 컴포넌트 |
| | `ui/mobile-pwa` | PWA 설정, 모바일 터치 최적화 |
| 스탬프 | `stamp` | 탐방 완료 뱃지, 레벨 시스템 |
| | `stamp/visit-badge` | 유산 방문 시 뱃지 부여 로직 |
| 인증/회원 | `auth` | 로그인, 회원가입, OAuth, 마이페이지 |
| 지도/유산 | `map` | 카카오 지도, 마커, 유산 목록/상세 조회 |
| | `map/search` | 유산 검색 기능 |

**브랜치명 예시**

```
✅ docent/voice
✅ route-recommend/save-share
✅ stamp
✅ ui/mobile-pwa
✅ map/search

❌ gwcat/stamp          → 이름 기반
❌ feat/stamp           → 커밋 타입 붙인 것
❌ Stamp                → 대문자
```

> 큰 기능 전체를 담당하면 `stamp`, 그 안의 세부 작업이면 `stamp/visit-badge` 처럼 씁니다.

### 작업 흐름

```
1. main에서 브랜치 생성
   git checkout -b stamp/visit-badge

2. 작업 후 커밋 (커밋 메시지엔 타입 사용)
   git commit -m "feat: add visit badge on heritage completion"
   git commit -m "fix: resolve badge not triggering on revisit"

3. PR 생성 → main에 머지
   - PR 제목: 커밋 메시지 형식과 동일하게
   - 머지 방식: Squash and merge 권장 (커밋 히스토리 정리)

4. 머지 후 브랜치 삭제
```

### PR 제목 예시

```
feat: add visit badge and level system for stamp
fix: resolve streaming parser error in docent chat
feat: implement course save and share feature
```

---

## 3. 요약 (치트시트)

| 항목 | 규칙 |
|------|------|
| 커밋 타입 | feat / fix / refactor / docs / style / chore / test |
| 커밋 언어 | 영어, 소문자 시작, 마침표 없음 |
| 브랜치 단위 | **기능 영역 기준** (커밋 타입 X, 이름 X) |
| 브랜치 형식 | `stamp`, `docent/voice`, `map/search` |
| main push | 직접 push 금지 → PR로만 |
| 머지 방식 | Squash and merge 권장 |
