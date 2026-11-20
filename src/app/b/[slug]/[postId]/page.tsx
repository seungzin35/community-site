import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentList } from "@/components/comment-list";
import { NotReady } from "@/components/not-ready";
import { ReportButton } from "@/components/report-button";
import { VoteButtons } from "@/components/vote-buttons";
import { getCurrentUser } from "@/lib/auth";
import { formatFullDate } from "@/lib/format";
import { getBoardBySlug, getComments, getPost, imageUrl } from "@/lib/posts";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { deletePost } from "../../actions";

// 회원 정보와 최신 글을 매번 읽어 오므로 서버에서 기다렸다가 보여 줍니다.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/b/[slug]/[postId]">): Promise<Metadata> {
  if (!isSupabaseConfigured) return {};
  const id = Number((await params).postId);
  const post = Number.isInteger(id) ? await getPost(id) : null;
  return post ? { title: post.title, description: post.content.slice(0, 120) } : {};
}

async function getMyVote(postId: number, userId: string | undefined) {
  if (!userId) return 0;
  const supabase = await createClient();
  const { data } = await supabase
    .from("post_votes")
    .select("value")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.value ?? 0;
}

export default async function PostPage({ params }: PageProps<"/b/[slug]/[postId]">) {
  if (!isSupabaseConfigured) return <NotReady />;

  const { slug, postId } = await params;
  const id = Number(postId);
  if (!Number.isInteger(id)) notFound();

  const [board, post, comments, user] = await Promise.all([
    getBoardBySlug(slug),
    getPost(id),
    getComments(id),
    getCurrentUser(),
  ]);
  if (!board || !post || post.board_id !== board.id) notFound();

  const [myVote] = await Promise.all([
    getMyVote(id, user?.id),
    createPublicClient().rpc("increment_view_count", { target_post_id: id }),
  ]);
  const canManage = user && (user.id === post.author_id || user.role === "admin");

  return (
    <div className="space-y-4">
      <Link href={`/b/${slug}`} className="text-sm font-semibold text-primary hover:underline">
        {board.name}
      </Link>

      <article className="rounded-lg border border-border bg-surface">
        <header className="border-b border-border p-4">
          <h1 className="break-words text-lg font-bold">{post.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{post.author?.nickname ?? "탈퇴회원"}</span>
            <span>{formatFullDate(post.created_at)}</span>
            <span>조회 {post.view_count + 1}</span>
            <span>댓글 {post.comment_count}</span>
            {user && user.id !== post.author_id && (
              <span className="ml-auto">
                <ReportButton postId={id} />
              </span>
            )}
          </div>
        </header>

        <div className="space-y-4 p-4">
          {post.images.map((image) => (
            <Image
              key={image.id}
              src={imageUrl(image.storage_path)}
              alt=""
              width={1200}
              height={900}
              unoptimized
              className="h-auto max-w-full rounded-md"
            />
          ))}
          {post.content && (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-7">{post.content}</p>
          )}
        </div>

        <div className="border-t border-border p-4">
          <VoteButtons
            slug={slug}
            postId={id}
            likes={post.like_count}
            dislikes={post.dislike_count}
            myVote={myVote}
          />
        </div>
      </article>

      <div className="flex justify-between text-sm">
        <Link href={`/b/${slug}`} className="rounded-md border border-border bg-surface px-3 py-1.5 hover:bg-muted">
          목록
        </Link>
        {canManage && (
          <div className="flex gap-2">
            <Link
              href={`/b/${slug}/${id}/edit`}
              className="rounded-md border border-border bg-surface px-3 py-1.5 hover:bg-muted"
            >
              수정
            </Link>
            <form action={deletePost}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="postId" value={id} />
              <button
                type="submit"
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-red-600 hover:bg-muted dark:text-red-400"
              >
                삭제
              </button>
            </form>
          </div>
        )}
      </div>

      <CommentList comments={comments} slug={slug} postId={id} user={user} />
    </div>
  );
}
