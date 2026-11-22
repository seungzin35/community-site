import type { Metadata } from "next";
import { ChevronLeft, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnswerList } from "@/components/community/answer-list";
import { NotReady } from "@/components/not-ready";
import { getCurrentUser } from "@/lib/auth";
import { formatQuestionDate, getAnswers, getQuestion, kstToday } from "@/lib/community";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// 로그인 정보를 읽으므로 서버에서 기다렸다가 보여 줍니다.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/question/[id]">): Promise<Metadata> {
  if (!isSupabaseConfigured) return {};
  const id = Number((await params).id);
  const question = Number.isInteger(id) ? await getQuestion(id) : null;
  return question ? { title: question.content } : {};
}

/** 마감된 지난 질문과 모든 답 */
export default async function PastQuestionPage({ params }: PageProps<"/question/[id]">) {
  if (!isSupabaseConfigured) return <NotReady />;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const question = await getQuestion(id);
  if (!question) notFound();
  if (question.open_date >= kstToday()) redirect("/question");

  const [answers, user] = await Promise.all([getAnswers(id), getCurrentUser()]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/question/hall" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ChevronLeft className="size-4" /> 명예의 전당
      </Link>
      <header className="card p-5">
        <p className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold">{formatQuestionDate(question.open_date)}의 질문 · 마감</span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" /> {question.answer_count}명 답함
          </span>
        </p>
        <h1 className="mt-2 break-words text-xl font-extrabold leading-snug tracking-tight">Q. {question.content}</h1>
      </header>
      {answers.length ? (
        <AnswerList answers={answers} user={user} myLikes={new Set()} open={false} />
      ) : (
        <p className="card px-4 py-10 text-center text-sm text-muted-foreground">이 질문에는 답이 없었어요.</p>
      )}
    </div>
  );
}
