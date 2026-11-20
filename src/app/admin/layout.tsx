import type { Metadata } from "next";
import Link from "next/link";
import { NotReady } from "@/components/not-ready";
import { requireAdminPage } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// 관리자 확인을 매번 하므로 서버에서 기다렸다가 보여 줍니다.
export const instant = false;

export const metadata: Metadata = {
  title: { default: "관리자", template: "%s | 관리자" },
  robots: { index: false },
};

const menu = [
  { href: "/admin", label: "요약" },
  { href: "/admin/reports", label: "신고" },
  { href: "/admin/boards", label: "게시판" },
  { href: "/admin/members", label: "회원" },
  { href: "/admin/posts", label: "게시글" },
  { href: "/admin/comments", label: "댓글" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!isSupabaseConfigured) return <NotReady />;
  await requireAdminPage();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-lg font-bold">관리자</h1>
        <nav className="flex flex-wrap gap-1 text-sm">
          {menu.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-1.5 hover:bg-muted">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
