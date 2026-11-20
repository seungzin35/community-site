"use client";

import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  /** 누르기 전에 물어볼 문장. 없으면 바로 실행합니다. */
  confirm?: string;
  danger?: boolean;
  className?: string;
};

/** 폼 안에 넣는 작은 버튼. 위험한 작업은 한 번 더 확인합니다. */
export function ConfirmButton({ children, confirm, danger, className = "" }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className={`rounded-md border border-border bg-surface px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-60 ${
        danger ? "text-red-600 dark:text-red-400" : ""
      } ${className}`}
    >
      {pending ? "처리 중..." : children}
    </button>
  );
}
