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
