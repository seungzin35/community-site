import { CornerDownRight } from "lucide-react";
import Link from "next/link";
import { Avatar } from "./avatar";
import { deleteComment } from "@/app/b/actions";
import type { CurrentUser } from "@/lib/auth";
import { formatFullDate } from "@/lib/format";
import { type Comment, commenterName } from "@/lib/posts";
import { CommentForm } from "./comment-form";
import { ReportButton } from "./report-button";

type Props = {
  comments: Comment[];
  slug: string;
  postId: number;
  user: CurrentUser | null;
  /** 익명 댓글 중 내가 쓴 것 */
  myAnonymous?: Set<number>;
  /** 익명 글이면 댓글도 익명으로 남아요. */
  anonymous?: boolean;
};

export function CommentList({ comments, slug, postId, user, myAnonymous = new Set(), anonymous = false }: Props) {
  const roots = comments.filter((comment) => !comment.parent_id);
  const repliesOf = (id: number) => comments.filter((comment) => comment.parent_id === id);
  const canWrite = user && !user.isBanned;

  const isMine = (comment: Comment) =>
    Boolean(user && (user.id === comment.author_id || myAnonymous.has(comment.id)));

  const item = (comment: Comment, isReply: boolean) => (
    <div className={`flex gap-3 ${isReply ? "ml-6 rounded-xl bg-muted/60 p-3 sm:ml-12" : ""}`}>
      {isReply && <CornerDownRight className="mt-1 size-4 shrink-0 text-muted-foreground" />}
      <Avatar name={comment.author?.nickname} size="sm" anonymous={comment.anon_label !== null} />
      <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={`text-sm font-semibold ${comment.anon_label === 0 ? "text-primary" : "text-foreground"}`}
        >
          {commenterName(comment)}
        </span>
        {comment.anon_label !== null && isMine(comment) && (
          <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-primary">나</span>
        )}
        <span>{formatFullDate(comment.created_at)}</span>
        {user && !isMine(comment) && (
          <span className="ml-auto">
            <ReportButton commentId={comment.id} />
          </span>
        )}
        {user && (isMine(comment) || user.role === "admin") && (
          <form action={deleteComment} className={isMine(comment) ? "ml-auto" : ""}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="commentId" value={comment.id} />
            <button type="submit" className="hover:text-red-600 dark:hover:text-red-400">
              삭제
            </button>
          </form>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{comment.content}</p>
      </div>
    </div>
  );

  return (
    <section className="card p-5 sm:p-6" data-tour="comments">
      <h2 className="mb-4 flex items-center gap-1.5 text-base font-bold">
        댓글 <span className="text-primary">{comments.length}</span>
      </h2>

      <ul className="space-y-5">
        {roots.map((comment) => (
          <li key={comment.id} className="space-y-3">
            {item(comment, false)}
            {repliesOf(comment.id).map((reply) => (
              <div key={reply.id}>{item(reply, true)}</div>
            ))}
            {canWrite && (
              <details className="ml-10 text-xs text-muted-foreground">
                <summary className="w-fit cursor-pointer list-none font-medium hover:text-primary">답글 쓰기</summary>
                <div className="mt-2">
                  <CommentForm
                    slug={slug}
                    postId={postId}
                    parentId={comment.id}
                    placeholder={anonymous ? "답글은 익명으로 남아요." : "답글을 남겨보세요."}
                  />
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>

      <div className={comments.length ? "mt-6 border-t border-border pt-5" : ""}>
        {canWrite ? (
          <CommentForm
            slug={slug}
            postId={postId}
            placeholder={anonymous ? "따뜻한 한마디를 남겨 주세요. 댓글은 익명으로 남아요." : undefined}
          />
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
