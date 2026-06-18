-- =============================================================================
-- heritalk 03 — 도슨트 대화 영속 + 루트(코스) 메타 확장
-- 신규: agent_sessions, messages (도슨트 세션·메시지)
-- 확장: saved_courses(+items) — 수동 코스 + AI 테마코스 메타
-- 개인정보(users + user_metadata)는 변경 없음
-- 실행: Supabase Dashboard > SQL Editor 에 통째로 붙여넣기
-- =============================================================================

-- 도슨트 대화 (세션 + 메시지). 로그인 사용자만 영속(익명 도슨트는 휘발).
create table if not exists agent_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  place_id   text,                       -- 거점 도슨트=places.id, 일반=null
  mode       text,                       -- 'place' | 'general'
  created_at timestamptz default now()
);

create table if not exists messages (
  id         bigint generated always as identity primary key,
  session_id uuid not null references agent_sessions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,  -- RLS용 비정규화
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  citations  jsonb default '[]',
  created_at timestamptz default now()
);
create index if not exists messages_session_idx on messages(session_id);

alter table agent_sessions enable row level security;
alter table messages       enable row level security;

drop policy if exists as_own on agent_sessions;
create policy as_own on agent_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists msg_own on messages;
create policy msg_own on messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 루트(코스) 메타 확장 (saved_courses 비어있음 → ADD 안전)
alter table saved_courses
  add column if not exists kind text default 'manual',   -- 'manual'(수동) | 'theme'(AI테마)
  add column if not exists mode text,                    -- 산책/답사/관광 또는 theme id
  add column if not exists total_distance double precision,
  add column if not exists total_time double precision,
  add column if not exists story text;                   -- AI 테마코스 스토리

alter table saved_course_items
  add column if not exists docent_script text,
  add column if not exists transition_script text;
