import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export type CurrentUser = {
  id: string;
  nickname: string;
  role: "user" | "admin";
  isBanned: boolean;
};

/** 현재 로그인한 회원. 로그인하지 않았으면 null */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, role, is_banned")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    id: user.id,
    nickname: profile.nickname,
    role: profile.role,
    isBanned: profile.is_banned,
  };
}
