import Image from "next/image";
import Link from "next/link";
import { formatListDate } from "@/lib/format";
import { imageUrl, type PostListItem } from "@/lib/posts";

type Item = PostListItem & { board?: { slug: string; name: string } };

/** 뽐뿌·디시처럼 한 줄에 한 글씩 보여주는 목록 */
export function PostTable({ posts, slug, notices = [] }: { posts: Item[]; slug?: string; notices?: Item[] }) {
  if (posts.length + notices.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
        아직 글이 없어요.
      </p>
    );
  }

  const row = (post: Item, isNotice: boolean) => {
    const href = `/b/${post.board?.slug ?? slug}/${post.id}`;
    return (
      <li
        key={`${isNotice ? "n" : "p"}${post.id}`}
        className={`flex items-center gap-3 px-3 py-2 text-sm ${isNotice ? "bg-muted" : ""}`}
      >
        <span className="hidden w-12 shrink-0 text-center text-xs text-muted-foreground sm:block">
          {isNotice ? <b className="text-primary">공지</b> : post.id}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={href} className="flex items-center gap-1.5 hover:text-primary">
            {post.board && (
              <span className="shrink-0 text-xs text-muted-foreground">[{post.board.name}]</span>
            )}
            <span className={`truncate ${isNotice ? "font-semibold" : ""}`}>{post.title}</span>
            {post.thumbnail_path && (
              <span className="shrink-0 text-xs text-muted-foreground" aria-label="사진 있음">
                🖼
              </span>
            )}
            {post.comment_count > 0 && (
              <span className="shrink-0 text-xs font-semibold text-primary">[{post.comment_count}]</span>
            )}
          </Link>
          <div className="mt-0.5 flex gap-2 text-xs text-muted-foreground sm:hidden">
            <span>{post.author?.nickname ?? "탈퇴회원"}</span>
            <span>{formatListDate(post.created_at)}</span>
            <span>조회 {post.view_count}</span>
            <span>추천 {post.like_count}</span>
          </div>
        </div>
        <span className="hidden w-24 shrink-0 truncate text-xs sm:block">
          {post.author?.nickname ?? "탈퇴회원"}
        </span>
        <span className="hidden w-14 shrink-0 text-center text-xs text-muted-foreground sm:block">
          {formatListDate(post.created_at)}
        </span>
        <span className="hidden w-12 shrink-0 text-center text-xs text-muted-foreground sm:block">
          {post.view_count}
        </span>
        <span className="hidden w-10 shrink-0 text-center text-xs text-muted-foreground sm:block">
          {post.like_count}
        </span>
      </li>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="hidden items-center gap-3 border-b border-border px-3 py-2 text-xs text-muted-foreground sm:flex">
        <span className="w-12 text-center">번호</span>
        <span className="flex-1">제목</span>
        <span className="w-24">글쓴이</span>
        <span className="w-14 text-center">날짜</span>
        <span className="w-12 text-center">조회</span>
        <span className="w-10 text-center">추천</span>
      </div>
      <ul className="divide-y divide-border">
        {notices.map((post) => row(post, true))}
        {posts.map((post) => row(post, false))}
      </ul>
    </div>
  );
}

/** 사진갤러리용 썸네일 목록 */
export function PostGrid({ posts, slug }: { posts: PostListItem[]; slug: string }) {
  if (posts.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
        아직 사진이 없어요.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {posts.map((post) => (
        <li key={post.id}>
          <Link
            href={`/b/${slug}/${post.id}`}
            className="block overflow-hidden rounded-lg border border-border bg-surface hover:border-primary"
          >
            <div className="relative aspect-square bg-muted">
              {post.thumbnail_path && (
                <Image
                  src={imageUrl(post.thumbnail_path)}
                  alt=""
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-sm font-medium">{post.title}</p>
              <p className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
                <span className="truncate">{post.author?.nickname ?? "탈퇴회원"}</span>
                <span className="shrink-0">추천 {post.like_count}</span>
                <span className="shrink-0">댓글 {post.comment_count}</span>
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
