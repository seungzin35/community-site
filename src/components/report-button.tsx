"use client";

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
      <summary className="cursor-pointer list-none hover:text-foreground">신고</summary>
      <form
        action={action}
        className="absolute right-0 z-10 mt-1 w-64 space-y-2 rounded-md border border-border bg-surface p-3 shadow-lg"
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
          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
        />
        {state?.error && (
          <p role="alert" className="text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "보내는 중..." : "신고하기"}
        </button>
      </form>
    </details>
  );
}
