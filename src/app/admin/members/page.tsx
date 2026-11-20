import type { Metadata } from "next";
import { setMemberBanned, setMemberRole } from "@/app/admin/actions";
import { Badge, Empty, SearchBox, Section } from "@/components/admin-ui";
import { ConfirmButton } from "@/components/confirm-button";
import { Pagination } from "@/components/pagination";
import { ADMIN_PAGE_SIZE, likePattern, readPage, readQuery, requireAdminPage } from "@/lib/admin";
import { formatFullDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "회원 관리" };

type Member = {
  id: string;
  nickname: string;
  role: "user" | "admin";
  is_banned: boolean;
  created_at: string;
  posts: { count: number }[];
  comments: { count: number }[];
};

export default async function AdminMembersPage({ searchParams }: PageProps<"/admin/members">) {
  const me = await requireAdminPage();
  const search = await searchParams;
  const page = readPage(search.page);
  const query = readQuery(search.q);
  const filter = search.filter === "banned" ? "banned" : search.filter === "admin" ? "admin" : "";

  const supabase = await createClient();
  let request = supabase
    .from("profiles")
    .select("id, nickname, role, is_banned, created_at, posts!posts_author_id_fkey(count), comments!comments_author_id_fkey(count)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  if (query) request = request.ilike("nickname", likePattern(query));
  if (filter === "banned") request = request.eq("is_banned", true);
  if (filter === "admin") request = request.eq("role", "admin");
  const { data, count } = await request;
  const members = (data ?? []) as unknown as Member[];

  const filterLink = (value: string, label: string) => (
    <a
      href={value ? `/admin/members?filter=${value}` : "/admin/members"}
      className={`rounded-md px-2.5 py-1 text-sm ${filter === value ? "bg-muted font-semibold" : "hover:bg-muted"}`}
    >
      {label}
    </a>
  );

  return (
    <Section
      title={`회원 ${(count ?? 0).toLocaleString()}명`}
      action={<SearchBox basePath="/admin/members" query={query} placeholder="닉네임 검색" />}
    >
      <div className="flex gap-1 border-b border-border px-4 py-2">
        {filterLink("", "전체")}
        {filterLink("banned", "정지")}
        {filterLink("admin", "관리자")}
      </div>
      {members.length === 0 ? (
        <Empty>회원이 없어요.</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {members.map((member) => {
            const isMe = member.id === me.id;
            return (
              <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm">
                <span className="font-medium">{member.nickname}</span>
                {member.role === "admin" && <Badge tone="blue">관리자</Badge>}
                {member.is_banned && <Badge tone="red">정지</Badge>}
                {isMe && <Badge>나</Badge>}
                <span className="text-xs text-muted-foreground">
                  가입 {formatFullDate(member.created_at)} · 글 {member.posts[0]?.count ?? 0} · 댓글{" "}
                  {member.comments[0]?.count ?? 0}
                </span>
                {!isMe && (
                  <div className="ml-auto flex gap-1.5">
                    <form action={setMemberBanned}>
                      <input type="hidden" name="id" value={member.id} />
                      <input type="hidden" name="banned" value={String(!member.is_banned)} />
                      <ConfirmButton
                        danger={!member.is_banned}
                        confirm={
                          member.is_banned
                            ? undefined
                            : `${member.nickname} 님을 정지할까요? 글과 댓글을 쓸 수 없게 돼요.`
                        }
                      >
                        {member.is_banned ? "정지 해제" : "정지"}
                      </ConfirmButton>
                    </form>
                    <form action={setMemberRole}>
                      <input type="hidden" name="id" value={member.id} />
                      <input type="hidden" name="role" value={member.role === "admin" ? "user" : "admin"} />
                      <ConfirmButton
                        confirm={
                          member.role === "admin"
                            ? `${member.nickname} 님의 관리자 권한을 뺄까요?`
                            : `${member.nickname} 님을 관리자로 지정할까요? 모든 관리 기능을 쓸 수 있게 돼요.`
                        }
                      >
                        {member.role === "admin" ? "관리자 해제" : "관리자 지정"}
                      </ConfirmButton>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="py-3">
        <Pagination
          basePath="/admin/members"
          page={page}
          totalPages={Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE)}
          query={query}
          params={filter ? { filter } : undefined}
        />
      </div>
    </Section>
  );
}
