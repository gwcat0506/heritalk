'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { PathPoint, positionAt, WALK_MPS } from '@/lib/tour/route'
import {
  Play, Pause, RotateCcw, Send, Loader2, Footprints, Flag, Map as MapIcon,
} from 'lucide-react'

const TourMap = dynamic(() => import('@/components/map/TourMap'), { ssr: false })

// ── 타입 ──
interface TourStop {
  order: number; id: string; name: string; designation: string; era: string
  address: string; imageUrl?: string; cumDist: number; legMin: number
  segments: string[]
}
interface TourData {
  routeType: 'tmap' | 'straight'
  start: { lat: number; lng: number }
  path: PathPoint[]
  totalDistance: number; totalMinutes: number
  intro: string; outro: string; stops: TourStop[]
}
interface SessionTour {
  start: { lat: number; lng: number }
  startLabel: string
  level: string
  stops: { id: string; name: string; lat: number; lng: number }[]
}
type ChatKind = 'docent' | 'system' | 'user' | 'walking'
interface Chat { kind: ChatKind; text: string; title?: string }

const SPEEDS = [1, 5, 20]

export default function TourPage() {
  const [tour, setTour] = useState<TourData | null>(null)
  const [session, setSession] = useState<SessionTour | null>(null)
  const [status, setStatus] = useState<'init' | 'loading' | 'ready' | 'empty' | 'error'>('init')

  // 지도에서 넘어온 선택 정보를 세션에서 읽어 투어 생성
  useEffect(() => {
    let raw: string | null = null
    try { raw = sessionStorage.getItem('heritalk_tour') } catch {}
    if (!raw) { setStatus('empty'); return }
    let s: SessionTour
    try { s = JSON.parse(raw) } catch { setStatus('empty'); return }
    if (!s.stops?.length) { setStatus('empty'); return }
    setSession(s)
    setStatus('loading')
    fetch('/api/tour', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: s.start.lat, lng: s.start.lng, stops: s.stops, level: s.level }),
    })
      .then(r => r.json())
      .then((data: TourData & { error?: string }) => {
        if (data.error || !data.path?.length) { setStatus('error'); return }
        setTour(data); setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  if (status === 'empty') return (
    <EmptyState text="지도 탭에서 둘러볼 유산을 골라 투어를 만들어보세요." />
  )
  if (status === 'error') return (
    <EmptyState text="투어를 만들지 못했어요. 다시 시도해 주세요." />
  )
  if (status !== 'ready' || !tour || !session) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-400">
      <Loader2 size={26} className="animate-spin" />
      <p className="text-sm">도슨트가 코스를 짜고 이야기를 엮는 중...</p>
    </div>
  )

  return <TourPlayer tour={tour} session={session} />
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl">🚶</div>
      <p className="text-sm text-stone-500">{text}</p>
      <Link href="/map" className="flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-4 py-2">
        <MapIcon size={15} /> 지도로 가기
      </Link>
    </div>
  )
}

