-- 마스코트 키우기 + 오늘의 질문
-- Supabase SQL Editor에 전체를 붙여넣고 Run 을 누르면 됩니다. (한 번만 실행)

-- 한국 시간 기준 오늘 날짜
create or replace function public.kst_today()
returns date
language sql stable set search_path = ''
as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;

-- ═══════════════════ 1. 마스코트 키우기 ═══════════════════
-- 글 10점, 댓글 3점, 추천 1점(글마다 처음 한 번), 오늘의 질문 답 5점.
-- 한 사람이 하루에 보탤 수 있는 점수는 최대 60점이라 도배로 키울 수 없습니다.
-- 점수는 DB 안의 트리거만 올릴 수 있고, 사이트나 회원이 직접 바꿀 수 없습니다.

-- 날마다 커뮤니티 전체 활동 (누구나 조회)
create table public.community_daily_stats (
  day      date primary key,
  posts    integer not null default 0,
  comments integer not null default 0,
  votes    integer not null default 0,
  answers  integer not null default 0,
  xp       integer not null default 0
);

-- 회원별 하루 점수 (하루 최대치를 지키기 위한 기록)
create table public.member_daily_xp (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day     date not null,
  xp      integer not null default 0,
  primary key (user_id, day)
);

-- 추천 점수를 받은 글 기록 (추천을 눌렀다 껐다 반복해도 한 번만 인정)
create table public.vote_xp_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id bigint not null references public.posts (id) on delete cascade,
  primary key (user_id, post_id)
);

create or replace function public.add_community_xp(kind text, member uuid, amount integer)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  today   date := public.kst_today();
  daily_cap constant integer := 60;
  current_xp integer;
  granted integer;
begin
  insert into public.member_daily_xp (user_id, day) values (member, today)
  on conflict do nothing;
  select xp into current_xp from public.member_daily_xp
  where user_id = member and day = today
  for update;
  granted := greatest(0, least(amount, daily_cap - coalesce(current_xp, 0)));
  if granted > 0 then
    update public.member_daily_xp set xp = xp + granted where user_id = member and day = today;
  end if;

  insert into public.community_daily_stats as s (day, posts, comments, votes, answers, xp)
  values (
    today,
    (kind = 'post')::int,
    (kind = 'comment')::int,
    (kind = 'vote')::int,
    (kind = 'answer')::int,
    granted
  )
  on conflict (day) do update set
    posts    = s.posts + excluded.posts,
    comments = s.comments + excluded.comments,
    votes    = s.votes + excluded.votes,
    answers  = s.answers + excluded.answers,
    xp       = s.xp + excluded.xp;
end;
$$;
-- 트리거 안에서만 쓰고, 사이트에서 직접 부를 수 없게 막습니다.
revoke execute on function public.add_community_xp(text, uuid, integer) from public, anon, authenticated;

create or replace function public.xp_on_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- 익명 글/댓글(작성자 없음)은 개인 상한 기록 없이 넘어갑니다.
  if new.author_id is not null then
    perform public.add_community_xp('post', new.author_id, 10);
  end if;
  return null;
end;
$$;
create trigger xp_on_post after insert on public.posts
  for each row execute function public.xp_on_post();

create or replace function public.xp_on_comment()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- 익명 글/댓글(작성자 없음)은 개인 상한 기록 없이 넘어갑니다.
  if new.author_id is not null then
    perform public.add_community_xp('comment', new.author_id, 3);
  end if;
  return null;
end;
$$;
create trigger xp_on_comment after insert on public.comments
  for each row execute function public.xp_on_comment();

create or replace function public.xp_on_vote()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.vote_xp_log (user_id, post_id) values (new.user_id, new.post_id)
  on conflict do nothing;
  if found then
    perform public.add_community_xp('vote', new.user_id, 1);
  end if;
  return null;
end;
$$;
create trigger xp_on_vote after insert on public.post_votes
  for each row execute function public.xp_on_vote();

