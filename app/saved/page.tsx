"use client";
// 저장 탭 — 관심 장소(즐겨찾기) + 저장한 코스(루트 불러오기·삭제).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSaved } from "@/stores/useSaved";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { walkEstimate } from "@/lib/poi";
import { listBookmarks, toggleBookmark, type BookmarkRow } from "@/lib/bookmarks";
import { listSavedTours, deleteSavedTour, type SavedTourRow } from "@/lib/courses";
import { POIThumbnail, EmptyState } from "@/components/ui";
import { Heart, Headphones, Bookmark } from "lucide-react";
import type { POI } from "@/lib/types";

export default function SavedPage() {
  const { courses, remove } = useSaved();
  const draft = useCourseDraft();
  const router = useRouter();

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [tours, setTours] = useState<SavedTourRow[]>([]);

  useEffect(() => {
    listBookmarks().then(setBookmarks);
    listSavedTours().then(setTours);
  }, []);

  async function unbookmark(b: BookmarkRow) {
    await toggleBookmark({ heritageId: b.heritage_id, heritageName: b.heritage_name ?? "" });
    setBookmarks((arr) => arr.filter((x) => x.heritage_id !== b.heritage_id));
  }

  async function removeTour(id: string) {
    await deleteSavedTour(id);
    setTours((arr) => arr.filter((t) => t.id !== id));
  }

  function open(pois: POI[]) {
    draft.clear();
    pois.forEach((p) => draft.toggle(p));
    router.push("/course/result");
  }

  // 저장 코스 → 드래프트 세팅 후 투어(재생성)
  function walkTour(pois: POI[]) {
    draft.clear();
    pois.forEach((p) => draft.toggle(p));
    router.push("/docent?tab=tour");
  }

  const allEmpty =
    bookmarks.length === 0 && tours.length === 0 && courses.length === 0;

  if (allEmpty) {
    return (
      <main className="px-4 pt-6">
        <h1 className="mb-3 text-xl font-bold text-navy">저장</h1>
        <div className="card">
          <EmptyState
            icon={<Bookmark className="h-7 w-7" strokeWidth={1.8} aria-hidden />}
            title="저장한 항목이 없어요"
            description="관심 장소를 ♥ 하거나 도보 코스를 만들어 저장하면 여기에 모여요."
            action={{ label: "코스 만들러 가기", href: "/course" }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 pt-6">
      {/* 관심 장소(즐겨찾기) */}
      {bookmarks.length > 0 && (
        <section className="mb-6">
          <h1 className="mb-3 text-xl font-bold text-navy">관심 장소</h1>
          <ul className="space-y-1.5">
            {bookmarks.map((b) => (
              <li key={b.heritage_id} className="card flex items-center gap-2 p-3">
                <Heart className="h-5 w-5 shrink-0 fill-heritage text-heritage" aria-hidden />
                <Link
                  href={`/place/${b.heritage_id}`}
                  className="pressable min-w-0 flex-1 truncate text-sm font-medium text-neutral-800"
                >
                  {b.heritage_name ?? "이름 없음"}
                </Link>
                <button
                  onClick={() => unbookmark(b)}
                  className="pressable shrink-0 text-xs text-neutral-400"
                >
                  해제
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 저장한 투어(DB) — 다시 듣기는 Gemini 재호출 없이 즉시 재생 */}
      {tours.length > 0 && (
        <section className="mb-6">
          <h1 className="mb-3 text-xl font-bold text-navy">저장한 투어</h1>
          <ul className="space-y-1.5">
            {tours.map((t) => (
              <li key={t.id} className="card flex items-center gap-2 p-3">
                <Headphones className="h-5 w-5 shrink-0 text-ai" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {t.title ?? "투어"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {t.total_distance ? `${(t.total_distance / 1000).toFixed(1)}km` : ""}
                    {t.total_time ? ` · ${Math.round(t.total_time / 60)}분` : ""}
                  </p>
                </div>
                <Link
                  href={`/docent?tab=tour&savedId=${t.id}`}
                  className="pressable shrink-0 rounded-chip bg-ai/10 px-2.5 py-1 text-xs font-semibold text-ai"
                >
                  다시 듣기
                </Link>
                <button
                  onClick={() => removeTour(t.id)}
                  className="pressable shrink-0 text-xs text-neutral-400"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h1 className="mb-3 text-xl font-bold text-navy">저장한 코스</h1>

      {courses.length === 0 ? (
        <div className="card grid place-items-center p-10 text-center text-sm text-neutral-500">
          아직 저장한 코스가 없어요.
          <br />
          코스를 만들고 저장해보세요.
        </div>
      ) : (
        <ul className="space-y-3">
          {courses.map((c) => {
            const est = walkEstimate(c.pois);
            return (
              <li key={c.id} className="card overflow-hidden">
                <button
                  onClick={() => open(c.pois)}
                  className="pressable block w-full text-left"
                >
                  <div className="flex gap-1 p-3 pb-0">
                    {c.pois.slice(0, 4).map((p) => (
                      <POIThumbnail
                        key={p.id}
                        poi={p}
                        className="h-16 flex-1 rounded-chip"
                      />
                    ))}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-xs text-neutral-500">
                      {c.pois.length}곳 · 약 {est.minutes}분 · {est.km.toFixed(1)}km
                    </p>
                  </div>
                </button>
                <div className="flex items-center justify-between border-t border-neutral-100 px-3 py-2">
                  <button
                    onClick={() => walkTour(c.pois)}
                    className="pressable inline-flex items-center gap-1 rounded-chip bg-ai/10 px-2.5 py-1 text-xs font-semibold text-ai"
                  >
                    <Headphones className="h-3.5 w-3.5" aria-hidden />
                    투어로 걷기
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="pressable text-xs text-red-500"
                  >
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
