import { createPublicClient } from "./supabase/public";

export type GameId = "jump" | "cards" | "reflex";

export type GameInfo = {
  id: GameId;
  name: string;
  emoji: string;
  summary: string;
  howTo: string;
  /** 높을수록 좋은 기록인지 (점수) 낮을수록 좋은지 (시간) */
  higherBetter: boolean;
};

export const games: GameInfo[] = [
  {
    id: "jump",
    name: "뭉치 점프",
    emoji: "🏃",
    summary: "굴러오는 장애물을 폴짝 뛰어넘어요",
    howTo: "화면을 누르거나 스페이스바를 눌러 점프! 길게 누르면 더 높이 뛰어요. 오래 버틸수록 빨라져요.",
    higherBetter: true,
  },
  {
    id: "cards",
    name: "짝꿍 카드",
    emoji: "🃏",
    summary: "같은 그림 카드 8쌍을 빨리 찾아요",
    howTo: "카드를 두 장씩 뒤집어 같은 그림을 맞춰요. 모두 맞추는 시간이 짧을수록 높은 순위예요.",
    higherBetter: false,
  },
  {
    id: "reflex",
    name: "번개 반응",
    emoji: "⚡",
    summary: "화면이 바뀌는 순간 누르는 반응속도",
    howTo: "화면이 초록색으로 바뀌면 최대한 빨리 눌러요. 5번 잰 평균이 내 기록이에요. 너무 일찍 누르면 다시!",
    higherBetter: false,
  },
];

export function getGame(id: string): GameInfo | undefined {
  return games.find((game) => game.id === id);
}

/** 기록을 사람이 읽기 좋게 */
export function formatRecord(game: GameId, score: number) {
  if (game === "jump") return `${score.toLocaleString()}점`;
  if (game === "cards") return `${(score / 1000).toFixed(1)}초`;
  return `${score}ms`;
}

export type RankEntry = { user_id: string; score: number; plays: number; nickname: string };

/** 게임별 순위표 (상위 n명). DB 준비 전이면 빈 목록 */
export async function getLeaderboard(game: GameInfo, limit = 20): Promise<RankEntry[]> {
  const { data, error } = await createPublicClient()
    .from("game_records")
    .select("user_id, score, plays, profile:profiles(nickname)")
    .eq("game", game.id)
    .order("score", { ascending: !game.higherBetter })
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("순위표를 불러오지 못했습니다:", error.message);
    return [];
  }
  return (data ?? []).map((row) => {
    const profile = row.profile as { nickname: string } | { nickname: string }[] | null;
    const nickname = Array.isArray(profile) ? profile[0]?.nickname : profile?.nickname;
    return { user_id: row.user_id, score: row.score, plays: row.plays, nickname: nickname ?? "알 수 없음" };
  });
}

/** 내 기록과 등수 */
export async function getMyRecord(game: GameInfo, userId: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("game_records")
    .select("score, plays")
    .eq("game", game.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const better = supabase.from("game_records").select("user_id", { count: "exact", head: true }).eq("game", game.id);
  const { count } = await (game.higherBetter ? better.gt("score", data.score) : better.lt("score", data.score));
  return { score: data.score as number, plays: data.plays as number, rank: (count ?? 0) + 1 };
}
