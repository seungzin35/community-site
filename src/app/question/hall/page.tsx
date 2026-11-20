import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Crown, Heart, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NotReady } from "@/components/not-ready";
import { Pagination } from "@/components/pagination";
import { readPage } from "@/lib/admin";
import { formatQuestionDate, getHallOfFame, HALL_PAGE_SIZE } from "@/lib/community";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "명예의 전당",
  description: "지난 오늘의 질문에서 좋아요를 가장 많이 받은 답 모음",
};

async function HallList({ searchParams }: { searchParams: PageProps<"/question/hall">["searchParams"] }) {
  await connection();
  const page = readPage((await searchParams).page);
  const { entries, total } = await getHallOfFame(page);

  if (!entries.length) {
    return (
      <p className="card px-4 py-12 text-center text-sm text-muted-foreground">
        아직 마감된 질문이 없어요. 오늘의 질문에 답하고 첫 번째 주인공이 되어 보세요!
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.question_id}>
            <Link href={`/question/${entry.question_id}`} className="card group block p-4 transition-colors hover:border-primary/40 sm:p-5">
              <p className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold">{formatQuestionDate(entry.open_date)}</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" /> {entry.answer_count}명 답함
                </span>
              </p>
              <p className="mt-1.5 break-words font-bold leading-snug">Q. {entry.question}</p>
              {entry.answer ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-800/60 dark:bg-amber-950/20">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <Crown className="size-3.5" /> {entry.nickname ?? "탈퇴회원"}
                    <span className="ml-auto inline-flex items-center gap-1 text-hot">
                      <Heart className="size-3.5 fill-current" /> {entry.like_count}
                    </span>
                  </p>
                  <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{entry.answer}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">좋아요를 받은 답이 없었어요.</p>
              )}
              <span className="mt-3 inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
                모든 답 보기 <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination basePath="/question/hall" page={page} totalPages={Math.ceil(total / HALL_PAGE_SIZE)} />
    </>
  );
}

export default function HallPage({ searchParams }: PageProps<"/question/hall">) {
  if (!isSupabaseConfigured) return <NotReady />;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/question" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ChevronLeft className="size-4" /> 오늘의 질문
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
          <Trophy className="size-5" />
        </span>
        명예의 전당
      </h1>
      <p className="text-sm text-muted-foreground">지난 질문마다 좋아요를 가장 많이 받은 답이에요.</p>
      <Suspense fallback={<div className="card h-40 animate-pulse" />}>
        <HallList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
