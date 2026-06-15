import { Heritage } from '@/types/heritage'
import { XMLParser } from 'fast-xml-parser'

const BASE = 'https://www.cha.go.kr/cha'

// 실제 API 응답 구조에 맞는 파서 설정
const parser = new XMLParser({
  ignoreAttributes: false,
  cdataPropName: '__cdata',
  isArray: (name) => name === 'item',
  trimValues: true,
  parseTagValue: false,  // 숫자 자동변환 끄기 (앞의 0 보존)
  parseAttributeValue: false,
})

// CDATA 또는 일반 문자열 추출
function cdata(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'object' && '__cdata' in val) return String(val.__cdata).trim()
  return String(val).trim()
}

// Haversine 거리 계산 (미터)
export function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

// 전국 17개 시·도 중심 좌표 + 국가유산청 시도코드(ccbaCtcd)
const SIDO_CENTERS: { code: string; name: string; lat: number; lng: number }[] = [
  { code: '11', name: '서울', lat: 37.5665, lng: 126.9780 },
  { code: '21', name: '부산', lat: 35.1796, lng: 129.0756 },
  { code: '22', name: '대구', lat: 35.8714, lng: 128.6014 },
  { code: '23', name: '인천', lat: 37.4563, lng: 126.7052 },
  { code: '24', name: '광주', lat: 35.1595, lng: 126.8526 },
  { code: '25', name: '대전', lat: 36.3504, lng: 127.3845 },
  { code: '26', name: '울산', lat: 35.5384, lng: 129.3114 },
  { code: '45', name: '세종', lat: 36.4801, lng: 127.2890 },
  { code: '31', name: '경기', lat: 37.4138, lng: 127.5183 },
  { code: '32', name: '강원', lat: 37.8228, lng: 128.1555 },
  { code: '33', name: '충북', lat: 36.6357, lng: 127.4914 },
  { code: '34', name: '충남', lat: 36.6588, lng: 126.6728 },
  { code: '35', name: '전북', lat: 35.7175, lng: 127.1530 },
  { code: '36', name: '전남', lat: 34.8679, lng: 126.9910 },
  { code: '37', name: '경북', lat: 36.4919, lng: 128.8889 },
  { code: '38', name: '경남', lat: 35.4606, lng: 128.2132 },
  { code: '50', name: '제주', lat: 33.4996, lng: 126.5312 },
]

// 좌표 주변에서 조회할 시·도 코드들을 고른다.
// 큰 도(경북 등)는 중심점이 멀어서 '가까운 N곳'만 뽑으면 정작 그 도가 빠진다.
// 그래서 중심점이 maxKm 이내인 시·도를 모두 포함한다(최소 4곳은 보장).
function nearbyCityCodes(lat: number, lng: number, maxKm = 140): string[] {
  const ranked = SIDO_CENTERS
    .map(s => ({ code: s.code, d: calcDistance(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.d - b.d)
  const within = ranked.filter(s => s.d <= maxKm * 1000)
  return (within.length >= 4 ? within : ranked.slice(0, 4)).map(s => s.code)
}

// 지정종류 코드: 국보(11), 보물(12), 사적(13), 명승(14), 천연기념물(15), 시도유형(21), 시도기념물(23)
const KDCD_LIST = ['11', '12', '13', '14', '15', '21', '23']

// 단일 ccbaKdcd + ccbaCtcd 조합으로 목록 조회
// 한 건이 실패해도 전체가 죽지 않도록 항상 배열을 반환(에러 시 빈 배열)
async function fetchList(cityCode: string, kdcd: string): Promise<any[]> {
  const url = `${BASE}/SearchKindOpenapiList.do?pageUnit=100&pageIndex=1&ccbaCtcd=${cityCode}&ccbaKdcd=${kdcd}`
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const xml = await res.text()
    const parsed = parser.parse(xml)
    const items = parsed?.result?.item
    if (!items) return []
    return Array.isArray(items) ? items : [items]
  } catch {
    return []
  }
}

// 주변 유산 목록 (반경 radiusM 미터 이내, 가까운 시·도 × 여러 지정종류 병렬 조회)
export async function getNearbyHeritage(
  lat: number,
  lng: number,
  radiusM = 2000
): Promise<Heritage[]> {
  const cityCodes = nearbyCityCodes(lat, lng)

  // 가까운 시·도 × 지정종류를 모두 병렬 조회 (먼 결과는 아래 반경 필터에서 제거)
  const results = await Promise.all(
    cityCodes.flatMap(city => KDCD_LIST.map(kdcd => fetchList(city, kdcd)))
  )
  const allItems = results.flat()

  return allItems
    .map(item => ({
      id: `${item.ccbaKdcd}_${item.ccbaAsno}`,
      name: cdata(item.ccbaMnm1),
      designation: cdata(item.ccmaName),
      category: '',
      era: '',
      city: cdata(item.ccbaCtcdNm),
      district: cdata(item.ccsiName),
      address: '',
      lat: parseFloat(item.latitude ?? '0'),
      lng: parseFloat(item.longitude ?? '0'),
    }))
    .filter(h => h.lat !== 0 && h.lng !== 0 && h.name)
    .map(h => ({ ...h, distance: calcDistance(lat, lng, h.lat, h.lng) }))
    .filter(h => (h.distance ?? Infinity) <= radiusM)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    // 같은 id 중복 제거
    .filter((h, i, arr) => arr.findIndex(x => x.id === h.id) === i)
}

// 유산 상세 (content, imageUrl, era, address 포함)
export async function getHeritageDetail(id: string): Promise<Heritage | null> {
  const [kdcd, asno] = id.split('_')
  const url = `${BASE}/SearchKindOpenapiDt.do?ccbaKdcd=${kdcd}&ccbaAsno=${asno}`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  const xml = await res.text()
  const parsed = parser.parse(xml)
  const root = parsed?.result
  const item = Array.isArray(root?.item) ? root.item[0] : root?.item
  if (!item) return null

  return {
    id,
    name: cdata(item.ccbaMnm1),
    designation: cdata(item.ccmaName),
    category: cdata(item.gcodeName),
    era: cdata(item.ccceName),
    city: cdata(item.ccbaCtcdNm),
    district: cdata(item.ccsiName),
    address: cdata(item.ccbaLcad),
    lat: parseFloat(root.latitude ?? '0'),
    lng: parseFloat(root.longitude ?? '0'),
    imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
    description: cdata(item.content),
  }
}
