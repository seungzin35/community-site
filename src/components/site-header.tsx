import Link from "next/link";
import { Suspense } from "react";
import type { Board } from "@/lib/boards";
import { site } from "@/lib/site";
import { BoardNav } from "./board-nav";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu, UserMenuFallback } from "./user-menu";

export function SiteHeader({ boards }: { boards: Board[] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight">
          <Logo />
          {site.name}
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
      <BoardNav boards={boards} />
    </header>
  );
}
