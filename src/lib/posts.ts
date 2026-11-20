import { supabaseUrl } from "./supabase/config";
import { createPublicClient } from "./supabase/public";
import type { Board } from "./boards";

export const PAGE_SIZE = 20;
export const IMAGE_BUCKET = "post-images";
export const MAX_IMAGES = 10;

export type PostListItem = {
  id: number;
  title: string;
  thumbnail_path: string | null;
  is_notice: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  author: { nickname: string } | null;
};

export type PostDetail = PostListItem & {
  board_id: number;
  author_id: string;
  content: string;
  dislike_count: number;
  images: { id: number; storage_path: string }[];
};

export type Comment = {
  id: number;
  author_id: string;
  parent_id: number | null;
  content: string;
  created_at: string;
  author: { nickname: string } | null;
};

const LIST_COLUMNS =
  "id, title, thumbnail_path, is_notice, view_count, like_count, comment_count, created_at, author:profiles!posts_author_id_fkey(nickname)";

export function imageUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}

export async function getBoardBySlug(slug: string): Promise<Board | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("boards")
    .select("id, slug, name, description, type")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as Board | null) ?? null;
}

export async function getPosts(boardId: number, page: number, query: string) {
  const supabase = createPublicClient();
  const from = (page - 1) * PAGE_SIZE;

  let request = supabase
    .from("posts")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("board_id", boardId)
    .eq("is_notice", false)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (query) {
    // ilike 패턴에서 특별한 뜻을 가진 문자는 지웁니다.
    request = request.ilike("title", `%${query.replace(/[%_\\]/g, "")}%`);
  }

  const [{ data, count, error }, notices] = await Promise.all([
    request,
    page === 1 && !query
      ? supabase
          .from("posts")
          .select(LIST_COLUMNS)
          .eq("board_id", boardId)
          .eq("is_notice", true)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);
  if (error) console.error("글 목록을 불러오지 못했습니다:", error.message);

  return {
    posts: (data ?? []) as unknown as PostListItem[],
    notices: (notices.data ?? []) as unknown as PostListItem[],
    total: count ?? 0,
  };
}

/** 인기글: 최근 7일 동안 추천을 많이 받은 글 */
export async function getPopularPosts(limit = 10) {
  const supabase = createPublicClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("posts")
    .select(`${LIST_COLUMNS}, board:boards!inner(slug, name, is_active)`)
    .eq("board.is_active", true)
    .gte("created_at", since)
    .gt("like_count", 0)
    .order("like_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as (PostListItem & { board: { slug: string; name: string } })[];
}

/** 최신글: 전체 게시판 */
export async function getRecentPosts(limit = 10) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("posts")
    .select(`${LIST_COLUMNS}, board:boards!inner(slug, name, is_active)`)
    .eq("board.is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as (PostListItem & { board: { slug: string; name: string } })[];
}

export async function getPost(postId: number): Promise<PostDetail | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("posts")
    .select(
      `${LIST_COLUMNS}, board_id, author_id, content, dislike_count, images:post_images(id, storage_path, sort_order)`,
    )
    .eq("id", postId)
    .order("sort_order", { referencedTable: "post_images" })
    .maybeSingle();
  return (data as unknown as PostDetail | null) ?? null;
}

export async function getComments(postId: number): Promise<Comment[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("comments")
    .select("id, author_id, parent_id, content, created_at, author:profiles!comments_author_id_fkey(nickname)")
    .eq("post_id", postId)
    .order("created_at");
  return (data ?? []) as unknown as Comment[];
}
