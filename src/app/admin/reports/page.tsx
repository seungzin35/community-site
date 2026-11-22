import type { Metadata } from "next";
import Link from "next/link";
import { deleteReportedTarget, setReportStatus } from "@/app/admin/actions";
import { Badge, Empty, Section } from "@/components/admin-ui";
import { ConfirmButton } from "@/components/confirm-button";
import { Pagination } from "@/components/pagination";
import {
  ADMIN_PAGE_SIZE,
  adminAuthorName,
  COMMENT_OWNER,
  POST_OWNER,
  readPage,
} from "@/lib/admin";
import { formatFullDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "신고 관리" };

type Row = {
  id: number;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  reporter: { nickname: string } | null;
  post: {
    id: number;
    title: string;
    board: { slug: string } | null;
    author: { nickname: string } | null;
    owner: { user: { nickname: string } | null } | null;
  } | null;
  comment: {
    id: number;
    content: string;
    author: { nickname: string } | null;
    owner: { user: { nickname: string } | null } | null;
    post: { id: number; board: { slug: string } | null } | null;
  } | null;
};

const statusLabel = { open: "대기", resolved: "처리 완료", dismissed: "기각" } as const;

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const search = await searchParams;
  const page = readPage(search.page);
  const showAll = search.all === "1";

  const supabase = await createClient();
  let request = supabase
    .from("reports")
    .select(
      `id, reason, status, created_at,
       reporter:profiles!reports_reporter_id_fkey(nickname),
       post:posts(id, title, board:boards(slug), author:profiles!posts_author_id_fkey(nickname), ${POST_OWNER}),
       comment:comments(id, content, author:profiles!comments_author_id_fkey(nickname), ${COMMENT_OWNER}, post:posts(id, board:boards(slug)))`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  if (!showAll) request = request.eq("status", "open");
  const { data, count, error } = await request;
  if (error) console.error("신고 목록을 불러오지 못했습니다:", error.message);
  const reports = (data ?? []) as unknown as Row[];

  return (
    <Section
      title={showAll ? `전체 신고 ${count ?? 0}건` : `처리할 신고 ${count ?? 0}건`}
      action={
        <Link href={showAll ? "/admin/reports" : "/admin/reports?all=1"} className="text-sm text-primary hover:underline">
          {showAll ? "처리할 신고만 보기" : "지난 신고도 보기"}
        </Link>
      }
    >
      {reports.length === 0 ? (
        <Empty>{showAll ? "신고가 없어요." : "처리할 신고가 없어요."}</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {reports.map((report) => {
            const target = report.post
              ? {
                  kind: "글",
                  text: report.post.title,
                  author: adminAuthorName(report.post.author, report.post.owner),
                  href: `/b/${report.post.board?.slug}/${report.post.id}`,
                }
              : report.comment
                ? {
                    kind: "댓글",
                    text: report.comment.content,
                    author: adminAuthorName(report.comment.author, report.comment.owner),
                    href: `/b/${report.comment.post?.board?.slug}/${report.comment.post?.id}`,
                  }
                : null;

            return (
              <li key={report.id} className="space-y-2 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={report.status === "open" ? "red" : "muted"}>{statusLabel[report.status]}</Badge>
                  {target && <Badge>{target.kind}</Badge>}
                  {target ? (
                    <Link href={target.href} className="min-w-0 flex-1 truncate font-medium hover:underline">
                      {target.text}
                    </Link>
                  ) : (
                    <span className="flex-1 text-muted-foreground">(이미 지워진 내용)</span>
                  )}
                </div>
                <p className="rounded-md bg-muted px-3 py-2 whitespace-pre-wrap break-words">{report.reason}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    작성자 {target?.author ?? "탈퇴회원"} · 신고자 {report.reporter?.nickname ?? "탈퇴회원"} ·{" "}
                    {formatFullDate(report.created_at)}
                  </span>
                  {report.status === "open" && (
                    <div className="ml-auto flex gap-1.5">
                      {target && (
                        <form action={deleteReportedTarget}>
                          {report.post && <input type="hidden" name="postId" value={report.post.id} />}
                          {report.comment && <input type="hidden" name="commentId" value={report.comment.id} />}
                          <ConfirmButton danger confirm={`신고된 ${target.kind}을(를) 지울까요?`}>
                            {target.kind} 삭제
                          </ConfirmButton>
                        </form>
                      )}
                      <form action={setReportStatus}>
                        <input type="hidden" name="id" value={report.id} />
                        <input type="hidden" name="status" value="resolved" />
                        <ConfirmButton>처리 완료</ConfirmButton>
                      </form>
                      <form action={setReportStatus}>
                        <input type="hidden" name="id" value={report.id} />
                        <input type="hidden" name="status" value="dismissed" />
                        <ConfirmButton>기각</ConfirmButton>
                      </form>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="py-3">
        <Pagination
          basePath="/admin/reports"
          params={showAll ? { all: "1" } : undefined}
          page={page}
          totalPages={Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE)}
        />
      </div>
    </Section>
  );
}
