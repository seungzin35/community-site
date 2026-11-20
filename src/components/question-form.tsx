"use client";

import { useActionState, useEffect, useRef } from "react";
import { addQuestions } from "@/app/admin/actions";

/** 관리자: 오늘의 질문 줄 세우기 (한 줄에 하나) */
export function QuestionForm() {
  const [state, action, pending] = useActionState(addQuestions, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <textarea
        name="questions"
        required
        rows={4}
        placeholder={"한 줄에 질문 하나씩 적어 주세요.\n예) 요즘 가장 자주 듣는 노래는?"}
        aria-label="추가할 질문"
        className="field resize-y"
      />
      <div className="flex flex-wrap items-center justify-end gap-3">
        {state?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        {state?.message && <p className="text-sm text-primary">{state.message}</p>}
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "추가 중..." : "줄 세우기"}
        </button>
      </div>
    </form>
  );
}
