import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NotReady } from "@/components/not-ready";
import { PostForm } from "@/components/post-form";
import { getCurrentUser } from "@/lib/auth";
import { getMyAnonymous, getPost } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updatePost } from "../../../actions";

// 회원 정보와 최신 글을 매번 읽어 오므로 서버에서 기다렸다가 보여 줍니다.
export const instant = false;

export const metadata: Metadata = { title: "글 수정" };

export default async function EditPage({ params }: PageProps<"/b/[slug]/[postId]/edit">) {
  if (!isSupabaseConfigured) return <NotReady />;

  const { slug, postId } = await params;
  const id = Number(postId);
  if (!Number.isInteger(id)) notFound();

  const [post, user] = await Promise.all([getPost(id), getCurrentUser()]);
  if (!post) notFound();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/b/${slug}/${id}/edit`)}`);
  const isMine =
    post.author_id === user.id ||
    (post.is_anonymous && (await getMyAnonymous(await createClient(), user.id, id, [])).post);
  if (!isMine && user.role !== "admin") redirect(`/b/${slug}/${id}`);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">글 수정</h1>
      <PostForm
        action={updatePost}
        slug={slug}
        userId={user.id}
        post={{ id: post.id, title: post.title, content: post.content }}
        isAnonymous={post.is_anonymous}
      />
    </div>
  );
}
