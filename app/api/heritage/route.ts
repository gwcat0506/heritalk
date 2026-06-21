import { NextRequest, NextResponse } from 'next/server'
import { getNearbyHeritage, getHeritageDetail } from '@/lib/api/heritage'

// GET /api/heritage?lat=37.5796&lng=126.9770&radius=2000
// GET /api/heritage?id=11_0000010000000  (상세)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')

  try {
    // 상세 조회
    if (id) {
      const detail = await getHeritageDetail(id)
      if (!detail) return NextResponse.json({ error: 'not found' }, { status: 404 })
      return NextResponse.json(detail)
    }

    // 주변 목록 조회
    const lat = parseFloat(searchParams.get('lat') ?? '37.5796')
    const lng = parseFloat(searchParams.get('lng') ?? '126.9770')
    const radius = parseInt(searchParams.get('radius') ?? '2000')

    const list = await getNearbyHeritage(lat, lng, radius)
    return NextResponse.json(list)
  } catch (err) {
    console.error('[/api/heritage] error:', err)
    // 실패해도 빈 배열(JSON)을 돌려줘 클라이언트가 깨지지 않게 함
    return NextResponse.json([], { status: 200 })
  }
}
