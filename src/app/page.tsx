import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PostTable } from "@/components/post-list";
import { getBoards } from "@/lib/boards";
import { getPopularPosts, getRecentPosts } from "@/lib/posts";
import { isSupabaseConfigured } from "@/lib/supabase/config";

async function Feeds() {
  // 인기글과 최신글은 방문할 때마다 새로 불러옵니다.
  await connection();
  const [popular, recent] = await Promise.all([getPopularPosts(), getRecentPosts()]);
  return (
    <>
      {popular.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">인기글</h2>
          <PostTable posts={popular} />
        </section>
      )}
      <section>
        <h2 className="mb-3 text-lg font-bold">최신글</h2>
        <PostTable posts={recent} />
      </section>
    </>
  );
}

export default async function HomePage() {
  const boards = await getBoards();

  return (
    <div className="space-y-8">
      {!isSupabaseConfigured && (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          아직 Supabase가 연결되지 않아 예시 게시판을 보여주고 있어요.
        </p>
      )}

      <section>
        <h1 className="mb-3 text-lg font-bold">게시판</h1>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                href={`/b/${board.slug}`}
                className="block rounded-lg border border-border bg-surface p-4 hover:border-primary"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{board.name}</span>
                  {board.type === "gallery" && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      갤러리
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{board.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {isSupabaseConfigured && (
        <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
          <Feeds />
        </Suspense>
      )}
    </div>
  );
}
