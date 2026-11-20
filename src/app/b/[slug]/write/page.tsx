import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NotReady } from "@/components/not-ready";
import { PostForm } from "@/components/post-form";
import { getCurrentUser } from "@/lib/auth";
import { getBoardBySlug } from "@/lib/posts";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPost } from "../../actions";

// 회원 정보와 최신 글을 매번 읽어 오므로 서버에서 기다렸다가 보여 줍니다.
export const instant = false;

export const metadata: Metadata = { title: "글쓰기" };

export default async function WritePage({ params }: PageProps<"/b/[slug]/write">) {
  if (!isSupabaseConfigured) return <NotReady />;

  const { slug } = await params;
  const [board, user] = await Promise.all([getBoardBySlug(slug), getCurrentUser()]);
  if (!board) notFound();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/b/${slug}/write`)}`);

  if (user.isBanned) {
    return (
      <p className="card px-4 py-12 text-center text-sm">
        활동이 정지된 계정이라 글을 쓸 수 없어요.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">
        <span className="text-primary">{board.name}</span> 글쓰기
      </h1>
      <PostForm action={createPost} slug={slug} userId={user.id} isGallery={board.type === "gallery"} />
    </div>
  );
}
