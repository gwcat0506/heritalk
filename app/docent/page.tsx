"use client";
// 도슨트 탭 — [대화 | 투어]. 대화=Q&A(항상). 투어=라이브 투어(코스 활성 시에만 접근).
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, MessagesSquare } from "lucide-react";
import DocentPanel from "@/components/DocentPanel";
import TourExperience, { type TourSource } from "@/components/TourExperience";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { POI } from "@/lib/types";

function DocentInner() {
  const params = useSearchParams();
  const router = useRouter();
  const t = useT();
  const placeId = params.get("placeId");
  const name = params.get("name") ?? "";
  const session = params.get("session") ?? undefined;
  const savedId = params.get("savedId") ?? undefined;

  // 코스 활성 = 작성 중 코스 2곳+ (또는 저장 투어 다시듣기 딥링크)
  const draftCount = useCourseDraft((s) => s.pois.length);
  const tourActive = draftCount >= 2 || !!savedId;
  const requestedTour = params.get("tab") === "tour";
  const tab: "chat" | "tour" = requestedTour && tourActive ? "tour" : "chat";
  const [lockHint, setLockHint] = useState(false);

  const poi: POI | undefined = placeId
    ? {
        id: placeId,
        name,
        category: "",
        district: "",
        latitude: 0,
        longitude: 0,
        address: "",
        shortDesc: "",
      }
    : undefined;

  const tourSource: TourSource = savedId ? { kind: "saved", id: savedId } : { kind: "draft" };

  function go(target: "chat" | "tour") {
    if (target === "tour") {
      if (!tourActive) {
        setLockHint(true);
        return;
      }
      router.replace("/docent?tab=tour");
    } else {
      setLockHint(false);
      router.replace("/docent");
    }
  }

  return (
    <main className="flex h-full flex-col px-4 pt-6">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ai-gradient text-ai">
            <MessagesSquare className="h-5 w-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold text-navy">{t("docent.title")}</p>
            <p className="text-xs text-neutral-400">{t("docent.role")}</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-chip bg-black/5 p-0.5 text-sm font-semibold">
          <button
            onClick={() => go("chat")}
            className={`pressable rounded-chip px-3 py-1 ${
              tab === "chat" ? "bg-white text-navy shadow-card" : "text-neutral-500"
            }`}
          >
            {t("docent.chatTab")}
          </button>
          <button
            onClick={() => go("tour")}
            aria-disabled={!tourActive}
            className={`pressable inline-flex items-center gap-1 rounded-chip px-3 py-1 ${
              tab === "tour"
                ? "bg-white text-navy shadow-card"
                : tourActive
                ? "text-neutral-500"
                : "text-neutral-300"
            }`}
          >
            {!tourActive && <Lock className="h-3 w-3" aria-hidden />}
            {t("docent.tourTab")}
          </button>
        </div>
      </header>

      {/* 투어 잠금 안내 */}
      {lockHint && !tourActive && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-card bg-ai/10 px-4 py-3 text-sm">
          <span className="min-w-0 text-neutral-600">{t("docent.tourLocked")}</span>
          <Link
            href="/course"
            onClick={() => setLockHint(false)}
            className="pressable shrink-0 rounded-chip bg-navy px-3 py-1.5 text-xs font-semibold text-white"
          >
            {t("course.title")}
          </Link>
        </div>
      )}

      {tab === "tour" ? (
        <div className="min-h-0 flex-1 pb-2">
          <TourExperience source={tourSource} />
        </div>
      ) : (
        <>
          {poi && <p className="mb-2 text-sm text-neutral-500">{poi.name}</p>}
          <DocentPanel poi={poi} sessionParam={session} className="h-[calc(100dvh-12rem)]" />
        </>
      )}
    </main>
  );
}

export default function DocentTabPage() {
  return (
    <Suspense>
      <DocentInner />
    </Suspense>
  );
}
