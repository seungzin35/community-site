"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/app/(auth)/actions";
import { site } from "@/lib/site";
import { Logo } from "./logo";

type Props = {
  mode: "login" | "signup";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
  notice?: string;
};

const inputClass = "field py-2.5";

export function AuthForm({ mode, action, next, notice }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isSignup = mode === "signup";

  return (
    <div className="card mx-auto mt-4 max-w-sm p-6 sm:mt-10 sm:p-8">
      <div className="mb-6 text-center">
        <Logo className="mx-auto size-11 rounded-xl" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{isSignup ? "회원가입" : "로그인"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup ? `${site.name}에 오신 걸 환영해요!` : "다시 만나서 반가워요!"}
        </p>
      </div>

      {state?.message ? (
        <p className="rounded-xl bg-primary-soft px-4 py-3 text-sm">{state.message}</p>
      ) : (
        <form action={formAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <label className="block space-y-1.5 text-sm font-medium">
            <span>이메일</span>
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>
          {isSignup && (
            <label className="block space-y-1.5 text-sm font-medium">
              <span>닉네임</span>
              <input name="nickname" required minLength={2} maxLength={20} className={inputClass} />
            </label>
          )}
          <label className="block space-y-1.5 text-sm font-medium">
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
            className="btn btn-primary w-full py-2.5"
          >
            {pending ? "처리 중..." : isSignup ? "가입하기" : "로그인"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignup ? (
          <>
            이미 회원이신가요?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              로그인
            </Link>
          </>
        ) : (
          <>
            아직 회원이 아니신가요?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              회원가입
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
