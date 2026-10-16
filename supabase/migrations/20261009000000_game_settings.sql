-- 출제 설정: 클래식 "아는 곡 우선"의 가중치와 적용 기준(src/known.ts). 어드민 "출제 설정" 탭에서 바꾸고, 게시해야 게임에 반영됩니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261008000000_audit_log.sql 다음)
-- 행은 하나(id = 'default')뿐입니다. 허용 범위는 src/known.ts의 KNOWN_LIMITS와 같습니다.

create table public.game_settings (
  id text primary key default 'default' check (id = 'default'),
  -- 아는 곡(도감에 있거나 아는 곡으로 표시한 곡)의 출제 가중치. 나머지 곡은 1.
  known_weight double precision not null default 3 check (known_weight between 1 and 10),
  -- 모르는 곡으로 표시한 곡의 출제 가중치.
  unknown_weight double precision not null default 0.3333333333333333 check (unknown_weight between 0.01 and 1),
  -- 아는 곡·모르는 곡이 이 곡 수 이상일 때부터 가중치를 적용합니다.
  min_signal_songs integer not null default 30 check (min_signal_songs between 0 and 1000),
  updated_at timestamptz not null default now()
);
insert into public.game_settings (id) values ('default');

create trigger game_settings_touch before update on public.game_settings
  for each row execute function public.touch_updated_at();
create trigger game_settings_audit after insert or update or delete on public.game_settings
  for each row execute function public.audit_row('id');

alter table public.game_settings enable row level security;
create policy "admins manage game settings" on public.game_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.game_settings from anon;
grant select, insert, update on public.game_settings to authenticated;
grant all on public.game_settings to service_role;
