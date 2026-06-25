# 걷는 시간 — 도보 여행 역사 AI 가이드 (웹앱)

KCISA 2026 출품작 (heritalk). 토이 동선 PoC(SwiftUI)를 Next.js로 이식 + 채팅 도슨트(사료 RAG) 추가.
기획: `../docs/01_기획.md` · DB 설계: `../docs/02_DB설계.md` · UX/UI: `../docs/03_UXUI.md`

## 스택
- **Next.js 15(App Router) · TypeScript · Tailwind · Zustand**
- **Supabase**(PostgreSQL + pgvector) — 사용자 데이터·사료 RAG
- **Kakao 지도**(표시) + **TMap 보행자 경로**(도보 경로·시간)
- **Google Gemini**(채팅 도슨트) + `text-embedding-004`(RAG 임베딩)

## 구조
```
app/         홈·지도·코스·코스결과·거점상세·저장·마이 + api(route/build, docent)
components/  디자인 시스템(ui.tsx)·KakaoMap·TabBar·DocentPanel
lib/         types · poi(이식) · routeEngine(이식)+tmap · kakao · gemini · rag · supabase
stores/      useCourseDraft · useSaved (zustand, localStorage)
data/        seoul_pois.json (116곳 실데이터)
scripts/     seed-places · seed-passages
supabase/    migrations/00_schema.sql (운영 백본) · 01_rag.sql (pgvector + search_passages)
```

## 로컬 실행 (패키지 매니저 = bun)
```bash
cd web
bun install                  # bun.lockb 생성 → 커밋(Vercel이 이 lockfile로 bun 자동 감지)
cp .env.example .env.local   # 키 입력
bun run dev                  # http://localhost:3000
```
> bun이 없으면: `curl -fsSL https://bun.sh/install | bash`. bun은 TypeScript를 네이티브 실행하므로 시드 스크립트에 별도 러너(tsx)가 필요 없다.

### 키 없이 되는 것 / 키가 필요한 것
| 기능 | 필요 키 |
|---|---|
| 거점 목록·홈 추천·코스 담기·편집·예상시간·저장 | 없음(시드 JSON+localStorage) |
| 지도 표시(핀·폴리라인) | `NEXT_PUBLIC_KAKAO_MAP_KEY` |
| 실제 도보 경로·시간 | `TMAP_APP_KEY` (없으면 직선거리 폴백) |
| 채팅 도슨트 LLM 답변 | `GOOGLE_GENERATIVE_AI_API_KEY` (없으면 거점 요약 폴백) |
| 사료 출처 인용(RAG) | Supabase + 위 Google 키 + `npm run seed:passages` |

## Supabase 셋업
Supabase Dashboard > SQL Editor에 순서대로 붙여넣어 실행:
1. 운영 백본 스키마: `supabase/migrations/00_schema.sql`
2. RAG 마이그레이션: `supabase/migrations/01_rag.sql`
3. (선택) 거점 적재: `bun run seed:places`
4. 사료 시드 적재: `bun run seed:passages`

## 배포 (Vercel)
- Root Directory = `web`. `bun.lockb`를 커밋하면 Vercel이 **bun을 자동 감지**(install = `bun install`, build = `next build`).
- 위 환경변수 등록 후 배포 → 내부 클라우드 데모 URL.

## 토이 → 웹 이식 매핑
`RouteEngine.buildRoute` → `lib/routeEngine.ts`(+TMap), `POIStore` → `lib/poi.ts`,
`CourseDraft`/`SavedStore` → `stores/*`, `Theme`/`Components` → `tailwind.config`+`components/ui.tsx`,
Views → `app/*`. MapKit→Kakao, MKDirections→TMap, CoreLocation→Geolocation, AVSpeech→제거(음성 미사용).
