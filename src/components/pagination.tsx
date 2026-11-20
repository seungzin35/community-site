import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = {
  basePath: string;
  page: number;
  totalPages: number;
  query?: string;
  /** 페이지를 넘겨도 유지할 다른 조건 (예: 필터) */
  params?: Record<string, string>;
};

export function Pagination({ basePath, page, totalPages, query, params: extra }: Props) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams(extra);
    if (target > 1) params.set("page", String(target));
    if (query) params.set("q", query);
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  // 현재 페이지가 속한 10개 묶음을 보여줍니다.
  const start = Math.floor((page - 1) / 10) * 10 + 1;
  const end = Math.min(start + 9, totalPages);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  const cell = "grid h-9 min-w-9 place-items-center rounded-lg px-2 tabular-nums transition-colors";

  return (
    <nav aria-label="페이지" className="flex flex-wrap justify-center gap-1 text-sm">
      {start > 1 && (
        <Link href={href(start - 1)} className={`${cell} text-muted-foreground hover:bg-surface`} aria-label="이전">
          <ChevronLeft className="size-4" />
        </Link>
      )}
      {pages.map((target) =>
        target === page ? (
          <span key={target} aria-current="page" className={`${cell} bg-primary font-bold text-primary-foreground`}>
            {target}
          </span>
        ) : (
          <Link key={target} href={href(target)} className={`${cell} text-muted-foreground hover:bg-surface hover:text-foreground`}>
            {target}
          </Link>
        ),
      )}
      {end < totalPages && (
        <Link href={href(end + 1)} className={`${cell} text-muted-foreground hover:bg-surface`} aria-label="다음">
          <ChevronRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}
