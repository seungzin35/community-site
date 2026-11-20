"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { IMAGE_BUCKET } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

export type AdminState = { error?: string; message?: string } | undefined;

/** 모든 관리자 작업 전에 다시 확인합니다. (DB 권한 규칙도 한 번 더 막습니다) */
async function adminClient() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return { user, supabase: await createClient() };
}

const NO_PERMISSION: AdminState = { error: "관리자만 할 수 있어요." };

/** 글들에 첨부된 사진 파일을 저장소에서 지웁니다. */
async function removePostImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postIds: number[],
) {
  if (!postIds.length) return;
  const { data: images } = await supabase
    .from("post_images")
    .select("storage_path")
    .in("post_id", postIds);
  const paths = (images ?? []).map((image) => image.storage_path);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths.slice(i, i + 100));
    if (error) console.error("사진 파일 삭제 실패:", error.message);
  }
}

function refreshSite() {
  revalidatePath("/", "layout");
}

// ───────────── 게시판 ─────────────

function readBoardFields(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 200);
  const isAnonymous = formData.get("is_anonymous") === "on";
  // 익명 게시판은 사진을 받지 않으므로 갤러리로 만들 수 없어요.
  const type = formData.get("type") === "gallery" && !isAnonymous ? "gallery" : "normal";
  const sortOrder = Math.floor(Number(formData.get("sort_order"))) || 0;
  const isActive = formData.get("is_active") === "on";

  if (!/^[a-z0-9-]{2,30}$/.test(slug)) {
    return { error: "주소는 영어 소문자, 숫자, - 만 써서 2~30자로 해주세요." } as const;
  }
  if (!name || name.length > 30) return { error: "게시판 이름은 1~30자로 해주세요." } as const;
  return {
    fields: { slug, name, description, type, sort_order: sortOrder, is_active: isActive, is_anonymous: isAnonymous },
  } as const;
}

export async function saveBoard(_: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await adminClient();
  if (!admin) return NO_PERMISSION;
  const parsed = readBoardFields(formData);
  if ("error" in parsed) return parsed;

  const id = Number(formData.get("id")) || null;
  const { error } = id
    ? await admin.supabase.from("boards").update(parsed.fields).eq("id", id)
    : await admin.supabase.from("boards").insert(parsed.fields);

  if (error) {
    if (error.code === "23505") return { error: "이미 쓰고 있는 주소예요." };
    console.error("게시판 저장 실패:", error.message);
    return { error: "저장하지 못했어요." };
  }
  updateTag("boards");
  refreshSite();
  return { message: id ? "저장했어요." : "게시판을 만들었어요." };
}

export async function deleteBoard(formData: FormData) {
  const admin = await adminClient();
  if (!admin) return;
  const id = Number(formData.get("id"));

  const { data: posts } = await admin.supabase.from("posts").select("id").eq("board_id", id);
  await removePostImages(admin.supabase, (posts ?? []).map((post) => post.id));
  const { error } = await admin.supabase.from("boards").delete().eq("id", id);
  if (error) console.error("게시판 삭제 실패:", error.message);

  updateTag("boards");
  refreshSite();
}

// ───────────── 회원 ─────────────

export async function setMemberBanned(formData: FormData) {
  const admin = await adminClient();
  if (!admin) return;
  const id = String(formData.get("id"));
  if (id === admin.user.id) return; // 자기 자신은 정지할 수 없음
  const banned = formData.get("banned") === "true";
  const { error } = await admin.supabase.from("profiles").update({ is_banned: banned }).eq("id", id);
  if (error) console.error("회원 정지 처리 실패:", error.message);
  revalidatePath("/admin/members");
}

export async function setMemberRole(formData: FormData) {
  const admin = await adminClient();
  if (!admin) return;
  const id = String(formData.get("id"));
  if (id === admin.user.id) return; // 자기 자신의 관리자 권한은 여기서 뺄 수 없음
  const role = formData.get("role") === "admin" ? "admin" : "user";
  const { error } = await admin.supabase.from("profiles").update({ role }).eq("id", id);
  if (error) console.error("회원 권한 변경 실패:", error.message);
  revalidatePath("/admin/members");
}

// ───────────── 게시글 / 댓글 ─────────────

export async function adminDeletePost(formData: FormData) {
  const admin = await adminClient();
  if (!admin) return;
  const id = Number(formData.get("id"));
  await removePostImages(admin.supabase, [id]);
  const { error } = await admin.supabase.from("posts").delete().eq("id", id);
  if (error) console.error("글 삭제 실패:", error.message);
  refreshSite();
}

export async function setPostNotice(formData: FormData) {
  const admin = await adminClient();
  if (!admin) return;
  const id = Number(formData.get("id"));
  const notice = formData.get("notice") === "true";
  const { error } = await admin.supabase.from("posts").update({ is_notice: notice }).eq("id", id);
  if (error) console.error("공지 설정 실패:", error.message);
  refreshSite();
}

export async function adminDeleteComment(formData: FormData) {
  const admin = await adminClient();
  if (!admin) return;
  const id = Number(formData.get("id"));
  const { error } = await admin.supabase.from("comments").delete().eq("id", id);
  if (error) console.error("댓글 삭제 실패:", error.message);
  refreshSite();
}

// ───────────── 신고 ─────────────

export async function setReportStatus(formData: FormData) {
  const admin = await adminClient();
  if (!admin) return;
  const id = Number(formData.get("id"));
  const status = formData.get("status") === "dismissed" ? "dismissed" : "resolved";
  const { error } = await admin.supabase.from("reports").update({ status }).eq("id", id);
  if (error) console.error("신고 처리 실패:", error.message);
  revalidatePath("/admin", "layout");
}

/** 신고된 글/댓글을 지우고, 같은 대상의 신고를 모두 처리 완료로 바꿉니다. */
export async function deleteReportedTarget(formData: FormData) {
  const admin = await adminClient();
  if (!admin) return;
  const postId = Number(formData.get("postId")) || null;
  const commentId = Number(formData.get("commentId")) || null;

  // 대상이 지워지면 신고 기록도 함께 지워지므로(연쇄 삭제) 먼저 처리 완료로 표시할 필요는 없습니다.
  if (postId) {
    await removePostImages(admin.supabase, [postId]);
    const { error } = await admin.supabase.from("posts").delete().eq("id", postId);
    if (error) console.error("신고된 글 삭제 실패:", error.message);
  } else if (commentId) {
    const { error } = await admin.supabase.from("comments").delete().eq("id", commentId);
    if (error) console.error("신고된 댓글 삭제 실패:", error.message);
  }
  refreshSite();
}
