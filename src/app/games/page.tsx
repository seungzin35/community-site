import type { Metadata } from "next";
import { ChevronRight, Crown, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { MascotFigure } from "@/components/community/mascot-figure";
import { formatRecord, games, getLeaderboard, type GameInfo } from "@/lib/games";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "웹게임",
  description: "뭉치랑 같이 하는 간단한 웹게임. 기록을 세우고 순위표 1등에 도전해 보세요.",
};

async function TopPlayer({ game }: { game: GameInfo }) {
  await connection();
  const [top] = await getLeaderboard(game, 1);
  if (!top) return <span>아직 1등이 없어요</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Crown className="size-3.5 shrink-0 text-[#e8a317]" />
      <span className="truncate">
        1등 {top.nickname} · {formatRecord(game.id, top.score)}
      </span>
    </span>
  );
}

export default function GamesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5b5bd6] via-[#6e56cf] to-[#8e4ec6] px-5 py-6 text-white shadow-lg shadow-primary/20 sm:px-8">
        <div className="pointer-events-none absolute -right-14 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <MascotFigure level={3} className="size-20 shrink-0" />
          <div>
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-white/85">
              <Gamepad2 className="size-3.5" /> 웹게임
            </p>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">뭉치랑 한 판 할래요?</h1>
            <p className="mt-1 text-sm text-white/85">로그인하고 하면 기록이 순위표에 올라가요.</p>
          </div>
        </div>
      </section>

      <ul className="grid gap-3 sm:grid-cols-3">
        {games.map((game) => (
          <li key={game.id}>
            <Link
              href={`/games/${game.id}`}
              className="card group flex h-full items-center gap-3 p-4 transition-colors hover:border-primary/40 sm:flex-col sm:items-start"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-2xl">{game.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between font-bold">
                  {game.name}
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:hidden" />
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{game.summary}</span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {isSupabaseConfigured ? (
                    <Suspense fallback={<span>순위 불러오는 중…</span>}>
                      <TopPlayer game={game} />
                    </Suspense>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
