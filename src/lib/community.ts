import type { MascotState } from "./mascot-level";
import { createClient } from "./supabase/server";
import { createPublicClient } from "./supabase/public";

export type Question = { id: number; content: string; open_date: string; answer_count: number };

export type Answer = {
  id: number;
  author_id: string;
  content: string;
  like_count: number;
  created_at: string;
  author: { nickname: string } | null;
};

export type HallEntry = {
  question_id: number;
  question: string;
  open_date: string;
  answer_count: number;
  answer_id: number | null;
  answer: string | null;
  like_count: number | null;
  nickname: string | null;
};

const EMPTY: MascotState = { total_xp: 0, today: { posts: 0, comments: 0, votes: 0, answers: 0, xp: 0 } };

/** 뭉치 상태 (모두의 점수와 오늘 활동). DB 준비 전이면 0으로 보여 줍니다. */
export async function getMascotState(): Promise<MascotState> {
  const { data, error } = await createPublicClient().rpc("get_mascot_state");
  if (error || !data) return EMPTY;
  return data as MascotState;
}

/** 오늘의 질문. 오늘 질문이 아직 안 정해졌으면 DB가 대기 중인 맨 앞 질문을 엽니다. */
export async function getTodayQuestion(): Promise<Question | null> {
  const { data, error } = await createPublicClient().rpc("get_today_question");
  if (error) {
    console.error("오늘의 질문을 불러오지 못했습니다:", error.message);
    return null;
  }
  return ((data as Question[] | null) ?? [])[0] ?? null;
}

/** 지난 질문 하나 (마감된 질문만 공개) */
export async function getQuestion(id: number): Promise<Question | null> {
  const { data } = await createPublicClient()
    .from("daily_questions")
    .select("id, content, open_date, answer_count")
    .eq("id", id)
    .not("open_date", "is", null)
    .maybeSingle();
  return (data as Question | null) ?? null;
}

/**
 * 답 목록 (좋아요 많은 순). 로그인한 회원의 권한으로 읽으므로,
 * 오늘 질문은 내가 답한 뒤에만 다른 사람 답이 나옵니다. (DB 규칙이 막음)
 */
export async function getAnswers(questionId: number): Promise<Answer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_answers")
    .select("id, author_id, content, like_count, created_at, author:profiles!daily_answers_author_id_fkey(nickname)")
    .eq("question_id", questionId)
    .order("like_count", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(500);
  return (data ?? []) as unknown as Answer[];
}

/** 내가 좋아요 누른 답 id */
export async function getMyLikes(answerIds: number[], userId: string | undefined) {
  if (!userId || !answerIds.length) return new Set<number>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_answer_likes")
    .select("answer_id")
    .eq("user_id", userId)
    .in("answer_id", answerIds);
  return new Set((data ?? []).map((row) => row.answer_id as number));
}

export const HALL_PAGE_SIZE = 20;

export async function getHallOfFame(page: number) {
  const from = (page - 1) * HALL_PAGE_SIZE;
  const { data, count } = await createPublicClient()
    .from("daily_hall_of_fame")
    .select("*", { count: "exact" })
    .order("open_date", { ascending: false })
    .range(from, from + HALL_PAGE_SIZE - 1);
  return { entries: (data ?? []) as HallEntry[], total: count ?? 0 };
}

/** "2026-11-20" → "11월 20일" */
export function formatQuestionDate(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일`;
}

/** 한국 시간 기준 오늘 날짜 "YYYY-MM-DD" */
export function kstToday() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
