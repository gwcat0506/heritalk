-- =============================================================================
-- KCISA 2026 — 도보 여행 역사 AI 에이전트 앱
-- 서비스 데이터베이스 스키마 — 현재 단계(역사 지식 그래프 제외)
--
-- 범위: 앱이 제품으로 돌아가는 운영 백본 전체
--   계정·취향 / 장소 카탈로그·미디어 / 큐레이션 / 동선·저장 /
--   에이전트 대화·음성 / 활동 로그·공유 / 운영(ETL·설정·분석)
-- 제외(보류): 유물·인물·사건·시대·사료(RAG) 역사 지식 그래프
--   → `04_확장_역사데이터_그래프.md` (W2 PoC 통과 후 places에 plug-in)
--
-- 실행: Supabase Dashboard > SQL Editor 에 통째로 붙여넣기
-- =============================================================================

create extension if not exists postgis;     -- 공간: 장소 좌표·주변검색·동선
create extension if not exists pg_trgm;      -- 한글 부분일치 검색
-- (pgvector는 역사 RAG 모듈과 함께 04에서 재도입)

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =============================================================================
-- DOMAIN 1. 계정 & 취향 (auth.users는 Supabase Auth가 관리)
-- =============================================================================
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path  text,                         -- Storage: avatars
  locale       text default 'ko',            -- 'ko' | 'en'
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create trigger profiles_set_updated before update on profiles
  for each row execute function set_updated_at();

create table user_preferences (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  default_mode   text default '산책' check (default_mode in ('산책','답사','관광')),
  language        text default 'ko',
  voice_first    boolean default false,      -- C4 음성 우선 UX
  large_text     boolean default false,      -- 시니어·접근성
  wheelchair     boolean default false,      -- 무장애 동선 필요
  interests      jsonb default '[]'::jsonb,  -- 관심 키워드(자유 태그)
  updated_at     timestamptz default now()
);
create trigger user_prefs_set_updated before update on user_preferences
  for each row execute function set_updated_at();

-- =============================================================================
-- DOMAIN 2. 장소 카탈로그 (거점) — 운영 정보만, 역사 서사 없음
--   토이 POI 116곳 승격. (구 설계의 hubs → places로 명확화)
-- =============================================================================
create table places (
  id           text primary key,            -- 토이 POI.id 호환
  type         text not null check (type in ('museum','gallery','historic_site')),
  name_ko      text not null,
  name_en      text,
  category     text,                         -- 원본 분류 보존
  district     text,
  geog         geography(Point,4326) not null,
  address      text,
  phone        text,
  homepage     text,
  hours        jsonb,                        -- {"mon":"09:00-18:00",...}
  closed_days  text,
  fees         jsonb,                        -- {"adult":0,"free":true}
  accessibility jsonb,                       -- {"wheelchair":true,"elevator":true,...}
  wheelchair   boolean default false,        -- accessibility에서 승격(필터·인덱스용)
  summary_ko   text,                         -- 운영 소개(역사 해설 아님). 토이 shortDesc
  summary_en   text,
  thumbnail    text,                         -- 대표 이미지
  status       text default 'active' check (status in ('active','hidden')),
  source_id    text,                         -- data_sources.id
  source_ref   text,                         -- 원본 키(asno, NUM)
  raw          jsonb,                        -- 원본 레코드 전체(추적)
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index places_geog_idx     on places using gist (geog);
create index places_type_idx     on places (type);
create index places_district_idx on places (district);
create index places_wheelchair_idx on places (wheelchair) where wheelchair;
create index places_name_trgm    on places using gin (name_ko gin_trgm_ops);
create trigger places_set_updated before update on places
  for each row execute function set_updated_at();

-- 장소 미디어 (사진·오디오 갤러리)
create table place_media (
  id         bigint generated always as identity primary key,
  place_id   text references places(id) on delete cascade,
  kind       text default 'photo' check (kind in ('photo','audio')),
  path       text not null,                  -- Storage 경로 또는 공공 URL
  caption_ko text,
  caption_en text,
  ord        int default 0,
  source_id  text
);
create index place_media_place_idx on place_media (place_id);

-- 두루누비 등 사전 정의 도보 코스(무장애 포함)
create table walking_courses (
  id           bigint generated always as identity primary key,
  name_ko      text not null,
  name_en      text,
  mode         text,                          -- '산책' | '답사'
  barrier_free boolean default false,
  path         geography(LineString,4326),
  distance_m   real,
  source_id    text,
  raw          jsonb
);

-- =============================================================================
-- DOMAIN 3. 큐레이션 (C1) — 장소 단위 편집 코스
--   ("종로 2시간 = [경복궁, 국현 서울관, 북촌]")  ※ 유물 단위는 역사 모듈로 보류
-- =============================================================================
create table collections (
  id        bigint generated always as identity primary key,
  type      text,                            -- 'featured' | 'theme' | 'wheelchair'
  mode      text,                            -- '산책' | '답사' | '관광'
  language  text default 'ko',
  title_ko  text,
  title_en  text,
  cover     text,                            -- 대표 이미지
  is_public boolean default true
);

create table collection_items (
  collection_id bigint references collections(id) on delete cascade,
  place_id      text references places(id) on delete cascade,
  ord           int not null,
  dwell_min     int,
  note_ko       text,
  primary key (collection_id, ord)
);

-- =============================================================================
-- DOMAIN 4. 동선 & 저장 (C3)
-- =============================================================================
-- 4.1 생성된 동선(계산 결과). 익명 생성 허용(user_id null) 후 저장 시 귀속
create table routes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  mode            text check (mode in ('산책','답사','관광')),
  language        text default 'ko',
  title           text,
  origin          geography(Point,4326),
  total_distance  real,                       -- meters
  total_time      real,                       -- seconds
  is_saved        boolean default false,
  source          text default 'ai',          -- 'ai' | 'manual' | 'collection'
  created_at      timestamptz default now()
);
create index routes_user_idx on routes (user_id);

