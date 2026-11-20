import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

async function count(table: "profiles" | "posts" | "comments" | "reports", openOnly = false) {
  const supabase = await createClient();
  let request = supabase.from(table).select("*", { count: "exact", head: true });
  if (openOnly) request = request.eq("status", "open");
  const { count } = await request;
  return count ?? 0;
}

export default async function AdminHome() {
  const [members, banned, posts, comments, openReports] = await Promise.all([
    count("profiles"),
    (async () => {
      const supabase = await createClient();
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_banned", true);
      return count ?? 0;
    })(),
    count("posts"),
    count("comments"),
    count("reports", true),
  ]);

  const cards = [
    { label: "처리할 신고", value: openReports, href: "/admin/reports", alert: openReports > 0 },
    { label: "회원", value: members, href: "/admin/members", note: banned ? `정지 ${banned}명` : undefined },
    { label: "게시글", value: posts, href: "/admin/posts" },
    { label: "댓글", value: comments, href: "/admin/comments" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-lg border bg-surface p-4 hover:border-primary ${
              card.alert ? "border-red-400" : "border-border"
            }`}
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.alert ? "text-red-600 dark:text-red-400" : ""}`}>
              {card.value.toLocaleString()}
            </p>
            {card.note && <p className="mt-0.5 text-xs text-muted-foreground">{card.note}</p>}
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        게시판 추가·수정은 <Link href="/admin/boards" className="text-primary hover:underline">게시판</Link> 메뉴에서,
        문제 회원 정지는 <Link href="/admin/members" className="text-primary hover:underline">회원</Link> 메뉴에서 할 수 있어요.
      </p>
    </div>
  );
}
