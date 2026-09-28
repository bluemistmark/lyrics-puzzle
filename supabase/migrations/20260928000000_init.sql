-- 초성 가사 퍼즐 데이터 스키마.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다.
-- 게임은 이 테이블을 직접 읽지 않습니다. 빌드(scripts/pull-catalog.ts)가 service role 키로 읽어 번들에 넣습니다.

-- 어드민 허용 목록. 로그인한 사용자의 이메일이 여기에 있어야 데이터를 읽고 쓸 수 있습니다.
create table public.admins (
  email text primary key check (email = lower(email))
);

create table public.songs (
  id text primary key check (id <> ''),
  artist text not null check (artist <> ''),
  title text not null check (title <> ''),
  aliases text[] not null default '{}',
  -- 곡 목록과 유닛(가수) 표시 순서. 새 곡은 가장 큰 값 + 1.
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (artist, title)
);

create table public.questions (
  id text primary key check (id <> ''),
  song_id text not null references public.songs (id) on update cascade on delete cascade,
  -- 가사1, 가사2(필수), 가사3(선택)
  lines text[] not null check (cardinality(lines) between 2 and 3),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index questions_song_id_idx on public.questions (song_id);

create table public.dictionary (
  english text primary key check (english <> ''),
  pronunciation text not null check (pronunciation <> ''),
  alternatives text[] not null default '{}',
  updated_at timestamptz not null default now()
);
-- 대소문자와 곧은/둥근 아포스트로피 차이만 있는 중복 방지 (src/data/english.ts의 englishKey와 맞춤)
create unique index dictionary_english_key on public.dictionary (
  lower(replace(replace(english, '’', ''''), '‘', ''''))
);

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger songs_touch before update on public.songs
  for each row execute function public.touch_updated_at();
create trigger questions_touch before update on public.questions
  for each row execute function public.touch_updated_at();
create trigger dictionary_touch before update on public.dictionary
  for each row execute function public.touch_updated_at();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.admins enable row level security;
alter table public.songs enable row level security;
alter table public.questions enable row level security;
alter table public.dictionary enable row level security;

create policy "own admin row" on public.admins
  for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));
create policy "admins manage songs" on public.songs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage questions" on public.questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage dictionary" on public.dictionary
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.admins, public.songs, public.questions, public.dictionary from anon;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.songs, public.questions, public.dictionary to authenticated;
grant all on public.admins, public.songs, public.questions, public.dictionary to service_role;

-- 어드민 등록 (이메일은 소문자로):
-- insert into public.admins (email) values ('you@example.com');
