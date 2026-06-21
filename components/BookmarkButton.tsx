"use client";
// 거점 상세 히어로의 즐겨찾기 토글 — 비로그인 시 /auth로 안내(graceful).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";

export default function BookmarkButton({
  heritageId,
  heritageName,
}: {
  heritageId: string;
  heritageName: string;
}) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    isBookmarked(heritageId).then(setOn);
  }, [heritageId]);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    const next = await toggleBookmark({ heritageId, heritageName });
    setBusy(false);
    if (next === null) {
      router.push("/auth");
      return;
    }
    setOn(next);
  }

  return (
    <button
      onClick={onClick}
      aria-label={on ? "즐겨찾기 해제" : "즐겨찾기"}
      aria-pressed={on}
      className="pressable absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-card backdrop-blur"
    >
      <Heart
        className={`h-5 w-5 ${on ? "fill-heritage text-heritage" : "text-neutral-500"}`}
        aria-hidden
      />
    </button>
  );
}