-- 마스코트 상태: 지금까지 모은 점수와 오늘 활동
create or replace function public.get_mascot_state()
returns json
language sql stable security definer set search_path = ''
as $$
  select json_build_object(
    'total_xp', coalesce((select sum(xp) from public.community_daily_stats), 0),
    'today', coalesce(
      (select json_build_object('posts', posts, 'comments', comments, 'votes', votes, 'answers', answers, 'xp', xp)
         from public.community_daily_stats where day = public.kst_today()),
      json_build_object('posts', 0, 'comments', 0, 'votes', 0, 'answers', 0, 'xp', 0)
    )
  );
$$;

-- 지금까지 쌓인 글·댓글·추천도 점수로 쳐 줍니다. (같은 하루 최대치 적용)
with acts as (
  select author_id as uid, (created_at at time zone 'Asia/Seoul')::date as day, 'post' as kind, 10 as pts from public.posts
  union all
  select author_id, (created_at at time zone 'Asia/Seoul')::date, 'comment', 3 from public.comments
  union all
  select user_id, (created_at at time zone 'Asia/Seoul')::date, 'vote', 1 from public.post_votes
), per_member as (
  select uid, day, least(sum(pts), 60)::int as xp from acts where uid is not null group by uid, day
), member_rows as (
  insert into public.member_daily_xp (user_id, day, xp)
  select uid, day, xp from per_member
  on conflict (user_id, day) do nothing
  returning 1
)
insert into public.community_daily_stats (day, posts, comments, votes, answers, xp)
select
  a.day,
  count(*) filter (where kind = 'post'),
  count(*) filter (where kind = 'comment'),
  count(*) filter (where kind = 'vote'),
  0,
  (select coalesce(sum(m.xp), 0) from per_member m where m.day = a.day)
from acts a
group by a.day
on conflict (day) do nothing;

insert into public.vote_xp_log (user_id, post_id)
select user_id, post_id from public.post_votes
on conflict do nothing;

-- ═══════════════════ 2. 오늘의 질문 ═══════════════════
-- 관리자가 질문을 줄 세워 두면, 한국 시간 자정마다 맨 앞 질문이 열립니다.
-- 그날 처음 누군가 사이트를 열 때 질문이 정해지므로 따로 예약 작업이 필요 없어요.
-- 답을 남겨야 다른 사람의 답이 보이고, 다음 날 자정에 마감되면 모두에게 공개됩니다.

create table public.daily_questions (
  id           bigint generated always as identity primary key,
  content      text not null check (char_length(content) between 2 and 200),
  open_date    date unique,           -- 열린 날짜 (아직 대기 중이면 비어 있음)
  queue_order  integer not null default 0,
  answer_count integer not null default 0,
  created_at   timestamptz not null default now()
);
create index daily_questions_queue_idx on public.daily_questions (queue_order, id) where open_date is null;

create table public.daily_answers (
  id          bigint generated always as identity primary key,
  question_id bigint not null references public.daily_questions (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 300),
  like_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (question_id, author_id)
);
create index daily_answers_best_idx on public.daily_answers (question_id, like_count desc, created_at);

