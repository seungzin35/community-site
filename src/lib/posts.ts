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
  /** 익명 게시판 글이면 true (author 는 비어 있어요) */
  is_anonymous: boolean;
  author: { nickname: string } | null;
};

export type PostDetail = PostListItem & {
  board_id: number;
  author_id: string | null;
  content: string;
  dislike_count: number;
  images: { id: number; storage_path: string }[];
};

export type Comment = {
  id: number;
  author_id: string | null;
  parent_id: number | null;
  /** 익명 댓글 번호: null 이면 닉네임, 0 은 글쓴이, 1 이상은 익명1, 익명2 ... */
  anon_label: number | null;
  content: string;
  created_at: string;
  author: { nickname: string } | null;
};

const LIST_COLUMNS =
  "id, title, thumbnail_path, is_notice, is_anonymous, view_count, like_count, comment_count, created_at, author:profiles!posts_author_id_fkey(nickname)";

/** 글쓴이 이름: 익명 글은 '익명', 탈퇴한 회원은 '탈퇴회원' */
export function authorName(post: { is_anonymous?: boolean; author: { nickname: string } | null }) {
  if (post.is_anonymous) return "익명";
  return post.author?.nickname ?? "탈퇴회원";
}

/** 댓글 쓴이 이름 */
export function commenterName(comment: Pick<Comment, "anon_label" | "author">) {
  if (comment.anon_label === 0) return "글쓴이";
  if (comment.anon_label) return `익명${comment.anon_label}`;
  return comment.author?.nickname ?? "탈퇴회원";
}

export function imageUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}

export async function getBoardBySlug(slug: string): Promise<Board | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("boards")
    .select("id, slug, name, description, type, is_anonymous")
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
    .select(
      "id, author_id, parent_id, anon_label, content, created_at, author:profiles!comments_author_id_fkey(nickname)",
    )
    .eq("post_id", postId)
    .order("created_at");
  return (data ?? []) as unknown as Comment[];
}

/**
 * 익명 글/댓글 중 내가 쓴 것 (본인만 읽을 수 있는 표에서 확인).
 * 로그인한 회원의 권한으로 읽어야 하므로 화면마다 새로 불러옵니다.
 */
export async function getMyAnonymous(
  supabase: Awaited<ReturnType<typeof import("./supabase/server").createClient>>,
  userId: string | undefined,
  postId: number,
  commentIds: number[],
) {
  const mine = { post: false, comments: new Set<number>() };
  if (!userId) return mine;
  const filters = [`post_id.eq.${postId}`];
  if (commentIds.length) filters.push(`comment_id.in.(${commentIds.join(",")})`);
  const { data } = await supabase
    .from("anonymous_owners")
    .select("post_id, comment_id")
    .eq("user_id", userId)
    .or(filters.join(","));
  for (const row of data ?? []) {
    if (row.post_id === postId) mine.post = true;
    if (row.comment_id) mine.comments.add(row.comment_id);
  }
  return mine;
}
