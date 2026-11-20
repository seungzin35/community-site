import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";

export function UserMenuFallback() {
  return <div className="h-8 w-32" aria-hidden />;
}

/** 헤더 오른쪽: 로그인 상태에 따라 바뀌는 부분 */
export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link href="/login" className="rounded-md px-3 py-1.5 hover:bg-muted">
          로그인
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
        >
          회원가입
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {user.role === "admin" && (
        <Link href="/admin" className="rounded-md px-3 py-1.5 font-medium text-primary hover:bg-muted">
          관리자
        </Link>
      )}
      <span className="font-medium">{user.nickname}</span>
      <form action={logout}>
        <button type="submit" className="rounded-md px-3 py-1.5 hover:bg-muted">
          로그아웃
        </button>
      </form>
    </div>
  );
}
