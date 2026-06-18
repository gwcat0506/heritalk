// 거점 상세 — 정적 116 + KHS 라이브 동시 지원. 히어로 + 정보 + 코스 담기 + 채팅 도슨트.
import { notFound } from "next/navigation";
import { getPoi } from "@/lib/data";
import { isKhsId, getPlaceCached, khsToPoi } from "@/lib/places";
import { categoryHex, isHeritage } from "@/lib/categories";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import PlaceActions from "./PlaceActions";
import type { POI } from "@/lib/types";

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let poi: POI | undefined;
  if (isKhsId(id)) {
    const k = await getPlaceCached(id); // KHS: places 캐시 또는 라이브 → 저장
    poi = k ? khsToPoi(k) : undefined;
  } else {
    poi = getPoi(id); // 정적 116
  }
  if (!poi) notFound();

  const hex = categoryHex(poi.category);

  return (
    <main className="pb-6">
      {/* 히어로 */}
      <div className="relative h-56 w-full bg-neutral-200">
        <BackButton />
        {poi.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poi.imageUrl} alt={poi.name} className="h-full w-full object-cover" />
        ) : (
          <div
            className="grid h-full place-items-center text-5xl"
            style={{ background: `linear-gradient(135deg, ${hex}d9, ${hex}8c)` }}
          >
            {isHeritage(poi.category) ? "🏛️" : "🖼️"}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <span className="chip text-white" style={{ backgroundColor: hex }}>
            {poi.category}
          </span>
          <h1 className="mt-1 text-2xl font-bold text-white drop-shadow">{poi.name}</h1>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <PlaceActions poi={poi} />

        {/* 소개 */}
        {poi.shortDesc && (
          <section className="card p-4">
            <h2 className="mb-1 text-sm font-semibold text-ai">✨ 유산 소개</h2>
            <p className="text-sm leading-relaxed text-neutral-700">{poi.shortDesc}</p>
          </section>
        )}

        {/* 기본 정보 */}
        <section className="card divide-y divide-neutral-100 p-4 text-sm">
          <Row label="분류" value={poi.category} />
          {poi.era && <Row label="시대" value={poi.era} />}
          {poi.district && <Row label="자치구" value={poi.district} />}
          {poi.address && <Row label="소재지" value={poi.address} />}
        </section>

        {/* AI 도슨트 채팅으로 이동 */}
        <Link
          href={`/docent?placeId=${encodeURIComponent(poi.id)}&name=${encodeURIComponent(poi.name)}`}
          className="pressable block w-full rounded-card bg-navy py-3.5 text-center font-semibold text-white"
        >
          🧑‍🏫 AI 도슨트와 대화하기
        </Link>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="shrink-0 text-neutral-400">{label}</span>
      <span className="text-right text-neutral-800">{value}</span>
    </div>
  );
}
