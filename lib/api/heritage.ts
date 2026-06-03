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

// 위도 경도 → 시도 코드 추정
function toCityCode(lat: number, lng: number): string {
  if (lat >= 37.4 && lat <= 37.7 && lng >= 126.7 && lng <= 127.3) return '11' // 서울
  if (lat >= 35.0 && lat <= 35.3 && lng >= 128.9 && lng <= 129.3) return '21' // 부산
  if (lat >= 35.8 && lat <= 36.0 && lng >= 128.4 && lng <= 128.8) return '22' // 대구
  if (lat >= 37.3 && lat <= 37.6 && lng >= 126.5 && lng <= 126.8) return '23' // 인천
  if (lat >= 35.1 && lat <= 35.2 && lng >= 126.8 && lng <= 127.0) return '24' // 광주
  if (lat >= 36.2 && lat <= 36.5 && lng >= 127.3 && lng <= 127.5) return '25' // 대전
  if (lat >= 35.5 && lat <= 35.6 && lng >= 129.2 && lng <= 129.4) return '26' // 울산
  if (lat >= 37.3 && lat <= 37.8 && lng >= 126.5 && lng <= 127.9) return '31' // 경기
  return '11' // 기본값 서울
}

// 지정종류 코드: 국보(11), 보물(12), 사적(13), 명승(14), 천연기념물(15), 시도유형(21), 시도무형(22), 시도기념물(23)
const KDCD_LIST = ['11', '12', '13', '14', '15', '21', '23']

// 단일 ccbaKdcd + ccbaCtcd 조합으로 목록 조회
async function fetchList(cityCode: string, kdcd: string): Promise<any[]> {
  const url = `${BASE}/SearchKindOpenapiList.do?pageUnit=100&pageIndex=1&ccbaCtcd=${cityCode}&ccbaKdcd=${kdcd}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  const xml = await res.text()
  const parsed = parser.parse(xml)
  const items = parsed?.result?.item
  if (!items) return []
  return Array.isArray(items) ? items : [items]
}

// 주변 유산 목록 (반경 radiusM 미터 이내, 여러 지정종류 병렬 조회)
export async function getNearbyHeritage(
  lat: number,
  lng: number,
  radiusM = 2000
): Promise<Heritage[]> {
  const cityCode = toCityCode(lat, lng)

  // 여러 지정종류 병렬 조회
  const results = await Promise.all(KDCD_LIST.map(kdcd => fetchList(cityCode, kdcd)))
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
    // 같은 좌표 중복 제거 (id 기준)
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
