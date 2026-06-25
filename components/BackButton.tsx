"use client";
// 뒤로 가기 — 이전 화면(지도 등)으로. 히스토리 없으면 지도로 폴백.
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/map");
      }}
      aria-label="뒤로 가기"
      className="pressable absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/35 text-lg text-white backdrop-blur"
    >
      ←
    </button>
  );
}
