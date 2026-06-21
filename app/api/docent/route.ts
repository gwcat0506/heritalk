import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getNearbyHeritage, getHeritageDetail } from '@/lib/api/heritage'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MODEL = 'gpt-4o-mini'
const MAX_TOOL_TURNS = 5 // 무한 도구호출 방지

// ── 도슨트 페르소나 / 행동 규칙 ────────────────────────────────
const LEVEL_GUIDE: Record<string, string> = {
  child: '초등학생도 이해할 수 있게 아주 쉬운 말로, 비유를 들어가며',
  general: '일반 성인에게 흥미롭게, 적당한 깊이로',
  expert: '역사에 관심 많은 사람에게 심화 내용까지',
}

function buildSystem(level: string, contextStr: string) {
  return [
    '너는 "헤리"라는 이름의 한국 국가유산 AI 도슨트야. 박물관 도슨트처럼 친근하고 생생하게 한국어로 해설해.',
    `설명 수준: ${LEVEL_GUIDE[level] ?? LEVEL_GUIDE.general} 설명한다.`,
    '',
    '[행동 규칙]',
    '1. 유산의 연도·시대·소재지 같은 사실은 반드시 get_heritage_detail 도구로 확인한 정보만 쓴다. 추측해서 지어내지 않는다.',
    '2. 역사적 배경·인물·사건은 search_wikipedia로 근거를 찾아 답한다.',
    '3. "주변에 뭐 있어?", "가볼 만한 곳" 같은 추천·길안내 요청은 get_nearby_heritage를 쓴다.',
    '4. 한문투·고어·어려운 한자어가 나오면 쉬운 현대 한국어로 풀어 설명하고, 어려운 용어는 괄호로 뜻을 단다.',
    '5. 도구로도 못 찾으면 솔직히 모른다고 말한다.',
    '6. 답변은 2~4문장으로 간결하게. 너무 길게 늘어놓지 않는다. 한 번에 하나의 흥미로운 이야기에 집중한다.',
    '7. 사용자가 한 곳을 자세히 들었으면, 마지막에 방문 인증(스탬프·카드 수집)을 가볍게 권유한다. 예: "직접 가보면 도감에 스탬프도 모을 수 있어요!"',
    '',
    '[현재 사용자 맥락]',
    contextStr || '(위치 정보 없음)',
  ].join('\n')
}

// ── LLM에 노출할 도구 정의 ────────────────────────────────────
const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_nearby_heritage',
      description:
        '현재(또는 지정) 위치 주변의 국가유산을 거리순으로 찾는다. 사용자가 주변 가볼 곳·추천·길안내를 물을 때 사용.',
      parameters: {
        type: 'object',
        properties: {
          radius_m: { type: 'number', description: '검색 반경(미터). 기본 3000' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_heritage_detail',
      description:
        '특정 국가유산의 상세 정보(시대·소재지·설명)를 국가유산청에서 가져온다. heritage_id는 주변 목록의 id(kdcd_asno 형식). 유산 자체에 대한 질문에 사용.',
      parameters: {
        type: 'object',
        properties: {
          heritage_id: { type: 'string', description: 'kdcd_asno 형식의 유산 id' },
        },
        required: ['heritage_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_wikipedia',
      description:
        '한국어 위키백과에서 역사적 사건·인물·제도 등을 검색해 요약을 가져온다. 유산의 역사적 배경을 설명할 때 사용.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색어' },
        },
        required: ['query'],
      },
    },
  },
]

