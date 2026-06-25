"use client";
// 토이 SavedStore.swift 이식 — 저장 코스. localStorage 영속(데모).
// 단계 6에서 Supabase saved_courses 동기화 레이어 추가 예정.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { POI } from "@/lib/types";

export interface SavedCourse {
  id: string;
  title: string;
  pois: POI[];
  createdAt: number;
}

interface SavedState {
  courses: SavedCourse[];
  add: (title: string, pois: POI[]) => void;
  remove: (id: string) => void;
  contains: (pois: POI[]) => boolean;
}

const sameSet = (a: POI[], b: POI[]) => {
  const sa = new Set(a.map((p) => p.id));
  const sb = new Set(b.map((p) => p.id));
  return sa.size === sb.size && [...sa].every((id) => sb.has(id));
};

export const useSaved = create<SavedState>()(
  persist(
    (set, get) => ({
      courses: [],
      add: (title, pois) =>
        set((s) => ({
          courses: [
            {
              id:
                globalThis.crypto?.randomUUID?.() ??
                String(Date.now()),
              title,
              pois,
              createdAt: Date.now(),
            },
            ...s.courses,
          ],
        })),
      remove: (id) =>
        set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),
      contains: (pois) => get().courses.some((c) => sameSet(c.pois, pois)),
    }),
    { name: "saved_courses_v1" }
  )
);
