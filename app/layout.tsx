import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HeriTalk',
  description: '위치 기반 국가유산 AI 도슨트',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