create table public.daily_answer_likes (
  answer_id  bigint not null references public.daily_answers (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);

-- 질문이 오늘 열려 있는지 / 이미 마감됐는지
create or replace function public.question_is_open(target bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.daily_questions where id = target and open_date = public.kst_today());
$$;

create or replace function public.question_is_closed(target bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.daily_questions where id = target and open_date < public.kst_today());
$$;

-- 내가 이 질문에 답했는지
create or replace function public.has_answered(target bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.daily_answers
    where question_id = target and author_id = (select auth.uid())
  );
$$;

-- 이 답에 좋아요를 누를 수 있는지: 열린 질문 + 나도 답함 + 내 답이 아님
create or replace function public.can_like_answer(target bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.daily_answers a
    where a.id = target
      and a.author_id <> (select auth.uid())
      and public.question_is_open(a.question_id)
      and public.has_answered(a.question_id)
  );
$$;

-- 오늘의 질문 (없으면 대기 중인 맨 앞 질문을 오늘 질문으로 엽니다)
create or replace function public.get_today_question()
returns table (id bigint, content text, open_date date, answer_count integer)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  today date := public.kst_today();
  next_id bigint;
begin
  if not exists (select 1 from public.daily_questions q where q.open_date = today) then
    select q.id into next_id from public.daily_questions q
    where q.open_date is null
    order by q.queue_order, q.id
    limit 1
    for update skip locked;
    if next_id is not null then
      begin
        update public.daily_questions q set open_date = today where q.id = next_id;
      exception when unique_violation then
        null; -- 같은 순간 다른 방문자가 먼저 열었으면 그 질문을 씁니다.
      end;
    end if;
  end if;
  return query
    select q.id, q.content, q.open_date, q.answer_count
    from public.daily_questions q where q.open_date = today;
end;
$$;

-- 답 수, 좋아요 수 자동 집계
create or replace function public.sync_answer_count()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.daily_questions set answer_count = answer_count + 1 where id = new.question_id;
    perform public.add_community_xp('answer', new.author_id, 5);
  else
    update public.daily_questions set answer_count = greatest(answer_count - 1, 0) where id = old.question_id;
  end if;
  return null;
end;
$$;
create trigger sync_answer_count after insert or delete on public.daily_answers
  for each row execute function public.sync_answer_count();

create or replace function public.sync_answer_like_count()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  target bigint := coalesce(new.answer_id, old.answer_id);
begin
  update public.daily_answers a
  set like_count = (select count(*) from public.daily_answer_likes l where l.answer_id = target)
  where a.id = target;
  return null;
end;
$$;
create trigger sync_answer_like_count after insert or delete on public.daily_answer_likes
  for each row execute function public.sync_answer_like_count();

-- 명예의 전당: 마감된 질문마다 좋아요를 가장 많이 받은 답
create view public.daily_hall_of_fame with (security_invoker = true) as
select
  q.id as question_id,
  q.content as question,
  q.open_date,
  q.answer_count,
  best.answer_id,
  best.answer,
  best.like_count,
  best.nickname
from public.daily_questions q
left join lateral (
  select a.id as answer_id, a.content as answer, a.like_count, p.nickname
  from public.daily_answers a
  left join public.profiles p on p.id = a.author_id
  where a.question_id = q.id and a.like_count > 0
  order by a.like_count desc, a.created_at
  limit 1
) best on true
where q.open_date < public.kst_today();

-- ═══════════════════ 접근 권한 ═══════════════════
alter table public.community_daily_stats enable row level security;
alter table public.member_daily_xp      enable row level security;
alter table public.vote_xp_log          enable row level security;
alter table public.daily_questions      enable row level security;
alter table public.daily_answers        enable row level security;
alter table public.daily_answer_likes   enable row level security;

-- 점수 표는 읽기만 가능 (쓰기 규칙이 없으므로 트리거 말고는 아무도 못 바꿉니다)
revoke insert, update, delete on public.community_daily_stats, public.member_daily_xp, public.vote_xp_log
  from anon, authenticated;
grant select on public.community_daily_stats to anon, authenticated;
grant select on public.member_daily_xp to authenticated;
create policy "community_daily_stats_select" on public.community_daily_stats for select using (true);
create policy "member_daily_xp_select" on public.member_daily_xp for select using ((select auth.uid()) = user_id);

grant select on public.daily_questions, public.daily_answers, public.daily_hall_of_fame to anon, authenticated;
grant insert, update, delete on public.daily_questions to authenticated;
grant insert, delete on public.daily_answers to authenticated;
revoke update on public.daily_answers from anon, authenticated;
grant select, insert, delete on public.daily_answer_likes to authenticated;
grant execute on function public.get_today_question() to anon, authenticated;
grant execute on function public.get_mascot_state() to anon, authenticated;
grant execute on function public.kst_today() to anon, authenticated;

-- 질문: 이미 열린 질문은 누구나, 대기 중인 질문은 관리자만 봅니다. 관리는 관리자만.
create policy "daily_questions_select" on public.daily_questions for select
  using (open_date <= public.kst_today() or public.is_admin());
create policy "daily_questions_admin_insert" on public.daily_questions for insert with check (public.is_admin());
create policy "daily_questions_admin_update" on public.daily_questions for update
  using (public.is_admin()) with check (public.is_admin());
create policy "daily_questions_admin_delete" on public.daily_questions for delete using (public.is_admin());

-- 답: 마감된 질문의 답은 누구나, 오늘 질문의 답은 나도 답한 뒤에만 보입니다.
create policy "daily_answers_select" on public.daily_answers for select
  using (
    public.question_is_closed(question_id)
    or author_id = (select auth.uid())
    or public.has_answered(question_id)
    or public.is_admin()
  );
create policy "daily_answers_insert" on public.daily_answers for insert
  with check (
    (select auth.uid()) = author_id
    and public.is_active_member()
    and public.question_is_open(question_id)
  );
create policy "daily_answers_delete" on public.daily_answers for delete
  using (((select auth.uid()) = author_id and public.question_is_open(question_id)) or public.is_admin());

-- 좋아요: 본인 기록만 보고, 열린 질문에 답한 사람만 남의 답에 누를 수 있습니다.
create policy "daily_answer_likes_select" on public.daily_answer_likes for select
  using ((select auth.uid()) = user_id);
create policy "daily_answer_likes_insert" on public.daily_answer_likes for insert
  with check ((select auth.uid()) = user_id and public.is_active_member() and public.can_like_answer(answer_id));
create policy "daily_answer_likes_delete" on public.daily_answer_likes for delete
  using ((select auth.uid()) = user_id and public.can_like_answer(answer_id));

-- ═══════════════════ 시작 질문 30개 ═══════════════════
insert into public.daily_questions (content, queue_order) values
  ('요즘 나를 가장 웃게 만든 일은 뭐예요?', 1),
  ('딱 하루 동안 아무 능력이나 가질 수 있다면?', 2),
  ('최근에 먹은 것 중 제일 맛있었던 음식은?', 3),
  ('무인도에 딱 세 가지만 가져갈 수 있다면?', 4),
  ('어릴 때 꿈은 뭐였어요?', 5),
  ('스트레스 받을 때 나만의 푸는 방법은?', 6),
  ('인생 영화나 드라마 하나만 추천해 주세요!', 7),
  ('10년 전의 나에게 한마디 할 수 있다면?', 8),
  ('요즘 빠져 있는 노래는?', 9),
  ('가장 기억에 남는 여행지는 어디예요?', 10),
  ('복권 1등에 당첨되면 제일 먼저 할 일은?', 11),
  ('나만 아는 숨은 맛집 메뉴를 알려 주세요.', 12),
  ('아침형 인간 vs 저녁형 인간, 당신은?', 13),
  ('최근에 새로 배운 것이 있나요?', 14),
  ('나를 동물에 비유한다면?', 15),
  ('평생 한 가지 음식만 먹어야 한다면?', 16),
  ('요즘 가장 갖고 싶은 물건은?', 17),
  ('주말에 가장 하고 싶은 일은?', 18),
  ('짜장면 vs 짬뽕, 그리고 그 이유는?', 19),
  ('나의 소소한 행복은 무엇인가요?', 20),
  ('타임머신이 있다면 과거와 미래 중 어디로?', 21),
  ('최근에 누군가에게 고마웠던 순간은?', 22),
  ('여름 vs 겨울, 어느 쪽이 더 좋아요?', 23),
  ('나만의 잠 잘 오는 비법이 있나요?', 24),
  ('올해 꼭 이루고 싶은 목표 하나는?', 25),
  ('지금 당장 떠날 수 있다면 어디로 갈래요?', 26),
  ('나의 최애 간식은?', 27),
  ('가장 좋아하는 계절의 냄새는?', 28),
  ('하루가 25시간이라면 남는 1시간에 뭘 할래요?', 29),
  ('이 커뮤니티에 바라는 점이 있다면?', 30);
