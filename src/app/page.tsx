import { ChevronRight, Clock, Flame, Images, MessageSquare, PenLine } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { PostTable } from "@/components/post-list";
import { getBoards } from "@/lib/boards";
import { getPopularPosts, getRecentPosts } from "@/lib/posts";
import { site } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function SectionTitle({ icon, title, tone }: { icon: React.ReactNode; title: string; tone: "hot" | "primary" }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[17px] font-bold">
      <span
        className={`grid size-7 place-items-center rounded-lg ${
          tone === "hot" ? "bg-hot-soft text-hot" : "bg-primary-soft text-primary"
        }`}
      >
        {icon}
      </span>
      {title}
    </h2>
  );
}

async function Feeds() {
  // 인기글과 최신글은 방문할 때마다 새로 불러옵니다.
  await connection();
  const [popular, recent] = await Promise.all([getPopularPosts(), getRecentPosts()]);
  return (
    <>
      {popular.length > 0 && (
        <section>
          <SectionTitle icon={<Flame className="size-4" />} title="인기글" tone="hot" />
          <PostTable posts={popular} compact />
        </section>
      )}
      <section>
        <SectionTitle icon={<Clock className="size-4" />} title="최신글" tone="primary" />
        <PostTable posts={recent} compact />
      </section>
    </>
  );
}

function FeedsFallback() {
  return (
    <div className="card space-y-3 p-5" aria-label="불러오는 중">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${90 - index * 8}%` }} />
      ))}
    </div>
  );
}

export default async function HomePage() {
  const boards = await getBoards();
  const firstBoard = boards.find((board) => board.type === "normal") ?? boards[0];

  return (
    <div className="space-y-8">
      {!isSupabaseConfigured && (
        <p className="card px-4 py-3 text-sm text-muted-foreground">
          아직 Supabase가 연결되지 않아 예시 게시판을 보여주고 있어요.
        </p>
      )}

      {/* 첫 화면 소개 */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5b5bd6] via-[#6e56cf] to-[#8e4ec6] px-6 py-8 text-white shadow-lg shadow-primary/20 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative max-w-xl">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Logo className="size-4 rounded" /> {site.name}
          </p>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            오늘은 어떤 이야기를
            <br />
            나눠 볼까요?
          </h1>
          <p className="mt-3 text-sm text-white/80 sm:text-base">{site.description}</p>
          {firstBoard && (
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/b/${firstBoard.slug}/write`} className="btn bg-white text-[#4b4bc8] hover:bg-white/90">
                <PenLine className="size-4" /> 글쓰기
              </Link>
              <Link href={`/b/${firstBoard.slug}`} className="btn bg-white/15 text-white hover:bg-white/25">
                {firstBoard.name} 둘러보기 <ChevronRight className="size-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-8">
          {isSupabaseConfigured && (
            <Suspense fallback={<FeedsFallback />}>
              <Feeds />
            </Suspense>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <section className="card p-2">
            <h2 className="px-3 pb-1 pt-2 text-sm font-bold">게시판</h2>
            <ul>
              {boards.map((board) => (
                <li key={board.id}>
                  <Link
                    href={`/b/${board.slug}`}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                      {board.type === "gallery" ? <Images className="size-[18px]" /> : <MessageSquare className="size-[18px]" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{board.name}</span>
                      {board.description && (
                        <span className="block truncate text-xs text-muted-foreground">{board.description}</span>
                      )}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
