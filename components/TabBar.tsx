"use client";
// 하단 5탭 셸 — 모던 탭바: lucide 아이콘 + 활성 pill 하이라이트 + 부드러운 상단 그림자.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessagesSquare, Route, Bookmark, User } from "lucide-react";
import { useCourseDraft } from "@/stores/useCourseDraft";
import { useT } from "@/lib/i18n/LocaleProvider";

const TABS = [
  { href: "/", key: "home", Icon: Home },
  { href: "/docent", key: "docent", Icon: MessagesSquare },
  { href: "/course", key: "course", Icon: Route },
  { href: "/saved", key: "saved", Icon: Bookmark },
  { href: "/mypage", key: "my", Icon: User },
];

export default function TabBar() {
  const pathname = usePathname();
  const count = useCourseDraft((s) => s.pois.length);
  const t = useT();

  // 인증 화면에선 탭바 숨김(전체화면 로그인).
  if (pathname.startsWith("/auth")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-stretch justify-around rounded-t-2xl bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_16px_rgba(0,0,0,0.06)] backdrop-blur">
      {TABS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const showBadge = item.href === "/course" && count > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium"
          >
            <span
              className={`relative grid h-7 w-12 place-items-center rounded-full transition-colors ${
                active ? "bg-ai/10 text-ai" : "text-neutral-400"
              }`}
            >
              <item.Icon
                className="h-[22px] w-[22px]"
                strokeWidth={active ? 2.4 : 2}
                aria-hidden
              />
              {showBadge && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </span>
            <span className={active ? "text-ai" : "text-neutral-400"}>
              {t(`tab.${item.key}`)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
