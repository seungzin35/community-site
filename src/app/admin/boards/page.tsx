import type { Metadata } from "next";
import Link from "next/link";
import { deleteBoard } from "@/app/admin/actions";
import { Badge, Empty, Section } from "@/components/admin-ui";
import { BoardForm, type BoardRow } from "@/components/board-form";
import { ConfirmButton } from "@/components/confirm-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "게시판 관리" };

export default async function AdminBoardsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("boards")
    .select("id, slug, name, description, type, sort_order, is_active, is_anonymous, posts(count)")
    .order("sort_order")
    .order("id");
  const boards = (data ?? []) as unknown as (BoardRow & { posts: { count: number }[] })[];
  const nextOrder = boards.reduce((max, board) => Math.max(max, board.sort_order), 0) + 1;

  return (
    <div className="space-y-4">
      <Section title="새 게시판 추가">
        <div className="p-4">
          <BoardForm nextOrder={nextOrder} />
        </div>
      </Section>

      <Section title={`게시판 ${boards.length}개`}>
        {boards.length === 0 ? (
          <Empty>게시판이 없어요.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {boards.map((board) => {
              const postCount = board.posts[0]?.count ?? 0;
              return (
                <li key={board.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Link href={`/b/${board.slug}`} className="font-semibold hover:underline">
                      {board.name}
                    </Link>
                    {board.type === "gallery" && <Badge>갤러리</Badge>}
                    {board.is_anonymous && <Badge tone="blue">익명</Badge>}
                    {!board.is_active && <Badge tone="red">숨김</Badge>}
                    <span className="text-xs text-muted-foreground">글 {postCount.toLocaleString()}개</span>
                    <form action={deleteBoard} className="ml-auto">
                      <input type="hidden" name="id" value={board.id} />
                      <ConfirmButton
                        danger
                        confirm={`"${board.name}" 게시판과 글 ${postCount}개, 첨부 사진을 모두 지울까요? 되돌릴 수 없어요.\n\n잠시 안 보이게만 하려면 "보이기"를 끄고 저장하세요.`}
                      >
                        삭제
                      </ConfirmButton>
                    </form>
                  </div>
                  <BoardForm board={board} />
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