create table route_stops (
  route_id            uuid references routes(id) on delete cascade,
  ord                 int not null,           -- 0=시작점 (토이 RouteStop.order)
  place_id            text references places(id),
  cumulative_distance real,                   -- m
  cumulative_time     real,                   -- s
  primary key (route_id, ord)
);

-- 4.2 단일 장소 즐겨찾기
create table favorites (
  user_id   uuid references auth.users(id) on delete cascade,
  place_id  text references places(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, place_id)
);

-- 4.3 사용자 저장 코스(토이 SavedCourse: 제목 + 장소 목록)
create table saved_courses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  title      text not null,
  created_at timestamptz default now()
);
create table saved_course_items (
  course_id uuid references saved_courses(id) on delete cascade,
  place_id  text references places(id) on delete cascade,
  ord       int not null,
  primary key (course_id, ord)
);

-- =============================================================================
-- DOMAIN 5. 에이전트 대화 & 음성 (C2 대화 골격 / C4)
--   ※ 답변 출처(역사 사료 인용)는 역사 모듈 도입 시 messages.meta로 연결
-- =============================================================================
create table agent_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  current_place_id text references places(id),
  mode           text,
  language        text default 'ko',
  status          text default 'active',      -- 'active' | 'ended'
  context        jsonb,                        -- 멀티턴 상태(대명사 추적 등)
  started_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index agent_sessions_user_idx on agent_sessions (user_id);
create trigger agent_sessions_set_updated before update on agent_sessions
  for each row execute function set_updated_at();

create table messages (
  id         bigint generated always as identity primary key,
  session_id uuid references agent_sessions(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade, -- RLS용 비정규화
  role       text not null check (role in ('user','assistant','tool')),
  content    text,
  lang       text default 'ko',
  audio_path text,                            -- 음성 입력/출력 파일(Storage)
  meta       jsonb,                           -- 의도분류·도구호출·(추후)출처
  created_at timestamptz default now()
);
create index messages_session_idx on messages (session_id);

-- TTS 음성 캐시 (첫 음절 latency↓)
create table tts_cache (
  text_hash  text primary key,               -- sha256(text+voice+lang)
  lang       text not null,
  voice      text,
  audio_path text not null,                   -- Storage: tts-cache
  created_at timestamptz default now()
);

-- =============================================================================
-- DOMAIN 6. 활동 로그 & 공유 (C5)
-- =============================================================================
create table walk_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  route_id    uuid references routes(id) on delete set null,
  mode        text,
  log_date    date default current_date,
  title       text,
  summary     text,
  visibility  text default 'private' check (visibility in ('private','link')),
  share_token text unique,                    -- visibility='link'일 때 공유 URL 키
  created_at  timestamptz default now()
);
create index walk_logs_user_idx on walk_logs (user_id);

create table log_visits (
  id          bigint generated always as identity primary key,
  walk_log_id uuid references walk_logs(id) on delete cascade,
  place_id    text references places(id),
  dwell_sec   int,
  photo_path  text,                           -- Storage: walk-photos(비공개)
  note        text,
  visited_at  timestamptz default now()
);
create index log_visits_log_idx on log_visits (walk_log_id);

