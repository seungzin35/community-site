import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./config";

/** 브라우저(클라이언트 컴포넌트)에서 쓰는 Supabase 클라이언트 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
