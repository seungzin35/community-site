import type { Metadata } from "next";
import Link from "next/link";
import { adminDeleteComment } from "@/app/admin/actions";
import { Empty, SearchBox, Section } from "@/components/admin-ui";
import { ConfirmButton } from "@/components/confirm-button";
import { Pagination } from "@/components/pagination";
import {
  ADMIN_PAGE_SIZE,
  adminAuthorName,
  COMMENT_OWNER,
  likePattern,
  readPage,
  readQuery,
} from "@/lib/admin";
import { formatFullDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "댓글 관리" };

type Row = {
  id: number;
  content: string;
  created_at: string;
  author: { nickname: string } | null;
  owner: { user: { nickname: string } | null } | null;
  post: { id: number; title: string; board: { slug: string } | null } | null;
};

export default async function AdminCommentsPage({ searchParams }: PageProps<"/admin/comments">) {
  const search = await searchParams;
  const page = readPage(search.page);
  const query = readQuery(search.q);

  const supabase = await createClient();
  let request = supabase
    .from("comments")
    .select(
      `id, content, created_at, author:profiles!comments_author_id_fkey(nickname), ${COMMENT_OWNER}, post:posts(id, title, board:boards(slug))`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  if (query) request = request.ilike("content", likePattern(query));
  const { data, count } = await request;
  const comments = (data ?? []) as unknown as Row[];

  return (
    <Section
      title={`댓글 ${(count ?? 0).toLocaleString()}개`}
      action={<SearchBox basePath="/admin/comments" query={query} placeholder="내용 검색" />}
    >
      {comments.length === 0 ? (
        <Empty>댓글이 없어요.</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {comments.map((comment) => (
            <li key={comment.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 whitespace-pre-wrap break-words">{comment.content}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {adminAuthorName(comment.author, comment.owner)} · {formatFullDate(comment.created_at)} ·{" "}
                  {comment.post && (
                    <Link
                      href={`/b/${comment.post.board?.slug}/${comment.post.id}`}
                      className="hover:underline"
                    >
                      {comment.post.title}
                    </Link>
                  )}
                </p>
              </div>
              <form action={adminDeleteComment}>
                <input type="hidden" name="id" value={comment.id} />
                <ConfirmButton danger confirm="이 댓글을 지울까요? 달린 답글도 함께 지워져요.">
                  삭제
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      <div className="py-3">
        <Pagination
          basePath="/admin/comments"
          page={page}
          totalPages={Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE)}
          query={query}
        />
      </div>
    </Section>
  );
}
