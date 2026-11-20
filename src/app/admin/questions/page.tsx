import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { deleteQuestion, moveQuestionFirst } from "@/app/admin/actions";
import { Badge, Empty, Section } from "@/components/admin-ui";
import { ConfirmButton } from "@/components/confirm-button";
import { QuestionForm } from "@/components/question-form";
import { formatQuestionDate, getTodayQuestion, kstToday } from "@/lib/community";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "오늘의 질문 관리" };

type Row = { id: number; content: string; open_date: string | null; answer_count: number };

export default async function AdminQuestionsPage() {
  await connection();
  // 오늘 질문이 아직 안 열렸으면 먼저 열어서 목록에 바로 보이게 합니다.
  await getTodayQuestion();
  const supabase = await createClient();
  const [{ data: queued }, { data: opened }] = await Promise.all([
    supabase
      .from("daily_questions")
      .select("id, content, open_date, answer_count")
      .is("open_date", null)
      .order("queue_order")
      .order("id")
      .limit(200),
    supabase
      .from("daily_questions")
      .select("id, content, open_date, answer_count")
      .not("open_date", "is", null)
      .order("open_date", { ascending: false })
      .limit(30),
  ]);
  const queue = (queued ?? []) as Row[];
  const past = (opened ?? []) as Row[];
  const today = kstToday();

  return (
    <div className="space-y-4">
      <Section title="질문 추가">
        <div className="space-y-2 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            줄 세운 순서대로 매일 한국 시간 밤 12시에 하나씩 열려요. 그날 아무도 방문하지 않으면 질문은 넘어가지 않고 다음 날로 미뤄져요.
          </p>
          <QuestionForm />
        </div>
      </Section>

      <Section title={`대기 중인 질문 ${queue.length}개`}>
        {queue.length < 3 && (
          <p className="border-b border-border bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {queue.length === 0
              ? "대기 중인 질문이 없어요. 내일 질문이 열리지 않으니 질문을 추가해 주세요."
              : `질문이 ${queue.length}개밖에 안 남았어요. 미리 더 추가해 두세요.`}
          </p>
        )}
        {queue.length === 0 ? (
          <Empty>대기 중인 질문이 없어요.</Empty>
        ) : (
          <ol className="divide-y divide-border">
            {queue.map((question, index) => (
              <li key={question.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 break-words">{question.content}</span>
                {index === 0 && <Badge tone="blue">다음 질문</Badge>}
                <div className="flex gap-1.5">
                  {index > 0 && (
                    <form action={moveQuestionFirst}>
                      <input type="hidden" name="id" value={question.id} />
                      <ConfirmButton>맨 앞으로</ConfirmButton>
                    </form>
                  )}
                  <form action={deleteQuestion}>
                    <input type="hidden" name="id" value={question.id} />
                    <ConfirmButton danger confirm="이 질문을 지울까요?">
                      삭제
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="열린 질문 (최근 30개)">
        {past.length === 0 ? (
          <Empty>아직 열린 질문이 없어요.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {past.map((question) => {
              const isToday = question.open_date === today;
              return (
                <li key={question.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground">{formatQuestionDate(question.open_date!)}</span>
                  <Link href={isToday ? "/question" : `/question/${question.id}`} className="min-w-0 flex-1 break-words hover:underline">
                    {question.content}
                  </Link>
                  {isToday && <Badge tone="blue">오늘</Badge>}
                  <span className="text-xs text-muted-foreground">답 {question.answer_count}</span>
                  <form action={deleteQuestion}>
                    <input type="hidden" name="id" value={question.id} />
                    <ConfirmButton danger confirm={`이 질문과 답 ${question.answer_count}개를 모두 지울까요? 되돌릴 수 없어요.`}>
                      삭제
                    </ConfirmButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
