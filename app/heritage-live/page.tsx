// /heritage-live — 국가유산청 서울 라이브 API 스파이크(서버 컴포넌트). 탭바엔 없고 주소로 직접 접근.
// 정적 116곳과 별개로 "라이브 데이터가 앱에서 흐르는지" 확인용.
import Link from "next/link";
import { MapPin, RefreshCw } from "lucide-react";
import { getSeoulHeritageList, type KhsHeritage } from "@/lib/khs";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic"; // 외부 API는 빌드가 아닌 요청 시 호출

// 지정종류별 색(스캔 가능한 리스트용) — 토큰 팔레트 기반.
function desigColor(d: string): string {
  if (d.includes("국보")) return "#f59e1a"; // accent
  if (d.includes("보물")) return "#9e6e45"; // museum
  if (d.includes("사적")) return "#7d4cd9"; // heritage
  if (d.includes("명승")) return "#2f9e6e";
  if (d.includes("천연")) return "#3b82a6";
  return "#1a294a"; // navy
}

export default async function HeritageLivePage() {
  const t = await getServerT();
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
      <header className="mb-3">
        <p className="text-sm text-neutral-500">{t("live.subtitle")}</p>
        <h1 className="text-2xl font-bold text-navy">{t("live.title")}</h1>
        <p className="mt-1 text-xs text-neutral-400">
          {t("live.count", { n: items.length.toLocaleString() })}
        </p>
      </header>

      {error && (
        <div className="card mb-4 flex items-center justify-between gap-3 p-4">
          <p className="text-sm text-red-500">{t("live.failed")}</p>
          <Link
            href="/heritage-live"
            className="pressable inline-flex shrink-0 items-center gap-1 rounded-chip bg-black/5 px-2.5 py-1 text-xs font-semibold text-neutral-700"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {t("common.retry")}
          </Link>
        </div>
      )}

      {/* 지정종류별 개수 — 스크롤 시 상단 고정 */}
      <div className="sticky top-0 z-10 -mx-4 mb-3 bg-canvas/95 px-4 py-2 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {counts.map(([d, c]) => (
            <span
              key={d}
              className="chip text-white"
              style={{ backgroundColor: desigColor(d) }}
            >
              {d} {c}
            </span>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <div className="space-y-2">
        {items.map((h) => (
          <div key={h.id} className="card flex items-center gap-3 p-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-chip text-[11px] font-bold leading-tight text-white"
              style={{ backgroundColor: desigColor(h.designation) }}
            >
              {h.designation.slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">{h.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                <MapPin className="h-3 w-3" aria-hidden />
                {h.district}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Link href="/" className="pressable mt-6 block text-center text-sm text-neutral-500">
        {t("live.home")}
      </Link>
    </main>
  );
}