// ────────────────────────── 투어 재생 ──────────────────────────
function TourPlayer({ tour, session }: { tour: TourData; session: SessionTour }) {
  const [traveled, setTraveled] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [log, setLog] = useState<Chat[]>([])
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)

  // 도착 직전 해설을 시작할 구간 길이(m). 이 거리만큼 가까워지면 미리 설명.
  const APPROACH_M = 150

  const traveledRef = useRef(0)
  const speedRef = useRef(speed)
  const playingRef = useRef(playing)
  const rafRef = useRef<number>(0)
  const lastRef = useRef<number>(0)
  const ptrRef = useRef(0)        // 다음에 풀어낼 이벤트 index
  const endedRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const total = tour.totalDistance

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [log])

  const push = useCallback((c: Chat) => setLog(l => [...l, c]), [])

  // 해설 이벤트 타임라인: 각 장소의 토막을 "도착 직전 구간"에 분산.
  // → 가까워지면 미리 설명을 듣고, 도착 지점에서는 도착 마커만.
  const timeline = useMemo(() => {
    const ev: { atDist: number; chat: Chat }[] = []
    let prev = 0
    tour.stops.forEach((s, i) => {
      const segs = s.segments.length ? s.segments : [`${s.name} 근처입니다.`]
      const legSpan = Math.max(1, s.cumDist - prev)
      const windowM = Math.min(legSpan, APPROACH_M) // 도착 전 최대 300m 구간
      const startAt = s.cumDist - windowM
      const k = segs.length
      segs.forEach((text, j) => {
        ev.push({
          atDist: startAt + windowM * ((j + 0.5) / k), // 마지막 토막이 도착 즈음에 끝남
          chat: { kind: 'docent', text, title: j === 0 ? `🔭 곧 ${s.order}. ${s.name}` : undefined },
        })
      })
      const next = tour.stops[i + 1]
      ev.push({
        atDist: s.cumDist,
        chat: { kind: 'walking', text: next ? `📍 「${s.name}」 도착 · 다음은 「${next.name}」, 약 ${next.legMin}분` : `📍 「${s.name}」 도착` },
      })
      prev = s.cumDist
    })
    return ev.sort((a, b) => a.atDist - b.atDist)
  }, [tour])

  // 시작 인사 묶음 (재생 처음/다시 시작 시 사용)
  const introLog = useCallback((): Chat[] => {
    const first = tour.stops[0]
    const arr: Chat[] = [{ kind: 'docent', title: '투어 시작', text: tour.intro || '함께 떠나볼까요?' }]
    if (first) arr.push({ kind: 'walking', text: `「${first.name}」 쪽으로 출발해요. ▶ 누르면 헤리가 안내를 시작해요.` })
    return arr
  }, [tour])

  useEffect(() => { setLog(introLog()) }, [introLog])

  useEffect(() => {
    const loop = (now: number) => {
      if (playingRef.current) {
        const dt = lastRef.current ? (now - lastRef.current) / 1000 : 0
        const nt = Math.min(total, traveledRef.current + dt * WALK_MPS * speedRef.current)
        traveledRef.current = nt
        setTraveled(nt)
        // 가까워진 만큼의 해설을 순서대로 풀어냄
        while (ptrRef.current < timeline.length && timeline[ptrRef.current].atDist <= nt) {
          push(timeline[ptrRef.current].chat)
          ptrRef.current++
        }
        if (nt >= total && !endedRef.current) {
          endedRef.current = true
          push({ kind: 'docent', title: '투어 마무리', text: tour.outro || '오늘 투어는 여기까지예요. 수고하셨어요!' })
          push({ kind: 'system', text: '🎉 투어 완료! 직접 방문하면 도감에 스탬프도 모을 수 있어요.' })
          setPlaying(false)
        }
      }
      lastRef.current = now
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [total, timeline, tour, push])

  const nextStop = tour.stops.find(s => s.cumDist > traveled + 1)
  const etaMin = nextStop ? Math.max(0, Math.ceil((nextStop.cumDist - traveled) / WALK_MPS / 60)) : 0
  const pos = positionAt(tour.path, traveled)

  async function ask(text: string) {
    const q = text.trim()
    if (!q || asking) return
    setPlaying(false)
    push({ kind: 'user', text: q })
    setInput('')
    setAsking(true)
    const history = log.filter(c => c.kind === 'user' || c.kind === 'docent')
      .map(c => ({ role: c.kind === 'user' ? 'user' : 'assistant', content: c.text }))
    history.push({ role: 'user', content: q })
    try {
      const res = await fetch('/api/docent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history, lat: pos.lat, lng: pos.lng, level: session.level,
          nearby: session.stops.map(h => ({ id: h.id, name: h.name })),
        }),
      })
      const data = await res.json()
      push({ kind: 'docent', text: data.reply ?? '답을 찾지 못했어요.' })
    } catch {
      push({ kind: 'docent', text: '오류가 났어요. 다시 물어봐 주세요.' })
    } finally {
      setAsking(false)
    }
  }

  const pct = total ? Math.round((traveled / total) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      {/* 경로 뷰 (실제 카카오 지도) */}
      <div className="px-4 pt-3">
        <TourMap
          path={tour.path}
          stopPositions={tour.stops.map(s => ({ ...positionAt(tour.path, s.cumDist), name: s.name }))}
          pos={pos}
        />
        <div className="flex items-center justify-between mt-2 text-xs text-stone-500">
          <span>{tour.routeType === 'tmap' ? '도로 경로' : '직선 경로'} · 총 {(total / 1000).toFixed(1)}km · 도보 {tour.totalMinutes}분</span>
          <span className="font-medium text-amber-700">
            {pct >= 100 ? '도착' : nextStop ? `다음 ${nextStop.name} · 약 ${etaMin}분` : ''}
          </span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full mt-1.5 overflow-hidden">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 컨트롤 */}
      <div className="px-4 py-2.5 flex items-center gap-2">
        <button onClick={() => { if (traveled >= total) { traveledRef.current = 0; ptrRef.current = 0; endedRef.current = false; setTraveled(0); setLog(introLog()) } setPlaying(p => !p) }}
          className="w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center active:scale-95">
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="flex gap-1">
          {SPEEDS.map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                speed === s ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-stone-500 border-stone-200'}`}>
              {s}배속
            </button>
          ))}
        </div>
        <Link href="/map" className="ml-auto flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700">
          <RotateCcw size={13} /> 새 투어
        </Link>
      </div>

      {/* 챗봇 로그 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3 border-t border-stone-100">
        {log.map((c, i) => <Bubble key={i} c={c} />)}
        {asking && (
          <div className="flex items-center gap-2 text-stone-400 text-sm">
            <Loader2 size={14} className="animate-spin" /> 도슨트가 찾는 중...
          </div>
        )}
      </div>

      {/* 질문 입력 */}
      <div className="px-4 py-3 border-t border-stone-100">
        <form onSubmit={e => { e.preventDefault(); ask(input) }} className="flex items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="이동 중 헤리에게 질문하기..."
            className="flex-1 bg-stone-100 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-200" />
          <button type="submit" disabled={!input.trim() || asking}
            className="w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:scale-95">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

function Bubble({ c }: { c: Chat }) {
  if (c.kind === 'user') return (
    <div className="flex justify-end"><div className="max-w-[80%] bg-stone-900 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm">{c.text}</div></div>
  )
  if (c.kind === 'walking') return (
    <div className="flex items-center gap-2 text-xs text-stone-400 px-1"><Footprints size={13} className="text-amber-500 flex-shrink-0" /><span>{c.text}</span></div>
  )
  if (c.kind === 'system') return (
    <div className="text-center text-xs text-amber-700 bg-amber-50 rounded-xl py-2 px-3">{c.text}</div>
  )
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%]">
        {c.title && <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 mb-1 px-1"><Flag size={11} />{c.title}</div>}
        <div className="bg-stone-100 text-stone-800 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">{c.text}</div>
      </div>
    </div>
  )
}

