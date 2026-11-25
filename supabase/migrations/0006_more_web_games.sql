-- 웹게임 추가: 뭉치 합치기, 뭉치 탑 쌓기, 풍선 뭉치, 오늘의 초성 퀴즈
-- 0005_web_games.sql 을 실행한 다음, 이 파일 전체를 SQL Editor에 붙여넣고 Run (한 번만 실행)

-- ═══════════════════ 1. 새 게임 순위표 ═══════════════════
alter table public.game_records drop constraint if exists game_records_game_check;
alter table public.game_records add constraint game_records_game_check
  check (game in ('merge', 'jump', 'tower', 'balloon', 'cards', 'reflex'));

create or replace function public.submit_game_score(p_game text, p_score integer)
returns table (best integer, is_new_best boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  old_best integer;
  higher_better boolean := p_game in ('merge', 'jump', 'tower', 'balloon');
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
  elsif p_game = 'merge' then
    if p_score < 0 or p_score > 1000000 then raise exception 'invalid score'; end if;
  elsif p_game = 'tower' then
    if p_score < 0 or p_score > 5000 then raise exception 'invalid score'; end if;
  elsif p_game = 'balloon' then
    if p_score < 0 or p_score > 20000 then raise exception 'invalid score'; end if;
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

-- ═══════════════════ 2. 오늘의 초성 퀴즈 ═══════════════════
-- 정답 단어는 이 표에만 있고, 사이트에서는 직접 읽을 수 없습니다. (채점은 DB 함수가 함)
create table public.quiz_words (
  id       serial primary key,
  word     text not null unique,
  category text not null,
  hint     text not null
);
alter table public.quiz_words enable row level security;
-- 정책이 없으므로 아무도 직접 읽거나 쓸 수 없습니다. (관리자는 Supabase 화면에서 단어 추가)

-- 회원별 하루 기록
create table public.quiz_plays (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  day        date not null,
  guesses    text[] not null default '{}',
  solved     boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.quiz_plays enable row level security;
create policy "quiz_plays_select_own" on public.quiz_plays for select using (user_id = auth.uid());

-- 한글 단어 → 초성 (예: 고양이 → ㄱㅇㅇ)
create or replace function public.to_chosung(p_word text)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  initials constant text[] := array['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  result text := '';
  ch text;
  code integer;
begin
  foreach ch in array regexp_split_to_array(p_word, '') loop
    code := ascii(ch);
    if code between 44032 and 55203 then
      result := result || initials[(code - 44032) / 588 + 1];
    else
      result := result || ch;
    end if;
  end loop;
  return result;
end;
$$;

-- 오늘의 단어 (단어 목록을 날마다 하나씩 돌아가며)
create or replace function public.quiz_word_for(p_day date)
returns public.quiz_words
language sql stable security definer set search_path = ''
as $$
  select w.* from public.quiz_words w
  order by w.id
  offset ((p_day - date '2026-11-24') % greatest((select count(*) from public.quiz_words), 1)
          + greatest((select count(*) from public.quiz_words), 1))
         % greatest((select count(*) from public.quiz_words), 1)
  limit 1;
$$;
revoke execute on function public.quiz_word_for(date) from public, anon, authenticated;

-- 글자별 결과: 2 = 자리까지 맞음, 1 = 다른 자리에 있음, 0 = 없음
create or replace function public.quiz_marks(p_answer text, p_guess text)
returns integer[]
language plpgsql immutable set search_path = ''
as $$
declare
  a text[] := regexp_split_to_array(p_answer, '');
  g text[] := regexp_split_to_array(p_guess, '');
  marks integer[] := array_fill(0, array[array_length(g, 1)]);
  used boolean[] := array_fill(false, array[array_length(a, 1)]);
  i integer;
  j integer;
begin
  for i in 1 .. array_length(g, 1) loop
    if i <= array_length(a, 1) and g[i] = a[i] then
      marks[i] := 2;
      used[i] := true;
    end if;
  end loop;
  for i in 1 .. array_length(g, 1) loop
    if marks[i] = 0 then
      for j in 1 .. array_length(a, 1) loop
        if not used[j] and g[i] = a[j] then
          marks[i] := 1;
          used[j] := true;
          exit;
        end if;
      end loop;
    end if;
  end loop;
  return marks;
end;
$$;

-- 오늘 문제 + 내 진행 상황 (끝난 사람에게만 정답을 알려 줌)
create or replace function public.get_quiz_today()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  today date := public.kst_today();
  w public.quiz_words;
  play public.quiz_plays;
  solvers integer;
  done boolean;
begin
  w := public.quiz_word_for(today);
  if w.id is null then
    return null;
  end if;
  if auth.uid() is not null then
    select * into play from public.quiz_plays where user_id = auth.uid() and day = today;
  end if;
  select count(*) into solvers from public.quiz_plays where day = today and solved;
  done := coalesce(play.solved, false) or coalesce(array_length(play.guesses, 1), 0) >= 6;
  return jsonb_build_object(
    'day', today,
    'chosung', public.to_chosung(w.word),
    'length', char_length(w.word),
    'category', w.category,
    'hint', w.hint,
    'solvers', solvers,
    'guesses', coalesce(
      (select jsonb_agg(jsonb_build_object('word', g, 'marks', to_jsonb(public.quiz_marks(w.word, g))))
       from unnest(play.guesses) as g),
      '[]'::jsonb),
    'solved', coalesce(play.solved, false),
    'answer', case when done then w.word end
  );
end;
$$;
grant execute on function public.get_quiz_today() to anon, authenticated;

-- 답 내기. 로그인한 회원은 기록이 남고, 로그인 안 하면 채점만 해 줍니다.
create or replace function public.quiz_guess(p_guess text, p_attempt integer default 1)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  today date := public.kst_today();
  me uuid := auth.uid();
  w public.quiz_words;
  guess text := regexp_replace(coalesce(p_guess, ''), '\s', '', 'g');
  play public.quiz_plays;
  tries integer;
  correct boolean;
begin
  w := public.quiz_word_for(today);
  if w.id is null then
    return jsonb_build_object('error', '오늘 문제가 아직 없어요.');
  end if;
  if char_length(guess) <> char_length(w.word) then
    return jsonb_build_object('error', char_length(w.word) || '글자로 써 주세요.');
  end if;
  if public.to_chosung(guess) <> public.to_chosung(w.word) then
    return jsonb_build_object('error', '초성이 맞는 단어를 써 주세요.');
  end if;
  correct := guess = w.word;

  if me is not null then
    if exists (select 1 from public.profiles where id = me and is_banned) then
      return jsonb_build_object('error', '활동이 정지된 계정이에요.');
    end if;
    insert into public.quiz_plays (user_id, day) values (me, today) on conflict do nothing;
    select * into play from public.quiz_plays where user_id = me and day = today for update;
    if play.solved or coalesce(array_length(play.guesses, 1), 0) >= 6 then
      return jsonb_build_object('error', '오늘 문제는 이미 끝났어요.');
    end if;
    if guess = any(play.guesses) then
      return jsonb_build_object('error', '이미 써 본 단어예요.');
    end if;
    update public.quiz_plays
    set guesses = guesses || guess, solved = correct, updated_at = now()
    where user_id = me and day = today;
    tries := coalesce(array_length(play.guesses, 1), 0) + 1;
  else
    tries := greatest(1, least(coalesce(p_attempt, 1), 6));
  end if;

  return jsonb_build_object(
    'word', guess,
    'marks', to_jsonb(public.quiz_marks(w.word, guess)),
    'solved', correct,
    'tries', tries,
    'answer', case when correct or tries >= 6 then w.word end
  );
end;
$$;
grant execute on function public.quiz_guess(text, integer) to anon, authenticated;

-- 퀴즈 순위: 맞힌 날이 많은 순, 같으면 적은 시도로 맞힌 순
create or replace function public.get_quiz_ranking(p_limit integer default 20)
returns table (user_id uuid, nickname text, solved bigint, avg_tries numeric, rank bigint)
language sql stable security definer set search_path = ''
as $$
  with stats as (
    select q.user_id,
           count(*) filter (where q.solved) as solved,
           round(avg(array_length(q.guesses, 1)) filter (where q.solved), 1) as avg_tries
    from public.quiz_plays q
    group by q.user_id
    having count(*) filter (where q.solved) > 0
  ),
  ranked as (
    select s.*, rank() over (order by s.solved desc, s.avg_tries asc) as rank
    from stats s
  )
  select r.user_id, p.nickname, r.solved, r.avg_tries, r.rank
  from ranked r join public.profiles p on p.id = r.user_id
  order by r.rank, p.nickname
  limit least(greatest(p_limit, 1), 100);
$$;
grant execute on function public.get_quiz_ranking(integer) to anon, authenticated;

create or replace function public.get_my_quiz_rank()
returns table (solved bigint, avg_tries numeric, rank bigint)
language sql stable security definer set search_path = ''
as $$
  with stats as (
    select q.user_id,
           count(*) filter (where q.solved) as solved,
           round(avg(array_length(q.guesses, 1)) filter (where q.solved), 1) as avg_tries
    from public.quiz_plays q
    group by q.user_id
    having count(*) filter (where q.solved) > 0
  ),
  ranked as (
    select s.*, rank() over (order by s.solved desc, s.avg_tries asc) as rank from stats s
  )
  select r.solved, r.avg_tries, r.rank from ranked r where r.user_id = auth.uid();
$$;
grant execute on function public.get_my_quiz_rank() to authenticated;

-- 문제 단어 (139개, 하루에 하나씩 차례로 나와요. 더 넣으려면 같은 모양으로 insert)
insert into public.quiz_words (word, category, hint) values
  ('부엉이', '동물', '밤에 깨어 있는 새'),
  ('야구', '운동', '홈런이 나오는 경기'),
  ('보름달', '자연', '동그랗게 꽉 찬 달'),
  ('배드민턴', '운동', '셔틀콕을 주고받는 운동'),
  ('태권도', '운동', '우리나라의 전통 무술'),
  ('수영장', '장소', '물에서 헤엄치는 곳'),
  ('캠핑', '여가', '텐트 치고 자연에서 하룻밤'),
  ('축구', '운동', '공을 발로 차서 골을 넣는 경기'),
  ('소나무', '자연', '사계절 푸른 나무'),
  ('바다', '장소', '파도가 치는 넓은 물'),
  ('자전거', '탈것', '페달을 밟아 움직이는 두 바퀴'),
  ('낚시', '여가', '물고기를 잡는 취미'),
  ('번개', '자연', '천둥과 함께 번쩍'),
  ('피자', '음식', '동그랗고 치즈가 늘어나는 음식'),
  ('소방관', '직업', '불을 끄는 사람'),
  ('개구리', '동물', '개굴개굴 우는 동물'),
  ('강아지', '동물', '꼬리를 흔들며 반겨 주는 친구'),
  ('배낭', '물건', '등에 메는 가방'),
  ('이불', '물건', '잘 때 덮는 것'),
  ('아침', '생활', '하루가 시작되는 때'),
  ('솜사탕', '음식', '설탕을 녹여 만든 구름 같은 간식'),
  ('할머니', '사람', '아빠나 엄마의 엄마'),
  ('컴퓨터', '물건', '키보드와 마우스로 쓰는 기계'),
  ('한글날', '날', '10월 9일'),
  ('거북이', '동물', '등껍질을 지고 느릿느릿'),
  ('눈썰매', '겨울', '눈 덮인 언덕에서 타는 것'),
  ('기린', '동물', '목이 아주 긴 동물'),
  ('바나나', '과일', '노랗고 길쭉한 과일'),
  ('장갑', '물건', '손을 따뜻하게 끼는 것'),
  ('가수', '직업', '노래를 부르는 사람'),
  ('설날', '날', '세배하고 세뱃돈 받는 날'),
  ('공원', '장소', '산책하기 좋은 곳'),
  ('주말', '생활', '토요일과 일요일'),
  ('만두', '음식', '피 속에 소를 넣어 빚은 음식'),
  ('이어폰', '물건', '귀에 꽂고 음악을 듣는 것'),
  ('의사', '직업', '아픈 사람을 치료하는 사람'),
  ('떡볶이', '음식', '빨간 양념의 분식'),
  ('버스', '탈것', '정류장에서 기다려 타는 차'),
  ('선물', '생활', '생일에 주고받는 것'),
  ('선풍기', '물건', '여름에 바람을 일으키는 가전'),
  ('학교', '장소', '선생님과 친구가 있는 곳'),
  ('돌고래', '동물', '똑똑하고 헤엄을 잘 치는 바다 친구'),
  ('줄넘기', '운동', '줄을 돌리며 뛰어넘는 운동'),
  ('피아노', '악기', '흰 건반 검은 건반'),
  ('별자리', '자연', '밤하늘 별들을 이어 만든 모양'),
  ('나비', '동물', '꽃 사이를 날아다니는 곤충'),
  ('열쇠', '물건', '문을 여는 작은 도구'),
  ('경찰관', '직업', '도둑을 잡는 사람'),
  ('텔레비전', '물건', '거실에서 방송을 보는 가전'),
  ('시계', '물건', '시간을 알려 주는 것'),
  ('생일', '생활', '케이크에 초를 꽂는 날'),
  ('목도리', '물건', '겨울에 목에 두르는 것'),
  ('기차', '탈것', '철길 위를 달리는 긴 차'),
  ('아이스크림', '음식', '차갑고 달콤한 디저트'),
  ('코끼리', '동물', '코가 길고 몸집이 큰 동물'),
  ('해바라기', '자연', '해를 따라 고개를 돌리는 꽃'),
  ('다람쥐', '동물', '도토리를 모으는 작은 동물'),
  ('초콜릿', '음식', '카카오로 만든 달콤한 간식'),
  ('어린이날', '날', '5월 5일'),
  ('치킨', '음식', '바삭하게 튀긴 닭'),
  ('목욕탕', '장소', '뜨끈한 탕에 들어가는 곳'),
  ('눈사람', '겨울', '눈을 굴려 만드는 사람'),
  ('달팽이', '동물', '집을 지고 다니는 느림보'),
  ('김밥', '음식', '소풍 갈 때 싸 가는 음식'),
  ('냉장고', '물건', '음식을 차갑게 보관하는 가전'),
  ('낮잠', '생활', '오후에 잠깐 자는 잠'),
  ('도서관', '장소', '책을 빌리는 곳'),
  ('우산', '물건', '비 오는 날 펼치는 것'),
  ('수건', '물건', '씻고 물기를 닦는 천'),
  ('붕어빵', '음식', '겨울 길거리의 물고기 모양 빵'),
  ('김치찌개', '음식', '김치를 넣고 끓인 찌개'),
  ('짜장면', '음식', '이사하는 날 시켜 먹는 까만 면'),
  ('냉면', '음식', '여름에 시원하게 먹는 면'),
  ('복숭아', '과일', '털이 보송보송한 여름 과일'),
  ('호떡', '음식', '꿀이 흘러나오는 겨울 간식'),
  ('세탁기', '물건', '빨래를 해 주는 가전'),
  ('지우개', '물건', '연필 글씨를 지우는 것'),
  ('영화관', '장소', '팝콘 들고 큰 화면을 보는 곳'),
  ('칫솔', '물건', '이를 닦는 도구'),
  ('안경', '물건', '눈이 나쁠 때 쓰는 것'),
  ('베개', '물건', '잘 때 머리를 받치는 것'),
  ('가위', '물건', '종이를 자르는 도구'),
  ('옥수수', '음식', '알갱이가 줄지어 박힌 곡식'),
  ('노래방', '장소', '마이크 잡고 노래하는 곳'),
  ('마스크', '물건', '입과 코를 가리는 것'),
  ('펭귄', '동물', '뒤뚱뒤뚱 걷는 남극의 새'),
  ('딸기', '과일', '씨가 겉에 박힌 빨간 과일'),
  ('우체부', '직업', '편지를 배달하는 사람'),
  ('사과', '과일', '하루 하나면 의사가 필요 없다는 과일'),
  ('연필', '물건', '깎아서 쓰는 필기구'),
  ('비빔밥', '음식', '여러 나물을 넣고 비벼 먹는 밥'),
  ('놀이공원', '장소', '롤러코스터를 타러 가는 곳'),
  ('택시', '탈것', '손을 들어 잡는 노란색 차'),
  ('팥빙수', '음식', '여름에 먹는 얼음 디저트'),
  ('벚꽃', '자연', '봄에 하얗게 피는 꽃'),
  ('등산', '여가', '산에 오르는 운동'),
  ('친구', '사람', '함께 놀고 이야기하는 사이'),
  ('미역국', '음식', '생일날 먹는 국'),
  ('햄버거', '음식', '빵 사이에 고기를 넣은 음식'),
  ('만화책', '물건', '그림으로 이야기를 읽는 책'),
  ('무지개', '자연', '비 온 뒤 하늘의 일곱 색깔'),
  ('편지', '물건', '봉투에 넣어 보내는 글'),
  ('기타', '악기', '줄을 튕겨 소리 내는 악기'),
  ('라면', '음식', '물 끓이고 스프 넣고 3분'),
  ('동물원', '장소', '여러 동물을 구경하는 곳'),
  ('여행', '생활', '낯선 곳으로 떠나는 것'),
  ('달력', '물건', '날짜를 보는 종이'),
  ('키보드', '물건', '타닥타닥 글자를 치는 것'),
  ('문어', '동물', '다리가 여덟 개인 바다 동물'),
  ('떡국', '음식', '설날 아침에 먹으면 한 살 더'),
  ('병원', '장소', '아플 때 가는 곳'),
  ('지하철', '탈것', '땅속으로 다니는 열차'),
  ('풍선', '물건', '바람을 넣어 부풀리는 것'),
  ('농구', '운동', '공을 바구니에 넣는 경기'),
  ('구름', '자연', '하늘에 떠 있는 하얀 것'),
  ('단풍', '자연', '가을에 붉게 물든 잎'),
  ('호랑이', '동물', '줄무늬가 있는 산속의 왕'),
  ('게임', '여가', '이기고 지는 놀이'),
  ('수박', '과일', '여름의 대표 과일, 겉은 초록 속은 빨강'),
  ('휴대폰', '물건', '늘 손에 들고 다니는 전화기'),
  ('시장', '장소', '물건을 사고파는 곳'),
  ('불고기', '음식', '달콤한 양념에 재운 고기'),
  ('추석', '날', '송편을 빚는 명절'),
  ('고슴도치', '동물', '등에 가시가 가득한 동물'),
  ('요리사', '직업', '음식을 만드는 사람'),
  ('사진', '물건', '추억을 찍어 남기는 것'),
  ('편의점', '장소', '24시간 문을 여는 가게'),
  ('뭉게구름', '자연', '솜사탕처럼 뭉실뭉실한 구름'),
  ('삼겹살', '음식', '구워 먹는 돼지고기'),
  ('거울', '물건', '내 모습을 비춰 보는 것'),
  ('산책', '생활', '가볍게 걷는 것'),
  ('선생님', '사람', '학생을 가르치는 사람'),
  ('포도', '과일', '송이송이 달린 보라색 과일'),
  ('군고구마', '음식', '겨울 길거리의 따끈한 간식'),
  ('크리스마스', '날', '산타가 선물을 주는 날'),
  ('고구마', '음식', '겨울에 군것질로 굽는 뿌리채소'),
  ('햄스터', '동물', '볼주머니에 먹이를 넣는 작은 동물'),
  ('고양이', '동물', '야옹 하고 우는 반려동물'),
  ('비행기', '탈것', '하늘을 나는 교통수단');
