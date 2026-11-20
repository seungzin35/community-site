import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NotReady } from "@/components/not-ready";
import { PostForm } from "@/components/post-form";
import { getCurrentUser } from "@/lib/auth";
import { getBoardBySlug } from "@/lib/posts";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPost } from "../../actions";

export const metadata: Metadata = { title: "글쓰기" };

export default async function WritePage({ params }: PageProps<"/b/[slug]/write">) {
  if (!isSupabaseConfigured) return <NotReady />;

  const { slug } = await params;
  const [board, user] = await Promise.all([getBoardBySlug(slug), getCurrentUser()]);
  if (!board) notFound();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/b/${slug}/write`)}`);

  if (user.isBanned) {
    return (
      <p className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm">
        활동이 정지된 계정이라 글을 쓸 수 없어요.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">{board.name} 글쓰기</h1>
      <PostForm action={createPost} slug={slug} userId={user.id} isGallery={board.type === "gallery"} />
    </div>
  );
}
