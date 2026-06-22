// 서버: 루트 에이전트 — 코스 거점 → 도보 루트(재사용) + AI 투어 도슨트 스토리(Gemini JSON).
import { NextResponse } from "next/server";
import { buildRoute, NotEnoughStopsError } from "@/lib/routeEngine";
import { attachDistances, walkMinutes } from "@/lib/tour/route";
import { generateTourStory, type TourStopInput } from "@/lib/gemini";
import { isKhsId, getPlaceCached } from "@/lib/places";
import { getPoi } from "@/lib/data";
import type { POI, LatLng } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { pois, startId, level = "general", language, interests } =
      (await req.json()) as {
        pois: POI[];
        startId?: string;
        level?: string;
        language?: string;
        interests?: string[];
      };
    if (!Array.isArray(pois) || pois.length < 2) {
      return NextResponse.json({ error: "거점이 2곳 이상 필요합니다." }, { status: 400 });
    }
    const start = (startId && pois.find((p) => p.id === startId)) || pois[0];

    // 1) 방문 순서 + 경로(TMap/직선) + 누적거리 — 기존 엔진 재사용
    const route = await buildRoute(start, pois);
    const ordered = route.stops.map((s) => s.poi);

    // 2) 경로 평탄화 → PathPoint + 정류지 누적거리(자체 일관: 미리보기 이동점과 동일 기준)
    const coords: LatLng[] = route.paths.flat();
    const stopCoords: LatLng[] = ordered.map((p) => ({ lat: p.latitude, lng: p.longitude }));
    const { path, stopDist } = attachDistances(coords, stopCoords);
    const total = path.length ? path[path.length - 1].dist : 0;

    // 3) 정류지 상세(전문 설명) — KHS는 getPlaceCached, 정적은 getPoi
    const details = await Promise.all(
      ordered.map(async (p) => {
        if (isKhsId(p.id)) {
          const k = await getPlaceCached(p.id).catch(() => null);
          if (k)
            return {
              description: k.description ?? k.summaryAi ?? "",
              designation: k.designation ?? p.category,
              era: k.era ?? "",
              address: k.address ?? "",
              imageUrl: k.imageUrl ?? null,
              name: k.name ?? p.name,
            };
        }
        const s = getPoi(p.id);
        return {
          description: s?.shortDesc ?? p.shortDesc ?? "",
          designation: s?.category ?? p.category,
          era: s?.era ?? p.era ?? "",
          address: s?.address ?? p.address ?? "",
          imageUrl: s?.imageUrl ?? p.imageUrl ?? null,
          name: s?.name ?? p.name,
        };
      })
    );

    const stopMeta = ordered.map((p, i) => {
      const d = details[i];
      const legM = stopDist[i] - (i > 0 ? stopDist[i - 1] : 0);
      return {
        order: i + 1,
        id: p.id,
        name: d.name,
        designation: d.designation,
        era: d.era,
        address: d.address,
        imageUrl: d.imageUrl,
        lat: p.latitude,
        lng: p.longitude,
        cumDist: Math.round(stopDist[i]),
        legMin: walkMinutes(legM),
        description: d.description,
      };
    });

    // 4) 스토리텔링(Gemini JSON)
    const storyInput: TourStopInput[] = stopMeta.map((s) => ({
      name: s.name,
      designation: s.designation,
      era: s.era,
      description: s.description,
      legMin: s.legMin,
    }));
    const story = await generateTourStory(storyInput, level, { language, interests });

    return NextResponse.json({
      path,
      totalDistance: Math.round(total),
      totalMinutes: walkMinutes(total),
      intro: story.intro,
      outro: story.outro,
      stops: stopMeta.map((s, i) => ({
        order: s.order,
        id: s.id,
        name: s.name,
        designation: s.designation,
        era: s.era,
        address: s.address,
        imageUrl: s.imageUrl,
        lat: s.lat,
        lng: s.lng,
        cumDist: s.cumDist,
        legMin: s.legMin,
        segments: story.stops[i]?.segments ?? [],
      })),
    });
  } catch (e) {
    if (e instanceof NotEnoughStopsError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("tour error", e);
    return NextResponse.json({ error: "투어 생성 실패" }, { status: 500 });
  }
}
