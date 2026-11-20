"use client";

import { Flag } from "lucide-react";
import { useActionState } from "react";
import { reportContent } from "@/app/b/actions";

type Props = { postId?: number; commentId?: number };

/** 신고하기: 누르면 이유를 적는 칸이 펼쳐집니다. */
export function ReportButton({ postId, commentId }: Props) {
  const [state, action, pending] = useActionState(reportContent, undefined);

  if (state?.message) {
    return <span className="text-xs text-muted-foreground">{state.message}</span>;
  }

  return (
    <details className="group relative text-xs text-muted-foreground">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted hover:text-red-600 dark:hover:text-red-400">
        <Flag className="size-3" /> 신고
      </summary>
      <form
        action={action}
        className="card absolute right-0 z-20 mt-1 w-64 space-y-2 p-3 shadow-xl"
      >
        {postId && <input type="hidden" name="postId" value={postId} />}
        {commentId && <input type="hidden" name="commentId" value={commentId} />}
        <textarea
          name="reason"
          required
          maxLength={500}
          rows={3}
          placeholder="신고 이유를 적어 주세요."
          aria-label="신고 이유"
          className="field text-foreground"
        />
        {state?.error && (
          <p role="alert" className="text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="btn w-full bg-red-600 text-white hover:bg-red-700"
        >
          {pending ? "보내는 중..." : "신고하기"}
        </button>
      </form>
    </details>
  );
}
