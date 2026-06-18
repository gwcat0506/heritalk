// 지도 라우트 — 공용 HeritageMap을 화면 높이(탭바 제외)로 채움. 홈에서는 MapSheet로 띄움.
import HeritageMap from "@/components/HeritageMap";

export default function MapPage() {
  return (
    <main className="relative h-[calc(100dvh-3.5rem)]">
      <HeritageMap />
    </main>
  );
}
