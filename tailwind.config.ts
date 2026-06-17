import type { Config } from "tailwindcss";

/**
 * 디자인 토큰 — 토이 `DesignSystem/Theme.swift` 이식.
 * navy(=primary/CTA), accent(=골드), heritage(=사적 퍼플), museum(=박물관 브라운), ai(=AI 틴트).
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#1a294a",
        accent: "#f59e1a",
        heritage: "#7d4cd9", // 사적
        museum: "#9e6e45", // 박물관
        ai: "#7366eb",
        canvas: "#f4f5f7", // systemGroupedBackground 대응
      },
      borderRadius: {
        card: "18px", // Theme.radius
        chip: "12px", // Theme.radiusSmall
      },
      boxShadow: {
        card: "0 4px 10px rgba(0,0,0,0.06)",
      },
      backgroundImage: {
        "ai-gradient": "linear-gradient(135deg, #edf0ff 0%, #fdebf5 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
