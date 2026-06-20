-- =============================================================================
-- heritalk 05 — 도슨트 대화 목록(이어보기) 메타
-- agent_sessions에 title·updated_at 추가(대화 리스트·최근순 정렬용)
-- messages·RLS는 03에서 정의됨(변경 없음)
-- 실행: Supabase Dashboard > SQL Editor 에 통째로 붙여넣기
-- =============================================================================

alter table agent_sessions
  add column if not exists title      text,
  add column if not exists updated_at timestamptz default now();

create index if not exists agent_sessions_user_updated_idx
  on agent_sessions(user_id, updated_at desc);
