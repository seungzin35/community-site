-- 익명 게시판 (예: 익명 고민상담소)
-- Supabase SQL Editor에 그대로 붙여넣어 한 번 실행합니다. 여러 번 실행해도 괜찮아요.
--
-- 익명 글/댓글은 posts.author_id / comments.author_id 를 비워 두고(null),
-- 실제 작성자는 따로 anonymous_owners 표에 적어 둡니다.
-- 이 표는 본인과 관리자만 읽을 수 있어서, 사이트 화면은 물론 공개 API로도 작성자를 알 수 없어요.
-- (관리자는 규칙 위반 글을 처리할 수 있도록 작성자를 볼 수 있습니다.)

-- ───────────── 표 바꾸기 ─────────────
alter table public.boards add column if not exists is_anonymous boolean not null default false;

alter table public.posts alter column author_id drop not null;
alter table public.posts add column if not exists is_anonymous boolean not null default false;

alter table public.comments alter column author_id drop not null;
-- 익명 댓글 표시 번호: null = 닉네임으로 표시, 0 = 글쓴이, 1 이상 = 익명1, 익명2 ...
alter table public.comments add column if not exists anon_label smallint;

create table if not exists public.anonymous_owners (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  post_id    bigint unique references public.posts (id) on delete cascade,
  comment_id bigint unique references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id) = 1)
);
create index if not exists anonymous_owners_user_idx on public.anonymous_owners (user_id);

alter table public.anonymous_owners enable row level security;
-- 로그인하지 않은 방문자는 아예 읽을 수 없고, 회원은 자기 것만, 관리자는 전부 읽습니다.
-- 추가/수정/삭제 규칙은 일부러 만들지 않았어요. 아래 함수로만 기록됩니다.
revoke all on public.anonymous_owners from anon;
revoke insert, update, delete on public.anonymous_owners from authenticated;
grant select on public.anonymous_owners to authenticated;
drop policy if exists "anonymous_owners_select" on public.anonymous_owners;
create policy "anonymous_owners_select" on public.anonymous_owners for select
  using ((select auth.uid()) = user_id or public.is_admin());

