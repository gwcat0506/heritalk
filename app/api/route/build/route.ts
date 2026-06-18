// 서버: 코스 거점 묶음 → 도보 루트(TMap). 클라이언트가 POI 객체(좌표 포함)를 보낸다(KHS·정적 혼합 지원).
import { NextResponse } from "next/server";
import { buildRoute, NotEnoughStopsError } from "@/lib/routeEngine";
import type { POI } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { startId, pois } = (await req.json()) as {
      startId?: string;
      pois: POI[];
    };
    if (!Array.isArray(pois) || pois.length < 1) {
      return NextResponse.json({ error: "거점이 필요합니다." }, { status: 400 });
    }
    const start = (startId && pois.find((p) => p.id === startId)) || pois[0];

    const t0 = Date.now();
    const route = await buildRoute(start, pois);
    const latencyMs = Date.now() - t0;

    return NextResponse.json({ route, latencyMs });
  } catch (e) {
    if (e instanceof NotEnoughStopsError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("route/build error", e);
    return NextResponse.json({ error: "루트 생성 실패" }, { status: 500 });
  }
}
