// Kakao Maps JS SDK 동적 로더. MapKit 대체(지도 표시·마커·폴리라인).
"use client";

let loadPromise: Promise<any> | null = null;

export function loadKakao(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject("no window");
  if (window.kakao?.maps) return Promise.resolve(window.kakao);
  if (loadPromise) return loadPromise;

  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!key) return Promise.reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY 미설정"));

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    script.onerror = () => reject(new Error("Kakao SDK 로드 실패"));
    document.head.appendChild(script);
  });
  return loadPromise;
}
