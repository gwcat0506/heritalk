// 투어 경로/타이밍 계산 — 순수 함수 모음 (GPS 없이 단위테스트 가능)
// ---------------------------------------------------------------
// 핵심 책임:
//  1) 두 좌표 사이 실제 거리(haversine)
//  2) 출발지에서 선택 유산들을 도는 "최적 방문 순서"(최근접 이웃)
//  3) 순서대로 점들을 잇는 촘촘한 경로 좌표 배열(직선 보간) + 누적거리
//  4) 거리 → 도보 소요시간 환산

export interface LatLng {
  lat: number
  lng: number
}

// 경로 위의 한 점 (누적 거리 포함)
export interface PathPoint extends LatLng {
  dist: number // 출발지로부터 누적 거리(m)
}

export const WALK_MPS = 1.3 // 보행 속도 ≈ 1.3 m/s (약 78 m/분)

// 두 좌표 사이 거리(m) — Haversine
export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// 거리(m) → "약 N분" 문자열
export function walkMinutes(distM: number): number {
  return Math.max(1, Math.round(distM / WALK_MPS / 60))
}

// 출발지에서 시작해 가장 가까운 곳을 차례로 잇는 방문 순서(최근접 이웃 휴리스틱).
// 입력 stops는 변형하지 않는다. 반환은 정렬된 새 배열.
export function nearestNeighborOrder<T extends LatLng>(start: LatLng, stops: T[]): T[] {
  const remaining = [...stops]
  const order: T[] = []
  let cur: LatLng = start
  while (remaining.length) {
    let bi = 0
    let bd = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(cur, remaining[i])
      if (d < bd) {
        bd = d
        bi = i
      }
    }
    const [next] = remaining.splice(bi, 1)
    order.push(next)
    cur = next
  }
  return order
}

// 두 점 사이를 stepM 간격으로 보간한 중간점들(끝점 b 제외, 시작점 a 포함).
function interpolateSegment(a: LatLng, b: LatLng, stepM: number): LatLng[] {
  const d = haversine(a, b)
  const n = Math.max(1, Math.ceil(d / stepM))
  const pts: LatLng[] = []
  for (let i = 0; i < n; i++) {
    const t = i / n
    pts.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t })
  }
  return pts
}

// 순서대로 정렬된 점들(points[0]=출발지, 이후=경유/도착)을 잇는
// 촘촘한 직선 경로를 만든다. Tmap 같은 도로 경로가 없을 때의 기본/폴백.
// 반환: { path(누적거리 포함), stopDist(각 점의 누적거리) }
//   stopDist[k] = points[k]가 경로 상에서 갖는 누적 거리(m). points[0]은 0.
export function buildStraightPath(
  points: LatLng[],
  stepM = 25
): { path: PathPoint[]; stopDist: number[] } {
  if (points.length === 0) return { path: [], stopDist: [] }
  const path: PathPoint[] = []
  const stopDist: number[] = []
  let acc = 0

  // 첫 점
  path.push({ ...points[0], dist: 0 })
  stopDist.push(0)

  for (let k = 1; k < points.length; k++) {
    const prev = points[k - 1]
    const cur = points[k]
    const mids = interpolateSegment(prev, cur, stepM).slice(1) // prev는 이미 들어감
    let last: LatLng = prev
    for (const m of mids) {
      acc += haversine(last, m)
      path.push({ ...m, dist: acc })
      last = m
    }
    acc += haversine(last, cur)
    path.push({ ...cur, dist: acc })
    stopDist.push(acc)
  }
  return { path, stopDist }
}

// 임의의 경로 좌표열(예: Tmap 응답 LineString)에 누적거리를 붙이고,
// 각 정류 지점(stops)이 경로 상에서 가장 가까운 점의 누적거리를 찾는다.
export function attachDistances(
  coords: LatLng[],
  stops: LatLng[]
): { path: PathPoint[]; stopDist: number[] } {
  const path: PathPoint[] = []
  let acc = 0
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) acc += haversine(coords[i - 1], coords[i])
    path.push({ ...coords[i], dist: acc })
  }
  const stopDist = stops.map(s => {
    let bd = Infinity
    let bDist = 0
    for (const p of path) {
      const d = haversine(s, p)
      if (d < bd) {
        bd = d
        bDist = p.dist
      }
    }
    return bDist
  })
  return { path, stopDist }
}

// 누적거리 path에서 traveled(m) 위치의 좌표를 보간해 구한다(부드러운 이동점).
export function positionAt(path: PathPoint[], traveled: number): LatLng {
  if (path.length === 0) return { lat: 0, lng: 0 }
  if (traveled <= 0) return { lat: path[0].lat, lng: path[0].lng }
  const total = path[path.length - 1].dist
  if (traveled >= total) return { lat: path[path.length - 1].lat, lng: path[path.length - 1].lng }
  for (let i = 1; i < path.length; i++) {
    if (path[i].dist >= traveled) {
      const a = path[i - 1]
      const b = path[i]
      const span = b.dist - a.dist || 1
      const t = (traveled - a.dist) / span
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
    }
  }
  return { lat: path[path.length - 1].lat, lng: path[path.length - 1].lng }
}
