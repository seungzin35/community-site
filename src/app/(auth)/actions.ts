"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | undefined;

const NOT_READY = "아직 회원 기능이 준비되지 않았어요.";

/** 로그인 뒤 돌아갈 주소. 사이트 안쪽 경로만 허용합니다. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_READY };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "이메일과 비밀번호를 입력해 주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "이메일 인증이 아직 끝나지 않았어요. 받은 메일의 링크를 눌러 주세요." };
    }
    return { error: "이메일 또는 비밀번호가 맞지 않아요." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_READY };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();

  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "이메일 주소를 확인해 주세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상으로 해주세요." };
  if (nickname.length < 2 || nickname.length > 20) {
    return { error: "닉네임은 2자 이상 20자 이하로 해주세요." };
  }

  const supabase = await createClient();
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", nickname)
    .maybeSingle();
  if (taken) return { error: "이미 쓰고 있는 닉네임이에요." };

  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "이미 가입된 이메일이에요." };
    if (error.code === "weak_password") return { error: "더 안전한 비밀번호를 사용해 주세요." };
    console.error("회원가입 실패:", error.message);
    return { error: "가입하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  // 이메일 인증을 켜 둔 경우 세션이 바로 생기지 않습니다.
  if (!data.session) {
    return { message: "인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 끝나요." };
  }
  redirect("/");
}

export async function logout() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
