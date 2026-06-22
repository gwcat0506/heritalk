"use client";
// 하단 5탭 셸 — 토이 RootTabView 이식 (홈/지도/코스/저장/마이).
// 아이콘은 토이 SF Symbols(house.fill·map.fill·route·bookmark·person)에 맞춘 단순 라인 SVG.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { useT } from "@/lib/i18n/LocaleProvider";

type IconProps = { className?: string };

// house.fill
const HomeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M11.3 3.3a1 1 0 0 1 1.4 0l8 7.4a1 1 0 0 1 .3.7V20a1 1 0 0 1-1 1h-4v-6H8v6H4a1 1 0 0 1-1-1v-8.6a1 1 0 0 1 .3-.7z" />
  </svg>
);
// chat bubble (도슨트)
const ChatIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
  </svg>
);
// route(curvepath) — 두 지점 + 곡선
const RouteIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    <path d="M7 17c4 0 3-10 10-10" />
    <circle cx="7" cy="17" r="2.4" fill="currentColor" stroke="none" />
    <circle cx="17" cy="7" r="2.4" fill="currentColor" stroke="none" />
  </svg>
);
// bookmark(outline)
const BookmarkIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinejoin="round"
  >
    <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1z" />
  </svg>
);
// person(outline)
const PersonIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </svg>
);

const TABS = [
  { href: "/", key: "home", Icon: HomeIcon },
  { href: "/docent", key: "docent", Icon: ChatIcon },
  { href: "/course", key: "course", Icon: RouteIcon },
  { href: "/saved", key: "saved", Icon: BookmarkIcon },
  { href: "/mypage", key: "my", Icon: PersonIcon },
];

export default function TabBar() {
  const pathname = usePathname();
  const count = useCourseDraft((s) => s.pois.length);
  const t = useT();

  // 인증 화면에선 탭바 숨김(전체화면 로그인).
  if (pathname.startsWith("/auth")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-stretch justify-around border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {TABS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              active ? "text-navy" : "text-neutral-400"
            }`}
          >
            <item.Icon className="h-6 w-6" />
            {t(`tab.${item.key}`)}
            {item.href === "/course" && count > 0 && (
              <span className="absolute right-3 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
