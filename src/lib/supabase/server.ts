import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./config";

/** 서버 컴포넌트, 서버 액션, 라우트 핸들러에서 쓰는 Supabase 클라이언트 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없습니다. 세션 갱신은 proxy.ts 가 처리합니다.
        }
      },
    },
  });
}
