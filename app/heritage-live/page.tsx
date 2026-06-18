// /heritage-live — 국가유산청 서울 라이브 API 스파이크(서버 컴포넌트). 탭바엔 없고 주소로 직접 접근.
// 정적 116곳과 별개로 "라이브 데이터가 앱에서 흐르는지" 확인용.
import Link from "next/link";
import { getSeoulHeritageList, type KhsHeritage } from "@/lib/khs";

export const dynamic = "force-dynamic"; // 외부 API는 빌드가 아닌 요청 시 호출

export default async function HeritageLivePage() {
  let items: KhsHeritage[] = [];
  let error: string | null = null;
  try {
    items = await getSeoulHeritageList();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const byDesig = new Map<string, number>();
  for (const h of items) byDesig.set(h.designation, (byDesig.get(h.designation) ?? 0) + 1);
  const counts = [...byDesig.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <main className="px-4 pt-6 pb-8">
      <header className="mb-4">
        <p className="text-sm text-neutral-500">국가유산청 실시간 · 서울</p>
        <h1 className="text-2xl font-bold text-navy">라이브 국가유산 ({items.length})</h1>
        <p className="mt-1 text-xs text-neutral-400">khs.go.kr OpenAPI 직접 호출 (스파이크)</p>
      </header>

      {error && (
        <p className="card mb-4 p-4 text-sm text-red-500">불러오기 실패: {error}</p>
      )}

      {/* 지정종류별 개수 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {counts.map(([d, c]) => (
          <span key={d} className="chip bg-black/5 text-neutral-700">
            {d} {c}
          </span>
        ))}
      </div>

      {/* 목록 */}
      <div className="space-y-2">
        {items.map((h) => (
          <div key={h.id} className="card flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="chip bg-navy/10 text-navy">{h.designation}</span>
                <span className="truncate text-sm font-medium text-neutral-900">{h.name}</span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-400">
                {h.district} · {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Link href="/" className="pressable mt-6 block text-center text-sm text-neutral-500">
        ← 홈으로
      </Link>
    </main>
  );
}
