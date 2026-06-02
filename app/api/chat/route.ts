import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { searchRelevantDocs, buildContext } from '@/lib/rag/search'
import { DocentLevel } from '@/types/heritage'

const client = new Anthropic()

const LEVEL_PROMPT: Record<DocentLevel, string> = {
  child: `당신은 초등학생에게 역사를 설명하는 친근한 선생님입니다.
- 짧고 쉬운 문장을 사용하세요
- 어려운 용어는 바로 쉽게 풀어 설명하세요
- 비유와 예시를 많이 사용하세요
- 이모지를 1~2개 사용해 친근감을 주세요`,

  general: `당신은 역사에 관심 있는 일반 성인에게 설명하는 전문 도슨트입니다.
- 역사적 맥락과 사건 중심으로 설명하세요
- 흥미로운 에피소드와 배경 이야기를 포함하세요
- 전문 용어는 간단히 설명을 덧붙이세요
- 자연스럽고 대화체로 설명하세요`,

  expert: `당신은 역사 전공자·마니아를 위한 심화 해설을 제공하는 전문가입니다.
- 사료·문헌 근거를 언급하세요
- 건축양식, 미술사적 의의 등 전문적 관점을 포함하세요
- 학계 연구와 논쟁 중인 사항도 언급하세요
- 다른 유산·시대와의 비교 분석을 제공하세요`,
}

export async function POST(req: NextRequest) {
  const { messages, heritageId, heritageName, level = 'general' } = await req.json()

  // 마지막 사용자 메시지로 RAG 검색
  const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')
  const query = `${heritageName} ${lastUserMessage?.content ?? ''}`

  const docs = await searchRelevantDocs(query, { matchCount: 4 })
  const context = buildContext(docs)

  const systemPrompt = `${LEVEL_PROMPT[level as DocentLevel]}

당신은 지금 "${heritageName}"에 대해 안내하고 있습니다.
아래 참고 자료를 바탕으로 정확하게 답변하세요. 자료에 없는 내용은 추측하지 마세요.

[참고 자료]
${context}

답변은 3~5문장으로 간결하게 해주세요. 모르는 내용은 "정확한 자료가 부족합니다"라고 솔직히 말하세요.`

  // 스트리밍 응답
  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: systemPrompt,
    messages: messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  })

  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
