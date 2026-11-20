"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useActionState } from "react";
import { votePost } from "@/app/b/actions";

type Props = { slug: string; postId: number; likes: number; dislikes: number; myVote: number };

export function VoteButtons({ slug, postId, likes, dislikes, myVote }: Props) {
  const [state, action, pending] = useActionState(votePost, undefined);
  const base =
    "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold tabular-nums transition-colors disabled:opacity-60";

  return (
    <form action={action} className="flex flex-col items-center gap-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="postId" value={postId} />
      <div className="flex gap-3" data-tour="vote">
        <button
          name="value"
          value="1"
          disabled={pending}
          aria-pressed={myVote === 1}
          className={`${base} ${
            myVote === 1
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-primary hover:border-primary hover:bg-primary-soft"
          }`}
        >
          <ThumbsUp className="size-4" /> 추천 {likes}
        </button>
        <button
          name="value"
          value="-1"
          disabled={pending}
          aria-pressed={myVote === -1}
          className={`${base} ${
            myVote === -1
              ? "border-foreground/40 bg-muted text-foreground"
              : "border-border bg-surface text-muted-foreground hover:border-foreground/30 hover:bg-muted"
          }`}
        >
          <ThumbsDown className="size-4" /> 비추천 {dislikes}
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
