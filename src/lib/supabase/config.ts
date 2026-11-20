export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Supabase 환경 변수가 설정되어 있는지 여부. 설정 전에도 사이트가 열리도록 확인용으로 사용합니다. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
