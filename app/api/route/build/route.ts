// 서버: 코스 거점 묶음 → 도보 루트(TMap). 클라이언트는 startId + poiIds만 보낸다.
import { NextResponse } from "next/server";
import { buildRoute, NotEnoughStopsError } from "@/lib/routeEngine";
import { getPoi, getPois } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { startId, poiIds } = (await req.json()) as {
      startId?: string;
      poiIds: string[];
    };
    if (!Array.isArray(poiIds) || poiIds.length < 1) {
      return NextResponse.json({ error: "거점이 필요합니다." }, { status: 400 });
    }
    const through = getPois(poiIds);
    const start = startId ? getPoi(startId) ?? through[0] : through[0];
    if (!start) {
      return NextResponse.json({ error: "거점을 찾을 수 없습니다." }, { status: 404 });
    }

    const t0 = Date.now();
    const route = await buildRoute(start, through);
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
