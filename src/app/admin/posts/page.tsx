import type { Metadata } from "next";
import Link from "next/link";
import { adminDeletePost, setPostNotice } from "@/app/admin/actions";
import { Badge, Empty, SearchBox, Section } from "@/components/admin-ui";
import { ConfirmButton } from "@/components/confirm-button";
import { Pagination } from "@/components/pagination";
import {
  ADMIN_PAGE_SIZE,
  adminAuthorName,
  likePattern,
  POST_OWNER,
  readPage,
  readQuery,
} from "@/lib/admin";
import { formatFullDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "게시글 관리" };

type Row = {
  id: number;
  title: string;
  is_notice: boolean;
  comment_count: number;
  like_count: number;
  created_at: string;
  board: { slug: string; name: string } | null;
  author: { nickname: string } | null;
  owner: { user: { nickname: string } | null } | null;
};

export default async function AdminPostsPage({ searchParams }: PageProps<"/admin/posts">) {
  const search = await searchParams;
  const page = readPage(search.page);
  const query = readQuery(search.q);

  const supabase = await createClient();
  let request = supabase
    .from("posts")
    .select(
      `id, title, is_notice, comment_count, like_count, created_at, board:boards(slug, name), author:profiles!posts_author_id_fkey(nickname), ${POST_OWNER}`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  if (query) request = request.ilike("title", likePattern(query));
  const { data, count } = await request;
  const posts = (data ?? []) as unknown as Row[];

  return (
    <Section
      title={`게시글 ${(count ?? 0).toLocaleString()}개`}
      action={<SearchBox basePath="/admin/posts" query={query} placeholder="제목 검색" />}
    >
      {posts.length === 0 ? (
        <Empty>글이 없어요.</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {post.is_notice && <Badge tone="blue">공지</Badge>}
                  <Link
                    href={`/b/${post.board?.slug}/${post.id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {post.title}
                  </Link>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {post.board?.name} · {adminAuthorName(post.author, post.owner)} · {formatFullDate(post.created_at)} ·
                  추천 {post.like_count} · 댓글 {post.comment_count}
                </p>
              </div>
              <div className="flex gap-1.5">
                <form action={setPostNotice}>
                  <input type="hidden" name="id" value={post.id} />
                  <input type="hidden" name="notice" value={String(!post.is_notice)} />
                  <ConfirmButton>{post.is_notice ? "공지 해제" : "공지로"}</ConfirmButton>
                </form>
                <form action={adminDeletePost}>
                  <input type="hidden" name="id" value={post.id} />
                  <ConfirmButton danger confirm={`"${post.title}" 글을 지울까요? 댓글과 사진도 함께 지워져요.`}>
                    삭제
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="py-3">
        <Pagination
          basePath="/admin/posts"
          page={page}
          totalPages={Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE)}
          query={query}
        />
      </div>
    </Section>
  );
}
