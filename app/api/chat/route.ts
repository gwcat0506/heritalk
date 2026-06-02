import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { DocentLevel } from '@/types/heritage'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LEVEL_PROMPT: Record<DocentLevel, string> = {
  child: `당신은 초등학생에게 역사를 설명하는 친근한 선생님입니다.
- 짧고 쉬운 문장을 사용하세요
- 어려운 용어는 바로 쉽게 풀어 설명하세요
- 비유와 예시를 많이 사용하세요`,

  general: `당신은 역사에 관심 있는 일반 성인에게 설명하는 전문 도슨트입니다.
- 역사적 맥락과 사건 중심으로 설명하세요
- 흥미로운 에피소드와 배경 이야기를 포함하세요
- 자연스럽고 대화체로 설명하세요`,

  expert: `당신은 역사 전공자를 위한 심화 해설을 제공하는 전문가입니다.
- 사료·문헌 근거를 언급하세요
- 건축양식, 미술사적 의의 등 전문적 관점을 포함하세요
- 다른 유산·시대와의 비교 분석을 제공하세요`,
}

export async function POST(req: NextRequest) {
  const { messages, heritageName, heritageDescription, level = 'general' } = await req.json()

  const systemPrompt = `${LEVEL_PROMPT[level as DocentLevel]}

지금 "${heritageName}"에 대해 안내하고 있습니다.
${heritageDescription ? `\n[유산 기본 정보]\n${heritageDescription}\n` : ''}
답변은 3~5문장으로 간결하게 해주세요.`

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 600,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
