import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// 질문을 임베딩으로 변환 후 유사 문서 검색
export async function searchRelevantDocs(
  query: string,
  options: {
    matchCount?: number
    filterEra?: string
    filterPerson?: string
  } = {}
) {
  const { matchCount = 5, filterEra, filterPerson } = options

  // 1. 쿼리 임베딩 생성
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  })
  const queryEmbedding = embeddingRes.data[0].embedding

  // 2. Supabase pgvector 유사도 검색
  const { data, error } = await supabaseAdmin.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_era: filterEra ?? null,
    filter_person: filterPerson ?? null,
  })

  if (error) throw error

  return data as {
    id: string
    content: string
    heritage_nm: string
    era: string
    similarity: number
  }[]
}

// 검색 결과를 LLM 컨텍스트 문자열로 변환
export function buildContext(docs: Awaited<ReturnType<typeof searchRelevantDocs>>) {
  return docs
    .map((doc, i) => `[자료 ${i + 1}] ${doc.heritage_nm ?? ''}\n${doc.content}`)
    .join('\n\n')
}
