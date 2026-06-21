"use client";
// 코스 허브 — 토이 CourseHubView 이식: 담은 거점 편집(순서·삭제·시작점) + 예상 + 걷기.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Map, Sparkles, ChevronUp, ChevronDown, Route } from "lucide-react";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { walkEstimate } from "@/lib/poi";
import {
  POIThumbnail,
  PrimaryButton,
  CategoryChip,
  EmptyState,
} from "@/components/ui";

export default function CoursePage() {
  const { pois, startId, remove, swap, setStart, clear } = useCourseDraft();
  const router = useRouter();
  const est = walkEstimate(pois);
  const start = startId ?? pois[0]?.id;

  return (
    <main className="px-4 pt-6">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">코스 만들기</h1>
        {pois.length > 0 && (
          <button onClick={clear} className="pressable text-sm text-neutral-400">
            전체 비우기
          </button>
        )}
      </div>

      {/* 거점 추가 진입 */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Link href="/map" className="pressable card flex flex-col items-center p-4 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-chip bg-ai-gradient text-ai">
            <Map className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="mt-2 text-sm font-semibold">주변에서 고르기</div>
          <div className="text-xs text-neutral-500">지도에서 담기</div>
        </Link>
        <Link href="/" className="pressable card flex flex-col items-center p-4 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-chip bg-ai-gradient text-ai">
            <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="mt-2 text-sm font-semibold">추천에서 고르기</div>
          <div className="text-xs text-neutral-500">홈 AI 추천</div>
        </Link>
      </div>

      {pois.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Route className="h-7 w-7" strokeWidth={1.8} aria-hidden />}
            title="아직 담은 거점이 없어요"
            description="위에서 지도나 AI 추천으로 거점을 담으면 나만의 도보 코스가 완성돼요."
            action={{ label: "지도에서 거점 찾기", href: "/map" }}
          />
        </div>
      ) : (
        <>
          <div className="mb-3 rounded-card bg-white p-4 text-center shadow-card">
            예상 <b className="text-navy">{est.minutes}분</b> ·{" "}
            <b className="text-navy">{est.km.toFixed(1)}km</b> · {pois.length}곳
            <p className="mt-1 text-xs text-neutral-400">
              ※ 실제 도보 경로·시간은 "이 코스로 걷기"에서 계산됩니다
            </p>
          </div>

          <ul className="mb-4 space-y-2">
            {pois.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 card p-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">
                  {i + 1}
                </span>
                <POIThumbnail poi={p} className="h-12 w-12 rounded-chip" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                    {start === p.id && (
                      <span className="chip bg-accent/15 text-accent">시작</span>
                    )}
                  </div>
                  <CategoryChip category={p.category} />
                </div>
                <div className="flex shrink-0 flex-col gap-1 text-neutral-400">
                  <button
                    onClick={() => i > 0 && swap(i, i - 1)}
                    className="pressable px-1 disabled:opacity-20"
                    disabled={i === 0}
                    aria-label="위로"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    onClick={() => i < pois.length - 1 && swap(i, i + 1)}
                    className="pressable px-1 disabled:opacity-20"
                    disabled={i === pois.length - 1}
                    aria-label="아래로"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    onClick={() => setStart(p.id)}
                    className="pressable rounded-chip bg-black/5 px-2 py-1 text-[11px]"
                  >
                    시작점
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="pressable rounded-chip px-2 py-1 text-[11px] text-red-500"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <PrimaryButton
            disabled={pois.length < 2}
            onClick={() => router.push("/course/result")}
          >
            {pois.length < 2 ? "거점 2곳 이상 담아주세요" : "코스 완성하기"}
          </PrimaryButton>
        </>
      )}
    </main>
  );
}
