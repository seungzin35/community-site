import { Crown, Trash } from "lucide-react";
import { deleteAnswer, toggleAnswerLike } from "@/app/question/actions";
import { Avatar } from "@/components/avatar";
import { ConfirmButton } from "@/components/confirm-button";
import type { CurrentUser } from "@/lib/auth";
import type { Answer } from "@/lib/community";
import { formatListDate } from "@/lib/format";
import { LikeButton } from "./like-button";

type Props = {
  answers: Answer[];
  user: CurrentUser | null;
  myLikes: Set<number>;
  /** 오늘 열린 질문이면 좋아요와 내 답 지우기를 할 수 있어요. */
  open: boolean;
};

export function AnswerList({ answers, user, myLikes, open }: Props) {
  const topLikes = answers[0]?.like_count ?? 0;

  return (
    <ul className="space-y-2.5">
      {answers.map((answer) => {
        const mine = user?.id === answer.author_id;
        const best = topLikes > 0 && answer.like_count === topLikes;
        const canLike = open && !!user && !mine && !user.isBanned;
        const canDelete = (mine && open) || user?.role === "admin";
        return (
          <li
            key={answer.id}
            className={`card p-4 ${best ? "border-amber-300 bg-amber-50/60 dark:border-amber-700/60 dark:bg-amber-950/20" : ""} ${
              mine ? "ring-2 ring-primary/30" : ""
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Avatar name={answer.author?.nickname} size="sm" />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                {answer.author?.nickname ?? "탈퇴회원"}
                {mine && <span className="ml-1.5 text-xs font-bold text-primary">내 답</span>}
                {best && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Crown className="size-3.5" /> {open ? "지금 1등" : "베스트"}
                  </span>
                )}
              </p>
              <span className="text-xs text-muted-foreground">{formatListDate(answer.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{answer.content}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <form action={toggleAnswerLike}>
                <input type="hidden" name="answerId" value={answer.id} />
                <input type="hidden" name="liked" value={String(myLikes.has(answer.id))} />
                <LikeButton liked={myLikes.has(answer.id)} count={answer.like_count} disabled={!canLike} />
              </form>
              {canDelete && (
                <form action={deleteAnswer}>
                  <input type="hidden" name="answerId" value={answer.id} />
                  <ConfirmButton danger confirm="이 답을 지울까요?">
                    <Trash className="size-3" /> 삭제
                  </ConfirmButton>
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 답하기 전에 보여 주는 가려진 답들 */
export function LockedAnswers({ count }: { count: number }) {
  if (count === 0) {
    return <p className="card px-4 py-8 text-center text-sm text-muted-foreground">아직 아무도 답하지 않았어요. 첫 번째로 답해 보세요!</p>;
  }
  return (
    <div className="relative">
      <ul aria-hidden className="pointer-events-none select-none space-y-2.5 blur-[6px]">
        {Array.from({ length: Math.min(count, 3) }, (_, index) => (
          <li key={index} className="card p-4">
            <div className="flex items-center gap-2.5">
              <span className="size-7 rounded-full bg-muted" />
              <span className="h-3 w-20 rounded bg-muted" />
            </div>
            <p className="mt-3 h-3 rounded bg-muted" style={{ width: `${85 - index * 15}%` }} />
            <p className="mt-2 h-3 w-1/2 rounded bg-muted" />
          </li>
        ))}
      </ul>
      <div className="absolute inset-0 grid place-items-center">
        <p className="rounded-full bg-surface px-4 py-2 text-sm font-bold shadow-lg">
          🔒 답을 남기면 {count.toLocaleString()}명의 답이 열려요
        </p>
      </div>
    </div>
  );
}
