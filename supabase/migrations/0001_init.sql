-- 커뮤니티 사이트 초기 DB 구조
-- Supabase SQL Editor에 그대로 붙여넣어 실행하거나 `supabase db push`로 적용합니다.

-- ───────────── 회원 프로필 ─────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null unique check (char_length(nickname) between 2 and 20),
  role        text not null default 'user' check (role in ('user', 'admin')),
  is_banned   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 관리자 여부 확인 (RLS 정책에서 사용)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- 정지되지 않은 로그인 회원인지 확인
create or replace function public.is_active_member()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and not is_banned
  );
$$;

-- 회원가입 시 프로필 자동 생성 (닉네임은 가입 폼에서 전달)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''),
      '회원' || substr(replace(new.id::text, '-', ''), 1, 8)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 일반 회원이 자신의 role / is_banned 를 바꾸지 못하게 막음
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.is_banned is distinct from old.is_banned)
     and (select auth.uid()) is not null
     and not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ───────────── 게시판 (관리자가 자유롭게 추가) ─────────────
create table public.boards (
  id          bigint generated always as identity primary key,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,30}$'),
  name        text not null check (char_length(name) between 1 and 30),
  description text not null default '',
  type        text not null default 'normal' check (type in ('normal', 'gallery')),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ───────────── 게시글 ─────────────
