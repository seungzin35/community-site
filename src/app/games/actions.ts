"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

export type SubmitResult =
  | { ok: true; best: number; isNewBest: boolean }
  | { ok: false; error: string; needLogin?: boolean };

/** 한 판 끝난 기록을 저장합니다. 최고 기록보다 좋을 때만 순위표가 바뀌어요. */
export async function submitScore(gameId: string, score: number): Promise<SubmitResult> {
  const game = getGame(gameId);
  if (!game || !Number.isFinite(score)) return { ok: false, error: "기록이 올바르지 않아요." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인하면 순위표에 기록이 올라가요.", needLogin: true };
  if (user.isBanned) return { ok: false, error: "활동이 정지된 계정이에요." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_game_score", { p_game: game.id, p_score: Math.round(score) });
  if (error) {
    console.error("게임 기록 저장 실패:", error.message);
    return { ok: false, error: "기록을 저장하지 못했어요." };
  }
  const row = ((data as { best: number; is_new_best: boolean }[] | null) ?? [])[0];
  revalidatePath(`/games/${game.id}`);
  revalidatePath("/games");
  return { ok: true, best: row?.best ?? Math.round(score), isNewBest: !!row?.is_new_best };
}

export type QuizGuessResult =
  | { word: string; marks: number[]; solved: boolean; tries: number; answer: string | null; error?: undefined }
  | { error: string };

/** 초성 퀴즈 답 내기. 채점과 기록은 DB 함수가 합니다. (정답은 브라우저로 보내지 않음) */
export async function guessQuiz(guess: string, attempt: number): Promise<QuizGuessResult> {
  const word = guess.replace(/\s/g, "").slice(0, 10);
  if (!word) return { error: "단어를 써 주세요." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quiz_guess", { p_guess: word, p_attempt: attempt });
  if (error || !data) {
    console.error("초성 퀴즈 채점 실패:", error?.message);
    return { error: "채점하지 못했어요. 잠시 뒤 다시 해 주세요." };
  }
  const result = data as QuizGuessResult;
  if (!result.error) {
    revalidatePath("/games/quiz");
    revalidatePath("/games");
  }
  return result;
}
