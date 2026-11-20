import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { login } from "../actions";

export const metadata: Metadata = { title: "로그인" };

async function LoginForm({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next, error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      action={login}
      next={typeof next === "string" ? next : undefined}
      notice={error === "auth" ? "인증 링크가 만료됐어요. 다시 로그인해 주세요." : undefined}
    />
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense>
      <LoginForm searchParams={searchParams} />
    </Suspense>
  );
}
