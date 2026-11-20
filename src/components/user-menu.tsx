import { LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "./avatar";

export function UserMenuFallback() {
  return <div className="h-9 w-36" aria-hidden />;
}

/** 헤더 오른쪽: 로그인 상태에 따라 바뀌는 부분 */
export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Link href="/login" className="btn btn-ghost">
          로그인
        </Link>
        <Link href="/signup" className="btn btn-primary" data-tour="signup">
          회원가입
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {user.role === "admin" && (
        <Link href="/admin" className="btn btn-ghost text-primary" title="관리자">
          <Shield className="size-4" />
          <span className="hidden sm:inline">관리자</span>
        </Link>
      )}
      <span className="flex items-center gap-2 px-1.5 text-sm font-semibold">
        <Avatar name={user.nickname} size="sm" />
        <span className="hidden max-w-28 truncate sm:inline">{user.nickname}</span>
      </span>
      <form action={logout}>
        <button type="submit" className="btn btn-ghost size-9 p-0 text-muted-foreground" title="로그아웃" aria-label="로그아웃">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
