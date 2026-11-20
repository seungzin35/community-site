import Link from "next/link";

/** 관리자 화면에서 쓰는 작은 공통 조각들 */

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-[15px] font-bold">{title}</h2>
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
        className="field w-48 py-1.5"
      />
      <button type="submit" className="btn btn-outline py-1.5">
        검색
      </button>
      {query && (
        <Link href={basePath} className="btn btn-ghost py-1.5 text-muted-foreground">
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
    blue: "bg-primary-soft text-primary",
  };
  return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}
