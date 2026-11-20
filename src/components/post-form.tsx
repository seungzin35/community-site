"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/app/b/actions";
import { IMAGE_BUCKET, MAX_IMAGES } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  slug: string;
  userId: string;
  /** 수정할 때만 전달 */
  post?: { id: number; title: string; content: string };
  isGallery?: boolean;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const inputClass = "field";

export function PostForm({ action, slug, userId, post, isGallery }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(post);

  function onFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > MAX_IMAGES) {
      setError(`사진은 ${MAX_IMAGES}장까지 올릴 수 있어요.`);
      event.target.value = "";
      return setFiles([]);
    }
    if (selected.some((file) => file.size > MAX_FILE_SIZE)) {
      setError("사진 한 장은 5MB 이하여야 해요.");
      event.target.value = "";
      return setFiles([]);
    }
    setError(undefined);
    setFiles(selected);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.delete("images");

    startTransition(async () => {
      setError(undefined);
      const supabase = createClient();
      const uploaded: string[] = [];

      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(path, file, { contentType: file.type });
        if (uploadError) {
          if (uploaded.length) await supabase.storage.from(IMAGE_BUCKET).remove(uploaded);
          return setError("사진을 올리지 못했어요. 파일 형식(JPG, PNG, WEBP, GIF)을 확인해 주세요.");
        }
        uploaded.push(path);
        formData.append("imagePaths", path);
      }

      const result = await action(undefined, formData);
      if (result?.error) {
        if (uploaded.length) await supabase.storage.from(IMAGE_BUCKET).remove(uploaded);
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-4 sm:p-6">
      <input type="hidden" name="slug" value={slug} />
      {post && <input type="hidden" name="postId" value={post.id} />}

      <input
        name="title"
        required
        maxLength={100}
        defaultValue={post?.title}
        placeholder="제목"
        aria-label="제목"
        className={`${inputClass} py-2.5 text-base font-semibold`}
      />
      <textarea
        name="content"
        rows={14}
        maxLength={20000}
        defaultValue={post?.content}
        placeholder="내용을 입력해 주세요."
        aria-label="내용"
        className={`${inputClass} resize-y leading-relaxed`}
      />

      {!isEdit && (
        <label className="block space-y-2 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm">
          <span className="font-medium">
            사진 첨부{isGallery ? " (필수)" : ""}{" "}
            <span className="text-muted-foreground">최대 {MAX_IMAGES}장, 한 장에 5MB 이하</span>
          </span>
          <input
            name="images"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onFilesChange}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:font-semibold file:text-primary"
          />
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary px-6"
        >
          {pending ? "등록 중..." : isEdit ? "수정" : "등록"}
        </button>
      </div>
    </form>
  );
}
