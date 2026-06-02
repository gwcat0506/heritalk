import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getNearbyHeritage } from '@/lib/api/heritage'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { lat, lng, theme, duration, level } = await req.json()

  // 1. 주변 유산 조회 (반경 2km)
  const heritageList = await getNearbyHeritage(lat, lng, 2000)

  // 2. 테마 필터링
  const themeFilterMap: Record<string, string[]> = {
    joseon:    ['조선', '조선시대'],
    japanese:  ['일제강점기', '개항기'],
    modern:    ['근현대', '대한민국'],
    yi_sunshin: ['임진왜란', '조선'],
    sejong:    ['조선', '세종'],
  }
  const eraKeywords = themeFilterMap[theme] ?? []
  const filtered = eraKeywords.length
    ? heritageList.filter(h => eraKeywords.some(k => h.era?.includes(k)))
    : heritageList

  const stops = filtered.slice(0, Math.min(4, Math.ceil(duration / 30)))

  // 3. Claude로 스토리라인 + 각 장소 도슨트 생성
  const stopNames = stops.map((s, i) => `${i + 1}. ${s.name} (${s.era})`).join('\n')

  const prompt = `다음 유산들을 방문하는 ${duration}분 코스를 만들어주세요.

[방문 유산]
${stopNames}

[요청 사항]
- 코스 전체를 하나의 역사적 서사로 연결하는 스토리 요약 (2~3문장)
- 각 장소별 방문 멘트 (${level === 'child' ? '어린이용 쉬운 설명' : level === 'expert' ? '전문가 심화 설명' : '일반 설명'}, 2문장)
- 다음 장소로 이동할 때 연결 멘트 (1문장)

JSON 형식으로 응답하세요:
{
  "story": "코스 서사 요약",
  "stops": [
    {
      "name": "유산명",
      "docentScript": "방문 멘트",
      "transitionScript": "다음 장소 이동 멘트 (마지막 장소는 null)"
    }
  ]
}`

  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = res.content[0].type === 'text' ? res.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const courseData = jsonMatch ? JSON.parse(jsonMatch[0]) : { story: '', stops: [] }

  return NextResponse.json({
    theme,
    duration,
    stops: stops.map((h, i) => ({
      order: i + 1,
      heritage: h,
      docentScript: courseData.stops?.[i]?.docentScript ?? '',
      transitionScript: courseData.stops?.[i]?.transitionScript ?? null,
    })),
    story: courseData.story,
  })
}
