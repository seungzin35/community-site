import { createClient } from "./supabase/server";
import { createPublicClient } from "./supabase/public";
import type { GameInfo, QuizToday, RankEntry } from "./games";

/** 게임별 순위표 (상위 n명). DB 준비 전이면 빈 목록 */
export async function getLeaderboard(game: GameInfo, limit = 20): Promise<RankEntry[]> {
  if (game.id === "quiz") return getQuizRanking(limit);
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
  if (game.id === "quiz") {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_my_quiz_rank");
    const row = ((data as { solved: number; rank: number }[] | null) ?? [])[0];
    return row ? { score: Number(row.solved), plays: Number(row.solved), rank: Number(row.rank) } : null;
  }
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

async function getQuizRanking(limit: number): Promise<RankEntry[]> {
  const { data, error } = await createPublicClient().rpc("get_quiz_ranking", { p_limit: limit });
  if (error) {
    console.error("퀴즈 순위를 불러오지 못했습니다:", error.message);
    return [];
  }
  return ((data as { user_id: string; nickname: string; solved: number }[] | null) ?? []).map((row) => ({
    user_id: row.user_id,
    score: Number(row.solved),
    plays: Number(row.solved),
    nickname: row.nickname,
  }));
}

export async function getQuizToday(): Promise<QuizToday | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_quiz_today");
  if (error) {
    console.error("오늘의 초성 퀴즈를 불러오지 못했습니다:", error.message);
    return null;
  }
  return (data as QuizToday | null) ?? null;
}
