"use client";

import { useActionState, useEffect, useRef } from "react";
import { addComment } from "@/app/b/actions";

type Props = { slug: string; postId: number; parentId?: number; placeholder?: string };

export function CommentForm({ slug, postId, parentId, placeholder = "댓글을 남겨보세요." }: Props) {
  const [state, action, pending] = useActionState(addComment, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  // 등록에 성공하면 입력칸을 비웁니다.
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) formRef.current?.reset();
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea
        name="content"
        required
        rows={parentId ? 2 : 3}
        maxLength={2000}
        placeholder={placeholder}
        aria-label="댓글"
        className="field resize-y"
      />
      <div className="flex items-center justify-end gap-3">
        {state?.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary"
        >
          {pending ? "등록 중..." : "등록"}
        </button>
      </div>
    </form>
  );
}
