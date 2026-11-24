-- 웹게임 순위표
-- Supabase SQL Editor에 전체를 붙여넣고 Run 을 누르면 됩니다. (한 번만 실행)
--
-- 게임마다 회원별 최고 기록 하나만 남깁니다.
--   jump   뭉치 점프   점수 (높을수록 좋음)
--   cards  짝꿍 카드   걸린 시간 ms (낮을수록 좋음)
--   reflex 번개 반응   5번 평균 반응속도 ms (낮을수록 좋음)
-- 기록은 submit_game_score 함수로만 저장되고, 사람이 낼 수 없는 기록은 거절합니다.

create table public.game_records (
  game       text not null check (game in ('jump', 'cards', 'reflex')),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  score      integer not null,
  plays      integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (game, user_id)
);

create index game_records_rank_idx on public.game_records (game, score);

alter table public.game_records enable row level security;
-- 순위표는 누구나 볼 수 있고, 쓰기는 아래 함수만 합니다.
create policy "game_records_select" on public.game_records for select using (true);

create or replace function public.submit_game_score(p_game text, p_score integer)
returns table (best integer, is_new_best boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  old_best integer;
  higher_better boolean := p_game = 'jump';
begin
  if me is null then
    raise exception 'login required';
  end if;
  if exists (select 1 from public.profiles where id = me and is_banned) then
    raise exception 'banned';
  end if;

  -- 사람이 낼 수 있는 범위만 받습니다.
  if p_game = 'jump' then
    if p_score < 0 or p_score > 100000 then raise exception 'invalid score'; end if;
  elsif p_game = 'cards' then
    if p_score < 6000 or p_score > 3600000 then raise exception 'invalid score'; end if;
  elsif p_game = 'reflex' then
    if p_score < 100 or p_score > 5000 then raise exception 'invalid score'; end if;
  else
    raise exception 'unknown game';
  end if;

  select r.score into old_best from public.game_records r
  where r.game = p_game and r.user_id = me
  for update;

  if old_best is null then
    insert into public.game_records (game, user_id, score) values (p_game, me, p_score);
    return query select p_score, true;
  elsif (higher_better and p_score > old_best) or (not higher_better and p_score < old_best) then
    update public.game_records
    set score = p_score, plays = plays + 1, updated_at = now()
    where game = p_game and user_id = me;
    return query select p_score, true;
  else
    update public.game_records set plays = plays + 1 where game = p_game and user_id = me;
    return query select old_best, false;
  end if;
end;
$$;
revoke execute on function public.submit_game_score(text, integer) from public, anon;
grant execute on function public.submit_game_score(text, integer) to authenticated;
