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
import { useT } from "@/lib/i18n/LocaleProvider";

export default function CoursePage() {
  const { pois, startId, remove, swap, setStart, clear } = useCourseDraft();
  const router = useRouter();
  const t = useT();
  const est = walkEstimate(pois);
  const start = startId ?? pois[0]?.id;

  return (
    <main className="px-4 pt-6">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">{t("course.title")}</h1>
        {pois.length > 0 && (
          <button onClick={clear} className="pressable text-sm text-neutral-400">
            {t("course.clearAll")}
          </button>
        )}
      </div>

      {/* 거점 추가 진입 */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Link href="/map" className="pressable card flex flex-col items-center p-4 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-chip bg-ai-gradient text-ai">
            <Map className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="mt-2 text-sm font-semibold">{t("course.fromMap")}</div>
          <div className="text-xs text-neutral-500">{t("course.fromMapSub")}</div>
        </Link>
        <Link href="/" className="pressable card flex flex-col items-center p-4 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-chip bg-ai-gradient text-ai">
            <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="mt-2 text-sm font-semibold">{t("course.fromRec")}</div>
          <div className="text-xs text-neutral-500">{t("course.fromRecSub")}</div>
        </Link>
      </div>

      {pois.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Route className="h-7 w-7" strokeWidth={1.8} aria-hidden />}
            title={t("course.empty.title")}
            description={t("course.empty.desc")}
            action={{ label: t("course.empty.cta"), href: "/map" }}
          />
        </div>
      ) : (
        <>
          <div className="mb-3 rounded-card bg-white p-4 text-center shadow-card">
            {t("course.estimate", {
              min: est.minutes,
              km: est.km.toFixed(1),
              n: pois.length,
            })}
            <p className="mt-1 text-xs text-neutral-400">{t("course.estimateNote")}</p>
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
                      <span className="chip bg-accent/15 text-accent">{t("course.startBadge")}</span>
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
                    {t("course.setStart")}
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="pressable rounded-chip px-2 py-1 text-[11px] text-red-500"
                  >
                    {t("course.delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <PrimaryButton
            disabled={pois.length < 2}
            onClick={() => router.push("/course/result")}
          >
            {pois.length < 2 ? t("course.needTwo") : t("course.finish")}
          </PrimaryButton>
        </>
      )}
    </main>
  );
}
