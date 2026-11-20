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
  const linkClass = "rounded-md px-2.5 py-1 hover:bg-muted";

  return (
    <nav aria-label="페이지" className="flex flex-wrap justify-center gap-1 text-sm">
      {start > 1 && (
        <Link href={href(start - 1)} className={linkClass}>
          이전
        </Link>
      )}
      {pages.map((target) =>
        target === page ? (
          <span
            key={target}
            aria-current="page"
            className="rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground"
          >
            {target}
          </span>
        ) : (
          <Link key={target} href={href(target)} className={linkClass}>
            {target}
          </Link>
        ),
      )}
      {end < totalPages && (
        <Link href={href(end + 1)} className={linkClass}>
          다음
        </Link>
      )}
    </nav>
  );
}
