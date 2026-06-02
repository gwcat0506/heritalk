import Link from 'next/link'
import { Map, MessageCircle, Route, User } from 'lucide-react'

const NAV = [
  { href: '/map',    icon: Map,           label: '지도' },
  { href: '/docent', icon: MessageCircle, label: '도슨트' },
  { href: '/course', icon: Route,         label: '코스' },
  { href: '/profile',icon: User,          label: '내 정보' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-white">
      {/* 상단 앱바 */}
      <header className="flex items-center px-5 py-3.5 border-b border-stone-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <span className="text-lg font-bold text-stone-900 tracking-tight">HeriTalk</span>
        <span className="ml-1.5 text-lg">🏛️</span>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* 하단 네비게이션 */}
      <nav className="border-t border-stone-100 bg-white/90 backdrop-blur-sm pb-safe">
        <div className="flex">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center py-3 gap-0.5 text-stone-400 hover:text-stone-900 transition-colors"
            >
              <Icon size={22} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
