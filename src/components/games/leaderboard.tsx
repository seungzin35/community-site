import { Crown, Medal } from "lucide-react";
import { formatRecord, getLeaderboard, getMyRecord, type GameInfo } from "@/lib/games";
import { getCurrentUser } from "@/lib/auth";

const medal = ["text-[#e8a317]", "text-[#9a9cab]", "text-[#c2773d]"];

/** 게임별 순위표 (상위 20명 + 내 순위) */
export async function Leaderboard({ game }: { game: GameInfo }) {
  const [entries, user] = await Promise.all([getLeaderboard(game), getCurrentUser()]);
  const mine = user ? await getMyRecord(game, user.id) : null;

  return (
    <section className="card overflow-hidden">
      <h2 className="flex items-center justify-between border-b border-border px-4 py-3 text-[15px] font-bold">
        <span className="inline-flex items-center gap-1.5">
          <Crown className="size-4 text-[#e8a317]" /> 순위표
        </span>
        <span className="text-xs font-medium text-muted-foreground">{game.higherBetter ? "점수 높은 순" : "기록 빠른 순"}</span>
      </h2>
      {mine && (
        <p className="flex items-center justify-between bg-primary-soft px-4 py-2.5 text-sm">
          <span className="font-semibold">내 최고 기록 · {mine.rank}위</span>
          <span className="font-bold tabular-nums">{formatRecord(game.id, mine.score)}</span>
        </p>
      )}
      {entries.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">아직 기록이 없어요. 첫 번째 1등이 되어 보세요!</p>
      ) : (
        <ol className="divide-y divide-border">
          {entries.map((entry, i) => (
            <li
              key={entry.user_id}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm ${entry.user_id === user?.id ? "bg-primary-soft/60" : ""}`}
            >
              <span className="grid w-6 shrink-0 place-items-center font-bold tabular-nums text-muted-foreground">
                {i < 3 ? <Medal className={`size-5 ${medal[i]}`} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{entry.nickname}</span>
              <span className="shrink-0 font-bold tabular-nums">{formatRecord(game.id, entry.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function LeaderboardFallback() {
  return <div className="card h-64 animate-pulse" />;
}
