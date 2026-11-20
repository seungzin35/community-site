import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotReady } from "@/components/not-ready";
import { Pagination } from "@/components/pagination";
import { PostGrid, PostTable } from "@/components/post-list";
import { getBoardBySlug, getPosts, PAGE_SIZE } from "@/lib/posts";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// 회원 정보와 최신 글을 매번 읽어 오므로 서버에서 기다렸다가 보여 줍니다.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  if (!isSupabaseConfigured) return {};
  const board = await getBoardBySlug((await params).slug);
  return board ? { title: board.name, description: board.description } : {};
}

export default async function BoardPage({ params, searchParams }: PageProps<"/b/[slug]">) {
  if (!isSupabaseConfigured) return <NotReady />;

  const { slug } = await params;
  const search = await searchParams;
  const page = Math.max(1, Math.floor(Number(search.page)) || 1);
  const query = typeof search.q === "string" ? search.q.trim().slice(0, 50) : "";

  const board = await getBoardBySlug(slug);
  if (!board) notFound();

  const { posts, notices, total } = await getPosts(board.id, page, query);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            <Link href={`/b/${slug}`}>{board.name}</Link>
          </h1>
          {board.description && (
            <p className="text-sm text-muted-foreground">{board.description}</p>
          )}
        </div>
        <Link
          href={`/b/${slug}/write`}
          className="shrink-0 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          글쓰기
        </Link>
      </div>

      {query && (
        <p className="text-sm text-muted-foreground">
          &ldquo;{query}&rdquo; 검색 결과 {total}건
        </p>
      )}

      {board.type === "gallery" ? (
        <>
          {notices.length > 0 && <PostTable posts={[]} notices={notices} slug={slug} />}
          <PostGrid posts={posts} slug={slug} />
        </>
      ) : (
        <PostTable posts={posts} notices={notices} slug={slug} />
      )}

      <Pagination basePath={`/b/${slug}`} page={page} totalPages={totalPages} query={query} />

      <form action={`/b/${slug}`} className="flex justify-center gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="제목 검색"
          aria-label="제목 검색"
          className="w-56 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button type="submit" className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted">
          검색
        </button>
      </form>
    </div>
  );
}
