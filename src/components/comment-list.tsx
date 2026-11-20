import Link from "next/link";
import { deleteComment } from "@/app/b/actions";
import type { CurrentUser } from "@/lib/auth";
import { formatFullDate } from "@/lib/format";
import type { Comment } from "@/lib/posts";
import { CommentForm } from "./comment-form";
import { ReportButton } from "./report-button";

type Props = { comments: Comment[]; slug: string; postId: number; user: CurrentUser | null };

export function CommentList({ comments, slug, postId, user }: Props) {
  const roots = comments.filter((comment) => !comment.parent_id);
  const repliesOf = (id: number) => comments.filter((comment) => comment.parent_id === id);
  const canWrite = user && !user.isBanned;

  const item = (comment: Comment, isReply: boolean) => (
    <div className={isReply ? "ml-6 border-l-2 border-border pl-3" : ""}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-sm font-medium text-foreground">
          {comment.author?.nickname ?? "탈퇴회원"}
        </span>
        <span>{formatFullDate(comment.created_at)}</span>
        {user && user.id !== comment.author_id && (
          <span className="ml-auto">
            <ReportButton commentId={comment.id} />
          </span>
        )}
        {user && (user.id === comment.author_id || user.role === "admin") && (
          <form action={deleteComment} className={user.id === comment.author_id ? "ml-auto" : ""}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="commentId" value={comment.id} />
            <button type="submit" className="hover:text-foreground">
              삭제
            </button>
          </form>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.content}</p>
    </div>
  );

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-bold">댓글 {comments.length}</h2>

      <ul className="space-y-4">
        {roots.map((comment) => (
          <li key={comment.id} className="space-y-3">
            {item(comment, false)}
            {repliesOf(comment.id).map((reply) => (
              <div key={reply.id}>{item(reply, true)}</div>
            ))}
            {canWrite && (
              <details className="ml-6 text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">답글 쓰기</summary>
                <div className="mt-2">
                  <CommentForm
                    slug={slug}
                    postId={postId}
                    parentId={comment.id}
                    placeholder="답글을 남겨보세요."
                  />
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>

      <div className={comments.length ? "mt-5 border-t border-border pt-4" : ""}>
        {canWrite ? (
          <CommentForm slug={slug} postId={postId} />
        ) : user ? (
          <p className="text-sm text-muted-foreground">활동이 정지된 계정이라 댓글을 쓸 수 없어요.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            댓글을 쓰려면{" "}
            <Link
              href={`/login?next=${encodeURIComponent(`/b/${slug}/${postId}`)}`}
              className="text-primary hover:underline"
            >
              로그인
            </Link>
            해 주세요.
          </p>
        )}
      </div>
    </section>
  );
}