-- =============================================================================
-- DOMAIN 7. 운영 (ETL·설정·분석) — 전체 구조의 백본
-- =============================================================================
-- 9종 공공데이터 출처 메타(provenance 루트)
create table data_sources (
  id          text primary key,
  name_ko     text not null,
  provider    text,
  endpoint    text,
  license     text,
  last_synced timestamptz,
  notes       text
);

-- 데이터 적재(ETL) 실행 로그 — "데이터 정제·구조화 기여" 증빙
create table sync_runs (
  id             bigint generated always as identity primary key,
  data_source_id text references data_sources(id),
  started_at     timestamptz default now(),
  finished_at    timestamptz,
  rows_in        int,
  rows_upserted  int,
  status         text default 'running',      -- 'running' | 'success' | 'error'
  error          text
);

-- 앱 설정/피처 플래그
create table app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now()
);

-- 제품 분석 이벤트(선택)
create table analytics_events (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null,
  name       text not null,
  props      jsonb,
  created_at timestamptz default now()
);
create index analytics_user_idx on analytics_events (user_id);
create index analytics_name_idx on analytics_events (name);

-- =============================================================================
-- RLS — 사용자 소유 테이블만. 공용 콘텐츠는 anon 읽기.
-- =============================================================================
-- 공용 읽기(콘텐츠)
alter table places          enable row level security;
alter table place_media     enable row level security;
alter table walking_courses enable row level security;
alter table collections     enable row level security;
alter table collection_items enable row level security;
create policy "read places"      on places          for select using (true);
create policy "read media"       on place_media     for select using (true);
create policy "read courses"     on walking_courses for select using (true);
create policy "read collections" on collections     for select using (is_public);
create policy "read coll_items"  on collection_items for select using (true);

-- 사용자 소유(본인만)
alter table profiles         enable row level security;
alter table user_preferences enable row level security;
alter table routes           enable row level security;
alter table route_stops      enable row level security;
alter table favorites        enable row level security;
alter table saved_courses    enable row level security;
alter table saved_course_items enable row level security;
alter table agent_sessions   enable row level security;
alter table messages         enable row level security;
alter table walk_logs        enable row level security;
alter table log_visits       enable row level security;
alter table analytics_events enable row level security;

create policy "own profile"  on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own prefs"    on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own routes"   on routes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own favorites" on favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own courses"  on saved_courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions" on agent_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own messages" on messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own walk_logs" on walk_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own analytics" on analytics_events
  for insert with check (auth.uid() = user_id);
-- 자식 테이블은 부모 소유로 위임
create policy "own route_stops" on route_stops
  for all using (exists (select 1 from routes r
    where r.id = route_stops.route_id and r.user_id = auth.uid()));
create policy "own course_items" on saved_course_items
  for all using (exists (select 1 from saved_courses c
    where c.id = saved_course_items.course_id and c.user_id = auth.uid()));
create policy "own log_visits" on log_visits
  for all using (exists (select 1 from walk_logs w
    where w.id = log_visits.walk_log_id and w.user_id = auth.uid()));
-- 공유 일지(link)는 익명 읽기 허용
create policy "shared walk_logs" on walk_logs
  for select using (visibility = 'link');

-- =============================================================================
-- RPC — 앱에서 직접 호출 (PostgREST)
-- =============================================================================
-- 주변 장소 검색 (토이 POIStore.nearby() 대체)
create or replace function places_nearby(lat double precision, lng double precision,
                                         radius_m int default 2000, max_n int default 20,
                                         only_wheelchair boolean default false)
returns setof places language sql stable as $$
  select * from places
  where status = 'active'
    and (not only_wheelchair or wheelchair)
    and ST_DWithin(geog, ST_MakePoint(lng, lat)::geography, radius_m)
  order by geog <-> ST_MakePoint(lng, lat)::geography
  limit max_n;
$$;

-- =============================================================================
-- Storage 버킷 (참고 — Dashboard/API로 생성)
-- =============================================================================
-- ('place-images', public) / ('avatars', public) /
-- ('tts-cache', public)    / ('walk-photos', private=RLS)

-- =============================================================================
-- 9종 데이터 출처 시드 (운영 메타)
-- =============================================================================
insert into data_sources (id, name_ko, provider) values
  ('heritage_gis','문화재청 GIS 사적',     '국가유산청'),
  ('museum_api',  '박물관·미술관 전시',    '박물관 OpenAPI·KCISA'),
  ('tourapi',     'TourAPI 4.0',          '한국관광공사'),
  ('durunubi',    '두루누비',             '한국관광공사'),
  ('barrierfree', '무장애여행 데이터',     '한국관광공사')
on conflict (id) do nothing;
