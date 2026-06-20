"use client";
// 도슨트 탭 — placeId 있으면 거점 맥락 채팅, 없으면 장소 무관 일반 도슨트.
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DocentPanel from "@/components/DocentPanel";
import type { POI } from "@/lib/types";

function DocentInner() {
  const params = useSearchParams();
  const placeId = params.get("placeId");
  const name = params.get("name") ?? "";
  const session = params.get("session") ?? undefined;
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

  return (
    <main className="flex h-full flex-col px-4 pt-6">
      <header className="mb-3">
        <p className="text-sm text-neutral-500">
          {poi ? poi.name : "무엇이든 물어보세요"}
        </p>
        <h1 className="text-2xl font-bold text-navy">AI 도슨트</h1>
      </header>
      <DocentPanel poi={poi} sessionParam={session} className="h-[calc(100dvh-11rem)]" />
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
