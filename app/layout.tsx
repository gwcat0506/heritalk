import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import TabBar from "@/components/TabBar";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/dict";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const c = await cookies();
  const locale: Locale = c.get("locale")?.value === "en" ? "en" : "ko";
  const largeText = c.get("pref_large")?.value === "1";
  return (
    <html lang={locale} className={largeText ? "a11y-large" : undefined}>
      <body>
        <LocaleProvider initialLocale={locale} initialLargeText={largeText}>
          {/* 모바일 우선: 가운데 정렬된 max-w-md 셸 */}
          <div className="mx-auto min-h-dvh max-w-md bg-canvas pb-20">
            {children}
          </div>
          <TabBar />
        </LocaleProvider>
      </body>
    </html>
  );
}
