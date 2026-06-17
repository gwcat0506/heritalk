"use client";
// 토이 CourseDraft.swift 이식 — 사용자가 "코스에 추가"한 거점 묶음(세션). localStorage 영속.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { POI } from "@/lib/types";

interface CourseDraftState {
  pois: POI[];
  startId: string | null; // 맨 위(시작점)
  toggle: (poi: POI) => void;
  contains: (id: string) => boolean;
  remove: (id: string) => void;
  move: (from: number, to: number) => void;
  swap: (i: number, j: number) => void;
  setStart: (id: string) => void;
  clear: () => void;
}

export const useCourseDraft = create<CourseDraftState>()(
  persist(
    (set, get) => ({
      pois: [],
      startId: null,
      toggle: (poi) =>
        set((s) => {
          const exists = s.pois.some((p) => p.id === poi.id);
          return {
            pois: exists
              ? s.pois.filter((p) => p.id !== poi.id)
              : [...s.pois, poi],
          };
        }),
      contains: (id) => get().pois.some((p) => p.id === id),
      remove: (id) =>
        set((s) => ({
          pois: s.pois.filter((p) => p.id !== id),
          startId: s.startId === id ? null : s.startId,
        })),
      move: (from, to) =>
        set((s) => {
          const next = [...s.pois];
          const [m] = next.splice(from, 1);
          next.splice(to, 0, m);
          return { pois: next };
        }),
      swap: (i, j) =>
        set((s) => {
          if (i < 0 || j < 0 || i >= s.pois.length || j >= s.pois.length)
            return s;
          const next = [...s.pois];
          [next[i], next[j]] = [next[j], next[i]];
          return { pois: next };
        }),
      setStart: (id) => set({ startId: id }),
      clear: () => set({ pois: [], startId: null }),
    }),
    { name: "course_draft_v1" }
  )
);
