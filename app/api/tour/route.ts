import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getHeritageDetail } from '@/lib/api/heritage'
import {
  LatLng, PathPoint,
  nearestNeighborOrder, buildStraightPath, attachDistances, walkMinutes,
} from '@/lib/tour/route'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface StopIn { id: string; name: string; lat: number; lng: number }

// ── Tmap 보행자 경로(도로 따라가는 좌표열). 키 없으면 null 반환(직선 폴백) ──
async function tryTmapPath(ordered: LatLng[]): Promise<LatLng[] | null> {
  const key = process.env.TMAP_APP_KEY
  if (!key || ordered.length < 2) return null
  const start = ordered[0]
  const end = ordered[ordered.length - 1]
  const pass = ordered.slice(1, -1)
  const body: Record<string, string> = {
    startX: String(start.lng), startY: String(start.lat),
    endX: String(end.lng), endY: String(end.lat),
    startName: '출발', endName: '도착',
    reqCoordType: 'WGS84GEO', resCoordType: 'WGS84GEO', searchOption: '0',
  }
  if (pass.length) body.passList = pass.map(p => `${p.lng},${p.lat}`).join('_')
  try {
    const res = await fetch('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1', {
      method: 'POST',
      headers: { appKey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const data = await res.json()
    const coords: LatLng[] = []
    for (const f of data.features ?? []) {
      if (f.geometry?.type === 'LineString') {
        for (const c of f.geometry.coordinates ?? []) {
          coords.push({ lng: c[0], lat: c[1] }) // Tmap은 [lng, lat]
        }
      }
    }
    return coords.length >= 2 ? coords : null
  } catch {
    return null
  }
}

// ── 도슨트 스토리텔링 (전체 스토리 + 정류지별 해설 + 이동 멘트) ──
async function generateStory(
  stops: { name: string; designation: string; era: string; description: string; legMin: number }[],
  level: string
) {
  const depth =
    level === 'child'
      ? '초등학생도 이해할 만큼 쉬운 말과 비유로 풀되, 내용은 풍부하게'
      : level === 'expert'
      ? '역사 애호가가 만족할 깊이로, 시대 배경·인물·제도·건축/미술사적 의의까지'
      : '일반 성인이 흥미롭게 따라올 수 있게, 배경 맥락과 뒷이야기를 충분히'

  const stopInfo = stops.map((s, i) =>
    `${i + 1}번째 「${s.name}」 (${s.designation}, ${s.era || '시대미상'}) — 직전 지점에서 도보 약 ${s.legMin}분\n   자료: ${s.description.slice(0, 600) || '(상세 설명 없음 — 일반적 역사 지식으로 보완)'}`
  ).join('\n\n')

  const names = stops.map((s, i) => `${i + 1}.${s.name}`).join('  ')

  const prompt = `당신은 한국 국가유산 도보 투어를 이끄는 AI 도슨트 "헤리"입니다. 한 명의 일관된 해설자로서, 아래 ${stops.length}곳을 "하나로 이어지는 이야기"로 안내합니다.

[오늘의 방문 순서]  ${names}

[각 장소 자료]
${stopInfo}

가장 중요한 원칙 — 각 장소를 따로 노는 별개 설명으로 만들지 말 것:
1) 먼저 이 장소들을 관통하는 하나의 큰 줄기(공통 시대·인물·사건·주제 등 무엇이든 자료에서 찾아)를 정한다. 그 줄기를 intro에서 제시하고, 모든 장소 해설이 그 줄기에 매달리게 한다.
2) 각 장소 해설은 하나의 긴 문단이 아니라, 그 장소에 "다가가며" 하나씩 듣는 해설 토막(segments)으로 나눈다. 한 장소당 3~5개, 각 토막은 1~2문장의 짧고 완결된 조각이다. 첫 토막은 그 장소가 가까워지는 시점의 안내로 시작하고("곧 ~가 보입니다 / 이제 ~로 다가가고 있어요" 같은), 이어지는 토막들이 (a)앞 장소와의 연결 → (b)구체적 연도·인물·사건의 깊은 본론 → (c)전체 줄기 속 의미로 흐른다. ※ "도착했습니다" 같은 도착 표현은 쓰지 말 것(도착 안내는 시스템이 따로 표시함). 어디까지나 다가가는 중에 미리 들려주는 해설이다.
3) 각 토막은 그 자체로 읽기 쉬워야 한다. 한 토막에 여러 주제를 욱여넣지 말 것. 마지막 토막에서는 다음 장소 이름을 언급해 다리를 놓는다(마지막 장소 제외).
4) 방문 순서가 시대순이 아니면 "시간을 거슬러 가보면" 식으로 자연스럽게 연결한다.
5) outro는 전체를 하나의 흐름으로 되짚는 마무리.
말투는 친근하고 생생하게(${depth}). 자료에 없는 사실을 지어내지 말고, 자료가 빈약하면 일반적으로 널리 알려진 역사 상식 수준에서 신중히 보완한다.

다음 JSON 형식으로만 응답(다른 텍스트 없이):
{
  "intro": "투어 시작 인사 + 오늘 코스를 관통하는 줄기를 제시하는 2~3문장.",
  "stops": [
    {
      "segments": ["1~2문장짜리 이야기 토막", "다음 토막", "...(장소당 3~5개)"]
    }
  ],
  "outro": "전체를 하나로 정리하는 마무리 2~3문장."
}`

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 3200,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    })
    return JSON.parse(res.choices[0]?.message?.content ?? '{}')
  } catch {
    return { intro: '', stops: [], outro: '' }
  }
}