// ── 도구 실제 구현 ────────────────────────────────────────────
async function searchWikipedia(query: string) {
  try {
    const url = new URL('https://ko.wikipedia.org/w/api.php')
    const params = {
      format: 'json', action: 'query', generator: 'search',
      gsrsearch: query, gsrlimit: '3', prop: 'extracts',
      exintro: '1', explaintext: '1',
    }
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'heritalk-docent/0.1' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { error: `위키백과 호출 실패 (${res.status})` }
    const pages = (await res.json())?.query?.pages ?? {}
    const out = Object.values<any>(pages)
      .filter(p => (p.extract ?? '').trim())
      .map(p => ({ title: p.title, extract: (p.extract as string).trim().slice(0, 700) }))
    return out.length ? out : { info: '관련 문서를 찾지 못했어요.' }
  } catch (e: any) {
    return { error: `위키백과 호출 실패: ${e?.message ?? e}` }
  }
}

async function runTool(name: string, args: any, loc: { lat: number; lng: number } | null) {
  if (name === 'get_nearby_heritage') {
    if (!loc) return { error: '현재 위치를 알 수 없어요.' }
    const radius = Math.min(args?.radius_m ?? 3000, 20000)
    const list = await getNearbyHeritage(loc.lat, loc.lng, radius)
    return list.slice(0, 10).map(h => ({
      id: h.id, name: h.name, designation: h.designation,
      district: h.district, distance_m: h.distance,
    }))
  }
  if (name === 'get_heritage_detail') {
    const id = String(args?.heritage_id ?? '')
    if (!id.includes('_')) return { error: 'heritage_id 형식 오류 (kdcd_asno)' }
    const d = await getHeritageDetail(id)
    if (!d) return { error: '정보를 찾지 못했어요.' }
    return {
      name: d.name, designation: d.designation, era: d.era,
      address: d.address, description: (d.description ?? '').slice(0, 1200),
    }
  }
  if (name === 'search_wikipedia') {
    return searchWikipedia(String(args?.query ?? ''))
  }
  return { error: `알 수 없는 도구: ${name}` }
}

// ── POST /api/docent ─────────────────────────────────────────
// body: { messages: {role, content}[], lat?, lng?, nearby?: Heritage[], level? }
export async function POST(req: NextRequest) {
  try {
    const { messages = [], lat, lng, nearby = [], level = 'general' } = await req.json()
    const loc = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null

    // 주변 유산 목록을 system 맥락에 넣어 '어디에 뭐가 있는지' 알게 한다
    const nearbyLines = (nearby as any[])
      .slice(0, 12)
      .map(h => `- ${h.name} (id=${h.id}, ${h.designation}, ${h.distance ?? '?'}m)`)
      .join('\n')
    const contextStr = [
      loc ? `현재 위치: 위도 ${loc.lat.toFixed(4)}, 경도 ${loc.lng.toFixed(4)}` : '',
      nearbyLines ? `주변 국가유산:\n${nearbyLines}` : '',
    ].filter(Boolean).join('\n')

    const convo: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystem(level, contextStr) },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ]

    const toolsUsed: { name: string; args: any }[] = []

    // 도구 호출 루프
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const res = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.6,
        max_tokens: 700,
        messages: convo,
        tools: TOOLS,
        tool_choice: 'auto',
      })
      const msg = res.choices[0]?.message
      if (!msg) break

      if (msg.tool_calls?.length) {
        convo.push(msg)
        for (const call of msg.tool_calls) {
          let parsed: any = {}
          try { parsed = JSON.parse(call.function.arguments || '{}') } catch {}
          toolsUsed.push({ name: call.function.name, args: parsed })
          const result = await runTool(call.function.name, parsed, loc)
          convo.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          })
        }
        continue // 도구 결과를 들고 다시 LLM 호출
      }

      // 최종 답변
      return NextResponse.json({
        reply: msg.content ?? '',
        toolsUsed,
      })
    }

    return NextResponse.json({
      reply: '죄송해요, 자료를 찾는 데 시간이 너무 걸렸어요. 다시 물어봐 주세요.',
      toolsUsed,
    })
  } catch (err: any) {
    console.error('[/api/docent] error:', err)
    return NextResponse.json(
      { reply: '오류가 발생했어요. 잠시 후 다시 시도해 주세요.', toolsUsed: [] },
      { status: 200 },
    )
  }
}
