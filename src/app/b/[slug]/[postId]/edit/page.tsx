import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NotReady } from "@/components/not-ready";
import { PostForm } from "@/components/post-form";
import { getCurrentUser } from "@/lib/auth";
import { getPost } from "@/lib/posts";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updatePost } from "../../../actions";

export const metadata: Metadata = { title: "글 수정" };

export default async function EditPage({ params }: PageProps<"/b/[slug]/[postId]/edit">) {
  if (!isSupabaseConfigured) return <NotReady />;

  const { slug, postId } = await params;
  const id = Number(postId);
  if (!Number.isInteger(id)) notFound();

  const [post, user] = await Promise.all([getPost(id), getCurrentUser()]);
  if (!post) notFound();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/b/${slug}/${id}/edit`)}`);
  if (post.author_id !== user.id && user.role !== "admin") redirect(`/b/${slug}/${id}`);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">글 수정</h1>
      <PostForm
        action={updatePost}
        slug={slug}
        userId={user.id}
        post={{ id: post.id, title: post.title, content: post.content }}
      />
    </div>
  );
}
