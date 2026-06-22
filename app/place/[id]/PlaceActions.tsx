"use client";
// 거점 상세 액션행 — 코스에 담기 / 길찾기(카카오맵) / 공유. (음성 해설 제거)
import { useCourseDraft } from "@/stores/useCourseDraft";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { POI } from "@/lib/types";

export default function PlaceActions({ poi }: { poi: POI }) {
  const { toggle, contains } = useCourseDraft();
  const t = useT();
  const added = contains(poi.id);

  const kakaoMapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(
    poi.name
  )},${poi.latitude},${poi.longitude}`;

  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: poi.name, text: poi.shortDesc, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      alert("링크를 복사했어요.");
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={() => toggle(poi)}
        className={`pressable rounded-card py-3 text-sm font-semibold ${
          added ? "bg-navy text-white" : "bg-accent text-white"
        }`}
      >
        {added ? `${t("place.added")} ✓` : `+ ${t("place.addCourse")}`}
      </button>
      <a
        href={kakaoMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="pressable grid place-items-center rounded-card bg-black/5 py-3 text-sm font-semibold"
      >
        {t("place.directions")}
      </a>
      <button
        onClick={share}
        className="pressable rounded-card bg-black/5 py-3 text-sm font-semibold"
      >
        {t("place.share")}
      </button>
    </div>
  );
}
