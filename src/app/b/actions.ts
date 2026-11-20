"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { IMAGE_BUCKET, MAX_IMAGES } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; message?: string } | undefined;

const LOGIN_REQUIRED = "로그인이 필요해요.";
const BANNED = "활동이 정지된 계정이에요.";

async function requireMember() {
  const user = await getCurrentUser();
  if (!user) return { error: LOGIN_REQUIRED } as const;
  if (user.isBanned) return { error: BANNED } as const;
  return { user } as const;
}

function readPostFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title) return { error: "제목을 입력해 주세요." } as const;
  if (title.length > 100) return { error: "제목은 100자 이하로 해주세요." } as const;
  if (content.length > 20000) return { error: "내용이 너무 길어요." } as const;
  return { title, content } as const;
}

export async function createPost(_: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireMember();
  if ("error" in member) return member;
  const fields = readPostFields(formData);
  if ("error" in fields) return fields;

  const slug = String(formData.get("slug") ?? "");
  // 사진 경로는 본인 폴더에 올린 것만 받습니다.
  const imagePaths = formData
    .getAll("imagePaths")
    .map(String)
    .filter((path) => path.startsWith(`${member.user.id}/`) && !path.includes(".."))
    .slice(0, MAX_IMAGES);

  const supabase = await createClient();
  const { data: board } = await supabase
    .from("boards")
    .select("id, type, is_anonymous")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!board) return { error: "게시판을 찾을 수 없어요." };
  if (board.is_anonymous) {
    // 익명 게시판: 작성자를 남기지 않는 전용 함수로 씁니다(사진은 받지 않아요).
    if (imagePaths.length) await supabase.storage.from(IMAGE_BUCKET).remove(imagePaths);
    if (!fields.content) return { error: "내용을 입력해 주세요." };
    const { data: postId, error } = await supabase.rpc("create_anonymous_post", {
      target_board_id: board.id,
      post_title: fields.title,
      post_content: fields.content,
    });
    if (error || !postId) {
      console.error("익명 글 등록 실패:", error?.message);
      return { error: "글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요." };
    }
    revalidatePath(`/b/${slug}`);
    redirect(`/b/${slug}/${postId}`);
  }
  if (board.type === "gallery" && imagePaths.length === 0) {
    return { error: "갤러리에는 사진을 한 장 이상 올려 주세요." };
  }
  if (!fields.content && imagePaths.length === 0) return { error: "내용을 입력해 주세요." };

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      board_id: board.id,
      author_id: member.user.id,
      title: fields.title,
      content: fields.content,
      thumbnail_path: imagePaths[0] ?? null,
    })
    .select("id")
    .single();
  if (error || !post) {
    console.error("글 등록 실패:", error?.message);
    return { error: "글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  if (imagePaths.length > 0) {
    const { error: imageError } = await supabase.from("post_images").insert(
      imagePaths.map((storage_path, sort_order) => ({ post_id: post.id, storage_path, sort_order })),
    );
    if (imageError) console.error("사진 정보 저장 실패:", imageError.message);
  }

  revalidatePath(`/b/${slug}`);
  redirect(`/b/${slug}/${post.id}`);
}

export async function updatePost(_: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireMember();
  if ("error" in member) return member;
  const fields = readPostFields(formData);
  if ("error" in fields) return fields;

  const slug = String(formData.get("slug") ?? "");
  const postId = Number(formData.get("postId"));

  const supabase = await createClient();
  // 본인 글(또는 관리자)만 수정되도록 DB 권한 규칙이 한 번 더 막습니다.
  const { data, error } = await supabase
    .from("posts")
    .update({ title: fields.title, content: fields.content })
    .eq("id", postId)
    .select("id");
  if (error || !data?.length) return { error: "글을 수정하지 못했어요." };

  revalidatePath(`/b/${slug}/${postId}`);
  redirect(`/b/${slug}/${postId}`);
}

export async function deletePost(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const postId = Number(formData.get("postId"));
  const member = await requireMember();
  if ("error" in member) redirect(`/b/${slug}/${postId}`);

  const supabase = await createClient();
  const { data: images } = await supabase
    .from("post_images")
    .select("storage_path")
    .eq("post_id", postId);

  const { data: deleted } = await supabase.from("posts").delete().eq("id", postId).select("id");
  if (!deleted?.length) redirect(`/b/${slug}/${postId}`);

  if (images?.length) {
    await supabase.storage.from(IMAGE_BUCKET).remove(images.map((image) => image.storage_path));
  }
  revalidatePath(`/b/${slug}`);
  redirect(`/b/${slug}`);
}

export async function addComment(_: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireMember();
  if ("error" in member) return member;

  const slug = String(formData.get("slug") ?? "");
  const postId = Number(formData.get("postId"));
  const parentId = formData.get("parentId") ? Number(formData.get("parentId")) : null;
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "댓글 내용을 입력해 주세요." };
  if (content.length > 2000) return { error: "댓글은 2000자 이하로 해주세요." };

  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("is_anonymous").eq("id", postId).maybeSingle();
  const { error } = post?.is_anonymous
    ? await supabase.rpc("create_anonymous_comment", {
        target_post_id: postId,
        target_parent_id: parentId,
        comment_content: content,
      })
    : await supabase
        .from("comments")
        .insert({ post_id: postId, author_id: member.user.id, parent_id: parentId, content });
  if (error) return { error: "댓글을 등록하지 못했어요." };

  revalidatePath(`/b/${slug}/${postId}`);
  return undefined;
}

export async function deleteComment(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const postId = Number(formData.get("postId"));
  const commentId = Number(formData.get("commentId"));
  const member = await requireMember();
  if ("error" in member) return;

  const supabase = await createClient();
  await supabase.from("comments").delete().eq("id", commentId);
  revalidatePath(`/b/${slug}/${postId}`);
}

/** 추천(1) 또는 비추천(-1). 같은 버튼을 다시 누르면 취소됩니다. */
export async function votePost(_: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireMember();
  if ("error" in member) return member;

  const slug = String(formData.get("slug") ?? "");
  const postId = Number(formData.get("postId"));
  const value = Number(formData.get("value")) === -1 ? -1 : 1;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("post_votes")
    .select("value")
    .eq("post_id", postId)
    .eq("user_id", member.user.id)
    .maybeSingle();

  const result =
    existing?.value === value
      ? await supabase.from("post_votes").delete().eq("post_id", postId).eq("user_id", member.user.id)
      : await supabase
          .from("post_votes")
          .upsert({ post_id: postId, user_id: member.user.id, value });
  if (result.error) return { error: "처리하지 못했어요." };

  revalidatePath(`/b/${slug}/${postId}`);
  return undefined;
}

/** 글 또는 댓글 신고. 같은 대상을 두 번 신고하면 DB의 고유 규칙이 막습니다. */
export async function reportContent(_: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireMember();
  if ("error" in member) return member;

  const postId = Number(formData.get("postId")) || null;
  const commentId = Number(formData.get("commentId")) || null;
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "신고 이유를 적어 주세요." };
  if (reason.length > 500) return { error: "신고 이유는 500자 이하로 해주세요." };

  const target = commentId ? { comment_id: commentId } : { post_id: postId };
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: member.user.id, reason, ...target });
  if (error) {
    if (error.code === "23505") return { error: "이미 신고했어요." };
    console.error("신고 실패:", error.message);
    return { error: "신고하지 못했어요." };
  }
  return { message: "신고했어요. 관리자가 확인할게요." };
}
