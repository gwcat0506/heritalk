"use client";
// 코스 허브 — 거점 추가 진입 + 모바일 제스처 편집(드래그 정렬·스와이프 삭제) + 하단 고정 요약/CTA.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Map, Sparkles, Route } from "lucide-react";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { walkEstimate } from "@/lib/poi";
import { EmptyState } from "@/components/ui";
import CourseStops from "@/components/CourseStops";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function CoursePage() {
  const { pois, remove, reorder, clear } = useCourseDraft();
  const router = useRouter();
  const t = useT();
  const est = walkEstimate(pois);
  const has = pois.length > 0;

  return (
    <main className={`px-4 pt-6 ${has ? "pb-32" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">{t("course.title")}</h1>
        {has && (
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

      {!has ? (
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
          <p className="mb-2 px-1 text-xs text-neutral-400">{t("course.editHint")}</p>
          <CourseStops pois={pois} onReorder={reorder} onRemove={remove} />
        </>
      )}

      {/* 하단 고정 요약 + CTA */}
      {has && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-xs text-neutral-500">
              {t("course.estimate", {
                min: est.minutes,
                km: est.km.toFixed(1),
                n: pois.length,
              })}
            </p>
            <button
              disabled={pois.length < 2}
              onClick={() => router.push("/course/result")}
              className="pressable shrink-0 rounded-card bg-navy px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {pois.length < 2 ? t("course.needTwo") : t("course.finish")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
