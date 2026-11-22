import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "./supabase/config";
import { createPublicClient } from "./supabase/public";

export type Board = {
  id: number;
  slug: string;
  name: string;
  description: string;
  type: "normal" | "gallery";
  /** 익명 게시판이면 글쓴이가 '익명'으로 보여요. */
  is_anonymous?: boolean;
};

/** Supabase 연결 전에 화면 틀을 확인하기 위한 예시 게시판 */
const sampleBoards: Board[] = [
  { id: 1, slug: "free", name: "자유게시판", description: "자유롭게 이야기를 나누는 곳", type: "normal" },
  { id: 2, slug: "humor", name: "유머게시판", description: "재미있는 글과 짤", type: "normal" },
  { id: 3, slug: "gallery", name: "사진갤러리", description: "사진을 올리고 구경하는 곳", type: "gallery" },
];

/** 게시판 목록. 캐시되며, 관리자가 게시판을 바꾸면 revalidateTag("boards") 로 갱신합니다. */
export async function getBoards(): Promise<Board[]> {
  "use cache";
  cacheTag("boards");
  cacheLife("hours");

  if (!isSupabaseConfigured) return sampleBoards;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("boards")
    .select("id, slug, name, description, type, is_anonymous")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("게시판 목록을 불러오지 못했습니다:", error.message);
    return [];
  }
  return data as Board[];
}
