import Link from "next/link";
import { Suspense } from "react";
import type { Board } from "@/lib/boards";
import { site } from "@/lib/site";
import { UserMenu, UserMenuFallback } from "./user-menu";

export function SiteHeader({ boards }: { boards: Board[] }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-primary">
          {site.name}
        </Link>
        <Suspense fallback={<UserMenuFallback />}>
          <UserMenu />
        </Suspense>
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
