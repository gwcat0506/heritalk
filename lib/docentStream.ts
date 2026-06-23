"use client";
// 도슨트 NDJSON 이벤트 스트림 리더 — DocentPanel·TourPlayer 공용.
import type { Citation, POI } from "./types";

export type DocentEvent =
  | { t: "delta"; text: string }
  | { t: "tool"; name: string }
  | { t: "action"; action: "addToCourse"; poi: POI }
  | { t: "citations"; items: Citation[] }
  | { t: "error"; text: string };

export async function* readDocentStream(res: Response): AsyncGenerator<DocentEvent> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) {
        try {
          yield JSON.parse(line) as DocentEvent;
        } catch {
          /* 부분/깨진 줄 무시 */
        }
      }
    }
  }
  const last = buf.trim();
  if (last) {
    try {
      yield JSON.parse(last) as DocentEvent;
    } catch {
      /* noop */
    }
  }
}

/** 도구 이름 → i18n 키. */
export function toolLabelKey(name: string): string {
  switch (name) {
    case "find_nearby_places":
      return "agent.tool.nearby";
    case "lookup_heritage":
      return "agent.tool.lookup";
    case "get_directions":
      return "agent.tool.directions";
    case "add_to_course":
      return "agent.tool.addCourse";
    default:
      return "agent.tool.working";
  }
}
