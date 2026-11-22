"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AnswerState = { error?: string } | undefined;

function refresh() {
  revalidatePath("/question");
  revalidatePath("/");
}

export async function submitAnswer(_: AnswerState, formData: FormData): Promise<AnswerState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요해요." };
  if (user.isBanned) return { error: "활동이 정지된 계정이에요." };

  const questionId = Number(formData.get("questionId"));
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "답을 적어 주세요." };
  if (content.length > 300) return { error: "답은 300자 이하로 해주세요." };

  const supabase = await createClient();
  // 오늘 열린 질문인지는 DB 규칙이 확인합니다.
  const { error } = await supabase
    .from("daily_answers")
    .insert({ question_id: questionId, author_id: user.id, content });
  if (error) {
    if (error.code === "23505") return { error: "이미 답했어요." };
    console.error("답 등록 실패:", error.message);
    return { error: "답을 등록하지 못했어요. 질문이 마감됐을 수도 있어요." };
  }
  refresh();
  return undefined;
}

/** 좋아요. 다시 누르면 취소됩니다. */
export async function toggleAnswerLike(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.isBanned) return;
  const answerId = Number(formData.get("answerId"));
  const liked = formData.get("liked") === "true";

  const supabase = await createClient();
  const { error } = liked
    ? await supabase.from("daily_answer_likes").delete().eq("answer_id", answerId).eq("user_id", user.id)
    : await supabase.from("daily_answer_likes").insert({ answer_id: answerId, user_id: user.id });
  if (error && error.code !== "23505") console.error("좋아요 처리 실패:", error.message);
  refresh();
}

/** 내 답 지우기 (마감 전까지) 또는 관리자가 지우기 */
export async function deleteAnswer(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const answerId = Number(formData.get("answerId"));
  const supabase = await createClient();
  const { error } = await supabase.from("daily_answers").delete().eq("id", answerId);
  if (error) console.error("답 삭제 실패:", error.message);
  refresh();
}
