import { cache } from "react";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export type CurrentUser = {
  id: string;
  nickname: string;
  role: "user" | "admin";
  isBanned: boolean;
};

/**
 * 현재 로그인한 회원. 로그인하지 않았으면 null
 * 한 번의 요청 안에서는 결과를 재사용합니다. (헤더와 본문이 각각 불러도 DB는 한 번만 조회)
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  // 토큰 서명을 서버 안에서 확인합니다. (Supabase 인증 서버에 매번 묻지 않아 빠름)
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, role, is_banned")
    .eq("id", userId)
    .single();
  if (!profile) return null;

  return {
    id: userId,
    nickname: profile.nickname,
    role: profile.role,
    isBanned: profile.is_banned,
  };
});
