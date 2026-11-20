import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./config";

/**
 * 로그인 정보 없이 공개 데이터만 읽는 Supabase 클라이언트.
 * 쿠키를 쓰지 않아서 "use cache" 안에서 사용할 수 있습니다. (게시판 목록 등)
 */
export function createPublicClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
