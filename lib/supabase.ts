import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 서버 전용 (서비스 롤 키) - API Route에서만 사용
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/*
  Supabase SQL 초기화 (한 번만 실행):

  -- pgvector 확장 활성화
  create extension if not exists vector;

  -- RAG 문서 청크 테이블
  create table document_chunks (
    id uuid primary key default gen_random_uuid(),
    content text not null,
    embedding vector(1536),
    source text,              -- heritage_api | emuseum | crawled
    heritage_id text,
    heritage_nm text,
    era text,
    person text,
    created_at timestamptz default now()
  );

  -- 벡터 유사도 검색 함수
  create or replace function match_documents(
    query_embedding vector(1536),
    match_count int default 5,
    filter_era text default null,
    filter_person text default null
  )
  returns table (
    id uuid,
    content text,
    heritage_nm text,
    era text,
    similarity float
  )
  language sql stable
  as $$
    select
      id, content, heritage_nm, era,
      1 - (embedding <=> query_embedding) as similarity
    from document_chunks
    where
      (filter_era is null or era = filter_era) and
      (filter_person is null or person = filter_person)
    order by embedding <=> query_embedding
    limit match_count;
  $$;
*/