-- ───────────── 본인 확인 함수 ─────────────
create or replace function public.owns_anonymous_post(target_post_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.anonymous_owners
    where post_id = target_post_id and user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_anonymous_comment(target_comment_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.anonymous_owners
    where comment_id = target_comment_id and user_id = (select auth.uid())
  );
$$;

-- ───────────── 익명 글 쓰기 ─────────────
create or replace function public.create_anonymous_post(target_board_id bigint, post_title text, post_content text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  new_id bigint;
begin
  if not public.is_active_member() then
    raise exception '로그인한 회원만 글을 쓸 수 있어요.';
  end if;
  if not exists (select 1 from public.boards where id = target_board_id and is_active and is_anonymous) then
    raise exception '익명 게시판이 아니에요.';
  end if;

  insert into public.posts (board_id, author_id, title, content, is_anonymous)
  values (target_board_id, null, trim(post_title), trim(post_content), true)
  returning id into new_id;

  insert into public.anonymous_owners (user_id, post_id) values ((select auth.uid()), new_id);
  return new_id;
end;
$$;

-- ───────────── 익명 댓글 쓰기 ─────────────
-- 같은 글 안에서는 같은 사람이 같은 번호(익명1, 익명2 ...)로 보이고, 글쓴이는 '글쓴이'로 보여요.
-- 다른 글에서는 번호가 새로 매겨져서 사람을 이어서 추적할 수 없어요.
create or replace function public.create_anonymous_comment(target_post_id bigint, target_parent_id bigint, comment_content text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  label smallint;
  new_id bigint;
begin
  if not public.is_active_member() then
    raise exception '로그인한 회원만 댓글을 쓸 수 있어요.';
  end if;
  if not exists (select 1 from public.posts where id = target_post_id and is_anonymous) then
    raise exception '익명 글이 아니에요.';
  end if;
  if target_parent_id is not null
     and not exists (select 1 from public.comments where id = target_parent_id and post_id = target_post_id) then
    raise exception '답글을 달 댓글을 찾을 수 없어요.';
  end if;

  -- 같은 글에 동시에 댓글이 달려도 번호가 겹치지 않게 잠깐 줄을 세웁니다.
  perform pg_advisory_xact_lock(target_post_id);

  if exists (select 1 from public.anonymous_owners where post_id = target_post_id and user_id = me) then
    label := 0;
  else
    select c.anon_label into label
    from public.comments c
    join public.anonymous_owners o on o.comment_id = c.id
    where c.post_id = target_post_id and o.user_id = me and c.anon_label > 0
    limit 1;
    if label is null then
      select coalesce(max(anon_label), 0) + 1 into label from public.comments where post_id = target_post_id;
    end if;
  end if;

  insert into public.comments (post_id, author_id, parent_id, content, anon_label)
  values (target_post_id, null, target_parent_id, trim(comment_content), label)
  returning id into new_id;

  insert into public.anonymous_owners (user_id, comment_id) values (me, new_id);
  return new_id;
end;
$$;

revoke execute on function public.create_anonymous_post(bigint, text, text) from public, anon;
revoke execute on function public.create_anonymous_comment(bigint, bigint, text) from public, anon;
grant execute on function public.create_anonymous_post(bigint, text, text) to authenticated;
grant execute on function public.create_anonymous_comment(bigint, bigint, text) to authenticated;
grant execute on function public.owns_anonymous_post(bigint) to anon, authenticated;
grant execute on function public.owns_anonymous_comment(bigint) to anon, authenticated;

-- ───────────── 권한 규칙 다시 만들기 ─────────────
-- 익명 게시판에는 위 함수로만 글/댓글을 쓸 수 있고(닉네임이 붙은 글이 섞이지 않게),
-- 익명 글/댓글의 수정·삭제는 실제 작성자 또는 관리자만 할 수 있어요.
drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts for insert
  with check (
    (select auth.uid()) = author_id
    and public.is_active_member()
    and (not is_notice or public.is_admin())
    and not is_anonymous
    and exists (select 1 from public.boards b where b.id = board_id and b.is_active and not b.is_anonymous)
  );

drop policy if exists "posts_update" on public.posts;
create policy "posts_update" on public.posts for update
  using (
    (((select auth.uid()) = author_id or public.owns_anonymous_post(id)) and public.is_active_member())
    or public.is_admin()
  )
  with check (
    (((select auth.uid()) = author_id or public.owns_anonymous_post(id)) and public.is_active_member())
    or public.is_admin()
  );

drop policy if exists "posts_delete" on public.posts;
create policy "posts_delete" on public.posts for delete
  using ((select auth.uid()) = author_id or public.owns_anonymous_post(id) or public.is_admin());

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert
  with check (
    (select auth.uid()) = author_id
    and public.is_active_member()
    and anon_label is null
    and not exists (select 1 from public.posts p where p.id = post_id and p.is_anonymous)
  );

drop policy if exists "comments_update" on public.comments;
create policy "comments_update" on public.comments for update
  using (
    (((select auth.uid()) = author_id or public.owns_anonymous_comment(id)) and public.is_active_member())
    or public.is_admin()
  )
  with check (
    (((select auth.uid()) = author_id or public.owns_anonymous_comment(id)) and public.is_active_member())
    or public.is_admin()
  );

drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments for delete
  using ((select auth.uid()) = author_id or public.owns_anonymous_comment(id) or public.is_admin());

-- 익명 글은 사진을 받지 않습니다(사진 파일 경로에 회원 번호가 들어가서 작성자가 드러날 수 있어요).
drop policy if exists "post_images_insert" on public.post_images;
create policy "post_images_insert" on public.post_images for insert
  with check (
    public.is_active_member()
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = (select auth.uid()) and not p.is_anonymous
    )
  );

-- 글을 고칠 때 익명 여부와 작성자는 바뀌지 않게 지킵니다.
create or replace function public.protect_post_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- 집계 트리거나 조회수 함수가 바꾸는 경우는 그대로 허용 (updated_at 도 유지)
  if pg_trigger_depth() > 1 or current_setting('app.allow_post_counters', true) = '1' then
    return new;
  end if;
  new.is_anonymous := old.is_anonymous;
  if old.is_anonymous then
    new.author_id := null;
  end if;
  if (select auth.uid()) is not null and not public.is_admin() then
    new.author_id     := old.author_id;
    new.board_id      := old.board_id;
    new.is_notice     := old.is_notice;
    new.view_count    := old.view_count;
    new.like_count    := old.like_count;
    new.dislike_count := old.dislike_count;
    new.comment_count := old.comment_count;
    new.created_at    := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.protect_comment_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.author_id  := old.author_id;
  new.post_id    := old.post_id;
  new.parent_id  := old.parent_id;
  new.anon_label := old.anon_label;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists protect_comment_fields on public.comments;
create trigger protect_comment_fields
  before update on public.comments
  for each row execute function public.protect_comment_fields();

-- ───────────── 기본 익명 게시판 ─────────────
insert into public.boards (slug, name, description, type, sort_order, is_anonymous)
values ('advice', '익명 고민상담소', '닉네임 없이 털어놓는 고민, 함께 들어 드려요', 'normal', 4, true)
on conflict (slug) do nothing;

