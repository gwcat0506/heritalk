"use client";
// 저장 탭 — 관심 장소(즐겨찾기) + 저장한 코스(루트 불러오기·삭제).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSaved } from "@/stores/useSaved";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { walkEstimate } from "@/lib/poi";
import { listBookmarks, toggleBookmark, type BookmarkRow } from "@/lib/bookmarks";
import { POIThumbnail } from "@/components/ui";
import type { POI } from "@/lib/types";

export default function SavedPage() {
  const { courses, remove } = useSaved();
  const draft = useCourseDraft();
  const router = useRouter();

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);

  useEffect(() => {
    listBookmarks().then(setBookmarks);
  }, []);

  async function unbookmark(b: BookmarkRow) {
    await toggleBookmark({ heritageId: b.heritage_id, heritageName: b.heritage_name ?? "" });
    setBookmarks((arr) => arr.filter((x) => x.heritage_id !== b.heritage_id));
  }

  function open(pois: POI[]) {
    draft.clear();
    pois.forEach((p) => draft.toggle(p));
    router.push("/course/result");
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
                <span className="text-lg">♥</span>
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
                <div className="border-t border-neutral-100 px-3 py-2 text-right">
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
