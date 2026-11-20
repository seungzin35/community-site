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
