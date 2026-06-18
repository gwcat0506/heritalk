"use client";
// 도슨트 탭 — 장소 무관 일반 AI 도슨트 채팅(전체 화면).
import DocentPanel from "@/components/DocentPanel";

export default function DocentTabPage() {
  return (
    <main className="flex h-full flex-col px-4 pt-6">
      <header className="mb-3">
        <p className="text-sm text-neutral-500">무엇이든 물어보세요</p>
        <h1 className="text-2xl font-bold text-navy">AI 도슨트</h1>
      </header>
      <DocentPanel className="h-[calc(100dvh-11rem)]" />
    </main>
  );
}
