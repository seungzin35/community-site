"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Board } from "@/lib/boards";

/** 헤더 아래 게시판 탭. 지금 보고 있는 게시판에 밑줄을 그어 줍니다. */
export function BoardNav({ boards }: { boards: Board[] }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "홈", gallery: false },
    { href: "/question", label: "오늘의 질문", gallery: false },
    ...boards.map((board) => ({ href: `/b/${board.slug}`, label: board.name, gallery: board.type === "gallery" })),
  ];

  return (
    <nav aria-label="게시판" data-tour="boards">
      <ul className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 text-[15px] sm:px-4">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-tour={item.gallery ? "gallery" : undefined}
                className={`relative block whitespace-nowrap px-3 py-3 font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
