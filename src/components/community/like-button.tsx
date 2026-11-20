"use client";

import { Heart } from "lucide-react";
import { useFormStatus } from "react-dom";

/** 좋아요 버튼 (폼 안에서 씀) */
export function LikeButton({ liked, count, disabled }: { liked: boolean; count: number; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-pressed={liked}
      aria-label={liked ? "좋아요 취소" : "좋아요"}
      className={`inline-flex min-w-14 items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums transition-colors disabled:cursor-default ${
        liked
          ? "border-hot bg-hot-soft text-hot"
          : "border-border bg-surface text-muted-foreground enabled:hover:border-hot enabled:hover:text-hot"
      } ${pending ? "opacity-60" : ""}`}
    >
      <Heart className={`size-3.5 ${liked ? "fill-current" : ""}`} /> {count}
    </button>
  );
}
