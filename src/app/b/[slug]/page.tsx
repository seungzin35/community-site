import type { Metadata } from "next";
import { Images, MessageSquare, PenLine, Search } from "lucide-react";
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
      <div className="card flex items-center gap-4 p-4 sm:p-5" data-board-type={board.type}>
        <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary sm:grid">
          {board.type === "gallery" ? <Images className="size-6" /> : <MessageSquare className="size-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight">
            <Link href={`/b/${slug}`}>{board.name}</Link>
          </h1>
          {board.description && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{board.description}</p>
          )}
        </div>
        <Link href={`/b/${slug}/write`} className="btn btn-primary shrink-0" data-tour="write">
          <PenLine className="size-4" /> 글쓰기
        </Link>
      </div>

      {query && (
        <p className="px-1 text-sm text-muted-foreground">
          <b className="text-foreground">&ldquo;{query}&rdquo;</b> 검색 결과 {total}건
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

      <form action={`/b/${slug}`} className="mx-auto flex max-w-md gap-2" data-tour="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={query} placeholder="제목으로 검색" aria-label="제목 검색" className="field pl-9" />
        </div>
        <button type="submit" className="btn btn-outline">
          검색
        </button>
      </form>
    </div>
  );
}
