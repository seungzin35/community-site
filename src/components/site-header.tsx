import Link from "next/link";
import type { Board } from "@/lib/boards";
import { site } from "@/lib/site";

export function SiteHeader({ boards }: { boards: Board[] }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-primary">
          {site.name}
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/login" className="rounded-md px-3 py-1.5 hover:bg-muted">
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
          >
            회원가입
          </Link>
        </div>
      </div>
      <nav className="border-t border-border">
        <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 text-sm">
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                href={`/b/${board.slug}`}
                className="block whitespace-nowrap px-3 py-2.5 hover:text-primary"
              >
                {board.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
