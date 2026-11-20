"use client";

import { useActionState } from "react";
import { votePost } from "@/app/b/actions";

type Props = { slug: string; postId: number; likes: number; dislikes: number; myVote: number };

export function VoteButtons({ slug, postId, likes, dislikes, myVote }: Props) {
  const [state, action, pending] = useActionState(votePost, undefined);
  const base = "rounded-md border px-5 py-2 text-sm font-medium disabled:opacity-60";

  return (
    <form action={action} className="flex flex-col items-center gap-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="postId" value={postId} />
      <div className="flex gap-2">
        <button
          name="value"
          value="1"
          disabled={pending}
          aria-pressed={myVote === 1}
          className={`${base} ${myVote === 1 ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}
        >
          👍 추천 {likes}
        </button>
        <button
          name="value"
          value="-1"
          disabled={pending}
          aria-pressed={myVote === -1}
          className={`${base} ${myVote === -1 ? "border-foreground bg-muted" : "border-border hover:border-foreground"}`}
        >
          👎 비추천 {dislikes}
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