// ── POST /api/tour ──
// body: { lat, lng, stops: StopIn[], level? }
export async function POST(req: NextRequest) {
  try {
    const { lat, lng, stops = [], level = 'general' } = await req.json()
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Array.isArray(stops) || stops.length === 0) {
      return NextResponse.json({ error: '출발 위치와 1곳 이상의 장소가 필요해요.' }, { status: 400 })
    }
    const start: LatLng = { lat, lng }

    // 1) 최적 방문 순서
    const ordered = nearestNeighborOrder(start, stops as StopIn[])
    const orderedPoints: LatLng[] = [start, ...ordered.map(s => ({ lat: s.lat, lng: s.lng }))]

    // 2) 경로: Tmap(도로) 우선, 없으면 직선 보간
    const tmap = await tryTmapPath(orderedPoints)
    let path: PathPoint[]
    let stopDist: number[]
    let routeType: 'tmap' | 'straight'
    if (tmap) {
      const r = attachDistances(tmap, orderedPoints)
      path = r.path; stopDist = r.stopDist; routeType = 'tmap'
    } else {
      const r = buildStraightPath(orderedPoints)
      path = r.path; stopDist = r.stopDist; routeType = 'straight'
    }

    // 3) 정류지 상세 + 구간별 도보시간
    const details = await Promise.all(ordered.map(s => getHeritageDetail(s.id).catch(() => null)))
    const stopMeta = ordered.map((s, i) => {
      const d = details[i]
      const legM = stopDist[i + 1] - stopDist[i] // 직전 지점(또는 출발지)에서의 거리
      return {
        id: s.id,
        name: d?.name || s.name,
        designation: d?.designation || '',
        era: d?.era || '',
        address: d?.address || '',
        imageUrl: d?.imageUrl,
        description: d?.description || '',
        cumDist: Math.round(stopDist[i + 1]),
        legMin: walkMinutes(legM),
      }
    })

    // 4) 스토리텔링
    const story = await generateStory(stopMeta, level)

    const total = stopDist[stopDist.length - 1]
    return NextResponse.json({
      routeType,
      start,
      path,
      totalDistance: Math.round(total),
      totalMinutes: walkMinutes(total),
      intro: story.intro ?? '',
      outro: story.outro ?? '',
      stops: stopMeta.map((s, i) => ({
        order: i + 1,
        id: s.id,
        name: s.name,
        designation: s.designation,
        era: s.era,
        address: s.address,
        imageUrl: s.imageUrl,
        cumDist: s.cumDist,
        legMin: s.legMin,
        segments: Array.isArray(story.stops?.[i]?.segments)
          ? story.stops[i].segments.filter((x: unknown) => typeof x === 'string' && x.trim())
          : [],
      })),
    })
  } catch (err) {
    console.error('[/api/tour] error:', err)
    return NextResponse.json({ error: '투어 생성 중 오류가 났어요. 다시 시도해 주세요.' }, { status: 200 })
  }
}
