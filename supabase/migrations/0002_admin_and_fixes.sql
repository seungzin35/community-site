-- 사진 삭제가 실제로 되도록 허용합니다.
-- Supabase Storage는 파일을 지울 때 "읽기" 권한도 함께 확인하므로,
-- 본인 폴더(또는 관리자)의 파일을 읽을 수 있는 규칙이 있어야 삭제가 동작합니다.
-- (사진 보기 자체는 공개 주소로 되므로 이 규칙과 상관없습니다.)
drop policy if exists "post_images_storage_select" on storage.objects;
create policy "post_images_storage_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'post-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

-- 같은 회원이 같은 글/댓글을 여러 번 신고하지 못하게 합니다.
create unique index if not exists reports_unique_post
  on public.reports (reporter_id, post_id) where post_id is not null;
create unique index if not exists reports_unique_comment
  on public.reports (reporter_id, comment_id) where comment_id is not null;
