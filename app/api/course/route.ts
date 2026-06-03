import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getNearbyHeritage, getHeritageDetail } from '@/lib/api/heritage'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const THEME_NAME_KEYWORDS: Record<string, string[]> = {
  joseon:     ['경복궁', '창덕궁', '창경궁', '덕수궁', '경희궁', '종묘', '사직', '운현궁', '도성', '한양', '궁', '조선'],
  japanese:   ['형무소', '독립문', '영은문', '경교장', '대한의원', '우정총국', '러시아공사관', '중명전', '정동'],
  modern:     ['대한의원', '한국은행', '배재학당', '성균관', '문묘', '구세군'],
  yi_sunshin: ['경복궁', '창덕궁', '종묘', '도성', '한양도성', '탑골', '원각사'],
  sejong:     ['경복궁', '창덕궁', '사직', '원각사', '문묘', '성균관'],
}

const THEME_CONTEXT: Record<string, string> = {
  joseon:     '조선시대(1392~1897) 왕궁과 도성 관련 유산 중심',
  japanese:   '일제강점기(1910~1945) 독립운동·근대역사 관련 유산 중심',
  modern:     '개항기~근현대(1880~1950년대) 서양 문물 수용과 근대화 관련 유산 중심',
  yi_sunshin: '이순신 장군 및 임진왜란(1592~1598) 관련 유산 중심',
  sejong:     '세종대왕(1418~1450 재위)의 업적·한글 창제·과학 관련 유산 중심',
}

export async function POST(req: NextRequest) {
  const { lat, lng, theme, duration, level } = await req.json()

  const heritageList = await getNearbyHeritage(lat, lng, 3000)

  const keywords = THEME_NAME_KEYWORDS[theme] ?? []
  const filtered = keywords.length
    ? heritageList.filter(h => keywords.some(k => h.name.includes(k)))
    : heritageList

  const candidates = filtered.length >= 2 ? filtered : heritageList
  const maxStops = Math.min(Math.max(2, Math.floor(duration / 30)), 5)
  const selectedList = candidates.slice(0, maxStops)

  const detailedStops = await Promise.all(
    selectedList.map(async h => {
      const detail = await getHeritageDetail(h.id)
      return detail ?? h
    })
  )

  const stopInfo = detailedStops.map((h, i) =>
    `${i + 1}. ${h.name} (${h.designation}, ${h.era || '시대미상'})
   주소: ${h.address || h.district}
   거리: ${h.distance}m
   설명: ${(h.description ?? '').slice(0, 200)}`
  ).join('\n\n')

  const levelLabel = level === 'child' ? '초등학생도 이해할 수 있는 쉬운 말로' :
                     level === 'expert' ? '역사 전공자 수준의 심화 내용으로' : '일반 성인에게 흥미롭게'

  const prompt = `당신은 한국 국가유산 전문 도슨트입니다.
아래 유산들로 ${duration}분짜리 탐방 코스를 만들어주세요.
테마: ${THEME_CONTEXT[theme] ?? ''}
설명 수준: ${levelLabel}

[방문할 유산 정보]
${stopInfo}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "story": "이 코스 전체를 하나의 역사 이야기로 소개하는 2~3문장. 구체적인 역사 사실 포함.",
  "stops": [
    {
      "name": "유산명",
      "docentScript": "이 장소에서 들려줄 핵심 역사 이야기 2~3문장. 구체적인 연도, 인물, 사건 포함.",
      "transitionScript": "다음 장소로 이동하며 연결되는 역사 이야기 1문장 (마지막 장소는 null)"
    }
  ]
}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1500,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = res.choices[0]?.message?.content ?? '{}'
  let courseData: { story: string; stops: any[] }
  try {
    courseData = JSON.parse(raw)
  } catch {
    courseData = { story: '', stops: [] }
  }

  return NextResponse.json({
    theme,
    duration,
    story: courseData.story ?? '',
    stops: detailedStops.map((h, i) => ({
      order: i + 1,
      heritage: h,
      docentScript: courseData.stops?.[i]?.docentScript ?? '',
      transitionScript: courseData.stops?.[i]?.transitionScript ?? null,
    })),
  })
}
