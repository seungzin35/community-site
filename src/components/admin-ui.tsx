import Link from "next/link";

/** 관리자 화면에서 쓰는 작은 공통 조각들 */

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

export function SearchBox({ basePath, query, placeholder }: { basePath: string; query: string; placeholder: string }) {
  return (
    <form action={basePath} className="flex gap-2">
      <input
        name="q"
        defaultValue={query}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-48 rounded-md border border-border bg-surface px-2.5 py-1 text-sm outline-none focus:border-primary"
      />
      <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-muted">
        검색
      </button>
      {query && (
        <Link href={basePath} className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted">
          전체
        </Link>
      )}
    </form>
  );
}

export function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "red" | "blue" }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}
