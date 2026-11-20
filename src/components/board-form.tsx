"use client";

import { useActionState } from "react";
import { saveBoard } from "@/app/admin/actions";

export type BoardRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  type: "normal" | "gallery";
  sort_order: number;
  is_active: boolean;
};

const input = "field py-1.5";

/** 게시판 추가(board 없음) 또는 수정(board 있음) */
export function BoardForm({ board, nextOrder = 0 }: { board?: BoardRow; nextOrder?: number }) {
  const [state, action, pending] = useActionState(saveBoard, undefined);

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto_auto_auto_auto] sm:items-end">
      {board && <input type="hidden" name="id" value={board.id} />}
      <label className="space-y-1 text-xs text-muted-foreground">
        <span>이름</span>
        <input name="name" required maxLength={30} defaultValue={board?.name} placeholder="예: 질문게시판" className={input} />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        <span>주소 (/b/주소)</span>
        <input
          name="slug"
          required
          pattern="[a-z0-9\-]{2,30}"
          title="영어 소문자, 숫자, - 로 2~30자"
          defaultValue={board?.slug}
          placeholder="예: qna"
          className={input}
        />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        <span>설명</span>
        <input name="description" maxLength={200} defaultValue={board?.description} className={input} />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        <span>종류</span>
        <select name="type" defaultValue={board?.type ?? "normal"} className={input}>
          <option value="normal">일반</option>
          <option value="gallery">갤러리</option>
        </select>
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        <span>순서</span>
        <input
          name="sort_order"
          type="number"
          defaultValue={board?.sort_order ?? nextOrder}
          className={`${input} sm:w-16`}
        />
      </label>
      <label className="flex items-center gap-1.5 pb-2 text-xs">
        <input name="is_active" type="checkbox" defaultChecked={board?.is_active ?? true} />
        <span>보이기</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary py-1.5"
      >
        {pending ? "저장 중..." : board ? "저장" : "추가"}
      </button>
      {(state?.error || state?.message) && (
        <p
          role={state.error ? "alert" : "status"}
          className={`text-xs sm:col-span-7 ${state.error ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
        >
          {state.error ?? state.message}
        </p>
      )}
    </form>
  );
}
