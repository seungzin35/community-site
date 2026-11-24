import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BalloonGame } from "@/components/games/balloon-game";
import { CardsGame } from "@/components/games/cards-game";
import { JumpGame } from "@/components/games/jump-game";
import { Leaderboard, LeaderboardFallback } from "@/components/games/leaderboard";
import { MergeGame } from "@/components/games/merge-game";
import { QuizGame } from "@/components/games/quiz-game";
import { ReflexGame } from "@/components/games/reflex-game";
import { TowerGame } from "@/components/games/tower-game";
import { getCurrentUser } from "@/lib/auth";
import { games, getGame, type GameId, type GameInfo } from "@/lib/games";
import { getQuizToday } from "@/lib/games-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// 게임은 세 개뿐이라 주소를 미리 정해 두고, 순위표만 따로 불러옵니다.
export const instant = false;

export function generateStaticParams() {
  return games.map((game) => ({ game: game.id }));
}

export async function generateMetadata({ params }: PageProps<"/games/[game]">): Promise<Metadata> {
  const game = getGame((await params).game);
  return game ? { title: game.name, description: `${game.summary}. ${game.howTo}` } : {};
}

const boards: Record<Exclude<GameId, "quiz">, () => React.ReactNode> = {
  merge: () => <MergeGame />,
  jump: () => <JumpGame />,
  tower: () => <TowerGame />,
  balloon: () => <BalloonGame />,
  cards: () => <CardsGame />,
  reflex: () => <ReflexGame />,
};

/** 초성 퀴즈는 오늘 문제와 내 진행 상황을 서버에서 받아 옵니다. */
async function Quiz() {
  await connection();
  const [today, user] = await Promise.all([getQuizToday(), getCurrentUser()]);
  if (!today) {
    return <p className="card px-4 py-12 text-center text-sm text-muted-foreground">오늘 문제를 준비하고 있어요. 조금 뒤에 다시 와 주세요!</p>;
  }
  return <QuizGame key={today.day} initial={today} loggedIn={!!user} />;
}

async function Ranking({ game }: { game: GameInfo }) {
  await connection();
  return <Leaderboard game={game} />;
}

export default async function GamePage({ params }: PageProps<"/games/[game]">) {
  const game = getGame((await params).game);
  if (!game) notFound();

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/games" className="btn btn-ghost -ml-2 px-2" aria-label="웹게임 목록">
            <ChevronLeft className="size-5" />
          </Link>
          <span className="text-3xl" aria-hidden>
            {game.emoji}
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight">{game.name}</h1>
            <p className="text-sm text-muted-foreground">{game.summary}</p>
          </div>
        </div>
        {game.id === "quiz" ? (
          isSupabaseConfigured ? (
            <Suspense fallback={<div className="card mx-auto h-96 max-w-md animate-pulse" />}>
              <Quiz />
            </Suspense>
          ) : (
            <p className="card px-4 py-12 text-center text-sm text-muted-foreground">준비 중이에요.</p>
          )
        ) : (
          boards[game.id]()
        )}
        <p className="rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">{game.howTo}</p>
      </div>
      <aside>
        {isSupabaseConfigured ? (
          <Suspense fallback={<LeaderboardFallback />}>
            <Ranking game={game} />
          </Suspense>
        ) : (
          <p className="card px-4 py-10 text-center text-sm text-muted-foreground">순위표는 준비 중이에요.</p>
        )}
      </aside>
    </div>
  );
}
