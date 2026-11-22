import type { Metadata } from "next";
import Link from "next/link";
import { Guide, GuideRestart } from "@/components/guide/guide";
import { Logo } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";
import { themeScript } from "@/components/theme-toggle";
import { getBoards } from "@/lib/boards";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: site.name,
    title: site.name,
    description: site.description,
    url: "/",
  },
  // 구글 서치콘솔 / 네이버 서치어드바이저 소유 확인 코드
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION }
      : undefined,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const boards = await getBoards();

  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* 한글 글꼴 Pretendard (SIL OFL) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader boards={boards} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
        <footer className="border-t border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pb-20 pt-8 text-sm sm:pb-8 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
              <Logo className="size-6" />
              {site.name}
            </Link>
            <p>{site.description}</p>
            <div className="flex flex-col gap-1 sm:items-end">
              <GuideRestart />
              <p className="text-xs">© {site.name}. All rights reserved.</p>
            </div>
          </div>
        </footer>
        <Guide />
      </body>
    </html>
  );
}
