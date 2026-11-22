"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { href: "/admin", label: "요약" },
  { href: "/admin/reports", label: "신고" },
  { href: "/admin/boards", label: "게시판" },
  { href: "/admin/questions", label: "오늘의 질문" },
  { href: "/admin/members", label: "회원" },
  { href: "/admin/posts", label: "게시글" },
  { href: "/admin/comments", label: "댓글" },
];

/** 관리자 메뉴. 지금 보고 있는 메뉴를 눌린 모양으로 보여 줍니다. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-muted p-1 text-sm">
      {menu.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 font-medium transition-colors ${
              active ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
