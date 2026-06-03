'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, MessageCircle, Route, User } from 'lucide-react'

const NAV = [
  { href: '/map',     icon: Map,           label: '지도' },
  { href: '/docent',  icon: MessageCircle, label: '도슨트' },
  { href: '/course',  icon: Route,         label: '코스' },
  { href: '/profile', icon: User,          label: '내 정보' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-white">
      <header className="flex items-center px-5 py-3.5 border-b border-stone-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <span className="text-lg font-bold text-stone-900 tracking-tight">HeriTalk</span>
        <span className="ml-1.5 text-lg">🏛️</span>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      <nav className="border-t border-stone-100 bg-white/90 backdrop-blur-sm pb-safe">
        <div className="flex">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
                  active ? 'text-stone-900' : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
