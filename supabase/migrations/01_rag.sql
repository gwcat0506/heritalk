-- 채팅 도슨트 사료 RAG (pgvector). 기획안 v2 F3 — Google text-embedding-004(768d).
-- 9종 5중 조인 그래프는 추후 과제. 여기서는 최소 RAG 셋(sources·passages·검색 RPC)만.
-- docs/02_DB설계.md 부록 A(역사 그래프) 설계의 RAG 부분을 768차원으로 가져온 것.

create extension if not exists vector;

-- 사료 출처(한국사DB·한국문집총간·박물관 도록 등)
create table if not exists sources (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  ref        text,            -- 권·편·연도 등
  url        text,
  created_at timestamptz default now()
);

-- 사료 청크 + 임베딩
create table if not exists passages (
  id         uuid primary key default gen_random_uuid(),
  source_id  uuid references sources(id) on delete cascade,
  content    text not null,
  embedding  vector(768),     -- text-embedding-004
  place_ids  text[] default '{}',  -- 연결된 거점(places.id / 토이 POI id). 비면 일반 사료
  tags       text[] default '{}',  -- 인물·시대·사건 태그(예: 정약용, 조선)
  created_at timestamptz default now()
);

create index if not exists passages_embedding_idx
  on passages using ivfflat (embedding vector_cosine_ops) with (lists = 50);
create index if not exists passages_place_ids_idx on passages using gin (place_ids);

-- 공용 읽기(데모): 사료는 모두 공개
alter table sources enable row level security;
alter table passages enable row level security;
drop policy if exists "read sources" on sources;
drop policy if exists "read passages" on passages;
create policy "read sources" on sources for select using (true);
create policy "read passages" on passages for select using (true);

-- 코사인 top-k 검색. 거점 필터(filter_place_id) 있으면 해당 거점/일반 사료 우선.
create or replace function search_passages(
  query_embedding vector(768),
  match_count int default 4,
  filter_place_id text default null
)
returns table (
  id uuid,
  content text,
  source_title text,
  source_ref text,
  similarity float
)
language sql stable
as $$
  select
    p.id,
    p.content,
    s.title as source_title,
    s.ref   as source_ref,
    1 - (p.embedding <=> query_embedding) as similarity
  from passages p
  join sources s on s.id = p.source_id
  where p.embedding is not null
    and (
      filter_place_id is null
      or p.place_ids = '{}'
      or filter_place_id = any(p.place_ids)
    )
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function search_passages(vector, int, text) to anon, authenticated;
