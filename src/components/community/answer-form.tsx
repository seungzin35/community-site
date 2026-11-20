"use client";

import { Send } from "lucide-react";
import { useActionState, useState } from "react";
import { submitAnswer } from "@/app/question/actions";

export function AnswerForm({ questionId }: { questionId: number }) {
  const [state, action, pending] = useActionState(submitAnswer, undefined);
  const [length, setLength] = useState(0);

  return (
    <form action={action} className="space-y-2" data-tour="answer">
      <input type="hidden" name="questionId" value={questionId} />
      <textarea
        name="content"
        required
        rows={3}
        maxLength={300}
        placeholder="나의 답을 남겨 주세요. 답을 남기면 다른 사람들의 답이 보여요!"
        aria-label="나의 답"
        onChange={(event) => setLength(event.target.value.length)}
        className="field resize-none text-[15px]"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">{length} / 300</span>
        {state?.error && (
          <p role="alert" className="ml-auto text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">
          <Send className="size-4" /> {pending ? "등록 중..." : "답하기"}
        </button>
      </div>
    </form>
  );
}
