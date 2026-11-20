import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getBoards } from "@/lib/boards";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.description,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const boards = await getBoards();

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader boards={boards} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          © {site.name}
        </footer>
      </body>
    </html>
  );
}
