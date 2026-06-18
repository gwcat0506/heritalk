-- =============================================================================
-- heritalk 02 — 운영 스키마 (팀 Supabase 재활용 + KHS 국가유산청 일원화)
-- 유지(재활용): users, visits, bookmarks, heritage_docs
-- 신규: places(국가유산 캐시), saved_courses(+items)
-- 폐기: Places(빈 bigint 테이블, 형태 불일치)
-- 실행: Supabase Dashboard > SQL Editor 에 통째로 붙여넣기
-- =============================================================================

drop table if exists "Places";

-- 장소 카탈로그 — KHS 국가유산 캐시. id = `${ccbaKdcd}_${ccbaAsno}` (visits/bookmarks.heritage_id와 정합)
create table if not exists places (
  id          text primary key,
  kdcd        text,                 -- 지정종류 코드(11 국보 … 23 시도기념물)
  asno        text,                 -- 관리번호(ccbaAsno)
  name        text not null,        -- ccbaMnm1
  designation text,                 -- ccmaName (국보·보물·사적·명승·천연기념물·시도유형·시도기념물)
  district    text,                 -- ccsiName (자치구)
  lat         double precision,
  lng         double precision,
  address     text,                 -- ccbaLcad (상세)
  era         text,                 -- ccceName (상세)
  summary     text,                 -- content (상세)
  image_url   text,                 -- (상세)
  raw         jsonb,                -- 원본 보존
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists places_district_idx on places (district);
create index if not exists places_designation_idx on places (designation);

alter table places enable row level security;
-- 공개 읽기 / 쓰기는 service_role(서버)만 — 별도 insert 정책 없음 → anon·authenticated 쓰기 기본 차단
drop policy if exists places_read on places;
create policy places_read on places for select using (true);

-- 저장 코스
create table if not exists saved_courses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  created_at timestamptz default now()
);
create table if not exists saved_course_items (
  course_id uuid references saved_courses(id) on delete cascade,
  ord       int  not null,
  place_id  text not null,          -- → places.id (소프트 참조)
  primary key (course_id, ord)
);

alter table saved_courses enable row level security;
alter table saved_course_items enable row level security;

drop policy if exists sc_own on saved_courses;
create policy sc_own on saved_courses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists sci_own on saved_course_items;
create policy sci_own on saved_course_items for all
  using (exists (select 1 from saved_courses c where c.id = course_id and c.user_id = auth.uid()))
  with check (exists (select 1 from saved_courses c where c.id = course_id and c.user_id = auth.uid()));
