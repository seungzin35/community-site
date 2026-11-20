import { ChevronRight, Clock, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { MASCOT_NAME } from "@/components/guide/mascot";
import type { Question } from "@/lib/community";
import { Countdown } from "./countdown";
import { MascotFigure } from "./mascot-figure";

/** 홈: 뭉치가 내는 오늘의 질문 */
export function QuestionCard({ question, level }: { question: Question | null; level: number }) {
  return (
    <section className="card flex flex-col p-5" data-tour="question">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold">오늘의 질문</h2>
        <Link href="/question/hall" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
          <Trophy className="size-3.5" /> 명예의 전당
        </Link>
      </div>

      <div className="mt-3 flex flex-1 items-start gap-3">
        <MascotFigure level={level} className="size-12 shrink-0" />
        <div className="relative min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-primary-soft px-4 py-3">
          <p className="text-[11px] font-bold text-primary">{MASCOT_NAME}가 물어봐요</p>
          <p className="mt-1 break-words text-[15px] font-bold leading-snug">
            {question ? question.content : "오늘의 질문을 준비하고 있어요. 조금만 기다려 주세요!"}
          </p>
        </div>
      </div>

      {question && (
        <>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" /> {question.answer_count.toLocaleString()}명이 답했어요
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> <Countdown />
            </span>
          </p>
          <Link href="/question" className="btn btn-primary mt-4 w-full">
            답하고 다른 사람 답 보기 <ChevronRight className="size-4" />
          </Link>
        </>
      )}
    </section>
  );
}
