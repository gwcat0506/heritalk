-- =============================================================================
-- heritalk 04 — 거점 소개글 AI 요약 컬럼
-- Claude 세션이 places.summary(국가유산청 원문)를 3~4문장으로 정규화해 저장.
-- 원문 summary는 보존, 표시는 summary_ai 우선.
-- 실행: Supabase Dashboard > SQL Editor
-- =============================================================================

alter table places add column if not exists summary_ai text;
