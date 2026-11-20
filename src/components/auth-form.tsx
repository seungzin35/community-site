"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/app/(auth)/actions";

type Props = {
  mode: "login" | "signup";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
  notice?: string;
};

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

export function AuthForm({ mode, action, next, notice }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isSignup = mode === "signup";

  return (
    <div className="mx-auto max-w-sm rounded-lg border border-border bg-surface p-6">
      <h1 className="mb-5 text-xl font-bold">{isSignup ? "회원가입" : "로그인"}</h1>

      {state?.message ? (
        <p className="rounded-md bg-muted px-3 py-3 text-sm">{state.message}</p>
      ) : (
        <form action={formAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <label className="block space-y-1 text-sm">
            <span>이메일</span>
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>
          {isSignup && (
            <label className="block space-y-1 text-sm">
              <span>닉네임</span>
              <input name="nickname" required minLength={2} maxLength={20} className={inputClass} />
            </label>
          )}
          <label className="block space-y-1 text-sm">
            <span>비밀번호</span>
            <input
              name="password"
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className={inputClass}
            />
          </label>

          {(state?.error || notice) && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {state?.error ?? notice}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "처리 중..." : isSignup ? "가입하기" : "로그인"}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {isSignup ? (
          <>
            이미 회원이신가요?{" "}
            <Link href="/login" className="text-primary hover:underline">
              로그인
            </Link>
          </>
        ) : (
          <>
            아직 회원이 아니신가요?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              회원가입
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
