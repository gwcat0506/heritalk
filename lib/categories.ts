// 카테고리/지정종류 색·아이콘 (순수 모듈 — 서버·클라이언트 공용).
// 박물관/미술관류는 🖼️, 그 외(사적·국보·보물 등 국가유산)는 🏛️
export const isHeritage = (category: string) =>
  category !== "박물관" && category !== "미술관" && category !== "갤러리";

// 정적(사적·박물관) + KHS 지정종류 색
const CATEGORY_HEX: Record<string, string> = {
  사적: "#7d4cd9",
  박물관: "#9e6e45",
  국보: "#f59e1a",
  보물: "#3b82f6",
  명승: "#14b8a6",
  천연기념물: "#10b981",
  시도유형문화유산: "#9e6e45",
  시도기념물: "#78716c",
};
export const categoryHex = (category: string) => CATEGORY_HEX[category] ?? "#9e6e45";
