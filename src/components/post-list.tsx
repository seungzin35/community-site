import { Image as ImageIcon, Images, MessageCircle, ThumbsUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatListDate } from "@/lib/format";
import { imageUrl, type PostListItem } from "@/lib/posts";

type Item = PostListItem & { board?: { slug: string; name: string } };

export function EmptyState({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-4 py-14 text-center text-sm text-muted-foreground">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        {icon ?? <MessageCircle className="size-6" />}
      </span>
      {children}
    </div>
  );
}

/**
 * 뽐뿌·디시처럼 한 줄에 한 글씩 보여주는 목록.
 * compact 는 홈 화면용으로 번호 칸을 숨깁니다.
 */
export function PostTable({
  posts,
  slug,
  notices = [],
  compact = false,
}: {
  posts: Item[];
  slug?: string;
  notices?: Item[];
  compact?: boolean;
}) {
  if (posts.length + notices.length === 0) {
    return <EmptyState>아직 글이 없어요. 첫 글을 남겨 보세요!</EmptyState>;
  }

  const row = (post: Item, isNotice: boolean) => {
    const href = `/b/${post.board?.slug ?? slug}/${post.id}`;
    const nickname = post.author?.nickname ?? "탈퇴회원";
    return (
      <li key={`${isNotice ? "n" : "p"}${post.id}`}>
        <Link
          href={href}
          className={`group flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/60 sm:py-2.5 ${
            isNotice ? "bg-primary-soft/50" : ""
          }`}
        >
          {!compact && (
            <span className="hidden w-12 shrink-0 text-center text-xs tabular-nums text-muted-foreground sm:block">
              {isNotice ? (
                <span className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                  공지
                </span>
              ) : (
                post.id
              )}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {isNotice && compact && (
                <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                  공지
                </span>
              )}
              {isNotice && !compact && (
                <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground sm:hidden">
                  공지
                </span>
              )}
              {post.board && (
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {post.board.name}
                </span>
              )}
              <span
                className={`truncate group-hover:text-primary ${isNotice ? "font-bold" : "font-medium"}`}
              >
                {post.title}
              </span>
              {post.thumbnail_path && (
                <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="사진 있음" />
              )}
              {post.comment_count > 0 && (
                <span className="shrink-0 text-xs font-bold tabular-nums text-hot">{post.comment_count}</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
              <span className="max-w-32 truncate">{nickname}</span>
              <span>·</span>
              <span>{formatListDate(post.created_at)}</span>
              <span>·</span>
              <span>조회 {post.view_count}</span>
              {post.like_count > 0 && (
                <span className="inline-flex items-center gap-0.5 text-primary">
                  <ThumbsUp className="size-3" /> {post.like_count}
                </span>
              )}
            </div>
          </div>
          <span className="hidden w-24 shrink-0 truncate text-xs text-foreground/80 sm:block">{nickname}</span>
          <span className="hidden w-14 shrink-0 text-center text-xs tabular-nums text-muted-foreground sm:block">
            {formatListDate(post.created_at)}
          </span>
          <span className="hidden w-12 shrink-0 text-center text-xs tabular-nums text-muted-foreground sm:block">
            {post.view_count}
          </span>
          <span
            className={`hidden w-10 shrink-0 text-center text-xs tabular-nums sm:block ${
              post.like_count > 0 ? "font-semibold text-primary" : "text-muted-foreground"
            }`}
          >
            {post.like_count}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="card overflow-hidden">
      <div className="hidden items-center gap-3 border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground sm:flex">
        {!compact && <span className="w-12 text-center">번호</span>}
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
    return <EmptyState icon={<Images className="size-6" />}>아직 사진이 없어요. 첫 사진을 올려 보세요!</EmptyState>;
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {posts.map((post) => (
        <li key={post.id}>
          <Link
            href={`/b/${slug}/${post.id}`}
            className="group card block overflow-hidden transition-shadow hover:shadow-lg hover:shadow-black/5"
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              {post.thumbnail_path ? (
                <Image
                  src={imageUrl(post.thumbnail_path)}
                  alt=""
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <ImageIcon className="absolute inset-0 m-auto size-8 text-muted-foreground/50" />
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold group-hover:text-primary">{post.title}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="min-w-0 flex-1 truncate">{post.author?.nickname ?? "탈퇴회원"}</span>
                <span className="inline-flex shrink-0 items-center gap-0.5">
                  <ThumbsUp className="size-3" />
                  {post.like_count}
                </span>
                <span className="inline-flex shrink-0 items-center gap-0.5">
                  <MessageCircle className="size-3" />
                  {post.comment_count}
                </span>
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
