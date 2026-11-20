import { notFound } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./auth";

/** 관리자 화면용. 관리자가 아니면 페이지가 없는 것처럼 보여 줍니다. */
export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  return user;
}

export const ADMIN_PAGE_SIZE = 30;

/** ?page= 값을 안전한 숫자로 바꿉니다. */
export function readPage(value: string | string[] | undefined) {
  return Math.max(1, Math.floor(Number(value)) || 1);
}

export function readQuery(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim().slice(0, 50) : "";
}

/** ilike 검색에서 특별한 뜻을 가진 문자를 지웁니다. */
export function likePattern(query: string) {
  return `%${query.replace(/[%_\\]/g, "")}%`;
}

type Nick = { nickname: string } | null;
type AnonOwner = { user: Nick } | { user: Nick }[] | null | undefined;

/** 관리자 화면 전용: 익명 글/댓글이면 실제 작성자 닉네임을 괄호로 함께 보여 줘요. */
export function adminAuthorName(author: Nick | undefined, owner: AnonOwner) {
  const anonymous = Array.isArray(owner) ? owner[0] : owner;
  if (anonymous) return `익명 (${anonymous.user?.nickname ?? "탈퇴회원"})`;
  return author?.nickname ?? "탈퇴회원";
}

/** 위 함수에 쓰는 select 조각 */
export const POST_OWNER = "owner:anonymous_owners!anonymous_owners_post_id_fkey(user:profiles(nickname))";
export const COMMENT_OWNER = "owner:anonymous_owners!anonymous_owners_comment_id_fkey(user:profiles(nickname))";