create table public.posts (
  id            bigint generated always as identity primary key,
  board_id      bigint not null references public.boards (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 100),
  content       text not null check (char_length(content) <= 20000),
  thumbnail_path text,
  is_notice     boolean not null default false,
  view_count    integer not null default 0,
  like_count    integer not null default 0,
  dislike_count integer not null default 0,
  comment_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index posts_board_created_idx on public.posts (board_id, created_at desc);
create index posts_author_idx on public.posts (author_id);
create index posts_popular_idx on public.posts (like_count desc, created_at desc);

-- 게시글에 첨부된 사진 (Supabase Storage 'post-images' 버킷의 경로)
create table public.post_images (
  id           bigint generated always as identity primary key,
  post_id      bigint not null references public.posts (id) on delete cascade,
  storage_path text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index post_images_post_idx on public.post_images (post_id, sort_order);

-- ───────────── 댓글 (대댓글 1단계) ─────────────
create table public.comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  parent_id  bigint references public.comments (id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

-- ───────────── 추천 / 비추천 ─────────────
create table public.post_votes (
  post_id    bigint not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  value      smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ───────────── 신고 ─────────────
create table public.reports (
  id          bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  post_id     bigint references public.posts (id) on delete cascade,
  comment_id  bigint references public.comments (id) on delete cascade,
  reason      text not null check (char_length(reason) between 1 and 500),
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id) = 1)
);
create index reports_status_idx on public.reports (status, created_at desc);

-- ───────────── 자동 집계 (댓글 수, 추천 수) ─────────────
create or replace function public.sync_comment_count()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger sync_comment_count
  after insert or delete on public.comments
  for each row execute function public.sync_comment_count();

create or replace function public.sync_vote_count()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  target bigint := coalesce(new.post_id, old.post_id);
begin
  update public.posts p set
    like_count    = (select count(*) from public.post_votes v where v.post_id = target and v.value = 1),
    dislike_count = (select count(*) from public.post_votes v where v.post_id = target and v.value = -1)
  where p.id = target;
  return null;
end;
$$;

create trigger sync_vote_count
  after insert or update or delete on public.post_votes
  for each row execute function public.sync_vote_count();

-- 집계 값과 작성자, 공지 여부는 일반 회원이 직접 바꾸지 못하게 막음
create or replace function public.protect_post_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- 집계 트리거나 조회수 함수가 바꾸는 경우는 그대로 허용 (updated_at 도 유지)
  if pg_trigger_depth() > 1 or current_setting('app.allow_post_counters', true) = '1' then
    return new;
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

create trigger protect_post_fields
  before update on public.posts
  for each row execute function public.protect_post_fields();

-- 조회수 증가 (누구나 호출 가능)
create or replace function public.increment_view_count(target_post_id bigint)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform set_config('app.allow_post_counters', '1', true);
  update public.posts set view_count = view_count + 1 where id = target_post_id;
  perform set_config('app.allow_post_counters', '', true);
end;
$$;

-- ───────────── 접근 권한 (RLS) ─────────────
alter table public.profiles    enable row level security;
alter table public.boards      enable row level security;
alter table public.posts       enable row level security;
alter table public.post_images enable row level security;
alter table public.comments    enable row level security;
alter table public.post_votes  enable row level security;
alter table public.reports     enable row level security;

-- 프로필: 누구나 조회, 본인만 수정(닉네임), 관리자는 모두 수정
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update
  using ((select auth.uid()) = id or public.is_admin())
  with check ((select auth.uid()) = id or public.is_admin());

-- 게시판: 활성 게시판은 누구나 조회, 관리는 관리자만
create policy "boards_select" on public.boards for select using (is_active or public.is_admin());
create policy "boards_admin_insert" on public.boards for insert with check (public.is_admin());
create policy "boards_admin_update" on public.boards for update using (public.is_admin()) with check (public.is_admin());
create policy "boards_admin_delete" on public.boards for delete using (public.is_admin());

-- 게시글: 누구나 조회, 회원만 작성, 본인 또는 관리자만 수정/삭제
create policy "posts_select" on public.posts for select using (true);
create policy "posts_insert" on public.posts for insert
  with check (
    (select auth.uid()) = author_id
    and public.is_active_member()
    and (not is_notice or public.is_admin())
    and exists (select 1 from public.boards b where b.id = board_id and b.is_active)
  );
create policy "posts_update" on public.posts for update
  using (((select auth.uid()) = author_id and public.is_active_member()) or public.is_admin())
  with check (((select auth.uid()) = author_id and public.is_active_member()) or public.is_admin());
create policy "posts_delete" on public.posts for delete
  using ((select auth.uid()) = author_id or public.is_admin());

-- 첨부 사진: 누구나 조회, 글 작성자 또는 관리자만 추가/삭제
create policy "post_images_select" on public.post_images for select using (true);
create policy "post_images_insert" on public.post_images for insert
  with check (
    public.is_active_member()
    and exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
  );
create policy "post_images_delete" on public.post_images for delete
  using (
    public.is_admin()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
  );

-- 댓글: 누구나 조회, 회원만 작성, 본인 또는 관리자만 수정/삭제
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert
  with check ((select auth.uid()) = author_id and public.is_active_member());
create policy "comments_update" on public.comments for update
  using (((select auth.uid()) = author_id and public.is_active_member()) or public.is_admin())
  with check (((select auth.uid()) = author_id and public.is_active_member()) or public.is_admin());
create policy "comments_delete" on public.comments for delete
  using ((select auth.uid()) = author_id or public.is_admin());

-- 추천: 본인 기록만 조회/관리
create policy "post_votes_select" on public.post_votes for select using ((select auth.uid()) = user_id);
create policy "post_votes_insert" on public.post_votes for insert
  with check ((select auth.uid()) = user_id and public.is_active_member());
create policy "post_votes_update" on public.post_votes for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "post_votes_delete" on public.post_votes for delete using ((select auth.uid()) = user_id);

-- 신고: 회원이 접수, 조회와 처리는 관리자만
create policy "reports_insert" on public.reports for insert
  with check ((select auth.uid()) = reporter_id and public.is_active_member());
create policy "reports_admin_select" on public.reports for select using (public.is_admin());
create policy "reports_admin_update" on public.reports for update using (public.is_admin()) with check (public.is_admin());
create policy "reports_admin_delete" on public.reports for delete using (public.is_admin());

-- ───────────── 사진 저장소 (Storage) ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- 파일 경로는 "<회원 id>/<파일명>" 형식. 본인 폴더에만 올릴 수 있음
create policy "post_images_storage_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_member()
  );
create policy "post_images_storage_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

-- ───────────── 기본 게시판 ─────────────
insert into public.boards (slug, name, description, type, sort_order) values
  ('free',    '자유게시판', '자유롭게 이야기를 나누는 곳', 'normal',  1),
  ('humor',   '유머게시판', '재미있는 글과 짤',           'normal',  2),
  ('gallery', '사진갤러리', '사진을 올리고 구경하는 곳',   'gallery', 3);
