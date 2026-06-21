import type { Metadata, Viewport } from "next";
import "./globals.css";
import TabBar from "@/components/TabBar";

export const metadata: Metadata = {
  title: "Heritalk — 도보 여행 역사 AI 가이드",
  description:
    "박물관·미술관·유적지를 거점으로, 산책·답사·관광 어디서나 한 점의 시간을 살아 있게 만드는 AI 동반자.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a294a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {/* 모바일 우선: 가운데 정렬된 max-w-md 셸 */}
        <div className="mx-auto min-h-dvh max-w-md bg-canvas pb-20">
          {children}
        </div>
        <TabBar />
      </body>
    </html>
  );
}
