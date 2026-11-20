import type { Metadata } from "next";
import { Clock, LogIn, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { AnswerForm } from "@/components/community/answer-form";
import { AnswerList, LockedAnswers } from "@/components/community/answer-list";
import { Countdown } from "@/components/community/countdown";
import { MascotFigure } from "@/components/community/mascot-figure";
import { MASCOT_NAME } from "@/components/guide/mascot";
import { NotReady } from "@/components/not-ready";
import { getCurrentUser } from "@/lib/auth";
import { formatQuestionDate, getAnswers, getMascotState, getMyLikes, getTodayQuestion } from "@/lib/community";
import { levelInfo } from "@/lib/mascot-level";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// 로그인 정보와 그날의 질문을 매번 읽어 오므로 서버에서 기다렸다가 보여 줍니다.
export const instant = false;

export const metadata: Metadata = {
  title: "오늘의 질문",
  description: "매일 자정에 열리는 오늘의 질문. 답을 남기면 다른 사람들의 답이 보여요.",
};

export default async function QuestionPage() {
  if (!isSupabaseConfigured) return <NotReady />;
  await connection();

  const [question, user, mascot] = await Promise.all([getTodayQuestion(), getCurrentUser(), getMascotState()]);
  const level = levelInfo(mascot.total_xp).level;
  const answers = question && user ? await getAnswers(question.id) : [];
  const answered = !!user && answers.some((answer) => answer.author_id === user.id);
  const showAnswers = answered || user?.role === "admin";
  const myLikes = showAnswers ? await getMyLikes(answers.map((answer) => answer.id), user?.id) : new Set<number>();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5b5bd6] via-[#6e56cf] to-[#8e4ec6] px-5 pb-6 pt-5 text-white shadow-lg shadow-primary/20 sm:px-8 sm:pb-8">
        <div className="pointer-events-none absolute -right-14 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between gap-2 text-xs font-semibold text-white/85">
          <span>{question ? `${formatQuestionDate(question.open_date)}의 질문` : "오늘의 질문"}</span>
          <Link href="/question/hall" className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 hover:bg-white/25">
            <Trophy className="size-3.5" /> 명예의 전당
          </Link>
        </div>
        <div className="relative mt-4 flex items-end gap-3">
          <MascotFigure level={level} className="mascot-grow size-20 shrink-0 sm:size-24" />
          <div className="relative mb-3 min-w-0 flex-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3.5 text-foreground shadow-md dark:bg-surface">
            <p className="text-[11px] font-bold text-primary">{MASCOT_NAME}가 물어봐요</p>
            <h1 className="mt-1 break-words text-lg font-extrabold leading-snug tracking-tight sm:text-xl">
              {question ? question.content : "오늘의 질문을 준비하고 있어요. 조금만 기다려 주세요!"}
            </h1>
          </div>
        </div>
        {question && (
          <p className="relative mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/85">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" /> {question.answer_count.toLocaleString()}명이 답했어요
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> <Countdown />
            </span>
          </p>
        )}
      </section>

      {question && (
        <>
          {!user ? (
            <div className="card flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">로그인하고 답을 남기면 다른 사람들의 답을 볼 수 있어요.</p>
              <Link href="/login?next=/question" className="btn btn-primary">
                <LogIn className="size-4" /> 로그인하고 답하기
              </Link>
            </div>
          ) : !answered && !user.isBanned ? (
            <div className="card p-4 sm:p-5">
              <AnswerForm questionId={question.id} />
            </div>
          ) : null}

          <section className="space-y-3">
            <h2 className="flex items-baseline justify-between text-[15px] font-bold">
              모두의 답
              {showAnswers && <span className="text-xs font-medium text-muted-foreground">좋아요를 가장 많이 받은 답이 명예의 전당에 올라가요</span>}
            </h2>
            {showAnswers ? (
              <AnswerList answers={answers} user={user} myLikes={myLikes} open />
            ) : (
              <LockedAnswers count={question.answer_count} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
