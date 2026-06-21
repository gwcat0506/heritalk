"use client";
// 도슨트 탭 — 상단 세그먼트 [대화 | 투어]. 대화=장소/일반 Q&A, 투어=라이브 투어 도슨트.
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DocentPanel from "@/components/DocentPanel";
import TourExperience, { type TourSource } from "@/components/TourExperience";
import type { POI } from "@/lib/types";

function DocentInner() {
  const params = useSearchParams();
  const router = useRouter();
  const placeId = params.get("placeId");
  const name = params.get("name") ?? "";
  const session = params.get("session") ?? undefined;
  const savedId = params.get("savedId") ?? undefined;
  const tab = params.get("tab") === "tour" ? "tour" : "chat";

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

  const go = (t: "chat" | "tour") => {
    const q = new URLSearchParams();
    if (t === "tour") q.set("tab", "tour");
    router.replace(`/docent${q.toString() ? `?${q}` : ""}`);
  };

  return (
    <main className="flex h-full flex-col px-4 pt-6">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">AI 도슨트</h1>
        <div className="flex gap-1 rounded-chip bg-black/5 p-0.5 text-sm font-semibold">
          {(["chat", "tour"] as const).map((t) => (
            <button
              key={t}
              onClick={() => go(t)}
              className={`pressable rounded-chip px-3 py-1 ${
                tab === t ? "bg-white text-navy shadow-card" : "text-neutral-500"
              }`}
            >
              {t === "chat" ? "대화" : "투어"}
            </button>
          ))}
        </div>
      </header>

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
